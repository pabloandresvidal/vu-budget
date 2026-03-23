import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Parse an SMS message and categorize the transaction using Gemini AI.
 */
export async function categorizeSMS(smsText, budgets) {
  const client = getClient();

  if (!client) {
    console.warn('No GEMINI_API_KEY configured — using regex fallback');
    return fallbackParse(smsText);
  }

  const budgetList = budgets.length > 0
    ? budgets.map(b => `ID: ${b.id} — "${b.title}" (${b.description || 'no description'})`).join('\n')
    : 'No budgets configured yet.';

  const prompt = `You are a financial transaction categorizer for a budgeting app. Analyze this bank SMS notification and extract the transaction details.

SMS: "${smsText}"

Available budgets:
${budgetList}

Instructions:
- Extract the vendor/merchant name (e.g. "Costco", "McDonald's", "Amazon")
- Extract the transaction amount as a positive number (look for patterns like "17.64", "$17.64", "CAD 17.64")
- Match the vendor to the most appropriate budget based on the vendor name and budget descriptions
- Set confidence 0.8+ when the match is very clear (e.g. grocery store → Groceries budget)
- Set confidence 0.5-0.79 when it's a reasonable guess
- Set confidence below 0.5 when you're unsure or no budget matches
- If no budgets exist or none match at all, set budgetId to null and confidence to 0

Return ONLY this JSON (no markdown, no explanation):
{
  "vendor": "string",
  "amount": number,
  "budgetId": number or null,
  "confidence": number,
  "description": "string"
}`;

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { temperature: 0, responseMimeType: 'application/json' }
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    console.log('Gemini result:', JSON.stringify(parsed));

    return {
      vendor: parsed.vendor || 'Unknown',
      amount: Math.abs(Number(parsed.amount)) || 0,
      budgetId: parsed.budgetId || null,
      confidence: Number(parsed.confidence) || 0,
      description: parsed.description || `Transaction at ${parsed.vendor || 'Unknown'}`
    };
  } catch (err) {
    console.error('Gemini AI error:', err.message);
    return fallbackParse(smsText);
  }
}

/**
 * Improved regex-based fallback parser.
 * Handles: "$17.64", "17.64", "CAD 17.64", "USD17.64"
 */
function fallbackParse(smsText) {
  // Match amounts with or without currency symbols/codes
  const amountMatch = smsText.match(
    /(?:\$|CAD|USD|MXN)?\s*([\d,]+\.\d{2})(?:\s*(?:CAD|USD|MXN))?/i
  );
  let amount = 0;
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, '')) || 0;
  }

  // Match vendor after "at", "from", "@", or before "was"
  const vendorMatch = smsText.match(
    /(?:at|from|@|spent at)\s+([A-Za-z0-9][A-Za-z0-9\s&'.\-]+?)(?:\s*[.,]|\s+(?:on|for|was|of|$))/i
  );
  const vendor = vendorMatch ? vendorMatch[1].trim() : 'Unknown Vendor';

  return {
    vendor,
    amount,
    budgetId: null,
    confidence: 0,
    description: `Transaction at ${vendor}`
  };
}

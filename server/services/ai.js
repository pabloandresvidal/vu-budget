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

  const prompt = `You are a strict financial transaction categorizer. Analyze this bank SMS notification.

SMS: "${smsText}"

Available budgets:
${budgetList}

CRITICAL RULES:
1. Extract the exactly correct vendor name. Ignore the bank name (e.g., "Rogers Bank", "Chase"). Find the merchant where the money was spent. 
   Example: "Rogers Bank: $17.51 spent at Costco" -> vendor is "Costco".
   Example: "Purchase of $4.00 at Starbucks" -> vendor is "Starbucks".
2. Extract the transaction amount as a positive number.
3. Match the vendor to the best budget based on the vendor name and budget descriptions.
4. Confidence scoring:
   - 0.8 to 1.0: Perfect semantic match (e.g., Costco/Walmart -> Groceries)
   - 0.5 to 0.79: Reasonable guess
   - 0.0 to 0.49: Unsure, or no budget matches. Use this if you cannot decipher the vendor securely.
5. If no budgets exist, set budgetId to null and confidence to 0.

OUTPUT FORMAT:
You must output ONLY valid JSON. Absolutely no markdown blocks, no \`\`\`json, no explanations. 
{
  "vendor": "Costco",
  "amount": 17.51,
  "budgetId": 12,
  "confidence": 0.9,
  "description": "Rogers Bank: $17.51 spent at Costco"
}`;

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    });
    console.log('[AI PIPELINE] Sending to Gemini. SMS:', smsText);
    console.log('[AI PIPELINE] Budgets:', budgetList);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    console.log('[AI PIPELINE] Raw Gemini response:', text);

    // Strip any accidental markdown fences or prefixes
    const cleaned = text.replace(/^```.*?\n/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    console.log('[AI PIPELINE] Parsed result:', JSON.stringify(parsed));

    return {
      vendor: parsed.vendor || 'Unknown',
      amount: Math.abs(Number(parsed.amount)) || 0,
      budgetId: parsed.budgetId || null,
      confidence: Number(parsed.confidence) || 0,
      description: parsed.description || `Transaction at ${parsed.vendor || 'Unknown'}`
    };
  } catch (err) {
    console.error('[AI PIPELINE] Gemini error:', err.message, err.stack);
    return fallbackParse(smsText, budgets);
  }
}

/**
 * Improved regex-based fallback parser.
 * Handles: "$17.64", "17.64", "CAD 17.64", "USD17.64"
 */
function fallbackParse(smsText, budgets = []) {
  // Match amounts with or without currency symbols/codes
  const amountMatch = smsText.match(
    /(?:\$|CAD|USD|MXN)?\s*([\d,]+\.\d{2})(?:\s*(?:CAD|USD|MXN))?/i
  );
  let amount = 0;
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, '')) || 0;
  }

  // Match vendor more aggressively
  const vendorMatch = smsText.match(/(?:at|from|@|spent at|to)\s+([A-Za-z0-9][A-Za-z0-9\s&'.\-*]+?)(?:\s*[.,]|\s+(?:on|for|was|of|$))/i);
  let vendor = vendorMatch ? vendorMatch[1].trim() : '';

  // Generic fallback if we still can't find a vendor
  if (!vendor || vendor.length < 2) {
    const capsMatch = smsText.match(/([A-Z][A-Z0-9\s&'.\-*]{2,})/);
    vendor = capsMatch ? capsMatch[1].trim() : 'Unknown Vendor';
  }

  // Simple budget matching by checking if vendor name appears in budget title/description
  let budgetId = null;
  if (budgets.length > 0 && vendor !== 'Unknown Vendor') {
    const lowerVendor = vendor.toLowerCase();
    for (const b of budgets) {
      const title = (b.title || '').toLowerCase();
      const desc = (b.description || '').toLowerCase();
      if (title.includes(lowerVendor) || desc.includes(lowerVendor) ||
          lowerVendor.includes(title)) {
        budgetId = b.id;
        break;
      }
    }
  }

  return {
    vendor,
    amount,
    budgetId,
    confidence: budgetId ? 0.3 : 0,
    description: `Transaction at ${vendor}`
  };
}

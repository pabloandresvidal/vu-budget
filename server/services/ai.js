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
 * @param {string} smsText - Raw SMS text from the bank
 * @param {Array} budgets - Array of {id, title, description} for the user's budgets
 * @returns {{ vendor, amount, budgetId, confidence, description }}
 */
export async function categorizeSMS(smsText, budgets) {
  const client = getClient();

  // If no Gemini key configured, fall back to regex parse
  if (!client) {
    return fallbackParse(smsText);
  }

  const budgetList = budgets
    .map(b => `ID: ${b.id} — "${b.title}" (${b.description || 'no description'})`)
    .join('\n');

  const prompt = `You are a financial transaction categorizer. Given a bank SMS notification, extract the transaction details and categorize it into one of the user's budgets.

Return ONLY a valid JSON object with these fields:
- vendor: string (the merchant/vendor name, cleaned up and human-readable)
- amount: number (the transaction amount, always positive)
- budgetId: number or null (the ID of the matching budget, or null if unsure)
- confidence: number (0-1, your confidence in the categorization)
- description: string (a short human-readable description of the transaction)

Available budgets:
${budgetList}

Rules:
- If no budgets match well, set budgetId to null and confidence to 0
- Only set confidence above 0.7 if you are very sure about the categorization
- Extract the exact dollar amount from the SMS
- Return ONLY the JSON object, no markdown fences, no explanation

SMS to categorize:
${smsText}`;

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini adds them
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(cleaned);

    return {
      vendor: parsed.vendor || 'Unknown',
      amount: Math.abs(Number(parsed.amount)) || 0,
      budgetId: parsed.budgetId || null,
      confidence: Number(parsed.confidence) || 0,
      description: parsed.description || ''
    };
  } catch (err) {
    console.error('Gemini AI categorization error:', err.message);
    return fallbackParse(smsText);
  }
}

/**
 * Basic regex-based fallback parser when AI is unavailable
 */
function fallbackParse(smsText) {
  const amountMatch = smsText.match(/\$\s?([\d,]+\.?\d*)|(?:USD|usd)\s?([\d,]+\.?\d*)|([\d,]+\.?\d*)\s?(?:USD|usd)/);
  let amount = 0;
  if (amountMatch) {
    const raw = (amountMatch[1] || amountMatch[2] || amountMatch[3] || '0').replace(/,/g, '');
    amount = parseFloat(raw) || 0;
  }

  const vendorMatch = smsText.match(/(?:at|from|to|@)\s+([A-Za-z0-9\s&'.]+?)(?:\s+(?:on|for|was|of|\.|$))/i);
  const vendor = vendorMatch ? vendorMatch[1].trim() : 'Unknown Vendor';

  return {
    vendor,
    amount,
    budgetId: null,
    confidence: 0,
    description: `Transaction at ${vendor}`
  };
}

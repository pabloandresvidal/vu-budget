import OpenAI from 'openai';

let openai = null;

function getClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

/**
 * Parse an SMS message and categorize the transaction.
 * @param {string} smsText - Raw SMS text from the bank
 * @param {Array} budgets - Array of {id, title, description} for the user's budgets
 * @returns {{ vendor: string, amount: number, budgetId: number|null, confidence: number, description: string }}
 */
export async function categorizeSMS(smsText, budgets) {
  const client = getClient();

  // If no OpenAI key configured, do a basic regex parse and leave uncategorized
  if (!client) {
    return fallbackParse(smsText);
  }

  const budgetList = budgets.map(b => `ID: ${b.id} — "${b.title}" (${b.description || 'no description'})`).join('\n');

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a financial transaction categorizer. Given a bank SMS notification, extract the transaction details and categorize it into one of the user's budgets.

Return a JSON object with these fields:
- vendor: string (the merchant/vendor name)
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
- Clean up the vendor name to be human-readable`
        },
        {
          role: 'user',
          content: smsText
        }
      ]
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      vendor: result.vendor || 'Unknown',
      amount: Math.abs(Number(result.amount)) || 0,
      budgetId: result.budgetId || null,
      confidence: Number(result.confidence) || 0,
      description: result.description || ''
    };
  } catch (err) {
    console.error('AI categorization error:', err);
    return fallbackParse(smsText);
  }
}

/**
 * Basic regex-based fallback parser when AI is unavailable
 */
function fallbackParse(smsText) {
  // Try to extract amount patterns like $45.50, 45.50, USD 45.50
  const amountMatch = smsText.match(/\$\s?([\d,]+\.?\d*)|(?:USD|usd)\s?([\d,]+\.?\d*)|([\d,]+\.?\d*)\s?(?:USD|usd)/);
  let amount = 0;
  if (amountMatch) {
    const raw = (amountMatch[1] || amountMatch[2] || amountMatch[3] || '0').replace(/,/g, '');
    amount = parseFloat(raw) || 0;
  }

  // Try to extract vendor — look for "at <vendor>" or "from <vendor>"
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

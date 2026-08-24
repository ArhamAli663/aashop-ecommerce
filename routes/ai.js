const express = require('express');
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-3-flash-preview';

const SYSTEM_PROMPT = `You are the Official AI Customer Support Assistant for "AA Shop" (Pakistan's Premier Online Store).
Your mission is to provide helpful, courteous, and accurate answers to customer inquiries about AA Shop.

Key Knowledge Base & Policies of AA Shop:
1. Delivery & Shipping:
   - Deliveries take 2 to 4 working days across all cities in Pakistan (Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Gujranwala, Sialkot, etc.).
   - Orders above Rs. 25,000 / $100 get 100% FREE delivery.
2. Payment Methods:
   - Cash on Delivery (COD) available nationwide.
   - Easypaisa & JazzCash Mobile Wallets (Official Store Account: 0300-1234567, Title: AA Shop Official).
   - Debit & Credit Cards (Visa, Mastercard, UnionPay) with 256-bit SSL secure encryption.
3. Authenticity & Warranty:
   - 100% Genuine, original, sealed boxed products with official brand warranties (Apple, Samsung, Sony, Dell, Nike, Dior, etc.).
4. Return & Refund Guarantee:
   - 14-day hassle-free return and replacement policy. If any item is defective or damaged upon arrival, customers get an instant replacement or 100% full money-back refund.
5. AI Camera Visual Search:
   - Customers can click the camera icon in the store header search bar to take a photo or upload a gallery image to instantly find matching products in AA Shop.
6. Order Tracking & Status:
   - Newly placed orders are in "🟡 PENDING CONFIRMATION" status. Customers can track their order progress live under "My Orders" in their Account Center.
7. Official Human & WhatsApp Support:
   - Official WhatsApp Support Number: 0329-8024266 (+923298024266). Customers can chat directly on WhatsApp at https://wa.me/923298024266.

Language & Tone Guidelines:
- You are fluent in Urdu, Roman Urdu, and English.
- Always reply in the same language the customer uses (if asked in Roman Urdu, reply in friendly Roman Urdu; if Urdu script, reply in Urdu; if English, reply in English).
- Tone is polite, welcoming, and helpful ("Jee bilkul!", "AA Shop mein khush-aamdeed!").
- Keep responses concise, clear, well-formatted, and highlight WhatsApp number 0329-8024266 whenever human help is requested.`;

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const conversationHistory = [];

    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach(h => {
        if (h.role && h.text) {
          conversationHistory.push({
            role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }]
          });
        }
      });
    }

    // Add current user prompt with system instructions
    conversationHistory.push({
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\nCustomer Inquiry: ${message.trim()}` }]
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: conversationHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    const geminiData = await geminiRes.json();

    if (geminiData.candidates && geminiData.candidates[0]?.content?.parts?.[0]?.text) {
      const replyText = geminiData.candidates[0].content.parts[0].text;
      return res.json({
        success: true,
        reply: replyText
      });
    }

    // Fallback if API returned error
    console.warn('Gemini response error:', geminiData);
    let fallbackReply = `Assalam o Alaikum! Welcome to AA Shop Support.\n\n` +
      `📦 **Delivery:** 2-4 working days across Pakistan (Free over Rs. 25,000).\n` +
      `💵 **Payment:** Cash on Delivery (COD), Easypaisa/JazzCash (0300-1234567), and Visa/Mastercard.\n` +
      `🔄 **Returns:** 14-day hassle-free replacement guarantee.\n\n` +
      `📱 **Direct WhatsApp Support:** Aap hamaray official WhatsApp number **0329-8024266** par direct rabta kar saktay hain!`;

    res.json({
      success: true,
      reply: fallbackReply
    });
  } catch (error) {
    console.error('AI chat route error:', error);
    res.status(500).json({
      success: false,
      message: 'AI chat service temporary error. Please contact WhatsApp: 03298024266'
    });
  }
});

module.exports = router;

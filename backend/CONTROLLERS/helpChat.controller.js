/* 
const { GoogleGenAI } = require("@google/genai");
const Product = require("../MODELS/product.model");

const chatWithCustomer = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your question.",
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Question must be under 1000 characters.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "Gemini API key is not configured.",
      });
    }

    const products = await Product.find({})
      .select("name price category")
      .limit(50)
      .lean();

    const productContext = products.map((p) => ({
      name: p.name,
      price: p.price,
      category: p.category,
    }));

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string"
          )
          .slice(-8)
          .map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content.slice(0, 1000) }],
          }))
      : [];

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const model =
      process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const config = {
      systemInstruction: `
You are a friendly e-commerce customer support assistant.
Answer clearly and politely in the customer's language.

Current product catalog:
${JSON.stringify(productContext)}

Rules:
- Use only this catalog for product names and prices.
- Never invent product availability, discounts, or delivery dates.
- You cannot see live order or payment records.
- For order status or payment confirmation, direct customers
  to My Orders or the store support team.
- Do not invent refund, return, or delivery policies.
- Never ask for passwords, OTPs, or card details.
- Keep answers short and helpful.
`,
      maxOutputTokens: 350,
    };

    let response;

    // Retry temporary server and rate-limit errors up to 3 times.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            ...safeHistory,
            {
              role: "user",
              parts: [{ text: message.trim() }],
            },
          ],
          config,
        });

        break;
      } catch (error) {
        const status = Number(
          error.status || error.code || error.error?.code
        );

        const retryable = [429, 500, 502, 503, 504].includes(status);

        console.error(
          `Gemini attempt ${attempt + 1} failed:`,
          error.message
        );

        if (!retryable || attempt === 2) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 1500 * (2 ** attempt))
        );
      }
    }

    if (!response?.text) {
      throw new Error("Gemini returned an empty response.");
    }

    return res.json({
      success: true,
      reply: response.text,
    });
  } catch (error) {
    const status = Number(
      error.status || error.code || error.error?.code
    );

    console.error("GEMINI HELP CHAT ERROR:", error.message);

    if (status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "AI request limit reached. Please wait and try again.",
      });
    }

    if (status === 503 || status === 504) {
      return res.status(503).json({
        success: false,
        message:
          "AI service is busy right now. Please try again shortly.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "AI support is temporarily unavailable. Please try again.",
    });
  }
};

module.exports = { chatWithCustomer }; */


const { GoogleGenAI } = require("@google/genai");
const Product = require("../MODELS/product.model");

const chatWithCustomer = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your question.",
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Question must be under 1000 characters.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "Gemini API key is not configured.",
      });
    }

    const products = await Product.find({})
      .select("name price category")
      .limit(50)
      .lean();

    const productContext = products.map((p) => ({
      name: p.name,
      price: p.price,
      category: p.category,
    }));

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string"
          )
          .slice(-8)
          .map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content.slice(0, 1000) }],
          }))
      : [];

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [
        ...safeHistory,
        {
          role: "user",
          parts: [{ text: message.trim() }],
        },
      ],
      config: {
        systemInstruction: `
You are a friendly e-commerce customer support assistant.
Answer clearly and politely in the customer's language.

Current product catalog:
${JSON.stringify(productContext)}

Rules:
- Use only this catalog for product names and prices.
- Never invent product availability, discounts, or delivery dates.
- You cannot see live order or payment records.
- For order status or payment confirmation, direct customers
  to My Orders or the store support team.
- Do not invent refund, return, or delivery policies.
- Never ask for passwords, OTPs, or card details.
- Keep answers short and helpful.
`,
        maxOutputTokens: 350,
      },
    });

    return res.json({
      success: true,
      reply:
        response.text ||
        "Sorry, I could not prepare an answer. Please try again.",
    });
  } catch (error) {
    console.error("GEMINI HELP CHAT ERROR:", error.message);

    return res.status(500).json({
      success: false,
      message:
        "AI support is temporarily unavailable. Please try again.",
    });
  }
};

module.exports = { chatWithCustomer };
 
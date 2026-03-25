const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

// Initialize Gemini API
exports.getRecommendation = async (req, res) => {
  try {
    const { skinTone, gender, occasion, dressType } = req.body;

    if (!skinTone || !gender || !occasion || !dressType) {
      return res.status(400).json({ msg: "Skin tone, gender, occasion, and dress type are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      console.error("❌ Gemini API Key is missing or not configured in .env");
      return res.status(500).json({ msg: "Gemini API Key is not configured correctly." });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
    let lastError = null;
    let recommendation = null;

    const currentTime = new Date().toLocaleTimeString();
    const prompt = `You are a fashion expert. Given a ${gender} with skin tone ${skinTone}, attending a ${occasion} wearing a ${dressType} at ${currentTime}, suggest the best color combination for the dress and accessories to look stunning. Keep it concise, stylish, and professional. Return the response in a structured format with "Dress Colors" and "Accessory Suggestions".`;

    for (const modelName of candidateModels) {
      try {
        console.log(`Trying Gemini model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        recommendation = response.text();
        if (recommendation) break;
      } catch (err) {
        lastError = err;
        console.error(`Error with ${modelName}:`, err.message);
        if (err.status !== 404) break; // If it's not a 404, the key or prompt might be the issue
      }
    }

    if (recommendation) {
      res.json({ recommendation });
    } else {
      throw lastError || new Error("All candidate models failed.");
    }
  } catch (err) {
    console.error("Gemini AI Final Error:", err);
    let msg = "Failed to get AI recommendation";
    if (err.status === 404) msg = "Model not found. Please check if your API key has access to Gemini 1.5 Flash in AI Studio.";
    if (err.status === 403) msg = "Access denied. Please check if your API key is valid and the Generative Language API is enabled.";
    res.status(500).json({ msg, error: err.message });
  }
};

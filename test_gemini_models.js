const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config({ path: "./backend/.env" });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.error("API key missing");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // There isn't a direct listModels in the simple SDK usually, 
    // but we can try to use the fetch API or just try gemini-1.5-flash-001
    console.log("Testing gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hi");
    console.log("Success with gemini-1.5-flash:", result.response.text());
  } catch (err) {
    console.error("Error with gemini-1.5-flash:", err.message);
    if (err.status === 404) {
        console.log("Attempting gemini-1.5-flash-latest...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const result = await model.generateContent("Hi");
            console.log("Success with gemini-1.5-flash-latest:", result.response.text());
        } catch (err2) {
            console.error("Error with gemini-1.5-flash-latest:", err2.message);
        }
    }
  }
}

listModels();

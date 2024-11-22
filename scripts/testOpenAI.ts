import OpenAI from "openai";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Check if API key is provided
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("Error: OPENAI_API_KEY is not set in the .env file.");
  process.exit(1); // Exit if no API key is provided
}

// Initialize OpenAI with the provided API key
const openai = new OpenAI({
  apiKey: apiKey,
});

async function testOpenAI() {
  try {
    console.log("Testing OpenAI API key...");

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use "gpt-4" if you have access
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello! Can you summarize this?" },
      ],
      max_tokens: 50, // Limit the response length for testing
    });

    console.log("API Test Successful!");
    console.log("Response:", response.choices[0]?.message?.content || "No response content");
  } catch (error) {
    console.error("Error testing OpenAI API:");

    // Handle the error as an instance of Error
    if (error instanceof Error) {
      console.error("Error Message:", error.message);
    } else if (typeof error === "object" && error !== null && "response" in error) {
      // If it's an API error (e.g., Axios-style error)
      const apiError = error as any; // Explicit casting
      console.error("Status Code:", apiError.response?.status);
      console.error("Response Data:", apiError.response?.data);
    } else {
      // Handle unexpected error types
      console.error("Unexpected Error:", String(error));
    }
  }
}
testOpenAI();


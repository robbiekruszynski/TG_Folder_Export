import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const EXPORT_DIR = process.env.EXPORT_DIR || "./hidden_exports";
const SUMMARY_DIR = process.env.SUMMARY_DIR || "./hidden_summary";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Ensure the summary directory exists
if (!fs.existsSync(SUMMARY_DIR)) {
  fs.mkdirSync(SUMMARY_DIR, { recursive: true });
}

async function summarizeFile(filePath: string, outputPath: string, model: string) {
  const rawData = fs.readFileSync(filePath, "utf-8");

  console.log(`Summarizing ${filePath} with model: ${model}...`);
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are an assistant that summarizes chat conversations." },
        { role: "user", content: `Summarize this chat log:\n\n${rawData}` },
      ],
      max_tokens: 1000,
    });

    const summary = response.choices[0]?.message?.content || "No summary available.";
    console.log(`Generated summary for ${filePath}:`, summary);

    fs.writeFileSync(outputPath, summary, "utf-8");
    console.log(`Summary successfully saved to ${outputPath}`);
  } catch (error) {
    if (error instanceof Error) {
      // Handle standard error object
      console.error(`Error summarizing ${filePath}:`, error.message);
    } else if (typeof error === "object" && error !== null && "response" in error) {
      const apiError = error as any; // Temporarily cast to any to handle `response`
      console.error(`API Error (${apiError.response.status}):`, apiError.response.data);
    } else {
      console.error(`Unknown error summarizing ${filePath}:`, String(error));
    }
  }
}

async function summarizeChats() {
  // Test if the API key works and the summary directory is writable
  if (!OPENAI_API_KEY) {
    console.error("No API key found. Please set OPENAI_API_KEY in your .env file.");
    return;
  }

  const testPath = path.join(SUMMARY_DIR, "test_summary.txt");
  try {
    fs.writeFileSync(testPath, "Test summary content", "utf-8");
    console.log(`Test file written to ${testPath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to write test file to ${SUMMARY_DIR}:`, error.message);
    } else {
      console.error(`Failed to write test file to ${SUMMARY_DIR}:`, String(error));
    }
    return;
  }

  const files = fs.readdirSync(EXPORT_DIR).filter(file => file.endsWith(".txt"));
  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo"; // Default to gpt-3.5-turbo if not specified

  for (const file of files) {
    const inputPath = path.join(EXPORT_DIR, file);
    const outputPath = path.join(SUMMARY_DIR, `summary_${file}`);
    if (fs.existsSync(outputPath)) {
      console.log(`Summary for ${file} already exists, skipping.`);
      continue;
    }

    await summarizeFile(inputPath, outputPath, model);
    await sleep(1000); // Add a 1-second delay to avoid hitting rate limits
  }

  console.log("All chats summarized.");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

summarizeChats();



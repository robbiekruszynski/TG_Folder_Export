import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const EXPORT_DIR = process.env.EXPORT_DIR || "./hidden_exports";
const SUMMARY_DIR = process.env.SUMMARY_DIR || "./hidden_summary";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!fs.existsSync(SUMMARY_DIR)) {
  fs.mkdirSync(SUMMARY_DIR, { recursive: true });
}

async function summarizeFile(filePath: string, outputPath: string) {
  const rawData = fs.readFileSync(filePath, "utf-8");

  console.log(`Summarizing ${filePath}...`);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an assistant that summarizes chat conversations." },
        { role: "user", content: `Summarize this chat log:\n\n${rawData}` },
      ],
      max_tokens: 1000, 
    });

    const summary = response.choices[0]?.message?.content || "No summary available.";
    fs.writeFileSync(outputPath, summary, "utf-8");
    console.log(`Summary saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error summarizing ${filePath}:`, (error as Error).message);
  }
}

async function summarizeChats() {
  const files = fs.readdirSync(EXPORT_DIR).filter(file => file.endsWith(".txt"));

  for (const file of files) {
    const inputPath = path.join(EXPORT_DIR, file);
    const outputPath = path.join(SUMMARY_DIR, `summary_${file}`);
    await summarizeFile(inputPath, outputPath);
  }

  console.log("All chats summarized.");
}

summarizeChats();

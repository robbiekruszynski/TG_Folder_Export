import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config();

type HuggingFaceResponse = Array<{
  summary_text: string;
}>;

const EXPORT_DIR = process.env.EXPORT_DIR || "./hidden_exports";
const SUMMARY_DIR = process.env.SUMMARY_DIR || "./hidden_summary";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

if (!HUGGINGFACE_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY is not set in the environment variables.");
  }
  
  if (!fs.existsSync(SUMMARY_DIR)) {
    fs.mkdirSync(SUMMARY_DIR, { recursive: true });
  }
  
  function cleanConversation(rawData: string): string {
    return rawData
      .split("\n")
      .map(line => line.replace(/^\[\w+]:/, "").trim()) // Remove sender names
      .filter(line => line !== "") // Remove empty lines
      .join(" ");
  }
  
  function truncateText(text: string, maxTokens: number): string {
    const tokens = text.split(" ");
    if (tokens.length > maxTokens) {
      return tokens.slice(0, maxTokens).join(" ");
    }
    return text;
  }
  
  function generateStructuredSummary(summary: string): string {
    return `
  1. Main Topics Discussed:
     ${summary}
  
  2. Next Steps or Action Points:
     - [Add specific actions based on the summary if needed.]
  
  3. Key Questions Raised:
     - [Highlight questions, if any.]
  
  4. Conclusions or Decisions Made:
     - [Summarize the decisions made or conclusions reached.]
    `.trim();
  }
  
  async function fetchWithRetry(url: string, options: RequestInit, retries: number): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      console.error(`API call failed (Attempt ${i + 1}): ${response.statusText}`);
      await new Promise(res => setTimeout(res, 1000)); // Wait 1 second before retrying
    }
    throw new Error(`API call failed after ${retries} retries.`);
  }
  
  async function summarizeFile(filePath: string, outputPath: string): Promise<boolean> {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const cleanedData = cleanConversation(rawData);
    const truncatedData = truncateText(cleanedData, 1024);
  
    console.log(`Summarizing ${filePath} using Hugging Face API...`);
    try {
      const response = await fetchWithRetry(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: truncatedData }),
        },
        3 // Retry up to 3 times
      );
  
      const result = (await response.json()) as HuggingFaceResponse;
      const generalSummary = result[0]?.summary_text || "No summary available.";
  
      console.log(`Generated summary for ${filePath}:`, generalSummary);
  
      // Post-process the summary for structured output
      const structuredSummary = generateStructuredSummary(generalSummary);
      fs.writeFileSync(outputPath, structuredSummary, "utf-8");
      console.log(`Summary successfully saved to ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`Error summarizing ${filePath}:`, error.message);
      return false;
    }
  }
  
  async function processFiles(): Promise<void> {
    const files = fs.readdirSync(EXPORT_DIR).filter(file => file.endsWith(".txt"));
    console.log(`Files to process: ${files.join(", ")}`);
  
    let successCount = 0;
    let failureCount = 0;
  
    for (const file of files) {
      const inputPath = path.join(EXPORT_DIR, file);
      const outputPath = path.join(SUMMARY_DIR, `summary_${file}`);
  
      if (fs.existsSync(outputPath)) {
        console.log(`Summary for ${file} already exists, skipping.`);
        continue;
      }
  
      const success = await summarizeFile(inputPath, outputPath);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
  
      // Respect rate limits by waiting 1 second between files
      await new Promise(res => setTimeout(res, 1000));
    }
  
    console.log("\nSummary Processing Completed:");
    console.log(`- Successful Summaries: ${successCount}`);
    console.log(`- Failed Summaries: ${failureCount}`);
    console.log("All chats summarized.");
  }
  
  (async () => {
    try {
      await processFiles();
    } catch (error) {
      console.error("Unhandled error during processing:", error.message);
    }
  })();
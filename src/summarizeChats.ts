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

// Clean and preprocess the conversation text
function cleanConversation(rawData: string): string {
  return rawData
    .split("\n")
    .map(line => line.replace(/^\[\d{2}:\d{2}:\d{2}\]/, "").trim()) // Remove timestamps
    .filter(line => line !== "") // Remove empty lines
    .join("\n");
}

// Split text into manageable chunks for the Hugging Face API
function splitTextByTurns(text: string, turnLimit: number = 5): string[] {
  const turns = text.split("\n").filter(line => line.trim() !== "");
  const chunks = [];
  for (let i = 0; i < turns.length; i += turnLimit) {
    chunks.push(turns.slice(i, i + turnLimit).join("\n"));
  }
  return chunks;
}

// Post-process the summary for structured output
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

// Summarize a single file
async function summarizeFile(filePath: string, outputPath: string): Promise<void> {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const cleanedData = cleanConversation(rawData);

  console.log(`Summarizing ${filePath} using Hugging Face API...`);

  const prompt = `
Analyze the following conversation and provide a structured summary with the following sections:
1. Main Topics Discussed (Provide a concise overview of the main themes or subjects discussed).
2. Next Steps or Action Points (Extract specific actionable items or tasks discussed in the conversation).
3. Key Questions Raised (Identify any questions that were asked or raised during the discussion).
4. Conclusions or Decisions Made (Summarize any conclusions reached or decisions made during the conversation).

Be specific and concise in your response. Use bullet points for "Next Steps" and "Key Questions."
Conversation:
${cleanedData}
  `;

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status ${response.status}`);
    }

    const result = (await response.json()) as HuggingFaceResponse;
    const generalSummary = result[0]?.summary_text || "No summary available.";

    console.log(`Generated summary for ${filePath}:`, generalSummary);

    // Post-process the summary for structured output
    const structuredSummary = generateStructuredSummary(generalSummary);
    fs.writeFileSync(outputPath, structuredSummary, "utf-8");
    console.log(`Summary successfully saved to ${outputPath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error summarizing ${filePath}:`, error.message);
    } else {
      console.error(`Unexpected error summarizing ${filePath}:`, String(error));
    }
  }
}

// Process all files in the export directory
async function processFiles(): Promise<void> {
  const files = fs.readdirSync(EXPORT_DIR).filter(file => file.endsWith(".txt"));

  for (const file of files) {
    const inputPath = path.join(EXPORT_DIR, file);
    const outputPath = path.join(SUMMARY_DIR, `summary_${file}`);

    if (fs.existsSync(outputPath)) {
      console.log(`Summary for ${file} already exists, skipping.`);
      continue;
    }

    await summarizeFile(inputPath, outputPath);
  }

  console.log("All chats summarized.");
}

// Watch for new files in the export directory
function watchExportDirectory(): void {
  console.log(`Watching ${EXPORT_DIR} for new files...`);

  fs.watch(EXPORT_DIR, async (eventType, filename) => {
    if (!filename) {
      console.warn("Filename is null. Skipping this event.");
      return;
    }

    if (eventType === "rename" && filename.endsWith(".txt")) {
      const inputPath = path.join(EXPORT_DIR, filename);
      const outputPath = path.join(SUMMARY_DIR, `summary_${filename}`);

      if (fs.existsSync(inputPath) && !fs.existsSync(outputPath)) {
        console.log(`Detected new file: ${filename}`);
        await summarizeFile(inputPath, outputPath);
      }
    }
  });
}

// Main function to process existing files and watch for new ones
(async () => {
  await processFiles(); // Process existing files
  watchExportDirectory(); // Watch for new files
})();








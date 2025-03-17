import fs from "fs";
import path from "path";
import * as chrono from "chrono-node";
import * as dotenv from "dotenv";
dotenv.config();

const EXPORT_DIR = process.env.EXPORT_DIR || "./hidden_exports";
const KEY_INFO_OUTPUT_DIR = process.env.KEY_INFO_OUTPUT_DIR || "./key_info";

if (!fs.existsSync(KEY_INFO_OUTPUT_DIR)) {
  fs.mkdirSync(KEY_INFO_OUTPUT_DIR, { recursive: true });
}


function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  return emails ? emails : [];
}


function extractLinks(text: string): string[] {
  const urlRegex = /\bhttps?:\/\/\S+\b/g;
  const links = text.match(urlRegex);
  return links ? links : [];
}


function extractMeetings(text: string): string[] {
  const lines = text.split("\n");
  const meetingKeywords = /meeting|meet|appointment|schedule/i;
  const meetingLines = lines.filter(line => meetingKeywords.test(line));
  return meetingLines;
}


function formatDateSimple(date: Date): string {
  const options = { year: 'numeric', month: 'long', day: 'numeric' } as const;
  return date.toLocaleDateString('en-US', options);
}


function extractDates(text: string): string[] {
  const results = chrono.parse(text);
  return results.map(result => formatDateSimple(result.start.date()));
}


function extractKeyInformation(text: string): string {
  const emails = extractEmails(text);
  const meetings = extractMeetings(text);
  const links = extractLinks(text);
  const dates = extractDates(text);

  let summary = "Extracted Key Information:\n";

  summary += "\n--- Emails Found ---\n";
  summary += emails.length > 0 ? emails.join("\n") : "None found.";

  summary += "\n\n--- Meetings Found ---\n";
  summary += meetings.length > 0 ? meetings.join("\n") : "None found.";

  summary += "\n\n--- Links Found ---\n";
  summary += links.length > 0 ? links.join("\n") : "None found.";

  // summary += "\n\n--- Date Mentions Found ---\n";
  // summary += dates.length > 0 ? dates.join("\n") : "None found.";

  return summary;
}


function processExportedConversations(): void {
  const files = fs.readdirSync(EXPORT_DIR).filter(file => file.endsWith(".txt"));
  console.log(`Found ${files.length} exported conversation files in ${EXPORT_DIR}`);

  files.forEach(file => {
    const filePath = path.join(EXPORT_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const keyInfoSummary = extractKeyInformation(content);

    const outputFilePath = path.join(KEY_INFO_OUTPUT_DIR, `key_info_${file}`);
    fs.writeFileSync(outputFilePath, keyInfoSummary, "utf-8");
    console.log(`Key information extracted and saved to: ${outputFilePath}`);
  });
}

processExportedConversations();



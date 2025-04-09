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

function isTrueMeeting(message: string): boolean {
  const schedulingPattern = /\b(?:meeting|appointment|call|conference)\b.*\b(?:at\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)\b/i;
  const dateAndMeetingPattern = /\b(?:meeting|appointment|call|conference)\b.*\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))\b/i;

  if (schedulingPattern.test(message) || dateAndMeetingPattern.test(message)) {
    if (/nice meeting you/i.test(message)) {
      return false;
    }
    return true;
  }
  return false;
}

function extractMeetings(text: string): string[] {
  const lines = text.split("\n");
  const meetingLines = lines.filter(line => isTrueMeeting(line));
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

function extractUsers(text: string): string[] {
  const lines = text.split("\n");
  const userSet = new Set<string>();
  const userRegex = /^\[\d{2}:\d{2}\]\s+([^:]+):/;
  for (const line of lines) {
    const match = line.match(userRegex);
    if (match && match[1]) {
      userSet.add(match[1].trim());
    }
  }
  return Array.from(userSet).sort((a, b) => a.localeCompare(b));
}


function splitLinks(links: string[]): { youtube: string[]; twitter: string[]; misc: string[] } {
  const youtubeLinks: string[] = [];
  const twitterLinks: string[] = [];
  const miscLinks: string[] = [];

  for (const link of links) {
    if (link.includes("youtube.com") || link.includes("youtu.be")) {
      youtubeLinks.push(link);
    } else if (link.includes("twitter.com")) {
      twitterLinks.push(link);
    } else {
      miscLinks.push(link);
    }
  }
  youtubeLinks.sort((a, b) => a.localeCompare(b));
  twitterLinks.sort((a, b) => a.localeCompare(b));
  miscLinks.sort((a, b) => a.localeCompare(b));

  return { youtube: youtubeLinks, twitter: twitterLinks, misc: miscLinks };
}


function extractAdminMessages(text: string): string[] {
  const lines = text.split("\n");
  const adminKeywords = ["admin", "owner", "moderator", "mod"];
  const adminMessages: string[] = [];
  const userRegex = /^\[\d{2}:\d{2}\]\s+([^:]+):/;

  for (const line of lines) {
    const match = line.match(userRegex);
    if (match && match[1]) {
      const sender = match[1].trim().toLowerCase();
      for (const keyword of adminKeywords) {
        if (sender.includes(keyword)) {
          adminMessages.push(line);
          break;
        }
      }
    }
  }
  return adminMessages;
}


function extractMediaMessages(text: string): string[] {
  const lines = text.split("\n");
  const mediaRegex = /<Media:\s*[^>]+>/;
  const mediaMessages = lines.filter(line => mediaRegex.test(line));
  return mediaMessages;
}


function extractPinnedMessages(text: string): string[] {
  const lines = text.split("\n");
  return lines.filter(line => line.toLowerCase().includes("pinned"));
}


function extractStarredMessages(text: string): string[] {
  const lines = text.split("\n");
  return lines.filter(line => line.toLowerCase().includes("starred"));
}


function extractKeyInformation(text: string): string {
  const users = extractUsers(text);
  const emails = extractEmails(text).sort((a, b) => a.localeCompare(b));
  const links = extractLinks(text);
  const { youtube, twitter, misc } = splitLinks(links);
  const meetings = extractMeetings(text).sort((a, b) => a.localeCompare(b));


  const adminMessages = extractAdminMessages(text);
  const mediaMessages = extractMediaMessages(text);
  const pinnedMessages = extractPinnedMessages(text);
  const starredMessages = extractStarredMessages(text);

  let summary = "Extracted Key Information:\n";

  summary += "\n--- Users in Conversation  ---\n";
  summary += users.length > 0 ? users.join("\n") : "None found.";

  summary += "\n\n--- Emails Found  ---\n";
  summary += emails.length > 0 ? emails.join("\n") : "None found.";

  summary += "\n\n--- YouTube Links ---\n";
  summary += youtube.length > 0 ? youtube.join("\n") : "None found.";

  summary += "\n\n--- Twitter Links  ---\n";
  summary += twitter.length > 0 ? twitter.join("\n") : "None found.";

  summary += "\n\n--- Miscellaneous Links ---\n";
  summary += misc.length > 0 ? misc.join("\n") : "None found.";

  summary += "\n\n--- Meetings Found ---\n";
  summary += meetings.length > 0 ? meetings.join("\n") : "None found.";


  summary += "\n\n--- Admin/Owner/Moderator Messages ---\n";
  summary += adminMessages.length > 0 ? adminMessages.join("\n") : "None found.";

  summary += "\n\n--- Media/Attachments Messages ---\n";
  summary += mediaMessages.length > 0 ? mediaMessages.join("\n") : "None found.";

  summary += "\n\n--- Pinned Messages ---\n";
  summary += pinnedMessages.length > 0 ? pinnedMessages.join("\n") : "None found.";

  summary += "\n\n--- Starred Messages ---\n";
  summary += starredMessages.length > 0 ? starredMessages.join("\n") : "None found.";

  return summary;
}

function processExportedConversations(): void {
  const files = fs.readdirSync(EXPORT_DIR).filter(file => file.endsWith(".txt"));
  console.log(`Found ${files.length} exported conversation file(s) in ${EXPORT_DIR}`);

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






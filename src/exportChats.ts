import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
import * as readline from "readline";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const API_ID = parseInt(process.env.API_ID || "0");
const API_HASH = process.env.API_HASH || "";
const SESSION_STRING = process.env.SESSION_STRING || "";
const EXPORT_DIR = process.env.EXPORT_DIR || "./hidden_exports";

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

const prompt = (question: string): Promise<string> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Computes a Date based on a user input.
 * Acceptable inputs:
 * - "all": returns Unix epoch (all messages)
 * - "week": returns the date 7 days ago
 * - "month": returns the date 30 days ago
 * - Any date string (e.g., "YYYY-MM-DD") for a custom date.
 */
function computeSinceDate(input: string): Date {
  const now = new Date();
  const lowerInput = input.toLowerCase();

  if (lowerInput === "all") {
    return new Date(0);
  } else if (lowerInput === "week") {
    const d = new Date();
    d.setDate(now.getDate() - 7);
    return d;
  } else if (lowerInput === "month") {
    const d = new Date();
    d.setDate(now.getDate() - 30);
    return d;
  } else {
    const d = new Date(input);
    if (isNaN(d.getTime())) {
      throw new Error("Invalid date format given.");
    }
    return d;
  }
}

async function exportFromFolder(client: TelegramClient): Promise<void> {
  console.log("\nFetching dialog filters...");
  const response = await client.invoke(new Api.messages.GetDialogFilters());

  if (!("filters" in response) || !Array.isArray(response.filters)) {
    console.error("Unexpected response from GetDialogFilters:", response);
    return;
  }

  const dialogFilters = response.filters.filter(
    (filter) => filter instanceof Api.DialogFilter
  );

  if (dialogFilters.length === 0) {
    console.log("No folders found.");
    return;
  }

  console.log("\nAvailable folders:");
  dialogFilters.forEach((filter, index) => {
    console.log(`${index + 1}. ${filter.title || "Unnamed folder"}`);
  });

  const folderIndex = parseInt(
    await prompt("\nEnter the number of the folder you want to view: ")
  );
  if (isNaN(folderIndex) || folderIndex < 1 || folderIndex > dialogFilters.length) {
    console.error("Invalid folder selection.");
    return;
  }

  const selectedFilter = dialogFilters[folderIndex - 1];
  console.log(`\nSelected Folder: ${selectedFilter.title || "Unnamed folder"}`);

  if (!selectedFilter.includePeers || selectedFilter.includePeers.length === 0) {
    console.log("No peers defined in this folder.");
    return;
  }

  console.log("\nFetching dialogs...");
  const dialogs = await client.getDialogs();

  const folderGroups = dialogs.filter((dialog) => {
    const entity = dialog.entity;
    if (!entity) return false;

    return selectedFilter.includePeers.some((peer) => {
      if (peer instanceof Api.InputPeerChat) {
        return (
          entity.className === "Chat" &&
          String(entity.id) === peer.chatId.toString()
        );
      }
      if (peer instanceof Api.InputPeerChannel) {
        return (
          entity.className === "Channel" &&
          String(entity.id) === peer.channelId.toString() &&
          entity.accessHash?.toString() === peer.accessHash?.toString()
        );
      }
      if (peer instanceof Api.InputPeerUser) {
        return (
          entity.className === "User" &&
          String(entity.id) === peer.userId.toString()
        );
      }
      return false;
    });
  });

  if (folderGroups.length === 0) {
    console.log(`\nNo groups or channels found in folder "${selectedFilter.title}".`);
    return;
  }

  console.log(
    `\nFound ${folderGroups.length} groups or channels in folder "${selectedFilter.title}":`
  );
  folderGroups.forEach((group, index) => {
    console.log(`${index + 1}. Name: ${group.name || "Unnamed"} (ID: ${group.id})`);
  });

  const selection = await prompt(
    "\nEnter the number of the group to export OR type 'all' to export all groups: "
  );
  let groupsToExport = [];
  if (selection.toLowerCase() === "all") {
    groupsToExport = folderGroups;
  } else {
    const groupIndex = parseInt(selection);
    if (
      isNaN(groupIndex) ||
      groupIndex < 1 ||
      groupIndex > folderGroups.length
    ) {
      console.error("Invalid group selection.");
      return;
    }
    groupsToExport.push(folderGroups[groupIndex - 1]);
  }

  // Prompt for time range option.
  console.log("DEBUG: About to prompt for time range.");
  let timeRangeInput = "";
  const timeOption = await prompt(
    "\nSelect time range option:\n" +
    "  - Type 'all' for all messages\n" +
    "  - Type 'week' for messages from the last 7 days\n" +
    "  - Type 'month' for messages from the last 30 days\n" +
    "  - Type 'custom' to enter a custom date (YYYY-MM-DD)\nYour choice: "
  );
  if (timeOption.toLowerCase().trim() === "custom") {
    timeRangeInput = await prompt("Enter the custom date (YYYY-MM-DD): ");
  } else {
    timeRangeInput = timeOption;
  }
  console.log("DEBUG: Received time range input:", timeRangeInput);

  let sinceDate: Date;
  try {
    sinceDate = computeSinceDate(timeRangeInput);
    console.log("DEBUG: Computed sinceDate:", sinceDate.toISOString());
  } catch (error) {
    console.error("ERROR computing since date:", (error as Error).message);
    return;
  }

  // Export messages for each selected group.
  for (const group of groupsToExport) {
    const entity = group.entity;
    if (!entity) {
      console.warn(`Skipping group ${group.name} as it has no entity.`);
      continue;
    }

    const sanitizedGroupName = (group.name || "Unnamed")
      .replace(/\s/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");
    const exportPath = path.join(EXPORT_DIR, `export_${sanitizedGroupName}.txt`);

    const fileStream = fs.createWriteStream(exportPath, { flags: "w" });
    fileStream.write(`\n==== START GROUP ====\n`);
    fileStream.write(`Group Name: ${group.name || "Unnamed"}\n`);
    fileStream.write(`Group ID: ${group.id}\n`);
    fileStream.write(`Exporting messages since: ${sinceDate.toISOString()}\n`);

    try {
      const participants = await client.getParticipants(entity);
      const participantMap = new Map();
      participants.forEach((participant) => {
        participantMap.set(
          participant.id.toString(),
          participant.username || participant.firstName || "Unknown User"
        );
      });

      fileStream.write(`Participant Count: ${participants.length}\n`);
      fileStream.write(
        `Participants: ${participants
          .map((p) => p.username || p.firstName || "Unknown User")
          .join(", ")}\n`
      );
      fileStream.write(`==== MESSAGES ====\n`);

      let currentDateHeader = "";
      for await (const message of client.iterMessages(entity)) {
        const messageDate = new Date(message.date * 1000);
        if (messageDate < sinceDate) {
          console.log(
            "DEBUG: Breaking message loop. Message date",
            messageDate.toISOString(),
            "is before sinceDate",
            sinceDate.toISOString()
          );
          break;
        }
        const formattedDate = `${String(messageDate.getDate()).padStart(
          2,
          "0"
        )}/${String(messageDate.getMonth() + 1).padStart(2, "0")}/${messageDate.getFullYear()}`;
        const formattedTime = `${String(messageDate.getHours()).padStart(
          2,
          "0"
        )}:${String(messageDate.getMinutes()).padStart(2, "0")}`;

        if (formattedDate !== currentDateHeader) {
          currentDateHeader = formattedDate;
          fileStream.write(`\n----- ${formattedDate} -----\n`);
        }

        const senderName =
          participantMap.get(message.senderId?.toString() || "") ||
          "Unknown Sender";
        fileStream.write(
          `[${formattedTime}] ${senderName}: ${message.text || "<Media/Other Message>"}\n`
        );
      }

      console.log(`Exported messages from ${group.name} to ${exportPath}`);
    } catch (err) {
      fileStream.write(
        `Error fetching participants or messages: ${(err as Error).message}\n`
      );
    }

    fileStream.write(`==== END GROUP ====\n`);
    fileStream.end();
  }
}

(async () => {
  console.log("Shoveling coal");

  const client = new TelegramClient(
    new StringSession(SESSION_STRING),
    API_ID,
    API_HASH,
    { connectionRetries: 5 }
  );

  await client.start({
    phoneNumber: async () => await prompt("Enter phone number: "),
    password: async () => await prompt("Enter your 2FA password (if enabled): "),
    phoneCode: async () =>
      await prompt("Enter the code sent to your Telegram (check your phone or computer for the message): "),
    onError: (err) => console.error(err),
  });

  console.log("Hell, it's about time. Logged in");

  let continueExport = true;
  while (continueExport) {
    await exportFromFolder(client);
    const answer = await prompt(
      "\nDo you want to export from another folder? (type 'yes' to continue or 'close' to exit): "
    );
    if (
      answer.toLowerCase().trim() === "close" ||
      answer.toLowerCase().trim() === "no" ||
      answer.toLowerCase().trim() === "n"
    ) {
      continueExport = false;
    }
  }
  
  console.log("Disconnecting...");
  await client.disconnect();
})();


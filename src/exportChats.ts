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

// Ensure the export directory exists
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

async function fetchFolderAndGroups() {
  console.log("Initializing Telegram client...");

  const client = new TelegramClient(new StringSession(SESSION_STRING), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await prompt("Enter your phone number: "),
    password: async () => await prompt("Enter your 2FA password (if enabled): "),
    phoneCode: async () => await prompt("Enter the code sent to your Telegram: "),
    onError: (err) => console.error(err),
  });

  console.log("Logged in successfully!");

  try {
    console.log("Fetching dialog filters...");
    const response = await client.invoke(new Api.messages.GetDialogFilters());

    if (!("filters" in response) || !Array.isArray(response.filters)) {
      console.error("Unexpected response from GetDialogFilters:", response);
      return;
    }

    const dialogFilters = response.filters.filter((filter) => filter instanceof Api.DialogFilter);

    if (dialogFilters.length === 0) {
      console.log("No folders found.");
      return;
    }

    console.log("\nAvailable folders:");
    dialogFilters.forEach((filter, index) => {
      console.log(`${index + 1}. ${filter.title || "Unnamed folder"}`);
    });

    const folderIndex = parseInt(await prompt("\nEnter the number of the folder you want to view: "));
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

    console.log(`\nFound ${folderGroups.length} groups or channels in folder "${selectedFilter.title}":`);
    folderGroups.forEach((group, index) => {
      console.log(`${index + 1}. Name: ${group.name || "Unnamed"} (ID: ${group.id})`);
    });

    const exportMessages = (await prompt("\nExport messages from all groups? (yes/no): ")).toLowerCase();
    if (exportMessages === "yes") {
      for (const group of folderGroups) {
        const entity = group.entity;
        if (!entity) {
          console.warn(`Skipping group ${group.name} as it has no entity.`);
          continue;
        }

        const sanitizedGroupName = (group.name || "Unnamed").replace(/\s/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
        const exportPath = path.join(EXPORT_DIR, `export_${sanitizedGroupName}.txt`);

        const fileStream = fs.createWriteStream(exportPath, { flags: "w" });

        fileStream.write(`\n==== START GROUP ====\n`);
        fileStream.write(`Group Name: ${group.name || "Unnamed"}\n`);
        fileStream.write(`Group ID: ${group.id}\n`);

        try {
          const participants = await client.getParticipants(entity);
          const participantMap = new Map();
          participants.forEach((participant) => {
            participantMap.set(participant.id.toString(), participant.username || participant.firstName || "Unknown User");
          });

          fileStream.write(`Participant Count: ${participants.length}\n`);
          fileStream.write(`Participants: ${participants.map(p => p.username || p.firstName || "Unknown User").join(", ")}\n`);
          fileStream.write(`==== MESSAGES ====\n`);

          for await (const message of client.iterMessages(entity, { limit: 100 })) {
            const senderName = participantMap.get(message.senderId?.toString() || "") || "Unknown Sender";
            fileStream.write(`- ${senderName}: ${message.text || "<Media/Other Message>"}\n`);
          }

          console.log(`Exported messages from ${group.name} to ${exportPath}`);
        } catch (err) {
          fileStream.write(`Error fetching participants or messages: ${(err as Error).message}\n`);
        }

        fileStream.write(`==== END GROUP ====\n`);
        fileStream.end();
      }

      console.log("All messages exported to individual files.");
    }
  } catch (err) {
    console.error("Error fetching folder or dialogs:", (err as Error).message);
  } finally {
    console.log("\nDisconnecting...");
    await client.disconnect();
  }
}

(async () => {
  await fetchFolderAndGroups();
})();

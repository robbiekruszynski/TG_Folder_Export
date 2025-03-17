import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import * as readline from "readline";
import * as dotenv from "dotenv";
dotenv.config();

const API_ID = parseInt(process.env.API_ID || "0");
const API_HASH = process.env.API_HASH || "";

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

async function generateSessionString() {
  console.log("Generating a new session string...");
  const client = new TelegramClient(new StringSession(""), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await prompt("Enter your phone number: "),
    password: async () => await prompt("Enter your 2FA password (if enabled): "),
    phoneCode: async () => await prompt("Enter the code sent to your Telegram: "),
    onError: (err) => console.error(err),
  });

  console.log("Logged in successfully!");
  const sessionString = client.session.save();
  console.log("Your session string:");
  console.log(sessionString);

  await client.disconnect();

  console.log("Save this session string in your .env file as SESSION_STRING.");
}

generateSessionString();

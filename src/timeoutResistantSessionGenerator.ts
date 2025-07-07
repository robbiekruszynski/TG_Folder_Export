import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config();

const API_ID = parseInt(process.env.API_ID || "0");
const API_HASH = process.env.API_HASH || "";

if (!API_ID || !API_HASH) {
  console.error("❌ Please set API_ID and API_HASH in your .env file");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateSessionString() {
  console.log("🔐 Timeout-Resistant Session String Generator");
  console.log("=============================================");

  try {
    // Get phone number
    const phoneNumber = await question("📱 Enter your phone number (with country code, e.g., +34...): ");
    
    if (!phoneNumber) {
      console.error("❌ Phone number is required");
      return;
    }

    console.log("\n🔄 Creating client with timeout-resistant settings...");
    
    // Create client with timeout-resistant settings
    const client = new TelegramClient(
      new StringSession(""), 
      API_ID, 
      API_HASH, 
      {
        connectionRetries: 10,
        timeout: 60000, // 60 seconds
        useWSS: false,
        retryDelay: 1000,
        maxConcurrentDownloads: 1,
        deviceModel: "Desktop",
        systemVersion: "Windows 10",
        appVersion: "1.0.0",
        langCode: "en",
      }
    );

    console.log("🔄 Starting client...");
    
    try {
      await client.start({
        phoneNumber: async () => phoneNumber,
        password: async () => {
          const password = await question("🔒 Enter your 2FA password (if enabled): ");
          return password || "";
        },
        phoneCode: async () => {
          const code = await question("📱 Enter the code sent to your phone: ");
          return code || "";
        },
        onError: (err: any) => {
          console.error("❌ Client error:", err);
        },
      });

      console.log("✅ Client started successfully!");
      
      // Get session string
      const sessionString = client.session.save() as unknown as string;
      
      console.log("\n🎉 Session string generated successfully!");
      console.log("📋 Your session string:");
      console.log("=".repeat(50));
      console.log(sessionString);
      console.log("=".repeat(50));
      
      // Save to .env file
      const envPath = ".env";
      let envContent = "";
      
      try {
        envContent = require("fs").readFileSync(envPath, "utf8");
      } catch (error) {
        // File doesn't exist, create it
      }
      
      // Update or add SESSION_STRING
      if (envContent.includes("SESSION_STRING=")) {
        envContent = envContent.replace(
          /SESSION_STRING=.*/,
          `SESSION_STRING=${sessionString}`
        );
      } else {
        envContent += `\nSESSION_STRING=${sessionString}\n`;
      }
      
      require("fs").writeFileSync(envPath, envContent);
      console.log("💾 Session string saved to .env file");
      
      console.log("\n✅ Setup complete! You can now run:");
      console.log("   npm run robust");
      
    } finally {
      await client.disconnect();
      console.log("🔌 Client disconnected");
    }
    
  } catch (error) {
    console.error("❌ Error generating session string:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("PHONE_NUMBER_BANNED")) {
        console.log("\n💡 Try these solutions:");
        console.log("1. Wait 24 hours before trying again");
        console.log("2. Use a different phone number");
        console.log("3. Contact Telegram support");
      } else if (error.message.includes("TIMEOUT")) {
        console.log("\n💡 Timeout detected. Try:");
        console.log("1. Check your internet connection");
        console.log("2. Try again in a few minutes");
        console.log("3. Use a VPN if needed");
      }
    }
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n👋 Goodbye!");
  process.exit(0);
});

generateSessionString(); 
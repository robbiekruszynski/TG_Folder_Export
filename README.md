# Telegram Folder Search Bot

A powerful Telegram bot that allows you to search through your Telegram folders and conversations with enhanced features like direct message links, calendar event extraction, and action item detection.

## 🚀 Features

- **📁 Folder Browsing** - Browse and select your Telegram folders
- **💬 Individual Conversation Selection** - Select specific chats/groups with visual indicators
- **🔍 Keyword Search** - Search for specific terms across multiple conversations
- **🔗 Direct Message Links** - Click to go back to original messages
- **📅 Calendar Event Extraction** - Automatically find meeting times and dates
- **✅ Action Item Detection** - Identify tasks and deadlines
- **⏰ Time Range Selection** - Search last 7 days, 30 days, 3 months, or all time
- **🛡️ Robust Error Handling** - Handles timeouts and connection issues gracefully

## 📋 Prerequisites

- Node.js (v16 or higher)
- Telegram API credentials (API_ID and API_HASH)
- Bot token from @BotFather

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd TG_Folder_Export
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   API_ID=your_api_id
   API_HASH=your_api_hash
   BOT_TOKEN=your_bot_token
   SESSION_STRING=your_session_string
   ```

## 🔧 Setup

### 1. Get Telegram API Credentials

1. Go to https://my.telegram.org/
2. Log in with your phone number
3. Go to "API Development Tools"
4. Create a new application
5. Copy the `API_ID` and `API_HASH`

### 2. Create a Bot

1. Message @BotFather on Telegram
2. Use `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token

### 3. Generate Session String

Run the session generator:
```bash
npm run session
```

Follow the prompts to:
- Enter your phone number (with country code, e.g., +34...)
- Enter the verification code sent to your phone
- Enter your 2FA password (if enabled)

The session string will be automatically saved to your `.env` file.

## 🚀 Usage

### Start the Bot

```bash
npm start
```

### Bot Commands

- `/start` - Welcome message and main menu
- `/help` - Show detailed help information

### User Flow

1. **Start the bot** → Click "📁 Browse Folders"
2. **Select a folder** → Click folder number
3. **Select conversations** → Click to select (✅ shows selected)
4. **Choose time range** → 7 days, 30 days, 3 months, or all time
5. **Type search term** → Just type in chat (e.g., "meeting", "deadline")
6. **Get results** → With direct links to original messages

### Search Features

- **📅 Meeting** - Find meeting-related messages
- **⏰ Deadline** - Find deadlines and due dates
- **📞 Call** - Find call-related messages
- **📋 Task** - Find task assignments
- **💰 Payment** - Find payment information
- **🎯 Project** - Find project-related messages
- **📝 Custom** - Type your own search term

## 📁 Project Structure

```
TG_Folder_Export/
├── src/
│   ├── robustEnhancedBot.ts          # Main bot with all features
│   └── timeoutResistantSessionGenerator.ts  # Session string generator
├── package.json                      # Project configuration
├── tsconfig.json                     # TypeScript configuration
├── README.md                         # This file
└── .env                              # Environment variables (create this)
```

## 🔧 Available Scripts

- `npm start` - Start the enhanced bot
- `npm run session` - Generate session string
- `npm run build` - Build TypeScript files

## 🛡️ Error Handling

The bot includes robust error handling for:
- **Connection timeouts** - Automatic retry with shorter timeouts
- **Message editing errors** - Falls back to sending new messages
- **Session issues** - Clear error messages and recovery instructions
- **Search failures** - Graceful degradation with helpful suggestions

## 📱 Bot Features

### Interactive Selection
- **Visual indicators** - ✅ for selected, ⬜ for unselected
- **Multiple selection** - Select multiple conversations at once
- **Conversation types** - 👤 Users, 👥 Groups, 📢 Channels

### Smart Search
- **Keyword matching** - Case-insensitive search
- **Time filtering** - Search within specified time ranges
- **Result limiting** - Show top results to prevent overload

### Enhanced Results
- **Direct links** - Click to go back to original messages
- **Calendar events** - Extract dates and times automatically
- **Action items** - Find tasks and deadlines
- **Conversation context** - Know which chat each result is from

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Troubleshooting

### Common Issues

1. **"No session string found"**
   - Run `npm run session` to generate a session string

2. **"Phone number banned"**
   - Wait 24 hours before trying again
   - Use a different phone number
   - Contact Telegram support

3. **"Timeout errors"**
   - Check your internet connection
   - Try again in a few minutes
   - Use a VPN if needed

4. **"Message can't be edited"**
   - The bot automatically handles this by sending new messages
   - No action needed from your side

### Getting Help

If you encounter issues:
1. Check the error messages in the console
2. Verify your `.env` file has all required variables
3. Ensure your bot token is correct
4. Make sure your session string is valid

## 🎯 Future Enhancements

- [ ] Calendar integration (add events directly to calendar)
- [ ] Export results to various formats (PDF, CSV)
- [ ] Advanced search filters (by sender, date range)
- [ ] AI-powered summarization of search results
- [ ] Web interface for easier management


# Telegram Folder Exporter

A TypeScript-based tool using GramJS to export Telegram chats from a specific folder.

---

## Features

- **Selective Export**: Export all chats from a specific Telegram folder.
- **Structured Output**: Messages are saved in `.txt` files, with separate files for each conversation.

---

## Prerequisites

1. **Node.js**: Install Node.js if not already available on your system. [Download Node.js](https://nodejs.org/)
2. **Telegram API Credentials**: Obtain your API ID and API Hash from Telegram:
   - Visit [my.telegram.org](https://my.telegram.org).
   - Log in with your Telegram account.
   - Navigate to **API Development Tools**.
   - Create a new application (name it anything you like).
   - Save the **API ID** and **API Hash** securely.

---

## Setup Guide

### 1. Clone the Repository
Clone the repository to your local machine:
```
git clone https://github.com/robbiekruszynski/TG-FOLDER-EXPORT.git
cd tg_folder_pull
```

2. Install Dependencies
Install the required packages:

```
npm install
```
```
npm i dotenv
```

3. Configure Environment Variables
Create a .env file in the project's root directory:

```
touch .env
```
Add the following keys to your .env file:

```
API_ID=your_api_id_here
API_HASH=your_api_hash_here
SESSION_STRING=your_session_string_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
EXPORT_DIR=./hidden_exports
SUMMARY_DIR=./hidden_summary
```

Replace ```your_api_id_here``` and ```your_api_hash_here``` with the credentials obtained from my.telegram.org. You will generate the ```SESSION_STRING``` in the next step.

4. Generate Session String
Authenticate and generate the session string:


```npx ts-node generateSessionString.ts```

Follow the on-screen prompts to log in. Once complete, add the session string to your .env file.

5. Run the Export Script
To export chats:

```
npx ts-node src/exportChats.ts
```

6. Generate Summaries
To generate a summary of the conversations:

```
npx ts-node src/summarizeChats.ts
```

Follow the on-screen instructions to select a folder and export chats.


#### Notes
Keep Credentials Secure: Never share your .env file or credentials publicly.
Contributions Welcome: Feel free to submit issues or pull requests to improve the project.
Happy exporting! 🚀

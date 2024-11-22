# Telegram Folder Exporter

This tool lets you export all your Telegram chats from a specific folder using TypeScript and GramJS, or at least that is what it's supposed to do. 

## Features

Selective Export: Choose a specific Telegram folder and export all its chats.

Structured Output: Messages are saved in .txt files, and the conversations within the folder are separated.

## Prerequisites

Node.js: Our script runs on Node.js. 

Telegram API Credentials: To chat with Telegram's servers, you'll need an API ID and API Hash.

1. Visit my.telegram.org.
2. Log in with your Telegram account.
3. Navigate to "API Development Tools."
4. Create a new application. Name it something fun!
5. Voilà! You'll see your API ID and API Hash. Keep them secret, keep them safe.

## Setup Guide

Follow these steps to get everything up and running:

1. Clone the Repository: Open your terminal and run:

```
git clone https://github.com/robbiekruszynski/TG-FOLER-EXPORT.git
```


```
cd tg_folder_pull
```

### Install Dependencies: Let's get those packages:

```
npm install
```

```
npm i dotenv
```

Configure Environment Variables: We like to keep things tidy with a .env file. Create one in the project's root directory:
```touch .env```

Go to https://my.telegram.org/ and log in to acquire 

Inside .env, add:

```
API_ID=your_api_id_here
API_HASH=your_api_hash_here
SESSION_STRING=your_session_string_here
```

Replace 
```your_api_id_here``` 
and 
```your_api_hash_here``` 
with the credentials you got earlier. 
```SESSION_STRING```
we'll generate that next.

Generate Session String: Time to authenticate. Run:

```
npx ts-node generateSessionString.ts
```

Follow the prompts to log in. Once done, you'll get a session string. Pop that into your .env file where it says SESSION_STRING.

Run the Export Script: You're all set! Execute:

```
npx ts-node src/exportChats.ts
```
then for a summary of the conversations 
```
npx ts-node src/summarizeChats.ts
```
Follow the on-screen instructions to select the folder and export your chats.

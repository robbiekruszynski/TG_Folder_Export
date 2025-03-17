// import fs from 'fs';
// import path from 'path';
// import OpenAI from 'openai';
// import 'dotenv/config';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY || '',
// });

// (async () => {
//   try {
//     const response = await openai.chat.completions.create({
//       model: 'gpt-3.5-turbo',
//       messages: [{ role: 'user', content: 'Hello, OpenAI!' }],
//     });
//     console.log('API Key Test Successful. Response:', response.choices[0].message?.content);
//   } catch (error) {
//     console.error('API Key Test Failed. Error:', error);
//   }
// })();

// async function summarizeText(text: string): Promise<string> {
//   try {
//     const response = await openai.chat.completions.create({
//       model: 'gpt-3.5-turbo',
//       messages: [{ role: 'user', content: `Summarize the following conversation:\n\n${text}` }],
//     });

//     return response.choices[0]?.message?.content?.trim() || 'No summary generated';
//   } catch (error) {
//     console.error('Error generating summary:', error);
//     return 'Error generating summary';
//   }
// }

// async function processConversations() {
//   const folderPath = path.resolve('path_to_exported_conversations'); 
//   const summaryFolder = path.resolve('summaries');
//   fs.mkdirSync(summaryFolder, { recursive: true });

//   const files = fs.readdirSync(folderPath);

//   for (const file of files) {
//     if (file.endsWith('.txt')) {
//       const filePath = path.join(folderPath, file);
//       const content = fs.readFileSync(filePath, 'utf-8');
//       console.log(`Summarizing file: ${file}`);

//       const summary = await summarizeText(content);

//       const summaryPath = path.join(summaryFolder, `summary_${file}`);
//       fs.writeFileSync(summaryPath, summary, 'utf-8');
//       console.log(`Summary saved to: ${summaryPath}`);
//     }
//   }
// }

// processConversations()
//   .then(() => console.log('Summarization complete!'))
//   .catch((err) => console.error('Error processing conversations:', err));

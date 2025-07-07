import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
import { Bot, InlineKeyboard } from "grammy";
import * as dotenv from "dotenv";

dotenv.config();

const API_ID = parseInt(process.env.API_ID || "0");
const API_HASH = process.env.API_HASH || "";
const SESSION_STRING = process.env.SESSION_STRING || "";
const BOT_TOKEN = process.env.BOT_TOKEN || "";

// Initialize the bot
const bot = new Bot(BOT_TOKEN);

// Store user sessions
const userSessions = new Map<number, {
  currentFolder?: any;
  selectedGroups?: any[];
  selectedConversations?: any[];
  searchQuery?: string;
  timeRange?: string;
  searchResults?: any[];
  lastMessageId?: number;
}>();

// Helper function to create client
async function createClient() {
  const client = new TelegramClient(
    new StringSession(SESSION_STRING), 
    API_ID, 
    API_HASH, 
    {
      connectionRetries: 1,
      timeout: 20000,
      useWSS: false,
      retryDelay: 1000,
    }
  );

  await client.start({
    phoneNumber: async () => "",
    password: async () => "",
    phoneCode: async () => "",
    onError: (err: any) => console.error("Client error:", err),
  });

  return client;
}

// Helper function to format date
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to extract calendar events
function extractCalendarInfo(message: string): {
  hasDate: boolean;
  hasTime: boolean;
  dateInfo: string;
  actionItems: string[];
} {
  const lowerMsg = message.toLowerCase();
  const datePatterns = [
    /\b(today|tomorrow|next week|next month)\b/gi,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi,
    /\b\d{1,2}-\d{1,2}-\d{2,4}\b/gi,
  ];

  const timePatterns = [
    /\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi,
    /\b(at|by)\s+\d{1,2}:\d{2}\b/gi,
  ];

  const actionPatterns = [
    /\b(meeting|call|call|discussion|review|presentation|deadline|due|reminder)\b/gi,
    /\b(schedule|book|arrange|set up|plan)\b/gi,
  ];

  let hasDate = false;
  let hasTime = false;
  let dateInfo = "";
  const actionItems: string[] = [];

  // Check for dates
  for (const pattern of datePatterns) {
    const matches = message.match(pattern);
    if (matches) {
      hasDate = true;
      dateInfo = matches.join(", ");
      break;
    }
  }

  // Check for times
  for (const pattern of timePatterns) {
    const matches = message.match(pattern);
    if (matches) {
      hasTime = true;
      if (!dateInfo) dateInfo = matches.join(", ");
      else dateInfo += " " + matches.join(", ");
    }
  }

  // Check for action items
  for (const pattern of actionPatterns) {
    const matches = message.match(pattern);
    if (matches) {
      actionItems.push(...matches);
    }
  }

  return { hasDate, hasTime, dateInfo, actionItems };
}

// Helper function to create message link
function createMessageLink(chatId: number, messageId: number): string {
  // For public channels/groups, we can create a direct link
  // For private chats, we'll use a different approach
  if (chatId < 0) {
    // Channel or group
    return `https://t.me/c/${Math.abs(chatId)}/${messageId}`;
  } else {
    // Private chat - we'll use a different format
    return `tg://msg?to=${chatId}&id=${messageId}`;
  }
}

// Safe message editing function
async function safeEditMessage(ctx: any, text: string, keyboard?: any) {
  try {
    // Try to edit the message
    await ctx.editMessageText(text, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
  } catch (error) {
    // If editing fails, send a new message
    console.log("Message editing failed, sending new message");
    const newMessage = await ctx.reply(text, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    
    // Store the new message ID
    const userId = ctx.from?.id;
    if (userId) {
      const userSession = userSessions.get(userId);
      if (userSession) {
        userSessions.set(userId, {
          ...userSession,
          lastMessageId: newMessage.message_id
        });
      }
    }
  }
}

// Bot commands
bot.command("start", async (ctx) => {
  const welcomeMessage = `
🤖 **Welcome to Robust Search Bot!**

I help you search through your Telegram conversations and find specific information with direct links back to the original messages.

**How to use:**
1. Click "📁 Browse Folders" to see your folders
2. Select a folder to view its conversations
3. Choose individual conversations (multiple selection supported)
4. Type your search term
5. Get results with direct links to original messages

Let's get started! 🚀
  `;
  
  const keyboard = new InlineKeyboard()
    .text("📁 Browse Folders", "show_folders")
    .text("🔍 Quick Search", "quick_search")
    .text("ℹ️ Help", "show_help");
  
  await ctx.reply(welcomeMessage, { reply_markup: keyboard });
});

bot.command("help", async (ctx) => {
  const helpMessage = `
📚 **Robust Search Bot Help**

**Main Features:**
• 📁 **Browse Folders** - View and select your Telegram folders
• 💬 **Individual Conversations** - Select specific chats/groups
• 🔍 **Keyword Search** - Search for specific terms
• 🔗 **Direct Links** - Click to go back to original messages
• 📅 **Calendar Events** - Extract meeting times and dates
• 📝 **Action Items** - Find tasks and deadlines

**Selection Process:**
1. Choose a folder
2. Select conversations (✅ shows selected)
3. Type your search term
4. Get results with links

**Time Ranges:**
• Last 7 days
• Last 30 days  
• Last 3 months
• All time

Start by clicking "📁 Browse Folders"!
  `;
  
  const keyboard = new InlineKeyboard()
    .text("📁 Browse Folders", "show_folders")
    .text("🔍 Quick Search", "quick_search")
    .text("🏠 Back to Start", "start");
  
  await ctx.reply(helpMessage, { reply_markup: keyboard });
});

// Callback handlers
bot.callbackQuery("start", async (ctx) => {
  await ctx.answerCallbackQuery();
  const welcomeMessage = `
🤖 **Welcome to Robust Search Bot!**

I help you search through your Telegram conversations and find specific information with direct links back to the original messages.

**How to use:**
1. Click "📁 Browse Folders" to see your folders
2. Select a folder to view its conversations
3. Choose individual conversations (multiple selection supported)
4. Type your search term
5. Get results with direct links to original messages

Let's get started! 🚀
  `;
  
  const keyboard = new InlineKeyboard()
    .text("📁 Browse Folders", "show_folders")
    .text("🔍 Quick Search", "quick_search")
    .text("ℹ️ Help", "show_help");
  
  await safeEditMessage(ctx, welcomeMessage, keyboard);
});

bot.callbackQuery("show_help", async (ctx) => {
  await ctx.answerCallbackQuery();
  const helpMessage = `
📚 **Robust Search Bot Help**

**Main Features:**
• 📁 **Browse Folders** - View and select your Telegram folders
• 💬 **Individual Conversations** - Select specific chats/groups
• 🔍 **Keyword Search** - Search for specific terms
• 🔗 **Direct Links** - Click to go back to original messages
• 📅 **Calendar Events** - Extract meeting times and dates
• 📝 **Action Items** - Find tasks and deadlines

**Selection Process:**
1. Choose a folder
2. Select conversations (✅ shows selected)
3. Type your search term
4. Get results with links

**Time Ranges:**
• Last 7 days
• Last 30 days  
• Last 3 months
• All time

Start by clicking "📁 Browse Folders"!
  `;
  
  const keyboard = new InlineKeyboard()
    .text("📁 Browse Folders", "show_folders")
    .text("🔍 Quick Search", "quick_search")
    .text("🏠 Back to Start", "start");
  
  await safeEditMessage(ctx, helpMessage, keyboard);
});

bot.callbackQuery("show_folders", async (ctx) => {
  try {
    await ctx.answerCallbackQuery("📁 Loading folders...");
    
    if (!SESSION_STRING) {
      await safeEditMessage(ctx, "❌ Session not configured. Please contact the bot administrator.");
      return;
    }

    const client = await createClient();
    
    try {
      const response = await client.invoke(new Api.messages.GetDialogFilters());
      const dialogFilters = response.filters.filter(
        (filter) => filter instanceof Api.DialogFilter
      );

      if (dialogFilters.length === 0) {
        await safeEditMessage(ctx, "📁 No folders found in your Telegram account.");
        return;
      }

      let folderList = "📁 **Your Telegram Folders:**\n\n";
      const keyboard = new InlineKeyboard();
      
      dialogFilters.forEach((filter, index) => {
        const folderName = filter.title || `Folder ${index + 1}`;
        folderList += `${index + 1}. ${folderName}\n`;
        
        // Add button for each folder (max 8 per row)
        if (index % 2 === 0) {
          keyboard.row();
        }
        keyboard.text(`${index + 1}. ${folderName}`, `select_folder_${index}`);
      });

      folderList += "\n**Click a folder to view its conversations:**";
      
      keyboard.row().text("🏠 Back to Start", "start");
      
      await safeEditMessage(ctx, folderList, keyboard);
      
    } finally {
      await client.disconnect();
    }
    
  } catch (error) {
    console.error("Error fetching folders:", error);
    await safeEditMessage(ctx, `❌ Error loading folders: ${(error as Error).message}`);
  }
});

// Handle folder selection
bot.callbackQuery(/select_folder_(\d+)/, async (ctx) => {
  try {
    const folderIndex = parseInt(ctx.match[1]);
    await ctx.answerCallbackQuery("🔍 Loading conversations...");
    
    const client = await createClient();
    
    try {
      // Get folders
      const response = await client.invoke(new Api.messages.GetDialogFilters());
      const dialogFilters = response.filters.filter(
        (filter) => filter instanceof Api.DialogFilter
      );

      if (folderIndex >= dialogFilters.length) {
        await safeEditMessage(ctx, "❌ Invalid folder selection.");
        return;
      }

      const selectedFilter = dialogFilters[folderIndex];
      const folderName = selectedFilter.title || `Folder ${folderIndex + 1}`;
      
      // Store selected folder
      const userId = ctx.from?.id;
      if (userId) {
        userSessions.set(userId, {
          ...userSessions.get(userId),
          currentFolder: selectedFilter,
          selectedConversations: []
        });
      }

      // Get dialogs and filter by folder
      const dialogs = await client.getDialogs();
      const folderConversations = dialogs.filter((dialog) => {
        const entity = dialog.entity;
        if (!entity) return false;

        return selectedFilter.includePeers?.some((peer: any) => {
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

      if (folderConversations.length === 0) {
        await safeEditMessage(ctx, `❌ No conversations found in "${folderName}".`);
        return;
      }

      let conversationList = `💬 **Conversations in "${folderName}":**\n\n`;
      const keyboard = new InlineKeyboard();
      
      folderConversations.forEach((conversation, index) => {
        const conversationName = conversation.name || `Conversation ${index + 1}`;
        const conversationType = conversation.entity?.className || "Unknown";
        const typeIcon = conversationType === "User" ? "👤" : 
                        conversationType === "Chat" ? "👥" : 
                        conversationType === "Channel" ? "📢" : "💬";
        
        conversationList += `${index + 1}. ${typeIcon} ${conversationName}\n`;
        
        // Add button for each conversation (max 2 per row)
        if (index % 2 === 0) {
          keyboard.row();
        }
        keyboard.text(`${index + 1}. ${typeIcon} ${conversationName}`, `select_conversation_${index}`);
      });

      conversationList += "\n**Click conversations to select them (multiple selection supported):**";
      
      keyboard.row()
        .text("🔍 Search Selected", "search_selected_conversations")
        .text("📁 Back to Folders", "show_folders");
      
      await safeEditMessage(ctx, conversationList, keyboard);
      
    } finally {
      await client.disconnect();
    }
    
  } catch (error) {
    console.error("Error fetching conversations:", error);
    await safeEditMessage(ctx, `❌ Error loading conversations: ${(error as Error).message}`);
  }
});

// Handle conversation selection
bot.callbackQuery(/select_conversation_(\d+)/, async (ctx) => {
  try {
    const conversationIndex = parseInt(ctx.match[1]);
    await ctx.answerCallbackQuery("✅ Conversation selected");
    
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const userSession = userSessions.get(userId);
    if (!userSession?.currentFolder) {
      await safeEditMessage(ctx, "❌ No folder selected. Please start over.");
      return;
    }

    const client = await createClient();
    
    try {
      // Get conversations in the current folder
      const response = await client.invoke(new Api.messages.GetDialogFilters());
      const dialogFilters = response.filters.filter(
        (filter) => filter instanceof Api.DialogFilter
      );

      const selectedFilter = userSession.currentFolder;
      const dialogs = await client.getDialogs();
      const folderConversations = dialogs.filter((dialog) => {
        const entity = dialog.entity;
        if (!entity) return false;

        return selectedFilter.includePeers?.some((peer: any) => {
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

      if (conversationIndex >= folderConversations.length) {
        await safeEditMessage(ctx, "❌ Invalid conversation selection.");
        return;
      }

      const selectedConversation = folderConversations[conversationIndex];
      const selectedConversations = userSession.selectedConversations || [];
      
      // Toggle selection
      const existingIndex = selectedConversations.findIndex(c => c.id === selectedConversation.id);
      if (existingIndex >= 0) {
        selectedConversations.splice(existingIndex, 1);
      } else {
        selectedConversations.push(selectedConversation);
      }

      userSessions.set(userId, {
        ...userSession,
        selectedConversations
      });

      const folderName = selectedFilter.title || "Unknown Folder";
      let conversationList = `💬 **Conversations in "${folderName}":**\n\n`;
      const keyboard = new InlineKeyboard();
      
      folderConversations.forEach((conversation, index) => {
        const conversationName = conversation.name || `Conversation ${index + 1}`;
        const conversationType = conversation.entity?.className || "Unknown";
        const typeIcon = conversationType === "User" ? "👤" : 
                        conversationType === "Chat" ? "👥" : 
                        conversationType === "Channel" ? "📢" : "💬";
        const isSelected = selectedConversations.some(c => c.id === conversation.id);
        const status = isSelected ? "✅" : "⬜";
        conversationList += `${status} ${index + 1}. ${typeIcon} ${conversationName}\n`;
        
        if (index % 2 === 0) {
          keyboard.row();
        }
        keyboard.text(`${isSelected ? "✅" : "⬜"} ${index + 1}. ${typeIcon} ${conversationName}`, `select_conversation_${index}`);
      });

      conversationList += `\n**Selected: ${selectedConversations.length} conversations**`;
      
      keyboard.row()
        .text("🔍 Search Selected", "search_selected_conversations")
        .text("📁 Back to Folders", "show_folders");
      
      await safeEditMessage(ctx, conversationList, keyboard);
      
    } finally {
      await client.disconnect();
    }
    
  } catch (error) {
    console.error("Error selecting conversation:", error);
    await safeEditMessage(ctx, `❌ Error: ${(error as Error).message}`);
  }
});

// Handle search selected conversations
bot.callbackQuery("search_selected_conversations", async (ctx) => {
  try {
    await ctx.answerCallbackQuery("🔍 Preparing search...");
    
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const userSession = userSessions.get(userId);
    if (!userSession?.selectedConversations || userSession.selectedConversations.length === 0) {
      await safeEditMessage(ctx, "❌ No conversations selected. Please select at least one conversation first.");
      return;
    }

    const timeRangeMessage = `
⏰ **Select Time Range:**

How far back should I search for information?

• Last 7 days - Recent conversations
• Last 30 days - Past month
• Last 3 months - Quarter overview
• All time - Complete history
    `;
    
    const keyboard = new InlineKeyboard()
      .row()
        .text("7 days", "time_7days")
        .text("30 days", "time_30days")
      .row()
        .text("3 months", "time_3months")
        .text("All time", "time_all")
      .row()
        .text("📁 Back to Conversations", "show_folders");
    
    await safeEditMessage(ctx, timeRangeMessage, keyboard);
    
  } catch (error) {
    console.error("Error preparing search:", error);
    await safeEditMessage(ctx, `❌ Error: ${(error as Error).message}`);
  }
});

// Handle time range selection
bot.callbackQuery(/time_(.+)/, async (ctx) => {
  try {
    const timeRange = ctx.match[1];
    await ctx.answerCallbackQuery("🔍 Setting time range...");
    
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const userSession = userSessions.get(userId);
    if (!userSession) return;

    userSessions.set(userId, {
      ...userSession,
      timeRange
    });

    const searchMessage = `
🔍 **Search Configuration:**

**Selected Conversations:** ${userSession.selectedConversations?.length || 0}
**Time Range:** ${timeRange === '7days' ? 'Last 7 days' : 
                timeRange === '30days' ? 'Last 30 days' :
                timeRange === '3months' ? 'Last 3 months' : 'All time'}

**Type your search term below:**

Examples:
• meeting
• deadline
• call
• payment
• project name
• specific date

**Just type your search term in the chat:**
    `;
    
    const keyboard = new InlineKeyboard()
      .row()
        .text("📁 Back to Conversations", "show_folders");
    
    await safeEditMessage(ctx, searchMessage, keyboard);
    
  } catch (error) {
    console.error("Error setting time range:", error);
    await safeEditMessage(ctx, `❌ Error: ${(error as Error).message}`);
  }
});

// Handle text messages for search
bot.on("message", async (ctx) => {
  const message = ctx.message?.text;
  if (!message || message.startsWith('/')) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const userSession = userSessions.get(userId);
  if (!userSession?.selectedConversations || userSession.selectedConversations.length === 0) {
    await ctx.reply("❌ No conversations selected. Please use /start to begin.");
    return;
  }

  await performSearch(ctx, message);
});

// Perform the actual search
async function performSearch(ctx: any, searchTerm: string) {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const userSession = userSessions.get(userId);
    if (!userSession?.selectedConversations) return;

    // Send a new message instead of editing
    const statusMessage = await ctx.reply(`🔍 Searching for "${searchTerm}" in ${userSession.selectedConversations.length} conversations...`);

    const client = await createClient();
    
    try {
      let searchResults = `🔍 **Search Results for "${searchTerm}"**\n\n`;
      let totalMatches = 0;
      let calendarEvents: any[] = [];
      let actionItems: any[] = [];
      let messageLinks: any[] = [];

      // Calculate time range
      const now = new Date();
      let sinceDate: Date;
      
      switch (userSession.timeRange) {
        case '7days':
          sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          sinceDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          sinceDate = new Date(0); // All time
      }

      for (const conversation of userSession.selectedConversations) {
        try {
          const messages = await client.getMessages(conversation.entity, {
            limit: 50, // Reduced limit to prevent timeouts
            offsetDate: Math.floor(sinceDate.getTime() / 1000),
          });

          const matchingMessages = messages.filter(msg => 
            msg.message?.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (matchingMessages.length > 0) {
            const conversationType = conversation.entity?.className || "Unknown";
            const typeIcon = conversationType === "User" ? "👤" : 
                            conversationType === "Chat" ? "👥" : 
                            conversationType === "Channel" ? "📢" : "💬";
            
            searchResults += `📋 **${typeIcon} ${conversation.name || "Unnamed"}** (${matchingMessages.length} matches)\n`;
            
            for (const msg of matchingMessages.slice(0, 3)) { // Reduced to 3 results per conversation
              const date = msg.date ? formatDate(msg.date) : "Unknown date";
              const preview = msg.message?.substring(0, 80) || "No text";
              
              // Create message link
              const messageLink = createMessageLink(conversation.id, msg.id);
              messageLinks.push({
                conversation: conversation.name || "Unknown",
                date: date,
                preview: preview,
                link: messageLink,
                messageId: msg.id
              });
              
              // Extract calendar info
              const calendarInfo = extractCalendarInfo(msg.message || "");
              if (calendarInfo.hasDate || calendarInfo.hasTime) {
                calendarEvents.push({
                  conversation: conversation.name || "Unknown",
                  date: date,
                  info: calendarInfo.dateInfo,
                  message: msg.message || "",
                  timestamp: msg.date,
                  link: messageLink
                });
              }
              
              if (calendarInfo.actionItems.length > 0) {
                actionItems.push({
                  conversation: conversation.name || "Unknown",
                  date: date,
                  items: calendarInfo.actionItems,
                  message: msg.message || "",
                  link: messageLink
                });
              }
              
              searchResults += `• [${date}] ${preview}...\n`;
            }
            
            if (matchingMessages.length > 3) {
              searchResults += `... and ${matchingMessages.length - 3} more\n`;
            }
            searchResults += "\n";
            totalMatches += matchingMessages.length;
          }
          
        } catch (error) {
          console.error(`Error searching in ${conversation.name}:`, error);
        }
      }

      if (totalMatches === 0) {
        searchResults = `❌ **No results found for "${searchTerm}"**\n\nTry:\n• Different search terms\n• Broader time range\n• Different conversations`;
      } else {
        searchResults += `\n✅ **Found ${totalMatches} total matches**`;
        
        // Add calendar summary if found
        if (calendarEvents.length > 0) {
          searchResults += `\n\n📅 **Calendar Events Found:**\n`;
          calendarEvents.slice(0, 3).forEach((event, index) => {
            searchResults += `${index + 1}. ${event.date} - ${event.info}\n`;
            searchResults += `   From: ${event.conversation}\n`;
          });
        }
        
        // Add action items summary
        if (actionItems.length > 0) {
          searchResults += `\n✅ **Action Items Found:**\n`;
          actionItems.slice(0, 3).forEach((item, index) => {
            searchResults += `${index + 1}. ${item.items.join(", ")}\n`;
            searchResults += `   From: ${item.conversation} (${item.date})\n`;
          });
        }

        // Store search results for later access
        userSessions.set(userId, {
          ...userSession,
          searchResults: messageLinks
        });
      }

      const keyboard = new InlineKeyboard()
        .row()
          .text("🔗 View All Links", "view_all_links")
          .text("📅 Calendar Events", "view_calendar_events")
        .row()
          .text("✅ Action Items", "view_action_items")
          .text("🔍 New Search", "search_selected_conversations")
        .row()
          .text("📁 Start Over", "show_folders");

      // Delete the status message and send results
      try {
        await ctx.api.deleteMessage(ctx.chat.id, statusMessage.message_id);
      } catch (error) {
        console.log("Could not delete status message");
      }

      await ctx.reply(searchResults, { 
        reply_markup: keyboard,
        parse_mode: "Markdown"
      });
      
    } finally {
      await client.disconnect();
    }
    
  } catch (error) {
    console.error("Error performing search:", error);
    await ctx.reply(`❌ Search error: ${(error as Error).message}`);
  }
}

// Handle view all links
bot.callbackQuery("view_all_links", async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const userSession = userSessions.get(userId);
    if (!userSession?.searchResults) {
      await ctx.answerCallbackQuery("❌ No search results available");
      return;
    }

    let linksMessage = `🔗 **Direct Links to Messages:**\n\n`;
    
    userSession.searchResults.forEach((result, index) => {
      linksMessage += `${index + 1}. **${result.conversation}** (${result.date})\n`;
      linksMessage += `   ${result.preview}...\n`;
      linksMessage += `   [🔗 Open Message](${result.link})\n\n`;
    });

    const keyboard = new InlineKeyboard()
      .row()
        .text("📅 Calendar Events", "view_calendar_events")
        .text("✅ Action Items", "view_action_items")
      .row()
        .text("🔍 New Search", "search_selected_conversations")
        .text("📁 Start Over", "show_folders");

    await ctx.reply(linksMessage, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    
  } catch (error) {
    console.error("Error viewing links:", error);
    await ctx.reply(`❌ Error: ${(error as Error).message}`);
  }
});

// Handle view calendar events
bot.callbackQuery("view_calendar_events", async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const userSession = userSessions.get(userId);
    if (!userSession?.searchResults) {
      await ctx.answerCallbackQuery("❌ No search results available");
      return;
    }

    let calendarMessage = `📅 **Calendar Events Found:**\n\n`;
    
    // Filter for calendar events
    const calendarEvents = userSession.searchResults.filter(result => {
      const calendarInfo = extractCalendarInfo(result.preview);
      return calendarInfo.hasDate || calendarInfo.hasTime;
    });

    if (calendarEvents.length === 0) {
      calendarMessage += "No calendar events found in the search results.";
    } else {
      calendarEvents.forEach((event, index) => {
        const calendarInfo = extractCalendarInfo(event.preview);
        calendarMessage += `${index + 1}. **${event.conversation}** (${event.date})\n`;
        calendarMessage += `   📅 ${calendarInfo.dateInfo}\n`;
        calendarMessage += `   [🔗 Open Message](${event.link})\n\n`;
      });
    }

    const keyboard = new InlineKeyboard()
      .row()
        .text("🔗 All Links", "view_all_links")
        .text("✅ Action Items", "view_action_items")
      .row()
        .text("🔍 New Search", "search_selected_conversations")
        .text("📁 Start Over", "show_folders");

    await ctx.reply(calendarMessage, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    
  } catch (error) {
    console.error("Error viewing calendar events:", error);
    await ctx.reply(`❌ Error: ${(error as Error).message}`);
  }
});

// Handle view action items
bot.callbackQuery("view_action_items", async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const userSession = userSessions.get(userId);
    if (!userSession?.searchResults) {
      await ctx.answerCallbackQuery("❌ No search results available");
      return;
    }

    let actionMessage = `✅ **Action Items Found:**\n\n`;
    
    // Filter for action items
    const actionItems = userSession.searchResults.filter(result => {
      const calendarInfo = extractCalendarInfo(result.preview);
      return calendarInfo.actionItems.length > 0;
    });

    if (actionItems.length === 0) {
      actionMessage += "No action items found in the search results.";
    } else {
      actionItems.forEach((item, index) => {
        const calendarInfo = extractCalendarInfo(item.preview);
        actionMessage += `${index + 1}. **${item.conversation}** (${item.date})\n`;
        actionMessage += `   ✅ ${calendarInfo.actionItems.join(", ")}\n`;
        actionMessage += `   [🔗 Open Message](${item.link})\n\n`;
      });
    }

    const keyboard = new InlineKeyboard()
      .row()
        .text("🔗 All Links", "view_all_links")
        .text("📅 Calendar Events", "view_calendar_events")
      .row()
        .text("🔍 New Search", "search_selected_conversations")
        .text("📁 Start Over", "show_folders");

    await ctx.reply(actionMessage, { 
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    
  } catch (error) {
    console.error("Error viewing action items:", error);
    await ctx.reply(`❌ Error: ${(error as Error).message}`);
  }
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start the bot
async function startBot() {
  console.log("🤖 Starting Robust Enhanced Bot...");
  
  try {
    await bot.start();
    console.log("✅ Robust enhanced bot started successfully");
    
  } catch (error) {
    console.error("❌ Error starting bot:", error);
  }
}

// Handle graceful shutdown
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

startBot(); 
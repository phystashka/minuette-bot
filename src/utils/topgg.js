import fetch from 'node-fetch';

const TOPGG_TOKEN = process.env.TOPGG_TOKEN;
const BOT_ID = process.env.BOT_ID || process.env.CLIENT_ID || '1378492150169473135';

export const checkUserVoted = async (userId) => {
  if (!TOPGG_TOKEN) {
    console.warn('TOPGG_TOKEN not found in environment variables');
    return false;
  }

  try {
    console.log(`Testing bot ${BOT_ID} exists on Top.gg...`);
    const botUrl = `https://top.gg/api/bots/${BOT_ID}`;
    
    const botResponse = await fetch(botUrl, {
      headers: {
        'Authorization': TOPGG_TOKEN
      }
    });
    
    if (!botResponse.ok) {
      console.error(`Bot not found on Top.gg API: ${botResponse.status}`);
      const botError = await botResponse.text();
      console.error(`Bot API error: ${botError}`);
      
      console.log(`Check if bot exists at: https://top.gg/bot/${BOT_ID}`);
      return false;
    }
    
    const botData = await botResponse.json();
    console.log(`Bot found on Top.gg:`, botData.username || 'Unknown name');
    
    console.log(`Checking vote for user ${userId} with bot ${BOT_ID}`);
    const url = `https://top.gg/api/bots/${BOT_ID}/check?userId=${userId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': TOPGG_TOKEN
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`ℹ️  User ${userId} has not voted in the last 12 hours (this is normal)`);
        return false;
      }
      
      console.error(`Top.gg vote API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Vote API response: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ User ${userId} has voted! Response:`, data);
    return data.voted === 1;
  } catch (error) {
    console.error('Error checking Top.gg vote:', error);
    return false;
  }
};

export const getVoteUrl = () => {
  return `https://top.gg/bot/${BOT_ID}/vote`;
};

export const getBotStats = async () => {
  if (!TOPGG_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`https://top.gg/api/bots/${BOT_ID}`, {
      headers: {
        'Authorization': `Bearer ${TOPGG_TOKEN}`
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting bot stats from Top.gg:', error);
    return null;
  }
};

export const postBotStats = async (guildCount) => {
  if (!TOPGG_TOKEN) {
    return false;
  }

  try {
    const response = await fetch(`https://top.gg/api/bots/${BOT_ID}/stats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOPGG_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        server_count: guildCount
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error posting stats to Top.gg:', error);
    return false;
  }
};
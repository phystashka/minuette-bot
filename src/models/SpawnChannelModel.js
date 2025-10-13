
import { query, getRow } from '../utils/database.js';


const processingChannels = new Set();

export const createSpawnChannelsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS spawn_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      active BOOLEAN DEFAULT 1,
      current_messages INTEGER DEFAULT 0,
      target_messages INTEGER DEFAULT 30,
      last_spawn DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, channel_id)
    )
  `;
  await query(sql);
  await query('CREATE INDEX IF NOT EXISTS idx_spawn_channels_guild ON spawn_channels (guild_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_spawn_channels_active ON spawn_channels (active)');
};

function getRandomTargetMessages() {
  return Math.floor(Math.random() * (50 - 10 + 1)) + 10;
}

export async function setSpawnChannel(guildId, channelId) {
  const countResult = await getRow('SELECT COUNT(*) as count FROM spawn_channels WHERE guild_id = ? AND active = 1', [guildId]);
  if (countResult.count >= 5) {
    return { success: false, error: 'Maximum of 5 spawn channels allowed per server.' };
  }
  
  const existingChannel = await getRow('SELECT id FROM spawn_channels WHERE guild_id = ? AND channel_id = ? AND active = 1', [guildId, channelId]);
  if (existingChannel) {
    return { success: false, error: 'This channel is already set as a spawn channel.' };
  }
  
  const targetMessages = getRandomTargetMessages();
  const currentTime = new Date().toISOString();
  
  await query(`INSERT INTO spawn_channels (guild_id, channel_id, active, current_messages, target_messages, created_at, updated_at)
    VALUES (?, ?, 1, 0, ?, ?, ?)
    ON CONFLICT(guild_id, channel_id) DO UPDATE SET active = 1, current_messages = 0, target_messages = ?, updated_at = ?`,
    [guildId, channelId, targetMessages, currentTime, currentTime, targetMessages, currentTime]);
  
  console.log(`📺 Spawn channel set for guild ${guildId}, channel ${channelId}: target=${targetMessages} messages`);
  return { success: true, channelCount: countResult.count + 1 };
}

export async function removeSpawnChannel(guildId, channelId) {
  const result = await query('UPDATE spawn_channels SET active = 0, updated_at = ? WHERE guild_id = ? AND channel_id = ?', 
    [new Date().toISOString(), guildId, channelId]);
  return result.changes > 0;
}

export async function removeAllSpawnChannels(guildId) {
  const result = await query('UPDATE spawn_channels SET active = 0, updated_at = ? WHERE guild_id = ?', 
    [new Date().toISOString(), guildId]);
  return result.changes || 0;
}

export async function getSpawnChannels(guildId) {
  return await query('SELECT * FROM spawn_channels WHERE guild_id = ? AND active = 1', [guildId]);
}

export async function getAllActiveSpawnChannels() {
  return await query('SELECT * FROM spawn_channels WHERE active = 1');
}


export async function trackChannelMessage(guildId, messageChannelId, authorId, client) {

  const spawnChannels = await getSpawnChannels(guildId);
  if (!spawnChannels.length) return [];
  
  const readyChannels = [];
  const currentTime = new Date().toISOString();
  

  for (const spawnChannel of spawnChannels) {
    const currentCount = spawnChannel.current_messages || 0;
    const newCount = currentCount + 1;
    

    if (newCount >= spawnChannel.target_messages) {

      if (processingChannels.has(spawnChannel.channel_id)) {

        await query('UPDATE spawn_channels SET current_messages = ?, updated_at = ? WHERE id = ?',
          [newCount, currentTime, spawnChannel.id]);
        continue;
      }
      

      processingChannels.add(spawnChannel.channel_id);
      

      const newTarget = Math.floor(Math.random() * 41) + 10;
      await query('UPDATE spawn_channels SET current_messages = 0, target_messages = ?, updated_at = ? WHERE id = ?',
        [newTarget, currentTime, spawnChannel.id]);
      
      readyChannels.push({
        channel_id: spawnChannel.channel_id,
        guild_id: spawnChannel.guild_id,
        current_messages: newCount,
        target_messages: spawnChannel.target_messages
      });
      

      setTimeout(() => {
        processingChannels.delete(spawnChannel.channel_id);
      }, 2000);
    } else {

      await query('UPDATE spawn_channels SET current_messages = ?, updated_at = ? WHERE id = ?',
        [newCount, currentTime, spawnChannel.id]);
    }
  }
  

  const updatedChannels = await getSpawnChannels(guildId);
  await logMessageCount(guildId, updatedChannels, client);
  
  return readyChannels;
}


async function logMessageCount(guildId, spawnChannels, client) {
  try {
    const guild = client?.guilds.cache.get(guildId);
    const guildName = guild?.name || `Guild ${guildId}`;
    
    console.log(`--- Сервер: ${guildName} ---`);
    
    for (const spawnChannel of spawnChannels) {
      const channel = guild?.channels.cache.get(spawnChannel.channel_id);
      const channelName = channel?.name || `Channel ${spawnChannel.channel_id}`;
      const current = spawnChannel.current_messages || 0;
      const target = spawnChannel.target_messages || 30;
      
      console.log(`Канал: #${channelName} | ${current}/${target}`);
    }
    console.log('');
  } catch (error) {
    console.error('Error logging message count:', error.message);
  }
}

export async function resetChannelAfterSpawn(channelId) {
  const newTarget = getRandomTargetMessages();
  const currentTime = new Date().toISOString();
  
  await query('UPDATE spawn_channels SET current_messages = 0, target_messages = ?, last_spawn = ?, updated_at = ? WHERE channel_id = ?',
    [newTarget, currentTime, currentTime, channelId]);
  
  return newTarget;
}


export async function getSpawnStatus(guildId) {
  const spawnChannels = await getSpawnChannels(guildId);
  return spawnChannels.map(channel => ({
    channel_id: channel.channel_id,
    current_messages: channel.current_messages || 0,
    target_messages: channel.target_messages || 30,
    progress: Math.min(100, Math.round(((channel.current_messages || 0) / (channel.target_messages || 30)) * 100))
  }));
}
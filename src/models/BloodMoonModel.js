import { query, getRow, insert, update, sequelize } from '../utils/database.js';

export const createBloodMoonTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS blood_moon_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL UNIQUE,
      channel_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await query(sql);
  console.log('Blood Moon channels table created/verified successfully');
};


export const setBloodMoonChannel = async (guildId, channelId) => {
  try {
    const existing = await getRow('SELECT * FROM blood_moon_channels WHERE guild_id = ?', [guildId]);
    
    if (existing) {
      await update('blood_moon_channels', 
        { channel_id: channelId, updated_at: new Date().toISOString() }, 
        'guild_id = ?', 
        [guildId]
      );
    } else {
      await insert('blood_moon_channels', {
        guild_id: guildId,
        channel_id: channelId
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error setting blood moon channel:', error);
    return false;
  }
};


export const removeBloodMoonChannel = async (guildId) => {
  try {
    await query('DELETE FROM blood_moon_channels WHERE guild_id = ?', [guildId]);
    return true;
  } catch (error) {
    console.error('Error removing blood moon channel:', error);
    return false;
  }
};


export const getBloodMoonChannel = async (guildId) => {
  try {
    const result = await getRow('SELECT channel_id FROM blood_moon_channels WHERE guild_id = ?', [guildId]);
    return result?.channel_id || null;
  } catch (error) {
    console.error('Error getting blood moon channel:', error);
    return null;
  }
};


export const getAllBloodMoonChannels = async () => {
  try {
    const results = await query('SELECT guild_id, channel_id FROM blood_moon_channels');
    return results || [];
  } catch (error) {
    console.error('Error getting all blood moon channels:', error);
    return [];
  }
};


let isBloodMoonActive = false;
let bloodMoonEndTime = null;

export const setBloodMoonActive = (active, endTime = null) => {
  isBloodMoonActive = active;
  bloodMoonEndTime = endTime;
};

export const isBloodMoonCurrentlyActive = () => {
  if (!isBloodMoonActive) return false;
  if (bloodMoonEndTime && Date.now() > bloodMoonEndTime) {
    isBloodMoonActive = false;
    bloodMoonEndTime = null;
    return false;
  }
  return true;
};

export const getBloodMoonTimeLeft = () => {
  if (!isBloodMoonCurrentlyActive()) return 0;
  return Math.max(0, bloodMoonEndTime - Date.now());
};
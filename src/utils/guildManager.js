
import { saveGuild, getGuild, removeGuild } from '../models/GuildModel.js';
import { TIME_CONSTANTS } from './constants.js';

const guildCache = new Map();

const CACHE_TTL = TIME_CONSTANTS.HOUR;

export const saveGuildInfo = async (guild) => {
  try {
    if (!guild || !guild.id) return null;
    
    const guildData = {
      guild_id: guild.id,
      name: guild.name,
      icon_url: guild.iconURL() || null,
      owner_id: guild.ownerId,
      member_count: guild.memberCount,
      premium_tier: guild.premiumTier
    };
    
    await saveGuild(guildData);

    guildCache.set(guild.id, {
      data: guildData,
      timestamp: Date.now()
    });
    
    return guildData;
  } catch (error) {
    console.error(`Error saving guild ${guild.id}:`, error.message);
    return null;
  }
};

export const getGuildInfo = async (guildId) => {
  try {
    const cached = guildCache.get(guildId);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    
    const guildData = await getGuild(guildId);
    
    if (guildData) {
      guildCache.set(guildId, {
        data: guildData,
        timestamp: Date.now()
      });
    }
    
    return guildData;
  } catch (error) {
    console.error(`Error getting guild ${guildId}:`, error.message);
    return null;
  }
};

export const deleteGuildInfo = async (guildId) => {
  try {
    await removeGuild(guildId);
    
    guildCache.delete(guildId);
    
    return true;
  } catch (error) {
    console.error(`Error deleting guild ${guildId}:`, error.message);
    return false;
  }
};

export const cleanupGuildCache = () => {
  const now = Date.now();
  
  for (const [guildId, entry] of guildCache.entries()) {
    if ((now - entry.timestamp) > CACHE_TTL) {
      guildCache.delete(guildId);
    }
  }
};

setInterval(cleanupGuildCache, TIME_CONSTANTS.MINUTE * 30); 
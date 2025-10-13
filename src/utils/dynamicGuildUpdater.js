import { saveGuild } from '../models/GuildModel.js';
import { createEmbed } from './components.js';


const DYNAMIC_UPDATE_GUILD_IDS = [
  '1369338076178026596',
  '1369338263332196446'
];


const UPDATE_INTERVAL = 5;


const updateIntervals = new Map();


export const initializeDynamicUpdates = async (client) => {
  try {

    
    for (const guildId of DYNAMIC_UPDATE_GUILD_IDS) {
      const guild = await client.guilds.fetch(guildId).catch(err => {
        console.error(`Failed to fetch guild ${guildId}:`, err.message);
        return null;
      });
      
      if (guild) {

        await updateGuildInfo(guild);
        

        if (!updateIntervals.has(guild.id)) {
          const intervalId = setInterval(() => {
            updateGuildInfo(guild).catch(err => {
              console.error(`Error updating guild ${guild.id}:`, err.message);
            });
          }, UPDATE_INTERVAL * 60 * 1000);
          
          updateIntervals.set(guild.id, intervalId);
        }
      }
    }
    

  } catch (error) {
    console.error('Error initializing dynamic guild updates:', error);
  }
};


export const updateGuildInfo = async (guild) => {
  try {

    const freshGuild = await guild.fetch();
    

    const iconURL = freshGuild.iconURL({ dynamic: true, size: 1024 });
    

    await freshGuild.members.fetch();
    const memberCount = freshGuild.memberCount;
    

    const guildData = {
      guild_id: freshGuild.id,
      name: freshGuild.name,
      icon_url: iconURL,
      owner_id: freshGuild.ownerId,
      member_count: memberCount,
      premium_tier: freshGuild.premiumTier
    };
    

    await saveGuild(guildData);
    

    return true;
  } catch (error) {
    console.error(`Error updating guild info for ${guild.id}:`, error);
    return false;
  }
};


export const stopDynamicUpdates = (guildId = null) => {
  if (guildId) {

    if (updateIntervals.has(guildId)) {
      clearInterval(updateIntervals.get(guildId));
      updateIntervals.delete(guildId);

    }
  } else {

    for (const [id, interval] of updateIntervals.entries()) {
      clearInterval(interval);

    }
    updateIntervals.clear();
  }
};


export const forceGuildUpdate = async (client, guildId) => {
  try {
    if (!DYNAMIC_UPDATE_GUILD_IDS.includes(guildId)) {
      return {
        success: false,
        message: 'This guild is not configured for dynamic updates'
      };
    }
    
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    
    if (!guild) {
      return {
        success: false,
        message: 'Guild not found or bot does not have access'
      };
    }
    
    await updateGuildInfo(guild);
    
    return {
      success: true,
      message: `Successfully updated information for ${guild.name}`
    };
  } catch (error) {
    console.error('Error in force guild update:', error);
    return {
      success: false,
      message: `Error updating guild: ${error.message}`
    };
  }
};

export default {
  initializeDynamicUpdates,
  updateGuildInfo,
  stopDynamicUpdates,
  forceGuildUpdate
}; 

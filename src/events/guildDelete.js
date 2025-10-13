/**
 * Handexport const execute = async (guild) => {
  try {
    console.log(`📤 [GUILD DELETE] Starting for guild: ${guild.name || 'Unknown'} (${guild.id})`);
    console.log(`📤 [GUILD DELETE] Guild details: ${guild.memberCount || 'Unknown'} members, owner: ${guild.ownerId || 'Unknown'}`);
    

    try {
      await deleteGuildInfo(guild.id);
      console.log(`✅ [GUILD DELETE] Guild info deleted for ${guild.name || guild.id}`);
    } catch (dbError) {
      console.error(`❌ [GUILD DELETE] Failed to delete guild info for ${guild.id}:`, dbError);
    }
    

    try {
      console.log(`📄 [GUILD DELETE] Sending guild leave log for ${guild.name || guild.id}`);
      const embedData = createGuildLeaveEmbed(guild);
      const success = await sendGuildLog(guild.client, embedData, 'GUILD_DELETE');l from server event
 * Removes server information from database
 * Cleans up all settings and data related to the server
 * Sends log to specified channel
 */
import { deleteGuildInfo } from '../utils/guildManager.js';
import { sendGuildLog, createGuildLeaveEmbed } from '../utils/guildLogger.js';

export const name = 'guildDelete';
export const once = false;

export const execute = async (guild) => {
  try {
    console.log(`📤 [GUILD DELETE] Starting for guild: ${guild.name || 'Unknown'} (${guild.id})`);
    console.log(`📤 [GUILD DELETE] Guild details: ${guild.memberCount || 'Unknown'} members, owner: ${guild.ownerId || 'Unknown'}`);
    

    try {
      await deleteGuildInfo(guild.id);
      console.log(`✅ [GUILD DELETE] Guild info deleted for ${guild.name || guild.id}`);
    } catch (dbError) {
      console.error(`❌ [GUILD DELETE] Failed to delete guild info for ${guild.id}:`, dbError);
    }
    

    try {
      console.log(`[GUILD DELETE] Sending guild leave log for ${guild.name || guild.id}`);
      const embedData = createGuildLeaveEmbed(guild);
      const success = await sendGuildLog(guild.client, embedData, 'GUILD_DELETE');
      
      if (success) {
        console.log(`✅ [GUILD DELETE] Guild leave log sent successfully for ${guild.name || guild.id}`);
      } else {
        console.warn(`⚠️ [GUILD DELETE] Failed to send log, but logged to console for ${guild.name || guild.id}`);
      }
    } catch (logError) {
      console.error(`❌ [GUILD DELETE] Unexpected error in logging for ${guild.name || guild.id}:`, logError);
    }
    
    console.log(`Removed from guild: ${guild.name} (${guild.id})`);
  } catch (error) {
    console.error(`Error handling guildDelete event for guild ${guild.id}:`, error.message);
  }
}; 
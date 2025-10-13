import { EmbedBuilder } from 'discord.js';
import { saveGuildInfo } from '../utils/guildManager.js';
import { sendGuildLog, createGuildJoinEmbed } from '../utils/guildLogger.js';
import { config } from '../config/config.js';

export const name = 'guildCreate';
export const once = false;

export const execute = async (guild) => {
  try {
    console.log(`📥 [GUILD CREATE] Starting for guild: ${guild.name} (${guild.id})`);
    console.log(`📥 [GUILD CREATE] Guild details: ${guild.memberCount} members, owner: ${guild.ownerId}`);
    

    try {
      await saveGuildInfo(guild);
      console.log(`✅ [GUILD CREATE] Guild info saved for ${guild.name}`);
    } catch (dbError) {
      console.error(`❌ [GUILD CREATE] Failed to save guild info for ${guild.name}:`, dbError);
    }
    

    try {
      const channel = guild.channels.cache.find(
        channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
      );
      
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('Welcome to Equestria!')
          .setDescription('*A magical portal opens before you*\n\nGreetings, everypony! Welcome to the magical world of Equestria! I\'m your guide through this enchanted land where friendship is magic and adventure awaits at every turn!\n\n✨ **Start your journey today!**')
          .addFields(
            { name: 'Begin Adventure', value: 'Use `/equestria` to enter the magical world and start your pony journey!' },
            { name: 'Game Features', value: 'Economy system, pony collection, battles, farming, and much more!' },
            { name: 'Need Help?', value: 'Use `/help` to see all available commands and features.' }
          )
          .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        console.log(`✅ [GUILD CREATE] Welcome message sent to ${guild.name}`);
      } else {
        console.log(`⚠️ [GUILD CREATE] No suitable channel found for welcome message in ${guild.name}`);
      }
    } catch (welcomeError) {
      console.error(`❌ [GUILD CREATE] Failed to send welcome message to ${guild.name}:`, welcomeError);
    }
    

    try {
      console.log(`📄 [GUILD CREATE] Sending guild join log for ${guild.name}`);
      const embedData = createGuildJoinEmbed(guild);
      const success = await sendGuildLog(guild.client, embedData, 'GUILD_CREATE');
      
      if (success) {
        console.log(`✅ [GUILD CREATE] Guild join log sent successfully for ${guild.name}`);
      } else {
        console.warn(`⚠️ [GUILD CREATE] Failed to send log, but logged to console for ${guild.name}`);
      }
    } catch (logError) {
      console.error(`❌ [GUILD CREATE] Unexpected error in logging for ${guild.name}:`, logError);
    }
    

  } catch (error) {
    console.error(`Error handling guildCreate event for guild ${guild.id}:`, error.message);
  }
}; 
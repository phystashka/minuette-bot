
import { EmbedBuilder } from 'discord.js';

const LOG_CHANNEL_ID = '1385317336101421196';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;


export async function sendGuildLog(client, embedData, logType = 'GUILD') {
  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {

      

      let logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
      
      if (!logChannel) {

        logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      }
      
      if (!logChannel) {
        throw new Error(`Log channel ${LOG_CHANNEL_ID} not found`);
      }
      

      const permissions = logChannel.permissionsFor(client.user);
      if (!permissions || !permissions.has('SendMessages')) {
        throw new Error(`No permission to send messages in log channel`);
      }
      

      const embed = new EmbedBuilder(embedData);
      await logChannel.send({ embeds: [embed] });
      

      return true;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ [${logType}] Attempt ${attempt} failed:`, error.message);
      
      if (attempt < MAX_RETRIES) {

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  console.error(`💥 [${logType}] All attempts failed. Last error:`, lastError);
  

  console.log(`🔔 [${logType}] FALLBACK LOG:`, {
    title: embedData.title,
    description: embedData.description,
    timestamp: new Date().toISOString()
  });
  
  return false;
}

export function createGuildJoinEmbed(guild) {
  const totalGuilds = guild.client.guilds.cache.size;
  
  return {
    color: 0x57F287,
    title: '🔔 Bot added to new server',
    description: `**Server:** ${guild.name} (ID: ${guild.id})\n**Total servers:** ${totalGuilds}`,
    fields: [
      { name: 'Owner', value: `<@${guild.ownerId}> (ID: ${guild.ownerId})`, inline: true },
      { name: 'Members', value: `${guild.memberCount}`, inline: true },
      { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
    ],
    thumbnail: { url: guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png' },
    timestamp: new Date().toISOString()
  };
}

export function createGuildLeaveEmbed(guild) {
  const totalGuilds = guild.client.guilds.cache.size;
  
  return {
    color: 0xED4245,
    title: '❌ Bot removed from server',
    description: `**Server:** ${guild.name || 'Unknown'} (ID: ${guild.id})\n**Remaining servers:** ${totalGuilds}`,
    fields: [
      { name: 'Owner', value: guild.ownerId ? `<@${guild.ownerId}> (ID: ${guild.ownerId})` : 'Unknown', inline: true },
      { name: 'Members', value: `${guild.memberCount || 'Unknown'}`, inline: true },
      { name: 'Joined', value: guild.joinedTimestamp ? `<t:${Math.floor(guild.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
    ],
    thumbnail: { url: guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png' },
    timestamp: new Date().toISOString()
  };
}

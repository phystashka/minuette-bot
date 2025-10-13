import { ActivityType } from 'discord.js';
import { saveGuildInfo } from '../utils/guildManager.js';
import { logStartup } from '../utils/logger.js';
import { startAutoSpawn } from '../utils/autoSpawn.js';
import { query } from '../utils/database.js';

export const name = 'ready';
export const once = true;


let isShowingMembers = true;


const updateBotStatus = (client) => {
  try {
    const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const totalServers = client.guilds.cache.size;

    if (isShowingMembers) {

      client.user.setPresence({
        status: 'online',
        activities: [{
          name: `brushing teeth for ${totalMembers.toLocaleString()} members`,
          type: ActivityType.Custom
        }]
      });
    } else {

      client.user.setPresence({
        status: 'online',
        activities: [{
          name: `over ${totalServers.toLocaleString()} servers`,
          type: ActivityType.Watching
        }]
      });
    }


    isShowingMembers = !isShowingMembers;
  } catch (error) {
    console.error('Error updating bot status:', error);
  }
};

export const execute = async (client) => {
  try {
    console.log(`👤 ${client.user.tag} | 🏠 ${client.guilds.cache.size} servers`);
    

    console.log(`🔧 Bot intents:`, client.options.intents.bitfield);
    console.log(`🔧 Has DirectMessages intent:`, client.options.intents.has('DirectMessages'));
    console.log(`🔧 Has MessageContent intent:`, client.options.intents.has('MessageContent'));
    

    try {
      const dmChannel = await client.channels.fetch('1423584192821985330');
      console.log(`📡 DM forward channel accessible: ${dmChannel ? dmChannel.name : 'null'}`);
    } catch (error) {
      console.error(`❌ Cannot access DM forward channel:`, error.message);
    }
    

    try {
      await query('DELETE FROM battle_sessions');
      console.log(`🗑️ Cleared active battle sessions on restart`);
    } catch (error) {
      console.error('Error clearing battle sessions:', error);
    }
    

    updateBotStatus(client);
    

    const { QuestBatchUpdater } = await import('../utils/questBatchUpdater.js');
    QuestBatchUpdater.setBotClient(client);
    

    setInterval(() => {
      updateBotStatus(client);
    }, 60000);
    

    startAutoSpawn(client);
    

    const promises = client.guilds.cache.map(guild => saveGuildInfo(guild));
    await Promise.all(promises);
    await logStartup(client);
  } catch (error) {
    console.error('Error in ready event:', error);
  }
}; 
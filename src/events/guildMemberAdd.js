import { updateGuildInfo } from '../utils/dynamicGuildUpdater.js';

export const name = 'guildMemberAdd';
export const once = false;

export const execute = async (member) => {
  try {
    

    const dynamicUpdateGuildIds = [
      '1369338076178026596',
      '1369338263332196446'
    ];
    
    if (dynamicUpdateGuildIds.includes(member.guild.id)) {
      await updateGuildInfo(member.guild);
    }
    
  } catch (error) {
    console.error(`Error handling guildMemberAdd event:`, error.message);
  }
}; 
import cron from 'node-cron';
import { createEmbed } from './components.js';
import { 
  setBloodMoonActive, 
  getAllBloodMoonChannels, 
  isBloodMoonCurrentlyActive 
} from '../models/BloodMoonModel.js';

const BLOOD_MOON_DURATION = 15 * 60 * 1000;


let discordClient = null;

export const initializeBloodMoonScheduler = (client) => {
  discordClient = client;
  


  cron.schedule('0 0,3,6,9,12,15,18,21 * * *', async () => {
    await startBloodMoonEvent();
  }, {
    timezone: "UTC"
  });
  

};

const startBloodMoonEvent = async () => {
  if (!discordClient) {
    console.error('Discord client not initialized for Blood Moon events');
    return;
  }
  

  

  const endTime = Date.now() + BLOOD_MOON_DURATION;
  setBloodMoonActive(true, endTime);
  

  await sendBloodMoonNotifications(true);
  

  setTimeout(async () => {
    await endBloodMoonEvent();
  }, BLOOD_MOON_DURATION);
};

const endBloodMoonEvent = async () => {

  

  setBloodMoonActive(false);
  

  await sendBloodMoonNotifications(false);
};

const sendBloodMoonNotifications = async (isStarting) => {
  try {
    const channels = await getAllBloodMoonChannels();
    
    for (const channelData of channels) {
      try {
        const channel = await discordClient.channels.fetch(channelData.channel_id);
        if (!channel) continue;
        
        const embed = createEmbed({
          title: isStarting ? '🩸 Blood Moon Rises!' : '🌙 Blood Moon Fades',
          description: isStarting 
            ? `*The night grows crimson as the Blood Moon rises...*\n\n🩸 **Blood Moon Event Active!**\n⏰ Duration: 15 minutes\n🎯 Special blood variants of ponies may appear!\n🔴 All encounters will have a crimson aura\n\n*Seek the shadows, brave the darkness...*`
            : `*The crimson light fades as the moon returns to normal...*\n\n🌙 **Blood Moon Event Ended**\n✨ The night returns to peace\n🎭 Normal pony encounters resume\n\n*Until the blood moon rises again...*`,
          color: isStarting ? 0x8B0000 : 0x4B0082
        });
        
        await channel.send({ embeds: [embed] });
        
      } catch (error) {
        console.error(`Failed to send Blood Moon notification to channel ${channelData.channel_id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error sending Blood Moon notifications:', error);
  }
};


export const triggerBloodMoonEvent = async () => {
  if (isBloodMoonCurrentlyActive()) {
    return { success: false, message: 'Blood Moon is already active!' };
  }
  
  await startBloodMoonEvent();
  return { success: true, message: 'Blood Moon event triggered manually!' };
};

export const getBloodMoonStatus = () => {
  return {
    active: isBloodMoonCurrentlyActive(),
    timeLeft: isBloodMoonCurrentlyActive() ? Math.floor((Date.now() - Date.now()) / 1000) : 0
  };
};

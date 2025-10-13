import { createEmbed } from '../utils/components.js';
import { addVoiceTime } from '../models/UserStatsModel.js';
import chalk from 'chalk';

export const name = 'voiceStateUpdate';
export const once = false;

const voiceJoinTimes = new Map();
let botClient = null;

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${minutes}m`;
}



export const execute = async (oldState, newState) => {
  const client = oldState.client || newState.client;
  if (!botClient) botClient = client;

  const userId = oldState.member?.user?.id || newState.member?.user?.id;
  if (!userId) return;

  const user = oldState.member?.user || newState.member?.user;
  if (!user || user.bot) return;

  const oldChannel = oldState.channel;
  const newChannel = newState.channel;


  if (!oldChannel && newChannel) {
    voiceJoinTimes.set(userId, Date.now());
    console.log(chalk.cyan(`🎤 Voice Join: ${user.username} joined ${newChannel.name}`));
    return;
  }


  if (oldChannel && !newChannel) {
    const joinTime = voiceJoinTimes.get(userId);
    if (!joinTime) return;

    voiceJoinTimes.delete(userId);
    const timeSpent = Math.floor((Date.now() - joinTime) / 1000 / 60);
    

    await addVoiceTime(userId, timeSpent);
    

    const timeFormatted = formatTime(timeSpent);
    console.log(chalk.magenta(`🎤 Voice Leave: ${user.username} left ${oldChannel.name} after ${timeFormatted}`));


    try {

      const ClanQuestModel = (await import('../models/ClanQuestModel.js')).default;
      const { query } = await import('../utils/database.js');
      

      let clanId = null;
      

      const ownedClan = await query('SELECT id FROM clans WHERE owner_id = ?', [userId]);
      if (ownedClan.length > 0) {
        clanId = ownedClan[0].id;
      } else {

        const viceClan = await query('SELECT id FROM clans WHERE vice_owner_id = ?', [userId]);
        if (viceClan.length > 0) {
          clanId = viceClan[0].id;
        } else {

          const memberClan = await query('SELECT clan_id FROM clan_members WHERE user_id = ?', [userId]);
          if (memberClan.length > 0) {
            clanId = memberClan[0].clan_id;
          }
        }
      }
      
      if (clanId && timeSpent > 0) {

        const { addVoiceQuestProgress } = await import('../utils/questBatchUpdater.js');
        addVoiceQuestProgress(userId, clanId, timeSpent);
      }
    } catch (questError) {
      console.debug('Quest progress tracking error:', questError.message);
    }


    return;
  }


  if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    console.log(chalk.blue(`🔄 Voice Switch: ${user.username} moved from ${oldChannel.name} to ${newChannel.name}`));

    return;
  }
};

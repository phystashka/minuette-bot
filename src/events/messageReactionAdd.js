
import { EmbedBuilder } from 'discord.js';

export const name = 'messageReactionAdd';
export const once = false;

export const execute = async (reaction, user) => {
  try {

    if (user.bot) return;
    

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.debug('Failed to fetch partial reaction:', error);
        return;
      }
    }
    

    if (!reaction.message.guild) return;
    

    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    

    const mockInteraction = {
      user,
      member,
      guild: reaction.message.guild
    };
    

    try {

      const ClanQuestModel = (await import('../models/ClanQuestModel.js')).default;
      const { query } = await import('../utils/database.js');
      

      const userId = user.id;
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
      
      if (clanId) {

        const { addReactionQuestProgress } = await import('../utils/questBatchUpdater.js');
        addReactionQuestProgress(userId, clanId);
      }
    } catch (questError) {
      console.debug('Quest progress tracking error:', questError.message);
    }
    
  } catch (error) {
    console.error('Error in messageReactionAdd event handler:', error);
  }
};
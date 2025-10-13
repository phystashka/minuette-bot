
import { updateGuildInfo } from '../utils/dynamicGuildUpdater.js';

export const name = 'guildMemberRemove';
export const once = false;

export const execute = async (member) => {
  try {

    const TARGET_GUILD_ID = '1369338076178026596';
    if (member.guild.id === TARGET_GUILD_ID) {

      await handleClanRemovalOnLeave(member.user.id);
    }
    

    const dynamicUpdateGuildIds = [
      '1369338076178026596',
      '1369338263332196446'
    ];
    
    if (dynamicUpdateGuildIds.includes(member.guild.id)) {

      setTimeout(async () => {
        await updateGuildInfo(member.guild);
      }, 1000);
    }
  } catch (error) {
    console.error(`Error handling guildMemberRemove event:`, error.message);
  }
};


async function handleClanRemovalOnLeave(userId) {
  try {
    const { query } = await import('../utils/database.js');
    const { getClanById, updateMemberCount } = await import('../models/ClanModel.js');
    

    const memberClans = await query('SELECT * FROM clan_members WHERE user_id = ?', [userId]);
    
    for (const membership of memberClans) {
      const clan = await getClanById(membership.clan_id);
      if (clan) {

        await query('DELETE FROM clan_members WHERE user_id = ? AND clan_id = ?', [userId, membership.clan_id]);
        

        const remainingMembers = await query('SELECT COUNT(*) as count FROM clan_members WHERE clan_id = ?', [membership.clan_id]);
        const newCount = remainingMembers[0].count + 1;
        await updateMemberCount(membership.clan_id, newCount);
        
        console.log(`🏰 Removed user ${userId} from clan ${clan.name} due to server leave`);
      }
    }
    

    const ownedClans = await query('SELECT * FROM clans WHERE owner_id = ? OR vice_owner_id = ?', [userId, userId]);
    
    for (const clan of ownedClans) {
      if (clan.owner_id === userId) {

        if (clan.vice_owner_id) {
          await query('UPDATE clans SET owner_id = ?, vice_owner_id = NULL WHERE id = ?', [clan.vice_owner_id, clan.id]);
          console.log(`🏰 Transferred ownership of clan ${clan.name} to vice owner due to owner leaving server`);
        } else {

          await query('DELETE FROM clans WHERE id = ?', [clan.id]);
          await query('DELETE FROM clan_members WHERE clan_id = ?', [clan.id]);
          console.log(`🏰 Disbanded clan ${clan.name} due to owner leaving server with no vice owner`);
        }
      } else if (clan.vice_owner_id === userId) {

        await query('UPDATE clans SET vice_owner_id = NULL WHERE id = ?', [clan.id]);
        console.log(`🏰 Removed vice owner from clan ${clan.name} due to server leave`);
      }
    }
    
  } catch (error) {
    console.error('Error handling clan removal on server leave:', error);
  }
} 
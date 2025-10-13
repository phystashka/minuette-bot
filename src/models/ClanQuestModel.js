import { query } from '../utils/database.js';

export default class ClanQuestModel {

  static async getAllQuestTypes() {
    try {
      return await query('SELECT * FROM clan_quest_types ORDER BY experience_reward ASC');
    } catch (error) {
      console.error('Error getting quest types:', error);
      throw error;
    }
  }


  static async getUserActiveQuests(userId, clanId) {
    try {
      return await query(`
        SELECT uq.*, qt.name, qt.description, qt.type 
        FROM clan_user_quests uq 
        JOIN clan_quest_types qt ON uq.quest_type_id = qt.id 
        WHERE uq.user_id = ? AND uq.clan_id = ? AND uq.completed = FALSE AND uq.expires_at > datetime('now')
        ORDER BY uq.created_at ASC
      `, [userId, clanId]);
    } catch (error) {
      console.error('Error getting user active quests:', error);
      throw error;
    }
  }


  static async generateQuestsForUser(userId, clanId) {
    try {

      await query('DELETE FROM clan_user_quests WHERE user_id = ? AND clan_id = ? AND completed = FALSE', [userId, clanId]);
      

      const questTypes = await this.getAllQuestTypes();
      

      const shuffled = questTypes.sort(() => 0.5 - Math.random());
      const selectedQuests = shuffled.slice(0, 3);
      

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setUTCHours(24, 0, 0, 0);
      
      const results = [];
      for (const questType of selectedQuests) {
        const result = await query(`
          INSERT INTO clan_user_quests (user_id, clan_id, quest_type_id, target_value, experience_reward, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, clanId, questType.id, questType.target_value, questType.experience_reward, expiresAt.toISOString()]);
        
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error generating quests for user:', error);
      throw error;
    }
  }


  static async updateQuestProgress(userId, clanId, questType, progressIncrement, client = null) {
    try {

      const quests = await query(`
        SELECT uq.*, qt.name, qt.description FROM clan_user_quests uq 
        JOIN clan_quest_types qt ON uq.quest_type_id = qt.id 
        WHERE uq.user_id = ? AND uq.clan_id = ? AND qt.type = ? AND uq.completed = FALSE AND uq.expires_at > datetime('now')
      `, [userId, clanId, questType]);
      
      const completedQuests = [];
      
      for (const quest of quests) {
        const newProgress = quest.current_progress + progressIncrement;
        const isCompleted = newProgress >= quest.target_value;
        
        if (isCompleted) {

          await query(`
            UPDATE clan_user_quests 
            SET current_progress = ?, completed = TRUE, completed_at = datetime('now')
            WHERE id = ?
          `, [quest.target_value, quest.id]);
          

          await query('UPDATE clans SET experience = experience + ? WHERE id = ?', [quest.experience_reward, clanId]);
          

          if (client) {
            try {
              const user = await client.users.fetch(userId);
              const clanResult = await query('SELECT name FROM clans WHERE id = ?', [clanId]);
              const clanName = clanResult[0]?.name || 'Unknown Clan';
              
              const { sendDMWithDelete } = await import('../utils/components.js');
              await sendDMWithDelete(user, {
                embeds: [{
                  title: '🎯 Quest Completed!',
                  description: `You have completed the quest **${quest.name}**!\n\n` +
                              `**Description:** ${quest.description}\n` +
                              `**Clan:** ${clanName}\n` +
                              `**Experience Earned:** ${quest.experience_reward} EXP`,
                  color: 0x00FF00,
                  timestamp: new Date().toISOString()
                }]
              });
            } catch (dmError) {
              console.log(`Could not send DM to user ${userId}:`, dmError.message);
            }
          }
          
          completedQuests.push({
            ...quest,
            current_progress: quest.target_value,
            completed: true
          });
        } else {

          await query('UPDATE clan_user_quests SET current_progress = ? WHERE id = ?', [newProgress, quest.id]);
        }
      }
      
      return completedQuests;
    } catch (error) {
      console.error('Error updating quest progress:', error);
      throw error;
    }
  }


  static getClanLevel(experience) {
    if (experience < 1000) return 1;
    if (experience < 5000) return 2;
    if (experience < 10000) return 3;
    if (experience < 15000) return 4;
    

    const baseExp = 15000;
    const expPerLevel = 5000;
    const additionalLevels = Math.floor((experience - baseExp) / expPerLevel);
    const level = 4 + additionalLevels;
    
    return Math.min(level, 50);
  }


  static getRequiredExpForNextLevel(currentExp) {
    const currentLevel = this.getClanLevel(currentExp);
    
    if (currentLevel >= 50) return null;
    
    if (currentLevel === 1) return 1000;
    if (currentLevel === 2) return 5000;
    if (currentLevel === 3) return 10000;
    if (currentLevel === 4) return 15000;
    

    const nextLevel = currentLevel + 1;
    const baseExp = 15000;
    const expPerLevel = 5000;
    const requiredExp = baseExp + (nextLevel - 4) * expPerLevel;
    
    return requiredExp;
  }


  static async cleanupExpiredQuests() {
    try {
      await query('DELETE FROM clan_user_quests WHERE expires_at < datetime("now") AND completed = FALSE');
    } catch (error) {
      console.error('Error cleaning up expired quests:', error);
      throw error;
    }
  }


  static async resetDailyQuests() {
    try {

      await this.cleanupExpiredQuests();
      

      const activeMembers = await query(`
        SELECT DISTINCT cm.user_id, cm.clan_id 
        FROM clan_members cm 
        JOIN clans c ON cm.clan_id = c.id
        UNION
        SELECT DISTINCT c.owner_id as user_id, c.id as clan_id
        FROM clans c
        UNION
        SELECT DISTINCT c.vice_owner_id as user_id, c.id as clan_id
        FROM clans c
        WHERE c.vice_owner_id IS NOT NULL
      `);
      

      for (const member of activeMembers) {
        await this.generateQuestsForUser(member.user_id, member.clan_id);
      }
      
      console.log(`✅ Daily quests reset for ${activeMembers.length} clan members`);
    } catch (error) {
      console.error('Error resetting daily quests:', error);
      throw error;
    }
  }


  static async getUserQuestStats(userId, clanId) {
    try {
      const stats = await query(`
        SELECT 
          COUNT(*) as total_quests,
          SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END) as completed_quests,
          SUM(CASE WHEN completed = TRUE THEN experience_reward ELSE 0 END) as total_exp_earned
        FROM clan_user_quests 
        WHERE user_id = ? AND clan_id = ?
      `, [userId, clanId]);
      
      return stats[0] || { total_quests: 0, completed_quests: 0, total_exp_earned: 0 };
    } catch (error) {
      console.error('Error getting user quest stats:', error);
      throw error;
    }
  }
}

import { query, getRow } from './database.js';
import { addExperience, calculateLevelFromExperience } from './friendshipExperience.js';
import { EmbedBuilder } from 'discord.js';
import { getCutieMarkForPony } from './cutiemarksManager.js';
import { getPonyExperienceBonus } from '../commands/economy/rebirth.js';


const processingMessages = new Set();


export async function addFriendshipExperience(userId, channel) {
  try {

    const messageKey = `${userId}_${Date.now()}`;
    if (processingMessages.has(userId)) {
      return;
    }
    
    processingMessages.add(userId);
    

    const activePony = await getRow(
      `SELECT f.*, pf.name, pf.pony_type, pf.rarity, pf.image
       FROM friendship f 
       JOIN pony_friends pf ON f.friend_id = pf.id 
       WHERE f.user_id = ? AND f.is_profile_pony = 1`,
      [userId]
    );
    
    if (!activePony) {
      processingMessages.delete(userId);
      return;
    }
    

    const currentExperience = parseInt(activePony.experience) || 0;
    

    const experienceBonus = await getPonyExperienceBonus(userId);
    

    const experienceResult = addExperience(currentExperience, experienceBonus);
    

    console.log(`[FRIENDSHIP] User ${userId}: ${activePony.name} - Exp: ${currentExperience} → ${experienceResult.newTotalExp} (+${experienceBonus}), Level: ${experienceResult.oldLevel} → ${experienceResult.newLevel}`);
    

    await query(
      'UPDATE friendship SET experience = ?, friendship_level = ? WHERE id = ?',
      [experienceResult.newTotalExp, experienceResult.newLevel, activePony.id]
    );
    

    if (experienceResult.leveledUp) {
      await sendLevelUpNotification(channel, userId, activePony.name, experienceResult.newLevel, activePony.image, activePony.friend_id);
    }
    

    processingMessages.delete(userId);
    
  } catch (error) {
    console.error('Error adding friendship experience:', error);
    processingMessages.delete(userId);
  }
}


async function sendLevelUpNotification(channel, userId, ponyName, newLevel, ponyImage, friendId) {
  try {

    

    if (newLevel === 30) {
      const cutieMark = await getCutieMarkForPony(ponyName, newLevel, friendId);
      const cutieMarkDisplay = cutieMark ? `${cutieMark} ` : '';
      
      const cutiemMarkEmbed = new EmbedBuilder()
        .setDescription(`<@${userId}>, **${cutieMarkDisplay}${ponyName}** earned their **Cutie Mark**! 🎉✨`)
        .setColor(0xFFD700)
        .setThumbnail(ponyImage || null);
      
      await channel.send({ embeds: [cutiemMarkEmbed] });

      return;
    }
    

    const cutieMark = await getCutieMarkForPony(ponyName, newLevel, friendId);
    const cutieMarkDisplay = cutieMark ? `${cutieMark} ` : '';
    
    const levelUpEmbed = new EmbedBuilder()
      .setDescription(`<@${userId}>, **${cutieMarkDisplay}${ponyName}** reached friendship level **${newLevel}**!`)
      .setColor(0x7CC9F9)
      .setThumbnail(ponyImage || null);
    
    await channel.send({ embeds: [levelUpEmbed] });

    
  } catch (error) {
    console.error('Error sending level up notification:', error);
  }
}


export async function getFriendshipStats(userId, friendId) {
  try {
    const friendship = await getRow(
      'SELECT experience, friendship_level FROM friendship WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    if (!friendship) {
      return null;
    }
    
    const experience = parseInt(friendship.experience) || 0;
    const stats = calculateLevelFromExperience(experience);
    
    return {
      level: stats.level,
      currentExp: stats.currentExp,
      expToNext: stats.expToNext,
      progress: stats.progress,
      totalExp: experience
    };
  } catch (error) {
    console.error('Error getting friendship stats:', error);
    return null;
  }
}


export async function getAllUserFriendshipLevels(userId) {
  try {
    const friendships = await query(
      `SELECT f.friend_id, f.experience, f.friendship_level, f.is_favorite,
              pf.name, pf.pony_type, pf.rarity
       FROM friendship f 
       JOIN pony_friends pf ON f.friend_id = pf.id 
       WHERE f.user_id = ?
       ORDER BY f.friendship_level DESC, f.experience DESC`,
      [userId]
    );
    
    return friendships.map(friendship => {
      const experience = parseInt(friendship.experience) || 0;
      const stats = calculateLevelFromExperience(experience);
      
      return {
        ...friendship,
        stats: stats
      };
    });
  } catch (error) {
    console.error('Error getting user friendship levels:', error);
    return [];
  }
}

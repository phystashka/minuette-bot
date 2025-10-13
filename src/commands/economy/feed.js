import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { query, getRow } from '../../utils/database.js';
import { addExperience, calculateLevelFromExperience, getTotalExperienceForLevel, getRequiredExperience } from '../../utils/friendshipExperience.js';
import { getCutieMarkFromPonyObject } from '../../utils/cutiemarksManager.js';


const feedCooldowns = new Map();


const FOOD_TYPES = {
  apples: {
    name: 'Apple',
    emoji: '🍎',
    levels: 1,
    resource: 'apples'
  },
  eggs: {
    name: 'Egg',
    emoji: '🥚',
    levels: 2,
    resource: 'eggs'
  },
  milk: {
    name: 'Milk',
    emoji: '🥛',
    levels: 3,
    resource: 'milk'
  }
};


const CUTIE_MARK_LEVEL = 30;

export const data = new SlashCommandBuilder()
  .setName('feed')
  .setDescription('Feed your selected pony to increase its level')
  .setDMPermission(false)
  .addIntegerOption(option =>
    option
      .setName('pony_id')
      .setDescription('Pony ID from your collection (check /myponies for IDs)')
      .setRequired(true)
      .setMinValue(1)
  )
    .addStringOption(option =>
      option
        .setName('food')
        .setDescription('Type of food to feed')
        .setRequired(true)
        .addChoices(
          { name: '🍎 Apple (+1 level)', value: 'apples' },
          { name: '🥚 Egg (+2 levels)', value: 'eggs' },
          { name: '🥛 Milk (+3 levels)', value: 'milk' }
        )
    );

export async function execute(interaction) {
    const userId = interaction.user.id;
    const ponyId = interaction.options.getInteger('pony_id');
    const foodType = interaction.options.getString('food');
    
    await interaction.deferReply();

    try {

      const pony = await getRow(`
        SELECT f.*, pf.name, pf.pony_type, pf.rarity, pf.image
        FROM friendship f 
        JOIN pony_friends pf ON f.friend_id = pf.id 
        WHERE f.id = ? AND f.user_id = ?
      `, [ponyId, userId]);

      if (!pony) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: `Pony with ID **${ponyId}** not found in your collection!\n\nUse \`/myponies\` command to view your ponies and their IDs.`,
            color: 0xed4245
          })]
        });
      }


      const cooldownKey = `${userId}_${ponyId}`;
      const now = Date.now();
      const cooldownTime = 25 * 60 * 1000;
      
      if (feedCooldowns.has(cooldownKey)) {
        const lastFeedTime = feedCooldowns.get(cooldownKey);
        const timeLeft = lastFeedTime + cooldownTime - now;
        
        if (timeLeft > 0) {
          const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
          return interaction.editReply({
            embeds: [createEmbed({
              title: '⏰ Cooldown',
              description: `**${pony.name}** has eaten recently and is not hungry yet!\n\nYou can feed this pony again in **${minutesLeft} minutes**.`,
              color: 0xffa500
            })]
          });
        }
      }


      const userResources = await getRow(`
        SELECT ${FOOD_TYPES[foodType].resource}
        FROM resources 
        WHERE user_id = ?
      `, [userId]);

      if (!userResources || userResources[FOOD_TYPES[foodType].resource] < 1) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Insufficient Resources',
            description: `You don't have any **${FOOD_TYPES[foodType].name}** ${FOOD_TYPES[foodType].emoji} to feed!\nUse /farm to go grow your own products`,
            color: 0xed4245
          })]
        });
      }


      const currentLevel = parseInt(pony.friendship_level) || 1;
      

      if (currentLevel >= 100) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: '⚠️ Max Level Reached',
            description: `**${pony.name}** is already at maximum level (100) and cannot gain more levels!\n\nYour **${FOOD_TYPES[foodType].name}** ${FOOD_TYPES[foodType].emoji} was not consumed.`,
            color: 0xffa500
          })]
        });
      }
      

      const levelsToAdd = FOOD_TYPES[foodType].levels;
      

      const newLevel = Math.min(currentLevel + levelsToAdd, 100);
      const actualLevelsGained = newLevel - currentLevel;
      

      if (actualLevelsGained === 0) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: '⚠️ No Level Gain',
            description: `**${pony.name}** didn't gain any levels!\n\nYour **${FOOD_TYPES[foodType].name}** ${FOOD_TYPES[foodType].emoji} was not consumed.`,
            color: 0xffa500
          })]
        });
      }
      

      const currentExperience = parseInt(pony.experience) || 0;
      const currentLevelBaseExp = getTotalExperienceForLevel(currentLevel);
      const currentLevelProgress = currentExperience - currentLevelBaseExp;
      

      const newLevelBaseExp = getTotalExperienceForLevel(newLevel);
      const newExperience = newLevelBaseExp + currentLevelProgress;


      const willGetCutieMark = currentLevel < CUTIE_MARK_LEVEL && newLevel >= CUTIE_MARK_LEVEL;


      console.log(`[FEED] User ${userId}: ${pony.name} - Exp: ${currentExperience} → ${newExperience} (+${newExperience - currentExperience}), Level: ${currentLevel} → ${newLevel} (fed ${FOOD_TYPES[foodType].name})`);


      await query(`
        UPDATE friendship 
        SET experience = ?, friendship_level = ?
        WHERE user_id = ? AND friend_id = ?
      `, [newExperience, newLevel, userId, pony.friend_id]);
      
      console.log(`[FEED] Updated all instances of ${pony.name} (friend_id: ${pony.friend_id}) to level ${newLevel}`);


      await query(`
        UPDATE resources 
        SET ${FOOD_TYPES[foodType].resource} = ${FOOD_TYPES[foodType].resource} - 1
        WHERE user_id = ?
      `, [userId]);


      feedCooldowns.set(cooldownKey, now);
      

      try {
        const { MessageCacheManager } = await import('../../utils/messageCacheManager.js');
        if (global.messageCacheManager) {
          global.messageCacheManager.invalidateActivePonyCache(userId);
          console.log(`[FEED] Cache invalidated for user ${userId}`);
        }
      } catch (error) {
        console.debug('Cache invalidation error:', error);
      }
      

      try {
        const { addQuestProgress } = await import('../../utils/questUtils.js');
        await addQuestProgress(userId, 'feed_ponies');
      } catch (questError) {
        console.debug('Quest progress error:', questError.message);
      }


      const experienceGained = newExperience - currentExperience;
      let description = `${FOOD_TYPES[foodType].emoji} You fed **${pony.name}** with **${FOOD_TYPES[foodType].name}**!\n\n`;
      description += `📈 **Level:** ${currentLevel} → **${newLevel}** (+${actualLevelsGained})\n`;
      description += `✨ **Experience:** ${currentExperience} → **${newExperience}** (+${experienceGained})\n\n`;

      if (willGetCutieMark) {

        const cutieMark = getCutieMarkFromPonyObject(pony);
        const cutieMarkDisplay = cutieMark ? `${cutieMark} ` : '';
        
        description += `🎉 **Congratulations!** **${cutieMarkDisplay}${pony.name}** reached level ${CUTIE_MARK_LEVEL} and earned their **cutie mark**! ✨\n\n`;
      } else if (newLevel >= CUTIE_MARK_LEVEL) {

        const cutieMark = getCutieMarkFromPonyObject(pony);
        const cutieMarkDisplay = cutieMark ? `${cutieMark} ` : '';
        

        description = description.replace(`**${pony.name}**`, `**${cutieMarkDisplay}${pony.name}**`);
      }


      const feedReplies = [
        `${pony.name} happily ate the ${FOOD_TYPES[foodType].name}!`,
        `${pony.name} looks content after the delicious meal!`,
        `${pony.name} feels energized after feeding!`,
        `${pony.name} looks at you gratefully!`,
        `${pony.name} became stronger thanks to your care!`,
        `${pony.name} neighs happily after the hearty meal!`,
        `${pony.name} is full of energy and ready for new adventures!`
      ];

      const randomReply = feedReplies[Math.floor(Math.random() * feedReplies.length)];
      description += randomReply;


      description += `\n-# Next feeding for this pony will be available in **25 minutes**.`;

      await interaction.editReply({
        embeds: [createEmbed({
          title: '🍽️ Feeding Complete!',
          description: description,
          color: willGetCutieMark ? 0xffd700 : 0x57f287
        })]
      });

    } catch (error) {
      console.error('Error in feed command:', error);
      await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Error',
          description: 'An error occurred while feeding the pony. Please try again later.',
          color: 0xed4245
        })]
      });
    }
  }
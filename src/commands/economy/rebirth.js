import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { query, getRow } from '../../utils/database.js';
import { getUserFriends, getFriendshipCount } from '../../models/FriendshipModel.js';
import { getHarmony } from '../../models/HarmonyModel.js';
import { getPonyByUserId } from '../../models/PonyModel.js';
import { t } from '../../utils/localization.js';


const PONY_SLOT_LIMITS = {
  0: 250,
  1: 1000,   
  2: 2000,  
  3: 4000,  
  4: 5000,  
  5: 7000,  
  6: 8000,  
  7: 9000,  
  8: 10000,  
  9: 12000,  
  10: 14000, 
  11: 16000, 
  12: 18000, 
  13: 20000, 
  14: 22000, 
  15: 24000  
};

const REBIRTH_REQUIREMENTS = {
  1: { ponies: 100, harmony: 500, poniesLost: 100 },
  2: { ponies: 200, harmony: 500, poniesLost: 200 },
  3: { ponies: 300, harmony: 750, poniesLost: 300 },
  4: { ponies: 400, harmony: 800, poniesLost: 400 },
  5: { ponies: 500, harmony: 900, poniesLost: 500, bits: 10000 },
  6: { ponies: 600, harmony: 1000, poniesLost: 600, bits: 20000 },
  7: { ponies: 650, harmony: 1200, poniesLost: 650, bits: 25000 },
  8: { ponies: 700, harmony: 1300, poniesLost: 700, bits: 30000 },
  9: { ponies: 800, harmony: 1400, poniesLost: 800, bits: 35000 },
  10: { ponies: 900, harmony: 1500, poniesLost: 900, bits: 40000 },
  11: { ponies: 1000, harmony: 1600, poniesLost: 1000, bits: 45000 },
  12: { ponies: 1050, harmony: 1700, poniesLost: 1050, bits: 50000 },
  13: { ponies: 1100, harmony: 1800, poniesLost: 1100, bits: 55000 },
  14: { ponies: 1150, harmony: 1900, poniesLost: 1150, bits: 60000 },
  15: { ponies: 1200, harmony: 2000, poniesLost: 1200, bits: 65000 }
};


const REBIRTH_BONUSES = {
  1: {
    ventureBonus: 5,
    resourceBonus: 5,
    farmReduction: 10,
    timelyReduction: 1,
    harvestReduction: 1,
    breedReduction: 0,
    harmonyLimit: 0,
    ponyDuplicates: 1,
    ponyExperience: 15,
    description: 'Access to /breed, +5% venture/resources, -10% farm costs, -1h timely/harvest, +15 exp/message'
  },
  2: {
    ventureBonus: 10,
    resourceBonus: 10,
    farmReduction: 15,
    timelyReduction: 2,
    harvestReduction: 2,
    breedReduction: 20,
    harmonyLimit: 0,
    ponyDuplicates: 1,
    ponyExperience: 20,
    description: '+10% venture/resources, -15% farm costs, -2h timely/harvest, -20min breed, +20 exp/message'
  },
  3: {
    ventureBonus: 15,
    resourceBonus: 15,
    farmReduction: 20,
    timelyReduction: 3,
    harvestReduction: 3,
    breedReduction: 40,
    harmonyLimit: 1500,
    ponyDuplicates: 2,
    ponyExperience: 22,
    description: '+15% venture/resources, -20% farm costs, -3h timely/harvest, -40min breed, 1500 harmony limit, x2 pony catches, +22 exp/message'
  },
  4: {
    ventureBonus: 18,
    resourceBonus: 18,
    farmReduction: 23,
    timelyReduction: 3.5,
    harvestReduction: 3.5,
    breedReduction: 50,
    harmonyLimit: 1600,
    ponyDuplicates: 2,
    ponyExperience: 24,
    description: '+18% venture/resources, -23% farm costs, -3.5h timely/harvest, -50min breed, 1600 harmony limit, x2 pony catches, +24 exp/message'
  },
  5: {
    ventureBonus: 20,
    resourceBonus: 20,
    farmReduction: 25,
    timelyReduction: 4,
    harvestReduction: 4,
    breedReduction: 60,
    harmonyLimit: 1700,
    ponyDuplicates: 2,
    ponyExperience: 26,
    description: '+20% venture/resources, -25% farm costs, -4h timely/harvest, -60min breed, 1700 harmony limit, x2 pony catches, +26 exp/message'
  },
  6: {
    ventureBonus: 22,
    resourceBonus: 22,
    farmReduction: 27,
    timelyReduction: 4.5,
    harvestReduction: 4.5,
    breedReduction: 70,
    harmonyLimit: 1800,
    ponyDuplicates: 3,
    ponyExperience: 28,
    description: '+22% venture/resources, -27% farm costs, -4.5h timely/harvest, -70min breed, 1800 harmony limit, x3 pony catches, +28 exp/message'
  },
  7: {
    ventureBonus: 25,
    resourceBonus: 25,
    farmReduction: 30,
    timelyReduction: 5,
    harvestReduction: 5,
    breedReduction: 80,
    harmonyLimit: 1900,
    ponyDuplicates: 3,
    ponyExperience: 30,
    description: '+25% venture/resources, -30% farm costs, -5h timely/harvest, -80min breed, 1900 harmony limit, x3 pony catches, +30 exp/message'
  },
  8: {
    ventureBonus: 27,
    resourceBonus: 27,
    farmReduction: 32,
    timelyReduction: 5.5,
    harvestReduction: 5.5,
    breedReduction: 90,
    harmonyLimit: 2000,
    ponyDuplicates: 3,
    ponyExperience: 32,
    description: '+27% venture/resources, -32% farm costs, -5.5h timely/harvest, -90min breed, 2000 harmony limit, x3 pony catches, +32 exp/message'
  },
  9: {
    ventureBonus: 30,
    resourceBonus: 30,
    farmReduction: 35,
    timelyReduction: 6,
    harvestReduction: 6,
    breedReduction: 100,
    harmonyLimit: 2100,
    ponyDuplicates: 3,
    ponyExperience: 34,
    description: '+30% venture/resources, -35% farm costs, -6h timely/harvest, -100min breed, 2100 harmony limit, x3 pony catches, +34 exp/message'
  },
  10: {
    ventureBonus: 32,
    resourceBonus: 32,
    farmReduction: 37,
    timelyReduction: 6.5,
    harvestReduction: 6.5,
    breedReduction: 110,
    harmonyLimit: 2200,
    ponyDuplicates: 3,
    ponyExperience: 36,
    description: '+32% venture/resources, -37% farm costs, -6.5h timely/harvest, -110min breed, 2200 harmony limit, x3 pony catches, +36 exp/message'
  },
  11: {
    ventureBonus: 35,
    resourceBonus: 35,
    farmReduction: 40,
    timelyReduction: 7,
    harvestReduction: 7,
    breedReduction: 120,
    harmonyLimit: 2300,
    ponyDuplicates: 3,
    ponyExperience: 38,
    description: '+35% venture/resources, -40% farm costs, -7h timely/harvest, -120min breed, 2300 harmony limit, x3 pony catches, +38 exp/message'
  },
  12: {
    ventureBonus: 37,
    resourceBonus: 37,
    farmReduction: 42,
    timelyReduction: 7.5,
    harvestReduction: 7.5,
    breedReduction: 130,
    harmonyLimit: 2400,
    ponyDuplicates: 3,
    ponyExperience: 40,
    description: '+37% venture/resources, -42% farm costs, -7.5h timely/harvest, -130min breed, 2400 harmony limit, x3 pony catches, +40 exp/message'
  },
  13: {
    ventureBonus: 40,
    resourceBonus: 40,
    farmReduction: 45,
    timelyReduction: 8,
    harvestReduction: 8,
    breedReduction: 140,
    harmonyLimit: 2500,
    ponyDuplicates: 4,
    ponyExperience: 42,
    description: '+40% venture/resources, -45% farm costs, -8h timely/harvest, -140min breed, 2500 harmony limit, x4 pony catches, +42 exp/message'
  },
  14: {
    ventureBonus: 42,
    resourceBonus: 42,
    farmReduction: 47,
    timelyReduction: 8.5,
    harvestReduction: 8.5,
    breedReduction: 150,
    harmonyLimit: 2600,
    ponyDuplicates: 4,
    ponyExperience: 44,
    description: '+42% venture/resources, -47% farm costs, -8.5h timely/harvest, -150min breed, 2600 harmony limit, x4 pony catches, +44 exp/message'
  },
  15: {
    ventureBonus: 45,
    resourceBonus: 45,
    farmReduction: 50,
    timelyReduction: 9,
    harvestReduction: 9,
    breedReduction: 160,
    harmonyLimit: 2700,
    ponyDuplicates: 4,
    ponyExperience: 46,
    description: '+45% venture/resources, -50% farm costs, -9h timely/harvest, -160min breed, 2700 harmony limit, x4 pony catches, +46 exp/message'
  }
};


export const createRebirthTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS rebirth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      rebirth_level INTEGER DEFAULT 0,
      total_rebirths INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  await query(`CREATE INDEX IF NOT EXISTS idx_rebirth_user_id ON rebirth (user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_rebirth_level ON rebirth (rebirth_level)`);
};


const getTotalPonyCount = async (userId) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM friendship WHERE user_id = ?',
      [userId]
    );
    return result[0].count;
  } catch (error) {
    console.error('Error getting total pony count:', error);
    return 0;
  }
};


const getUserRebirth = async (userId) => {
  let rebirth = await getRow('SELECT * FROM rebirth WHERE user_id = ?', [userId]);
  
  if (!rebirth) {

    await query('INSERT INTO rebirth (user_id) VALUES (?)', [userId]);
    rebirth = await getRow('SELECT * FROM rebirth WHERE user_id = ?', [userId]);
  }
  
  return rebirth;
};


const updateRebirthLevel = async (userId, newLevel) => {
  await query(
    'UPDATE rebirth SET rebirth_level = ?, total_rebirths = total_rebirths + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
    [newLevel, userId]
  );
};


export const getPonySlotLimit = async (userId) => {
  const rebirth = await getUserRebirth(userId);
  return PONY_SLOT_LIMITS[rebirth.rebirth_level] || PONY_SLOT_LIMITS[0];
};


export const canGetNewPony = async (userId) => {
  try {

    const ponyCount = await query('SELECT COUNT(*) as count FROM friendship WHERE user_id = ?', [userId]);
    const currentPonies = ponyCount[0]?.count || 0;
    

    const slotLimit = await getPonySlotLimit(userId);
    
    return {
      canGet: currentPonies < slotLimit,
      currentPonies,
      slotLimit,
      message: currentPonies >= slotLimit 
        ? `🏠 Your stable is full! You have reached the maximum capacity of ${slotLimit} ponies. Consider rebirthing to unlock more slots or managing your current herd.`
        : null
    };
  } catch (error) {
    console.error('Error checking pony slot limit:', error);
    return { canGet: true, currentPonies: 0, slotLimit: 750, message: null };
  }
};


export const getRebirthBonuses = async (userId) => {
  const rebirth = await getUserRebirth(userId);
  return REBIRTH_BONUSES[rebirth.rebirth_level] || {
    ventureBonus: 0,
    resourceBonus: 0,
    farmReduction: 0,
    timelyReduction: 0,
    harvestReduction: 0,
    breedReduction: 0,
    harmonyLimit: 0,
    ponyDuplicates: 1,
    ponyExperience: 10
  };
};


const canRebirth = async (userId, targetLevel) => {
  const requirements = REBIRTH_REQUIREMENTS[targetLevel];
  if (!requirements) return { canRebirth: false, reason: 'Invalid rebirth level' };
  

  const ponyCount = await getTotalPonyCount(userId);
  if (ponyCount < requirements.ponies) {
    return { 
      canRebirth: false, 
      reason: `Need ${requirements.ponies} ponies total (you have ${ponyCount})` 
    };
  }
  

  const userFriends = await getUserFriends(userId);
  const removableRarities = ['BASIC', 'RARE', 'EPIC', 'MYTHIC', 'LEGEND'];
  const removablePonies = userFriends.filter(p => removableRarities.includes(p.rarity));
  

  if (removablePonies.length === 0) {
    return {
      canRebirth: false,
      reason: `You have no removable ponies to sacrifice. All your ponies are protected (CUSTOM/SECRET/UNIQUE/EXCLUSIVE).`
    };
  }
  

  const userHarmony = await getHarmony(userId);
  if (userHarmony < requirements.harmony) {
    return { 
      canRebirth: false, 
      reason: `Need ${requirements.harmony} harmony (you have ${userHarmony})` 
    };
  }


  if (requirements.bits) {
    const userPony = await getPonyByUserId(userId);
    const userBits = userPony ? userPony.bits : 0;
    if (userBits < requirements.bits) {
      return { 
        canRebirth: false, 
        reason: `Need ${requirements.bits} bits (you have ${userBits})` 
      };
    }
  }

  return { canRebirth: true };
};


const performRebirth = async (userId, targetLevel) => {
  const requirements = REBIRTH_REQUIREMENTS[targetLevel];
  
  try {

    await query('BEGIN TRANSACTION');
    

    const userFriends = await getUserFriends(userId);
    

    const removableRarities = ['BASIC', 'RARE', 'EPIC', 'MYTHIC', 'LEGEND'];
    const poniesNeededToRemove = requirements.poniesLost;
    const removedByRarity = {};
    

    let poniesRemoved = 0;
    const poniesIdsToDelete = [];
    
    for (const rarity of removableRarities) {
      if (poniesRemoved >= poniesNeededToRemove) break;
      
      const poniesOfRarity = userFriends.filter(p => p.rarity === rarity);
      removedByRarity[rarity] = 0;
      
      for (const pony of poniesOfRarity) {
        if (poniesRemoved >= poniesNeededToRemove) break;
        
        poniesIdsToDelete.push(pony.friendship_id);
        poniesRemoved++;
        removedByRarity[rarity]++;
      }
    }
    

    if (poniesIdsToDelete.length > 0) {
      const placeholders = poniesIdsToDelete.map(() => '?').join(',');
      await query(`DELETE FROM friendship WHERE id IN (${placeholders})`, poniesIdsToDelete);
    }
    

    await query('DELETE FROM user_farms WHERE user_id = ?', [userId]);
    

    await query(`
      UPDATE resources SET 
        wood = 0, stone = 0, tools = 0, celestial_fabric = 0, sun_crystal = 0,
        royal_wax = 0, gifts = 0, apples = 0, eggs = 0, milk = 0,
        expansion_plans = 0, pumpkins = 0, candies = 0, pumpkin_baskets = 0,
        forest_herbs = 0, bone_dust = 0, moonstone_shard = 0,
        active_battle_potion = 0, battle_potion_expires = 0,
        active_resource_potion = 0, resource_potion_expires = 0,
        active_luck_potion = 0, luck_potion_expires = 0,
        active_discovery_potion = 0, discovery_potion_expires = 0,
        active_nightmare_potion = 0, nightmare_potion_expires = 0
      WHERE user_id = ?
    `, [userId]);
    

    

    await query('UPDATE ponies SET bits = 0 WHERE user_id = ?', [userId]);
    

    await query('UPDATE bank_accounts SET balance = 0 WHERE user_id = ?', [userId]);
    

    await query('UPDATE harmony SET harmony_points = harmony_points - ? WHERE user_id = ?', [requirements.harmony, userId]);
    

    await updateRebirthLevel(userId, targetLevel);
    

    if (targetLevel === 1) {

    }
    

    await query('COMMIT');
    
    return { 
      success: true, 
      poniesRemoved,
      removedByRarity,
      protectedPonies: userFriends.filter(p => !removableRarities.includes(p.rarity)).length
    };
    
  } catch (error) {

    await query('ROLLBACK');
    console.error('Error performing rebirth:', error);
    return { success: false, error: error.message };
  }
};


const createRebirthEmbed = async (userId) => {
  const rebirth = await getUserRebirth(userId);
  const currentLevel = rebirth.rebirth_level;
  const nextLevel = currentLevel + 1;
  
  const embed = new EmbedBuilder()
    .setTitle('<:rebirth:1426523946064281611> Pony Rebirth')
    .setColor(0x9B59B6);

  let desc = '';
  if (currentLevel === 0) {
    desc += '> Rebirth allows you to sacrifice progress for permanent bonuses.\n';
  } else {
    const currentBonuses = REBIRTH_BONUSES[currentLevel];
    const currentSlotLimit = PONY_SLOT_LIMITS[currentLevel];
    desc += `> **Current Rebirth Level:** <:rebirth:1426523946064281611> ${currentLevel}\n> **Current Bonuses:** ${currentBonuses.description}\n> **Pony Slots:** ${currentSlotLimit} maximum capacity\n`;
  }

  if (nextLevel <= 15) {
    const requirements = REBIRTH_REQUIREMENTS[nextLevel];
    const nextBonuses = REBIRTH_BONUSES[nextLevel];
    const ponyCount = await getTotalPonyCount(userId);
    const userHarmony = await getHarmony(userId);
    const userPony = await getPonyByUserId(userId);
    const userBits = userPony ? userPony.bits : 0;
    const userFriends = await getUserFriends(userId);
    const removableRarities = ['BASIC', 'RARE', 'EPIC', 'MYTHIC', 'LEGEND'];
    const removablePonies = userFriends.filter(p => removableRarities.includes(p.rarity));
    const protectedPonies = userFriends.filter(p => !removableRarities.includes(p.rarity));

    desc += '\n```ansi\n'
      + `Total ponies:        ${ponyCount}/${requirements.ponies}\n`
      + `Harmony:             ${userHarmony}/${requirements.harmony}\n`;
    

    if (requirements.bits) {
      desc += `Bits:                ${userBits}/${requirements.bits}\n`;
    }
    
    desc += '```\n';
    desc += '> **Removal priority:** BASIC → RARE → EPIC → MYTHIC → LEGEND\n';
    desc += '> **Protected ponies:** CUSTOM, SECRET, UNIQUE, EXCLUSIVE\n';
    desc += '\n> __What will be lost:__\n';
    desc += `> - Up to ${requirements.poniesLost} ponies\n`;
    desc += '> - All farm progress\n';
    desc += '> - All resources except diamonds, keys & cases\n';
    desc += '> - All bits (cash & bank)\n';
    desc += '\n> __Next Level Bonuses:__\n';
    desc += `> ${nextBonuses.description}\n`;
    const nextSlotLimit = PONY_SLOT_LIMITS[nextLevel];
    desc += `> **New Pony Slots:** ${nextSlotLimit} maximum capacity (+${nextSlotLimit - PONY_SLOT_LIMITS[currentLevel]} slots)\n`;
    desc += '\n> **Rebirth is permanent and cannot be undone!**';
  } else {
    desc += '> **Maximum rebirth level reached!**';
  }

  embed.setDescription(desc);
  return embed;
};


const createRebirthComponents = (userId, canPerformRebirth) => {
  const row = new ActionRowBuilder();
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`rebirth_perform_${userId}`)
      .setLabel('Rebirth')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`rebirth_info_${userId}`)
      .setLabel('Info')
      .setStyle(ButtonStyle.Secondary)
  );
  return [row];
};

export const data = new SlashCommandBuilder()
  .setName('rebirth')
  .setDescription('Access the rebirth system to gain permanent bonuses')
  .setDescriptionLocalizations({
    'ru': 'Получите доступ к системе перерождений для получения постоянных бонусов'
  })
  .setDMPermission(false);

export async function execute(interaction) {

  const ponyCheck = await requirePony(interaction);
  if (ponyCheck !== true) {
    return;
  }
  
  try {
    const userId = interaction.user.id;
    

    const rebirth = await getUserRebirth(userId);
    const nextLevel = rebirth.rebirth_level + 1;
    

    let canPerformRebirth = false;
    if (nextLevel <= 15) {
      const rebirthCheck = await canRebirth(userId, nextLevel);
      canPerformRebirth = rebirthCheck.canRebirth;
    }
    
    const embed = await createRebirthEmbed(userId);
    const components = createRebirthComponents(userId, canPerformRebirth);
    
    await interaction.reply({
      embeds: [embed],
      components: components
    });
    
  } catch (error) {
    console.error('Error in rebirth command:', error);
    await interaction.reply({
      content: '❌ An error occurred while accessing the rebirth system.',
      ephemeral: true
    });
  }
}


export const handleRebirthButtons = async (interaction) => {
  try {
    const [action, targetUserId] = interaction.customId.split('_').slice(1);
    const userId = interaction.user.id;
    

    if (targetUserId !== userId) {
      return interaction.reply({
        content: 'Only the person who used the rebirth command can use these buttons.',
        ephemeral: true
      });
    }
    
    if (action === 'perform') {

      const rebirth = await getUserRebirth(userId);
      const nextLevel = rebirth.rebirth_level + 1;
      
      if (nextLevel > 15) {
        return interaction.reply({
          content: '❌ You have already reached the maximum rebirth level.',
          ephemeral: true
        });
      }
      
      const rebirthCheck = await canRebirth(userId, nextLevel);
      if (!rebirthCheck.canRebirth) {
        return interaction.reply({
          content: `❌ ${rebirthCheck.reason}`,
          ephemeral: true
        });
      }
      
      await interaction.deferUpdate();
      

      const loadingEmbed = new EmbedBuilder()
        .setTitle('<:rebirth:1426523946064281611> Rebirth in Progress')
        .setDescription('> Processing rebirth...\n> This may take a few moments.')
        .setColor(0xFFAA00);
      
      await interaction.editReply({
        embeds: [loadingEmbed],
        components: []
      });
      
      const result = await performRebirth(userId, nextLevel);
      
      if (result.success) {

        const totalRemoved = Object.values(result.removedByRarity).reduce((sum, count) => sum + count, 0);
        

        const remainingHarmony = await getHarmony(userId);
        
        const successEmbed = new EmbedBuilder()
          .setTitle('<:rebirth:1426523946064281611> Rebirth Complete')
          .setColor(0x00FF00);
        
        let desc = `> **Rebirth Level <:rebirth:1426523946064281611> ${nextLevel} Achieved**\n\n`;
        desc += '```ansi\n';
        desc += `Ponies sacrificed:    ${totalRemoved}\n`;
        desc += `Protected ponies:     ${result.protectedPonies}\n`;
        desc += `Harmony spent:        ${REBIRTH_REQUIREMENTS[nextLevel].harmony}\n`;
        if (REBIRTH_REQUIREMENTS[nextLevel].bits) {
          desc += `Bits spent:           ${REBIRTH_REQUIREMENTS[nextLevel].bits}\n`;
        }
        desc += `Harmony remaining:    ${remainingHarmony}\n`;
        desc += '```\n';
        desc += `> **New Bonuses Active:**\n> ${REBIRTH_BONUSES[nextLevel].description}`;
        
        successEmbed.setDescription(desc);
        
        await interaction.editReply({
          embeds: [successEmbed],
          components: []
        });
      } else {
        const errorEmbed = new EmbedBuilder()
          .setTitle('<:rebirth:1426523946064281611> Rebirth Failed')
          .setDescription(`> **Error occurred during rebirth**\n> ${result.error}`)
          .setColor(0xFF0000);
        
        await interaction.editReply({
          embeds: [errorEmbed],
          components: []
        });
      }
      
    } else if (action === 'info') {
      const infoEmbed = new EmbedBuilder()
        .setTitle('<:rebirth:1426523946064281611> Rebirth System Information')
        .setColor(0x9B59B6);
      
      let desc = '> The rebirth system allows you to sacrifice progress for permanent bonuses.\n\n';
      
      desc += '**Sacrifice Priority:**\n';
      desc += '```\n';
      desc += 'BASIC → RARE → EPIC → MYTHIC → LEGEND\n';
      desc += '```\n';
      
      desc += '> **Protected Rarities:**\n';
      desc += '> CUSTOM, SECRET, UNIQUE, EXCLUSIVE\n\n';
      
      desc += '> **What You Lose:**\n';
      desc += '> - Required number of removable ponies\n';
      desc += '> - All farm progress and most resources\n';
      desc += '> - Harmony points (only the required cost)\n\n';
      
      desc += '> **What You Keep:**\n';
      desc += '> - Protected ponies\n';
      desc += '> - Diamonds, keys, cases\n';
      desc += '> - Profile customizations\n';
      desc += '> - Clan membership\n\n';
      
      desc += '> **What You Gain:**\n';
      desc += '> - Permanent venture bonuses\n';
      desc += '> - Increased resource generation\n';
      desc += '> - Reduced costs and cooldowns\n';
      desc += '> - Access to advanced features\n\n';
      
      desc += '> **⚠️ Rebirth is permanent and cannot be undone!**';
      
      infoEmbed.setDescription(desc);
      
      await interaction.reply({
        embeds: [infoEmbed],
        ephemeral: true
      });
    }
    
  } catch (error) {
    console.error('Error in handleRebirthButtons:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
};


export const getFarmPurchaseCostWithRebirth = async (userId) => {
  const { getFarmPurchaseCost } = await import('../../models/FarmModel.js');
  return await getFarmPurchaseCost(userId);
};

export const calculateUpgradeCostWithRebirth = async (currentLevel, userId) => {
  const { calculateUpgradeCost } = await import('../../models/FarmModel.js');
  return await calculateUpgradeCost(currentLevel, userId);
};


export const hasBreedingAccess = async (userId) => {
  const rebirth = await getUserRebirth(userId);
  console.log(`Debug hasBreedingAccess for ${userId}: rebirth_level = ${rebirth.rebirth_level}`);

  return rebirth.rebirth_level >= 1;
};


export const getHarmonyLimit = async (userId) => {
  const rebirth = await getUserRebirth(userId);
  const bonuses = REBIRTH_BONUSES[rebirth.rebirth_level];
  
  if (bonuses && bonuses.harmonyLimit > 0) {
    return bonuses.harmonyLimit;
  }
  
  return 1000;
};


export const getPonyDuplicateMultiplier = async (userId) => {
  const rebirth = await getUserRebirth(userId);
  const bonuses = REBIRTH_BONUSES[rebirth.rebirth_level];
  return bonuses ? bonuses.ponyDuplicates : 1;
};


export const getPonyExperienceBonus = async (userId) => {
  const rebirth = await getUserRebirth(userId);
  const bonuses = REBIRTH_BONUSES[rebirth.rebirth_level];
  return bonuses ? bonuses.ponyExperience : 10;
};


export { getUserRebirth };

export const category = 'economy';
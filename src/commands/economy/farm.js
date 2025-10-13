import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getPony, addBits, removeBits } from '../../utils/pony/index.js';
import { getHarmony, addHarmony, removeHarmony, spendHarmony } from '../../models/HarmonyModel.js';
import { getResourceAmount, updateResources, getResourcesByUserId } from '../../models/ResourceModel.js';


async function getUserPonyBonuses(userId) {
  const { query } = await import('../../utils/database.js');
  

  const earthPonies = await query(`
    SELECT COUNT(*) as count 
    FROM friendship f
    JOIN pony_friends pf ON f.friend_id = pf.id 
    WHERE f.user_id = ? AND pf.pony_type = 'earth'
  `, [userId]);


  const pegasusPonies = await query(`
    SELECT COUNT(*) as count 
    FROM friendship f
    JOIN pony_friends pf ON f.friend_id = pf.id 
    WHERE f.user_id = ? AND pf.pony_type = 'pegasus'
  `, [userId]);


  const milkyWay = await query(`
    SELECT COUNT(*) as count 
    FROM friendship f
    JOIN pony_friends pf ON f.friend_id = pf.id 
    WHERE f.user_id = ? AND pf.name = 'Milky Way'
  `, [userId]);

  const earthCount = earthPonies[0]?.count || 0;
  const pegasusCount = pegasusPonies[0]?.count || 0;
  const hasMilkyWay = (milkyWay[0]?.count || 0) > 0;


  let appleMultiplier = 1;
  let appleLimit = 15;
  if (earthCount >= 20) {
    appleMultiplier = 4;
    appleLimit = 40;
  } else if (earthCount >= 10) {
    appleMultiplier = 3;
    appleLimit = 25;
  } else if (earthCount >= 5) {
    appleMultiplier = 2;
    appleLimit = 25;
  }


  let eggMultiplier = 1;
  let eggLimit = 15;
  if (pegasusCount >= 20) {
    eggMultiplier = 4;
    eggLimit = 40;
  } else if (pegasusCount >= 10) {
    eggMultiplier = 3;
    eggLimit = 25;
  } else if (pegasusCount >= 5) {
    eggMultiplier = 2;
    eggLimit = 25;
  }


  let milkMultiplier = 1;
  let milkLimit = 15;
  if (hasMilkyWay) {
    milkMultiplier = 5;
    milkLimit = 50;
  }

  return {
    earthCount,
    pegasusCount,
    hasMilkyWay,
    appleMultiplier,
    appleLimit,
    eggMultiplier,
    eggLimit,
    milkMultiplier,
    milkLimit
  };
}

import { 
  getUserFarm, 
  createFarm, 
  upgradeFarm, 
  hasFarm, 
  calculateUpgradeCost, 
  getFarmPurchaseCost,
  getExpansionPlans,
  spendExpansionPlans,
  changeFarmProduction,
  getPurchasedProductions,
  addPurchasedProduction,
  startHarvest,
  getUserHarvestTimestampForProduction,
  getUserHarvestTimestamp,
  setProductionTimer
} from '../../models/FarmModel.js';

export const data = new SlashCommandBuilder()
  .setName('farm')
  .setDescription('Manage your farm - buy, upgrade and view your farm status')
  .setDescriptionLocalizations({
    'ru': 'Управляйте своей фермой - покупайте, улучшайте и просматривайте статус фермы'
  })
  .setDMPermission(false);

export async function execute(interaction) {
  const user = interaction.user;
  const userId = user.id;


  const activeGame = global.activeGames?.get(userId);
  if (activeGame && activeGame.active && !activeGame.gameOver) {
    return interaction.reply({
      embeds: [createEmbed({
        title: 'You are already at the harvest!',
        description: 'You are already harvesting, harvest the active crop to return to the farm',
        color: 0x03168f,
        user: user
      })],
      ephemeral: true
    });
  }

  try {

    const userFarm = await getUserFarm(userId);
    
    if (!userFarm) {

      const purchaseCost = await getFarmPurchaseCost(userId);
      

      const pony = await getPony(userId);
      const harmony = await getHarmony(userId);
      const resources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0 };
      
      const embed = createEmbed({
        title: '🚜 Farm',
        description: `"This farm once fed half of Appleloosa," says Big Mac, "but now it needs a new owner. If you take on the work, you can restore it and turn it into a real wonder. Here you can grow apples, harvest crops, and even discover new secrets of the old orchard."\n\n> **Your Resources:**\n<:bits:1411354539935666197> ${pony?.bits || 0}\n<:harmony:1416514347789844541> ${harmony || 0}\n<:wooden:1426514988134301787> ${resources.wood}\n<:stones:1426514985865056326> ${resources.stone}\n<:tool:1426514983159599135> ${resources.tools}\n\n> **Purchase Cost:**\n<:bits:1411354539935666197> ${purchaseCost.bits}\n<:harmony:1416514347789844541> ${purchaseCost.harmony}\n<:wooden:1426514988134301787> ${purchaseCost.wood}\n<:stones:1426514985865056326> ${purchaseCost.stone}\n<:tool:1426514983159599135> ${purchaseCost.tools}`,
        color: 0x03168f,
        user: interaction.user
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`farm_purchase_${userId}`)
          .setLabel('Purchase Farm')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }


    const currentLevel = userFarm.level;
    const canUpgrade = currentLevel < 99;
    

    const pony = await getPony(userId);
    const harmony = await getHarmony(userId);
    const resources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0 };
    const expansionPlans = await getExpansionPlans(userId);
    
    let upgradeInfo = '';
    let upgradeButton = null;
    
    if (canUpgrade) {
      const upgradeCost = await calculateUpgradeCost(currentLevel, userId);
      upgradeInfo = `\n\n**Upgrade to Level ${currentLevel + 1}:**\n<:bits:1411354539935666197> ${upgradeCost.bits}\n<:harmony:1416514347789844541> ${upgradeCost.harmony}\n<:wooden:1426514988134301787> ${upgradeCost.wood}\n<:stones:1426514985865056326> ${upgradeCost.stone}\n<:tool:1426514983159599135> ${upgradeCost.tools}`;
      
      upgradeButton = new ButtonBuilder()
        .setCustomId(`farm_upgrade_${userId}`)
        .setLabel('Upgrade')
        .setStyle(ButtonStyle.Secondary);
    }

    const embed = createEmbed({
      title: '🚜 Your Farm',
      description: `**Level:** ${currentLevel}/99\n\n**Your Resources:**\n<:bits:1411354539935666197> ${pony?.bits || 0}\n<:harmony:1416514347789844541> ${harmony || 0}\n<:wooden:1426514988134301787> ${resources.wood}\n<:stones:1426514985865056326> ${resources.stone}\n<:tool:1426514983159599135> ${resources.tools}\n<:cartography:1418286057585250438> ${expansionPlans || 0}${upgradeInfo}`,
      color: 0x03168f,
      user: interaction.user
    });

    const components = [];
    

    const firstRow = new ActionRowBuilder();
    
    if (upgradeButton) {
      firstRow.addComponents(upgradeButton);
    }
    

    const farmDetailsButton = new ButtonBuilder()
      .setCustomId(`farm_details_${userId}`)
      .setLabel('Farm Details')
      .setStyle(ButtonStyle.Primary);
    

    const harvestButton = new ButtonBuilder()
      .setCustomId(`farm_harvest_view_${userId}`)
      .setLabel('My Harvest')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🌾');
    
    firstRow.addComponents(farmDetailsButton, harvestButton);
    

    const ponyBonusesButton = new ButtonBuilder()
      .setCustomId(`farm_pony_bonuses_${userId}`)
      .setLabel('Pony Bonuses')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🦄');
    
    const secondRow = new ActionRowBuilder();
    secondRow.addComponents(ponyBonusesButton);
    
    components.push(firstRow);
    components.push(secondRow);

    return interaction.reply({
      embeds: [embed],
      components
    });

  } catch (error) {
    console.error('Error in farm command:', error);
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while processing your farm command.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


export async function handleFarmInteraction(interaction) {
  const userId = interaction.user.id;
  

  if (interaction.customId.includes('_')) {
    const parts = interaction.customId.split('_');
    const ownerId = parts[parts.length - 1];
    
    if (userId !== ownerId) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Access Denied',
          description: 'You can only manage your own farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
  }
  
  if (interaction.customId.startsWith('farm_purchase_')) {
    await handleFarmPurchase(interaction, userId);
  } else if (interaction.customId.startsWith('farm_upgrade_')) {
    await handleFarmUpgrade(interaction, userId);
  } else if (interaction.customId.startsWith('farm_details_')) {
    await handleFarmDetails(interaction, userId);
  } else if (interaction.customId.startsWith('farm_switch_production_')) {
    await handleFarmSwitchProduction(interaction, userId);
  } else if (interaction.customId.startsWith('farm_production_buy_')) {
    await handleFarmProductionBuy(interaction, userId);
  } else if (interaction.customId.startsWith('farm_start_growing_')) {
    await handleFarmStartGrowing(interaction, userId);
  } else if (interaction.customId.startsWith('farm_harvest_view_')) {
    await handleFarmHarvestView(interaction, userId);
  } else if (interaction.customId.startsWith('farm_pony_bonuses_')) {
    await handleFarmPonyBonuses(interaction, userId);
  } else if (interaction.customId.startsWith('farm_trade_')) {
    const parts = interaction.customId.split('_');
    const resourceType = parts[2]; 
    await handleFarmTrade(interaction, userId, resourceType);
  } else if (interaction.customId.startsWith('farm_back_main_')) {
    await handleFarmBack(interaction, userId);
  } else if (interaction.customId.startsWith('farm_harvest_')) {
    await handleFarmHarvest(interaction, userId);
  } else if (interaction.customId.startsWith('farm_back_')) {
    await handleFarmBack(interaction, userId);
  } else if (interaction.customId.startsWith('game_left_')) {
    await handleGameMove(interaction, userId, 'left');
  } else if (interaction.customId.startsWith('game_right_')) {
    await handleGameMove(interaction, userId, 'right');
  }
}


async function handleFarmPurchase(interaction, userId) {
  try {
    await interaction.deferUpdate();


    if (await hasFarm(userId)) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You already have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    const purchaseCost = await getFarmPurchaseCost(userId);
    

    const pony = await getPony(userId);
    const harmony = await getHarmony(userId);
    const resources = await getResourcesByUserId(userId);

    if (!pony || pony.bits < purchaseCost.bits) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${purchaseCost.bits} Bits but only have ${pony?.bits || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (harmony < purchaseCost.harmony) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${purchaseCost.harmony} Harmony but only have ${harmony || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (!resources || resources.wood < purchaseCost.wood) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${purchaseCost.wood} Wood but only have ${resources?.wood || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (!resources || resources.stone < purchaseCost.stone) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${purchaseCost.stone} Stone but only have ${resources?.stone || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (!resources || resources.tools < purchaseCost.tools) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${purchaseCost.tools} Tools but only have ${resources?.tools || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    await removeBits(userId, purchaseCost.bits);
    await spendHarmony(userId, purchaseCost.harmony);
    await updateResources(userId, {
      wood: resources.wood - purchaseCost.wood,
      stone: resources.stone - purchaseCost.stone,
      tools: resources.tools - purchaseCost.tools
    });


    await createFarm(userId);


    const userFarm = await getUserFarm(userId);
    const currentLevel = userFarm.level;
    const canUpgrade = currentLevel < 99;
    

    const updatedPony = await getPony(userId);
    const updatedHarmony = await getHarmony(userId);
    const updatedResources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0 };
    const expansionPlans = await getExpansionPlans(userId);
    
    let upgradeInfo = '';
    let upgradeButton = null;
    
    if (canUpgrade) {
      const upgradeCost = await calculateUpgradeCost(currentLevel, userId);
      upgradeInfo = `\n\n**Upgrade to Level ${currentLevel + 1}:**\n<:bits:1411354539935666197> ${upgradeCost.bits}\n<:harmony:1416514347789844541> ${upgradeCost.harmony}\n<:wooden:1426514988134301787> ${upgradeCost.wood}\n<:stones:1426514985865056326> ${upgradeCost.stone}\n<:tool:1426514983159599135> ${upgradeCost.tools}`;
      
      upgradeButton = new ButtonBuilder()
        .setCustomId(`farm_upgrade_${userId}`)
        .setLabel('Upgrade')
        .setStyle(ButtonStyle.Secondary);
    }

    const embed = createEmbed({
      title: '🚜 Your Farm',
      description: `**✅ Farm successfully purchased!**\n\n**Level:** ${currentLevel}/99\n\n**Your Resources:**\n<:bits:1411354539935666197> ${updatedPony?.bits || 0}\n<:harmony:1416514347789844541> ${updatedHarmony || 0}\n<:wooden:1426514988134301787> ${updatedResources.wood}\n<:stones:1426514985865056326> ${updatedResources.stone}\n<:tool:1426514983159599135> ${updatedResources.tools}\n<:cartography:1418286057585250438> ${expansionPlans || 0}${upgradeInfo}`,
      color: 0x03168f,
      user: interaction.user
    });

    const components = [];
    const firstRow = new ActionRowBuilder();
    
    if (upgradeButton) {
      firstRow.addComponents(upgradeButton);
    }
    
    const farmDetailsButton = new ButtonBuilder()
      .setCustomId(`farm_details_${userId}`)
      .setLabel('Farm Details')
      .setStyle(ButtonStyle.Primary);
    
    firstRow.addComponents(farmDetailsButton);
    components.push(firstRow);

    await interaction.editReply({
      embeds: [embed],
      components: components
    });

  } catch (error) {
    console.error('Error purchasing farm:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while purchasing your farm.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}

async function handleFarmUpgrade(interaction, userId) {
  try {
    await interaction.deferUpdate();

    const userFarm = await getUserFarm(userId);
    
    if (!userFarm) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You don\'t have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (userFarm.level >= 99) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Max Level Reached',
          description: 'Your farm is already at maximum level (99)!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    const upgradeCost = await calculateUpgradeCost(userFarm.level, userId);
    console.log(`[UPGRADE DEBUG] User ${userId}, Farm Level ${userFarm.level}, Upgrade Cost:`, upgradeCost);
    
    const pony = await getPony(userId);
    const harmony = await getHarmony(userId);
    const resources = await getResourcesByUserId(userId);

    if (!pony || pony.bits < upgradeCost.bits) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${upgradeCost.bits} Bits but only have ${pony?.bits || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (harmony < upgradeCost.harmony) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${upgradeCost.harmony} Harmony but only have ${harmony || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (!resources || resources.wood < upgradeCost.wood) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${upgradeCost.wood} Wood but only have ${resources?.wood || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (!resources || resources.stone < upgradeCost.stone) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${upgradeCost.stone} Stone but only have ${resources?.stone || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (!resources || resources.tools < upgradeCost.tools) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need ${upgradeCost.tools} Tools but only have ${resources?.tools || 0}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    console.log(`[UPGRADE DEBUG] About to remove - Bits: ${upgradeCost.bits}, Harmony: ${upgradeCost.harmony}`);
    await removeBits(userId, upgradeCost.bits);
    await spendHarmony(userId, upgradeCost.harmony);
    await updateResources(userId, {
      wood: resources.wood - upgradeCost.wood,
      stone: resources.stone - upgradeCost.stone,
      tools: resources.tools - upgradeCost.tools
    });

    await upgradeFarm(userId);
    const newLevel = userFarm.level + 1;

    const embed = createEmbed({
      title: '🚜 Farm Upgraded!',
      description: `Your farm has been upgraded to Level ${newLevel}!`,
      color: 0x03168f,
      user: interaction.user
    });

    const backButton = new ButtonBuilder()
      .setCustomId(`farm_back_${userId}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)

    const actionRow = new ActionRowBuilder().addComponents(backButton);

    await interaction.editReply({
      embeds: [embed],
      components: [actionRow]
    });

  } catch (error) {
    console.error('Error upgrading farm:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while upgrading your farm.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}

async function handleFarmDetails(interaction, userId, shouldDefer = true) {
  try {
    if (shouldDefer) {
      await interaction.deferUpdate();
    }

    const userFarm = await getUserFarm(userId);
    
    if (!userFarm) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You don\'t have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    const productionType = userFarm.production_type || 'apple';
    const expansionPlans = await getExpansionPlans(userId);
    const harmony = await getHarmony(userId);

    const productionDetails = {
      apple: {
        name: 'Apple Production',
        emoji: '🍎',
        description: 'Traditional apple farming - the foundation of any good farm.',
        benefits: 'Free to maintain, steady production, perfect for beginners',
        yield: 'Fresh apples with natural sweetness'
      },
      egg: {
        name: 'Egg Production', 
        emoji: '🥚',
        description: 'Sustainable chicken farming focused on high-quality egg production.',
        benefits: 'Rich in protein, steady income, premium market value',
        yield: 'Farm-fresh eggs with superior nutrition'
      },
      milk: {
        name: 'Milk Production',
        emoji: '🥛', 
        description: 'Premium dairy farming with focus on milk quality and cow welfare.',
        benefits: 'High calcium content, consistent daily yield, excellent profit margins',
        yield: 'Creamy milk rich in essential nutrients'
      }
    };

    const currentProduction = productionDetails[productionType];
    

    const harvestTimestamp = await getUserHarvestTimestampForProduction(userId, productionType);
    const now = Date.now();
    

    const { getHarvestTime } = await import('../../models/FarmModel.js');
    const harvestTimeMinutes = getHarvestTime(userFarm.level);
    const harvestTimeHours = Math.floor(harvestTimeMinutes / 60);
    const harvestTimeRemainingMinutes = harvestTimeMinutes % 60;
    
    let timeDisplayText = `${harvestTimeHours}h`;
    if (harvestTimeRemainingMinutes > 0) {
      timeDisplayText += ` ${harvestTimeRemainingMinutes}m`;
    }
    
    let harvestInfo = `Harvest time: ${timeDisplayText} (Level ${userFarm.level})`;
    

    if (!userFarm.harvest_started_at) {

      harvestInfo += '\nStatus: The harvest has not started yet, use the "Start Growing" button to begin.';
    } else if (harvestTimestamp && harvestTimestamp > now) {
      const remainingTime = harvestTimestamp - now;
      const hours = Math.floor(remainingTime / (1000 * 60 * 60));
      const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
      harvestInfo += `\nReady in: ${hours}h ${minutes}m`;
    } else if (harvestTimestamp && harvestTimestamp <= now) {
      harvestInfo += '\nStatus: Ready to harvest!';
    } else {
      harvestInfo += '\nStatus: The harvest has not started yet, use the "Start Growing" button to begin.';
    }

    const embed = createEmbed({
      title: `${currentProduction.emoji} ${currentProduction.name}`,
      description: currentProduction.description,
      color: 0x03168f,
      user: interaction.user
    });

    embed.addFields(
      { name: 'Production Benefits', value: currentProduction.benefits, inline: false },
      { name: 'Expected Yield', value: currentProduction.yield, inline: false },
      { name: 'Harvest Information', value: harvestInfo, inline: false }
    );


    const buttons = [];
    

    const switchButton = new ButtonBuilder()
      .setCustomId(`farm_switch_production_${userId}`)
      .setLabel('Switch Production Type')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄');
    buttons.push(switchButton);
    

    const hasActiveHarvest = harvestTimestamp && harvestTimestamp > now;
    const harvestReady = harvestTimestamp && harvestTimestamp <= now;
    
    if (!hasActiveHarvest && !harvestReady) {
      const startGrowingButton = new ButtonBuilder()
        .setCustomId(`farm_start_growing_${userId}`)
        .setLabel('Start Growing')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🌱');
      buttons.push(startGrowingButton);
    } else if (harvestReady) {

      const harvestButton = new ButtonBuilder()
        .setCustomId(`farm_harvest_${userId}`)
        .setLabel('Collect Harvest')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🌾');
      buttons.push(harvestButton);
    }


    const backButton = new ButtonBuilder()
      .setCustomId(`farm_back_${userId}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
    buttons.push(backButton);

    const row = new ActionRowBuilder().addComponents(buttons);

    return interaction.editReply({
      embeds: [embed],
      components: [row]
    });

  } catch (error) {
    console.error('Error showing farm details:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while showing farm details.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function handleFarmSwitchProduction(interaction, userId) {
  try {
    await interaction.deferUpdate();

    const userFarm = await getUserFarm(userId);
    
    if (!userFarm) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You don\'t have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    const embed = createEmbed({
      title: 'Switch Production Type',
      description: 'Choose a new production type for your farm:\n\n⚠️ **Warning** — __Switching production will cancel any ongoing harvest!__',
      color: 0x03168f,
      user: interaction.user
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`farm_production_view_${userId}`)
      .setPlaceholder('Choose production type to switch to')
      .addOptions([
        {
          label: 'Apple Production',
          description: 'Classic apple farming - FREE (default)',
          value: 'apple',
          emoji: '🍎'
        },
        {
          label: 'Egg Production', 
          description: 'Requires Level 15 + 30 expansion plans + 50 harmony',
          value: 'egg',
          emoji: '🥚'
        },
        {
          label: 'Milk Production',
          description: 'Requires Level 30 + 50 expansion plans + 100 harmony', 
          value: 'milk',
          emoji: '🥛'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return interaction.editReply({
      embeds: [embed],
      components: [row]
    });

  } catch (error) {
    console.error('Error switching production:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while switching production.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


export async function handleFarmProductionView(interaction) {
  const userId = interaction.user.id;
  

  if (interaction.customId.includes('_')) {
    const parts = interaction.customId.split('_');
    const ownerId = parts[parts.length - 1];
    
    if (userId !== ownerId) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Access Denied',
          description: 'You can only view your own farm production!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
  }

  try {
    await interaction.deferUpdate();

    const userFarm = await getUserFarm(userId);
    
    if (!userFarm) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You don\'t have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    const productionType = interaction.values[0];
    const expansionPlans = await getExpansionPlans(userId);
    const harmony = await getHarmony(userId);
    

    const purchasedProductions = await getPurchasedProductions(userId);
    const alreadyPurchased = purchasedProductions.includes(productionType);
    

    const productionCosts = {
      apple: { expansionPlans: 0, harmony: 0, level: 1 },
      egg: { expansionPlans: 30, harmony: 50, level: 15 }, 
      milk: { expansionPlans: 50, harmony: 100, level: 30 }
    };
    
    const productionDetails = {
      apple: {
        name: 'Apple Production',
        emoji: '🍎',
        description: 'Traditional apple farming - the foundation of any good farm.',
        benefits: 'Free to maintain, steady production, perfect for beginners',
        yield: 'Fresh apples with natural sweetness'
      },
      egg: {
        name: 'Egg Production', 
        emoji: '🥚',
        description: 'Sustainable chicken farming focused on high-quality egg production.',
        benefits: 'Rich in protein, steady income, premium market value',
        yield: 'Farm-fresh eggs with superior nutrition'
      },
      milk: {
        name: 'Milk Production',
        emoji: '🥛', 
        description: 'Premium dairy farming with focus on milk quality and cow welfare.',
        benefits: 'High calcium content, consistent daily yield, excellent profit margins',
        yield: 'Creamy milk rich in essential nutrients'
      }
    };

    const cost = productionCosts[productionType];
    const details = productionDetails[productionType];
    

    const currentProductionType = userFarm.production_type || 'apple';
    const isCurrentProduction = currentProductionType === productionType;
    
    const embed = createEmbed({
      title: `${details.emoji} ${details.name}`,
      description: details.description,
      color: 0x03168f,
      user: interaction.user
    });

    embed.addFields(
      { name: 'Production Benefits', value: details.benefits, inline: false },
      { name: 'Expected Yield', value: details.yield, inline: false }
    );
    
    if (isCurrentProduction) {
      embed.addFields(
        { name: 'Status', value: 'Currently Active Production', inline: false }
      );
    } else {
      let costText;
      if (alreadyPurchased || productionType === 'apple') {
        costText = alreadyPurchased ? 'Already Purchased - Free to Switch' : 'Free (Default production)';
      } else {
        costText = `**Level ${cost.level} required**\n<:cartography:1418286057585250438> ${cost.expansionPlans} expansion plans\n<:harmony:1416514347789844541> ${cost.harmony} harmony`;
      }
        
      const resourceText = `**Level:** ${userFarm.level}\n<:cartography:1418286057585250438> ${expansionPlans || 0}\n<:harmony:1416514347789844541> ${harmony || 0}`;
      
      embed.addFields(
        { name: 'Cost to Switch', value: costText, inline: true },
        { name: 'Your Resources', value: resourceText, inline: true }
      );
    }

    let components = [];
    

    if (!isCurrentProduction) {
      const buttonLabel = alreadyPurchased || productionType === 'apple' ? 'Switch Production' : 'Purchase Production';
      

      const canPurchase = alreadyPurchased || productionType === 'apple' || 
        (userFarm.level >= cost.level && (expansionPlans || 0) >= cost.expansionPlans && (harmony || 0) >= cost.harmony);
      
      const buttons = [];
      
      const buyButton = new ButtonBuilder()
        .setCustomId(`farm_production_buy_${productionType}_${userId}`)
        .setLabel(buttonLabel)
        .setStyle(canPurchase ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setEmoji(details.emoji)
        .setDisabled(!canPurchase);

      buttons.push(buyButton);
      

      const backButton = new ButtonBuilder()
        .setCustomId(`farm_switch_production_${userId}`)
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary);
      
      buttons.push(backButton);

      components.push(new ActionRowBuilder().addComponents(buttons));
    } else {
      return await handleFarmDetails(interaction, userId, false);
    }

    return interaction.editReply({
      embeds: [embed],
      components: components
    });

  } catch (error) {
    console.error('Error viewing farm production:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while viewing production details.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}

async function handleFarmProductionBuy(interaction, userId) {

  if (interaction.customId.includes('_')) {
    const parts = interaction.customId.split('_');
    const ownerId = parts[parts.length - 1];
    
    if (userId !== ownerId) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Access Denied',
          description: 'You can only manage your own farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
  }

  try {
    await interaction.deferUpdate();

    const userFarm = await getUserFarm(userId);
    
    if (!userFarm) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You don\'t have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const customIdParts = interaction.customId.split('_');
    const newProductionType = customIdParts[3];
    

    const productionCosts = {
      apple: { expansionPlans: 0, harmony: 0, level: 1 },
      egg: { expansionPlans: 30, harmony: 50, level: 15 }, 
      milk: { expansionPlans: 50, harmony: 100, level: 30 }
    };

    const cost = productionCosts[newProductionType];
    console.log(`[PRODUCTION_BUY DEBUG] User ${userId}, Production Type: ${newProductionType}, Cost:`, cost);
    const expansionPlans = await getExpansionPlans(userId);
    const harmony = await getHarmony(userId);
    console.log(`[PRODUCTION_BUY DEBUG] User ${userId}, Current Resources - Expansion Plans: ${expansionPlans}, Harmony: ${harmony}`);
    

    const purchasedProductions = await getPurchasedProductions(userId);
    const alreadyPurchased = purchasedProductions.includes(newProductionType);
    

    if (userFarm.production_type === newProductionType) {

      return await handleFarmDetails(interaction, userId, false);
    }


    if (!alreadyPurchased && newProductionType !== 'apple') {

      if (userFarm.level < cost.level) {
        const backButton = new ButtonBuilder()
          .setCustomId(`farm_switch_production_${userId}`)
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(backButton);

        return interaction.editReply({
          embeds: [createEmbed({
            title: 'Level Requirement Not Met',
            description: `${newProductionType.charAt(0).toUpperCase() + newProductionType.slice(1)} Production requires farm level ${cost.level}.\n\nYour current farm level: ${userFarm.level}`,
            color: 0xe74c3c,
            user: interaction.user
          })],
          components: [actionRow]
        });
      }


      if ((expansionPlans || 0) < cost.expansionPlans) {
        const backButton = new ButtonBuilder()
          .setCustomId(`farm_switch_production_${userId}`)
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(backButton);

        return interaction.editReply({
          embeds: [createEmbed({
            title: 'Insufficient Resources',
            description: `You need <:cartography:1418286057585250438> ${cost.expansionPlans} expansion plans but only have ${expansionPlans || 0}.`,
            color: 0xe74c3c,
            user: interaction.user
          })],
          components: [actionRow]
        });
      }


      if ((harmony || 0) < cost.harmony) {
        const backButton = new ButtonBuilder()
          .setCustomId(`farm_switch_production_${userId}`)
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(backButton);

        return interaction.editReply({
          embeds: [createEmbed({
            title: 'Insufficient Resources',
            description: `You need <:harmony:1416514347789844541> ${cost.harmony} harmony but only have ${harmony || 0}.`,
            color: 0xe74c3c,
            user: interaction.user
          })],
          components: [actionRow]
        });
      }
      

      console.log(`[PRODUCTION_BUY DEBUG] About to spend - Expansion Plans: ${cost.expansionPlans}, Harmony: ${cost.harmony}`);
      await spendExpansionPlans(userId, cost.expansionPlans);
      await spendHarmony(userId, cost.harmony);
      

      await addPurchasedProduction(userId, newProductionType);
    }
    

    const changeResult = await changeFarmProduction(userId, newProductionType);
    

    const { setProductionTimer } = await import('../../models/FarmModel.js');
    await setProductionTimer(userId, 'apple', null);
    await setProductionTimer(userId, 'chicken', null); 
    await setProductionTimer(userId, 'egg', null);
    await setProductionTimer(userId, 'milk', null);
    await setProductionTimer(userId, 'cow', null);
    

    const { query } = await import('../../utils/database.js');
    await query(
      'UPDATE user_farms SET harvest_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
    

    if (global.activeGames && global.activeGames.has(userId)) {
      const gameState = global.activeGames.get(userId);
      if (gameState) {
        gameState.active = false;
        gameState.gameOver = true;
      }
      global.activeGames.delete(userId);
    }
    

    const farmAfterChange = await getUserFarm(userId);
    

    return await handleFarmDetails(interaction, userId, false);

  } catch (error) {
    console.error('Error buying farm production:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while changing production type.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function handleFarmBack(interaction, userId) {

  if (interaction.customId.includes('_')) {
    const parts = interaction.customId.split('_');
    const ownerId = parts[parts.length - 1];
    
    if (userId !== ownerId) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Access Denied',
          description: 'You can only manage your own farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
  }

  try {
    await interaction.deferUpdate();
    

    const userFarm = await getUserFarm(userId);
    if (!userFarm) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You don\'t have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        components: []
      });
    }


    const currentLevel = userFarm.level;
    const canUpgrade = currentLevel < 99;
    
    const pony = await getPony(userId);
    const harmony = await getHarmony(userId);
    const resources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0 };
    const expansionPlans = await getExpansionPlans(userId);
    
    let upgradeInfo = '';
    let upgradeButton = null;
    
    if (canUpgrade) {
      const upgradeCost = await calculateUpgradeCost(currentLevel, userId);
      upgradeInfo = `\n\n**Upgrade to Level ${currentLevel + 1}:**\n<:bits:1411354539935666197> ${upgradeCost.bits}\n<:harmony:1416514347789844541> ${upgradeCost.harmony}\n<:wooden:1426514988134301787> ${upgradeCost.wood}\n<:stones:1426514985865056326> ${upgradeCost.stone}\n<:tool:1426514983159599135> ${upgradeCost.tools}`;
      
      upgradeButton = new ButtonBuilder()
        .setCustomId(`farm_upgrade_${userId}`)
        .setLabel('Upgrade')
        .setStyle(ButtonStyle.Secondary);
    }

    const embed = createEmbed({
      title: '🚜 Your Farm',
      description: `**Level:** ${currentLevel}/99\n\n**Your Resources:**\n<:bits:1411354539935666197> ${pony?.bits || 0}\n<:harmony:1416514347789844541> ${harmony || 0}\n<:wooden:1426514988134301787> ${resources.wood}\n<:stones:1426514985865056326> ${resources.stone}\n<:tool:1426514983159599135> ${resources.tools}\n<:cartography:1418286057585250438> ${expansionPlans || 0}${upgradeInfo}`,
      color: 0x03168f,
      user: interaction.user
    });

    const components = [];
    const firstRow = new ActionRowBuilder();
    
    if (upgradeButton) {
      firstRow.addComponents(upgradeButton);
    }
    
    const farmDetailsButton = new ButtonBuilder()
      .setCustomId(`farm_details_${userId}`)
      .setLabel('Farm Details')
      .setStyle(ButtonStyle.Primary);
    
    const harvestViewButton = new ButtonBuilder()
      .setCustomId(`farm_harvest_view_${userId}`)
      .setLabel('My Harvest')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🌾');
    
    const ponyBonusesButton = new ButtonBuilder()
      .setCustomId(`farm_pony_bonuses_${userId}`)
      .setLabel('Pony Bonuses')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🦄');
    
    firstRow.addComponents(farmDetailsButton, harvestViewButton);
    
    const secondRow = new ActionRowBuilder();
    secondRow.addComponents(ponyBonusesButton);
    components.push(firstRow);
    components.push(secondRow);

    return interaction.editReply({
      embeds: [embed],
      components: components
    });
  } catch (error) {
    console.error('Error going back to farm:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while returning to your farm.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function handleFarmStartGrowing(interaction, userId) {

  if (interaction.customId.includes('_')) {
    const parts = interaction.customId.split('_');
    const ownerId = parts[parts.length - 1];
    
    if (userId !== ownerId) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Access Denied',
          description: 'You can only manage your own farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
  }

  try {
    await interaction.deferUpdate();

    const userFarm = await getUserFarm(userId);
    
    if (!userFarm) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You don\'t have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const productionType = userFarm.production_type || 'apple';
    const harvestTimestamp = await getUserHarvestTimestampForProduction(userId, productionType);
    const now = Date.now();
    

    if (harvestTimestamp && harvestTimestamp > now) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'Harvest is already in progress for this production type!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
    

    if (userFarm.harvest_started_at && (!harvestTimestamp || harvestTimestamp <= now)) {
      const { query } = await import('../../utils/database.js');
      await query(
        'UPDATE user_farms SET harvest_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [userId]
      );
      console.log(`Cleared inconsistent harvest_started_at for user ${userId}`);
    }


    const startResult = await startHarvest(userId);
    
    if (!startResult) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'Failed to start growing harvest.',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const { getHarvestTime, setProductionTimer } = await import('../../models/FarmModel.js');
    
    const harvestTimeMinutes = getHarvestTime(userFarm.level);
    const harvestTimeMs = harvestTimeMinutes * 60 * 1000;
    const harvestStartTime = Date.now();
    
    console.log(`[TIMER DEBUG] Setting new timer for user ${userId}, production ${productionType}`);
    console.log(`[TIMER DEBUG] Start time: ${harvestStartTime}, Harvest time minutes: ${harvestTimeMinutes}`);
    console.log(`[TIMER DEBUG] Harvest will be ready at: ${harvestStartTime + harvestTimeMs}`);
    console.log(`[TIMER DEBUG] That's ${new Date(harvestStartTime + harvestTimeMs).toISOString()}`);
    

    await setProductionTimer(userId, productionType, harvestStartTime);
    

    const verifyTimestamp = await getUserHarvestTimestampForProduction(userId, productionType);
    console.log(`[TIMER VERIFY] Database now has timestamp: ${verifyTimestamp}`);
    console.log(`[TIMER VERIFY] That's ${new Date(verifyTimestamp).toISOString()}`);


    return await handleFarmDetails(interaction, userId, false);

  } catch (error) {
    console.error('Error starting farm harvest:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while starting harvest.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function handleFarmHarvest(interaction, userId) {

  const activeGame = global.activeGames?.get(userId);
  if (activeGame && activeGame.active && !activeGame.gameOver) {
    return interaction.reply({
      embeds: [createEmbed({
        title: 'You are already harvesting!',
        description: 'You already have an active harvest game running. Complete it first before starting another harvest.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }


  if (interaction.customId.includes('_')) {
    const parts = interaction.customId.split('_');
    const ownerId = parts[parts.length - 1];
    
    if (userId !== ownerId) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Access Denied',
          description: 'You can only harvest your own farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
  }

  try {
    await interaction.deferUpdate();

    const userFarm = await getUserFarm(userId);
    
    if (!userFarm) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You don\'t have a farm!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const harvestTimestamp = await getUserHarvestTimestampForProduction(userId, userFarm.production_type);
    const now = Date.now();
    
    if (!harvestTimestamp || harvestTimestamp > now) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Not Ready',
          description: 'Your harvest is not ready yet!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    if (userFarm.production_type === 'apple') {
      return await startAppleHarvestGame(interaction, userId);
    } else if (userFarm.production_type === 'chicken' || userFarm.production_type === 'egg') {
      return await startEggSnakeGame(interaction, userId);
    } else if (userFarm.production_type === 'milk') {
      return await startMilkFlappyGame(interaction, userId);
    } else {

      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Coming Soon',
          description: `Mini-game for ${userFarm.production_type} harvest is coming soon!`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

  } catch (error) {
    console.error('Error harvesting farm:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while harvesting.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function startAppleHarvestGame(interaction, userId) {
  try {
    const gameState = {
      userId,
      field: createGameField(),
      basketPosition: 5,
      score: 0,
      timeLeft: 60,
      gameOver: false,
      active: true,
      updating: false,
      apples: []
    };


    const gameEmbed = await createGameEmbed(gameState);
    const gameButtons = createGameButtons(userId);


    global.activeGames = global.activeGames || new Map();
    global.activeGames.set(userId, gameState);


    startGameLoop(interaction, userId);

    return interaction.editReply({
      embeds: [gameEmbed],
      components: gameButtons
    });

  } catch (error) {
    console.error('Error starting apple harvest game:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'Failed to start the harvest game.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


function createGameField() {
  const field = [];

  for (let y = 0; y < 4; y++) {
    field.push(new Array(12).fill(':blue_square:'));
  }

  field.push(new Array(12).fill(':green_square:'));
  return field;
}


async function createGameEmbed(gameState) {

  const bonuses = await getUserPonyBonuses(gameState.userId);
  const maxApples = bonuses.appleLimit;
  

  const displayField = gameState.field.map(row => [...row]);
  

  displayField[3][gameState.basketPosition] = ':basket:';
  

  gameState.apples.forEach(apple => {
    if (apple.y >= 0 && apple.y < 5 && apple.x >= 0 && apple.x < 12) {
      displayField[apple.y][apple.x] = ':apple:';
    }
  });


  const fieldDisplay = displayField.map(row => row.join('')).join('\n');

  return createEmbed({
    title: '🍎 Apple Harvest',
    description: `Collect ${maxApples} apples in 1 minute!\n\n${fieldDisplay}\n\n**Score:** ${gameState.score}/${maxApples} apples\n**Time Left:** ${gameState.timeLeft} seconds`,
    color: 0x03168f,
    user: { id: gameState.userId }
  });
}


function createGameButtons(userId) {

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`game_disabled_1_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`game_disabled_2_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`game_disabled_3_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );


  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`game_left_${userId}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`game_disabled_center_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`game_right_${userId}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Primary)
  );


  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`game_disabled_4_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`game_disabled_5_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`game_disabled_6_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );

  return [row1, row2, row3];
}


function startGameLoop(interaction, userId) {
  const gameInterval = setInterval(async () => {
    const gameState = global.activeGames?.get(userId);
    if (!gameState || gameState.gameOver) {
      clearInterval(gameInterval);
      return;
    }


    gameState.timeLeft--;


    if (Math.random() < 0.3) {
      gameState.apples.push({
        x: Math.floor(Math.random() * 12),
        y: 0
      });
    }


    gameState.apples = gameState.apples.filter(apple => {
      apple.y++;
      

      if (apple.y === 3 && apple.x === gameState.basketPosition) {
        gameState.score++;
        return false;
      }
      

      if (apple.y >= 4) {
        return false;
      }
      
      return true;
    });


    if (gameState.timeLeft <= 0 || gameState.score >= 15) {
      gameState.gameOver = true;
      gameState.active = false;
      clearInterval(gameInterval);
      

      await endAppleHarvestGame(interaction, userId);
      return;
    }


    if (!gameState.updating) {
      const gameEmbed = await createGameEmbed(gameState);
      const gameButtons = createGameButtons(userId);
      
      interaction.editReply({
        embeds: [gameEmbed],
        components: gameButtons
      }).catch(console.error);
    }

  }, 1000);
}


async function endAppleHarvestGame(interaction, userId) {
  try {
    const gameState = global.activeGames.get(userId);
    if (!gameState) return;


    gameState.active = false;
    gameState.gameOver = true;


    global.activeGames.delete(userId);


    const { addResource } = await import('../../models/ResourceModel.js');
    if (gameState.score > 0) {
      const bonuses = await getUserPonyBonuses(userId);
      const totalApples = gameState.score * bonuses.appleMultiplier;
      await addResource(userId, 'apples', totalApples);
      

      gameState.finalReward = totalApples;
      gameState.multiplier = bonuses.appleMultiplier;
    }


    const { setProductionTimer, startHarvest } = await import('../../models/FarmModel.js');
    await setProductionTimer(userId, 'apple', null);


    const { query } = await import('../../utils/database.js');
    await query(
      'UPDATE user_farms SET harvest_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );


    await startHarvest(userId);


    const bonuses = await getUserPonyBonuses(userId);
    const maxApples = bonuses.appleLimit;
    

    let resultMessage = '';
    let color = 0x03168f;
    
    if (gameState.score >= maxApples) {
      resultMessage = '🎉 **Perfect Harvest!** You collected the maximum amount of apples!';
      color = 0x00ff00;
    } else if (gameState.score >= Math.floor(maxApples * 0.66)) {
      resultMessage = '👍 **Good Harvest!** You collected most of the apples!';
      color = 0xffff00;
    } else if (gameState.score > 0) {
      resultMessage = '😊 **Partial Harvest!** You collected some apples!';
      color = 0xff8800;
    } else {
      resultMessage = '😞 **No Harvest!** Better luck next time!';
      color = 0xff0000;
    }

    const finalReward = gameState.finalReward || gameState.score;
    const multiplier = gameState.multiplier || 1;
    let rewardText = `**Reward:** +${finalReward} 🍎 apples`;
    if (multiplier > 1) {
      rewardText += ` (${gameState.score} × ${multiplier} pony bonus!)`;
    }

    const finalEmbed = createEmbed({
      title: '🍎 Harvest Complete!',
      description: `${resultMessage}\n\n**Final Score:** ${gameState.score}/${maxApples} apples\n${rewardText}\n\nYour apples have been added to your resources!`,
      color: color,
      user: { id: userId }
    });


    try {
      return await interaction.editReply({
        embeds: [finalEmbed],
        components: []
      });
    } catch (editError) {

      if (interaction.message) {
        return await interaction.message.edit({
          embeds: [finalEmbed],
          components: []
        });
      }
      console.error('Could not update apple game message:', editError);
    }

  } catch (error) {
    console.error('Error ending apple harvest game:', error);
  }
}

async function endAppleHarvestGameTimeout(userId) {
  try {
    const gameState = global.activeGames?.get(userId);
    if (!gameState) return;


    gameState.active = false;
    gameState.gameOver = true;


    global.activeGames.delete(userId);


    const { addResource } = await import('../../models/ResourceModel.js');
    if (gameState.score > 0) {
      await addResource(userId, 'apples', gameState.score);
    }


    const { setProductionTimer } = await import('../../models/FarmModel.js');
    await setProductionTimer(userId, 'apple', null);


    const { query } = await import('../../utils/database.js');
    await query(
      'UPDATE user_farms SET harvest_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );

    console.log(`Apple harvest game ended for user ${userId} with score ${gameState.score}`);

  } catch (error) {
    console.error('Error ending apple harvest game on timeout:', error);
  }
}

export async function handleGameMove(interaction, userId, direction) {
  const gameState = global.activeGames.get(userId);
  if (!gameState || !gameState.active || gameState.gameOver) {

    return;
  }


  if (gameState.updating) {
    return;
  }
  gameState.updating = true;


  if (direction === 'left' && gameState.basketPosition > 0) {
    gameState.basketPosition -= 1;
  } else if (direction === 'right' && gameState.basketPosition < 11) {
    gameState.basketPosition += 1;
  }


  gameState.apples = gameState.apples.filter((apple, index) => {
    if (apple.y === 3 && apple.x === gameState.basketPosition) {
      gameState.score++;
      return false;
    }
    return true;
  });


  await interaction.update({
    embeds: [await createGameEmbed(gameState)],
    components: createGameButtons(userId)
  });


  gameState.updating = false;


  if (gameState.score >= 15) {
    gameState.active = false;
    gameState.gameOver = true;
    await endAppleHarvestGame(interaction, userId);
  }
}




async function startEggSnakeGame(interaction, userId) {
  try {
    const gameState = {
      userId,
      snake: [{x: 4, y: 4}],
      direction: {x: 1, y: 0},
      eggs: [],
      score: 0,
      timeLeft: 90,
      gameOver: false,
      active: true,
      updating: false,
      fieldSize: 8
    };


    generateEgg(gameState);


    const gameEmbed = await createSnakeGameEmbed(gameState);
    const gameButtons = createSnakeGameButtons(userId);


    global.activeGames = global.activeGames || new Map();
    global.activeGames.set(userId, gameState);


    startSnakeGameLoop(interaction, userId);

    return interaction.editReply({
      embeds: [gameEmbed],
      components: gameButtons
    });

  } catch (error) {
    console.error('Error starting egg snake game:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'Failed to start the egg collection game.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


function generateEgg(gameState) {
  let eggPosition;
  let attempts = 0;
  
  do {
    eggPosition = {
      x: Math.floor(Math.random() * gameState.fieldSize),
      y: Math.floor(Math.random() * gameState.fieldSize)
    };
    attempts++;
  } while (
    attempts < 50 &&
    gameState.snake.some(segment => segment.x === eggPosition.x && segment.y === eggPosition.y)
  );
  
  gameState.eggs = [eggPosition];
}


async function createSnakeGameEmbed(gameState) {
  const bonuses = await getUserPonyBonuses(gameState.userId);
  const maxEggs = bonuses.eggLimit;
  
  const field = [];
  

  for (let y = 0; y < gameState.fieldSize; y++) {
    field.push(new Array(gameState.fieldSize).fill(':blue_square:'));
  }
  

  gameState.snake.forEach(segment => {
    if (segment.x >= 0 && segment.x < gameState.fieldSize && 
        segment.y >= 0 && segment.y < gameState.fieldSize) {
      field[segment.y][segment.x] = ':green_square:';
    }
  });
  

  gameState.eggs.forEach(egg => {
    if (egg.x >= 0 && egg.x < gameState.fieldSize && 
        egg.y >= 0 && egg.y < gameState.fieldSize) {
      field[egg.y][egg.x] = '🥚';
    }
  });
  

  const fieldString = field.map(row => row.join('')).join('\n');
  
  const minutes = Math.floor(gameState.timeLeft / 60);
  const seconds = gameState.timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return createEmbed({
    title: '🐍 Egg Snake Collection',
    description: `Collect eggs to grow your snake! Don't hit your own tail!\n\n${fieldString}\n\n**Score:** ${gameState.score}/${maxEggs} eggs 🥚\n**Length:** ${gameState.snake.length} segments\n**Time:** ${timeString}`,
    color: 0x03168f,
    user: { id: gameState.userId }
  });
}


function createSnakeGameButtons(userId) {

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`snake_disabled_1_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`snake_up_${userId}`)
      .setLabel('⬆️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`snake_disabled_2_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );


  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`snake_left_${userId}`)
      .setLabel('⬅️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`snake_disabled_center_${userId}`)
      .setLabel('🐍')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`snake_right_${userId}`)
      .setLabel('➡️')
      .setStyle(ButtonStyle.Primary)
  );


  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`snake_disabled_3_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`snake_down_${userId}`)
      .setLabel('⬇️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`snake_disabled_4_${userId}`)
      .setLabel('⬜')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );

  return [row1, row2, row3];
}


function startSnakeGameLoop(interaction, userId) {
  const gameInterval = setInterval(async () => {
    const gameState = global.activeGames?.get(userId);
    if (!gameState || gameState.gameOver) {
      clearInterval(gameInterval);
      return;
    }


    gameState.timeLeft--;


    const head = gameState.snake[0];
    const newHead = {
      x: head.x + gameState.direction.x,
      y: head.y + gameState.direction.y
    };


    if (newHead.x < 0) newHead.x = gameState.fieldSize - 1;
    if (newHead.x >= gameState.fieldSize) newHead.x = 0;
    if (newHead.y < 0) newHead.y = gameState.fieldSize - 1;
    if (newHead.y >= gameState.fieldSize) newHead.y = 0;


    const hitTail = gameState.snake.some(segment => 
      segment.x === newHead.x && segment.y === newHead.y
    );

    if (hitTail) {
      gameState.gameOver = true;
      gameState.active = false;
      clearInterval(gameInterval);
      await endEggSnakeGame(interaction, userId);
      return;
    }


    gameState.snake.unshift(newHead);


    const eggIndex = gameState.eggs.findIndex(egg => 
      egg.x === newHead.x && egg.y === newHead.y
    );

    if (eggIndex !== -1) {

      gameState.score++;
      gameState.eggs.splice(eggIndex, 1);
      

      if (gameState.eggs.length === 0) {
        generateEgg(gameState);
      }
    } else {

      gameState.snake.pop();
    }


    if (gameState.timeLeft <= 0 || gameState.score >= 15) {
      gameState.gameOver = true;
      gameState.active = false;
      clearInterval(gameInterval);
      await endEggSnakeGame(interaction, userId);
      return;
    }


    if (!gameState.updating) {
      const gameEmbed = await createSnakeGameEmbed(gameState);
      const gameButtons = createSnakeGameButtons(userId);
      
      interaction.editReply({
        embeds: [gameEmbed],
        components: gameButtons
      }).catch(console.error);
    }

  }, 1000);
}


export async function handleSnakeMove(interaction, userId, direction) {
  const gameState = global.activeGames.get(userId);
  if (!gameState || !gameState.active || gameState.gameOver) {

    return;
  }


  if (gameState.updating) {
    return;
  }


  let newDirection;
  switch (direction) {
    case 'up':
      newDirection = {x: 0, y: -1};
      break;
    case 'down':
      newDirection = {x: 0, y: 1};
      break;
    case 'left':
      newDirection = {x: -1, y: 0};
      break;
    case 'right':
      newDirection = {x: 1, y: 0};
      break;
    default:
      return;
  }


  const currentDirection = gameState.direction;
  if (newDirection.x === -currentDirection.x && newDirection.y === -currentDirection.y) {

    return;
  }


  gameState.direction = newDirection;


  await interaction.deferUpdate();
}


async function endEggSnakeGame(interaction, userId) {
  try {
    const gameState = global.activeGames.get(userId);
    if (!gameState) return;


    gameState.active = false;
    gameState.gameOver = true;


    global.activeGames.delete(userId);


    const { addResource } = await import('../../models/ResourceModel.js');
    if (gameState.score > 0) {
      const bonuses = await getUserPonyBonuses(userId);
      const totalEggs = gameState.score * bonuses.eggMultiplier;
      await addResource(userId, 'eggs', totalEggs);
      

      gameState.finalReward = totalEggs;
      gameState.multiplier = bonuses.eggMultiplier;
    }


    const { setProductionTimer, startHarvest } = await import('../../models/FarmModel.js');
    await setProductionTimer(userId, 'chicken', null);


    const { query } = await import('../../utils/database.js');
    await query(
      'UPDATE user_farms SET harvest_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );


    await startHarvest(userId);


    const bonuses = await getUserPonyBonuses(userId);
    const maxEggs = bonuses.eggLimit;
    

    let resultMessage = '';
    let color = 0x03168f;
    
    if (gameState.score >= maxEggs) {
      resultMessage = '🎉 **Perfect Collection!** You collected the maximum amount of eggs!';
      color = 0x00ff00;
    } else if (gameState.score >= Math.floor(maxEggs * 0.8)) {
      resultMessage = '👍 **Great Collection!** You collected most of the eggs!';
      color = 0xffff00;
    } else if (gameState.score >= Math.floor(maxEggs * 0.5)) {
      resultMessage = '😊 **Good Collection!** You collected a decent amount!';
      color = 0xff8800;
    } else if (gameState.score > 0) {
      resultMessage = '🐣 **Some Collection!** You collected some eggs!';
      color = 0xff8800;
    } else {
      resultMessage = '😞 **No Collection!** Better luck next time!';
      color = 0xff0000;
    }

    const finalReward = gameState.finalReward || gameState.score;
    const multiplier = gameState.multiplier || 1;
    let rewardText = `**Reward:** +${finalReward} 🥚 eggs`;
    if (multiplier > 1) {
      rewardText += ` (${gameState.score} × ${multiplier} pony bonus!)`;
    }

    const finalEmbed = createEmbed({
      title: '🥚 You have collected the eggs!',
      description: `${resultMessage}\n\n**Final Score:** ${gameState.score}/${maxEggs} eggs 🥚\n**Snake Length:** ${gameState.snake.length} segments\n${rewardText}\n\nYour eggs have been added to your resources!`,
      color: color,
      user: { id: userId }
    });


    try {
      return await interaction.editReply({
        embeds: [finalEmbed],
        components: []
      });
    } catch (editError) {

      if (interaction.message) {
        return await interaction.message.edit({
          embeds: [finalEmbed],
          components: []
        });
      }
      console.error('Could not update egg game message:', editError);
    }

  } catch (error) {
    console.error('Error ending egg snake game:', error);
  }
}


async function startMilkFlappyGame(interaction, userId) {

  const activeGame = global.activeGames?.get(userId);
  if (activeGame && activeGame.active && !activeGame.gameOver) {
    return interaction.editReply({
      embeds: [createEmbed({
        title: '🎮 Active Game',
        description: 'You already have an active milk collection game! Finish your current game before starting a new one.',
        color: 0x3498db,
        user: { id: userId }
      })],
      ephemeral: true
    });
  }

  try {

    const bonuses = await getUserPonyBonuses(userId);
    const maxMilk = bonuses.milkLimit;
    

    const gameState = {
      birdRow: 3,
      obstacles: [],
      milkItems: [],
      score: 0,
      gameOver: false,
      active: true,
      startTime: Date.now(),
      timeLimit: 90000
    };



    let nextPipeColumn = 3;
    
    while (nextPipeColumn < 7) {

      const upperPipeHeight = Math.floor(Math.random() * 3) + 1;
      

      const gapSize = 2;
      

      const lowerPipeStart = upperPipeHeight + gapSize;
      

      const lowerPipeHeight = 7 - lowerPipeStart;
      
      if (lowerPipeHeight >= 1 && lowerPipeHeight <= 3) {

        for (let row = 0; row < upperPipeHeight; row++) {
          gameState.obstacles.push(`${row}-${nextPipeColumn}`);
        }
        

        for (let row = lowerPipeStart; row < 7; row++) {
          gameState.obstacles.push(`${row}-${nextPipeColumn}`);
        }
        

        if (Math.random() < 0.6) {
          const gapRow = upperPipeHeight + Math.floor(gapSize / 2);
          gameState.milkItems.push(`${gapRow}-${nextPipeColumn}`);
        }
        

        nextPipeColumn += Math.floor(Math.random() * 2) + 2;
      } else {

        nextPipeColumn++;
      }
    }


    if (!global.activeGames) global.activeGames = new Map();
    global.activeGames.set(userId, gameState);


    let gameField = '';
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const pos = `${row}-${col}`;
        if (col === 0 && row === gameState.birdRow) {
          gameField += '🐄';
        } else if (gameState.obstacles.includes(pos)) {
          gameField += '🟢';
        } else if (gameState.milkItems.includes(pos)) {
          gameField += '🥛';
        } else {
          gameField += '🟦';
        }
      }
      gameField += '\n';
    }

    const embed = createEmbed({
      title: '🥛 Milk Collection Game',
      description: `Guide the cow through the green pipes and collect milk!\n\nScore: ${gameState.score}/${maxMilk} 🥛\nTime: 1:30 ⏰\n\n${gameField}\n\n🐄 = Cow\n🟢 = Pipes (avoid!)\n🥛 = Milk (collect!)\n🟦 = Sky`,
      color: 0x3498db,
      user: { id: userId }
    });


    const upButton = new ButtonBuilder()
      .setCustomId(`milk_move_up_${userId}`)
      .setLabel('⬆️ Up')
      .setStyle(ButtonStyle.Primary);

    const downButton = new ButtonBuilder()
      .setCustomId(`milk_move_down_${userId}`)
      .setLabel('⬇️ Down')
      .setStyle(ButtonStyle.Primary);

    const superUpButton = new ButtonBuilder()
      .setCustomId(`milk_move_super_up_${userId}`)
      .setLabel('⏫ Super Up')
      .setStyle(ButtonStyle.Secondary);

    const superDownButton = new ButtonBuilder()
      .setCustomId(`milk_move_super_down_${userId}`)
      .setLabel('⏬ Super Down')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(upButton, superUpButton);
    const row2 = new ActionRowBuilder().addComponents(downButton, superDownButton);

    return await interaction.editReply({
      embeds: [embed],
      components: [row1, row2]
    });

  } catch (error) {
    console.error('Error starting milk flappy game:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'Failed to start the milk collection game.',
        color: 0xe74c3c,
        user: { id: userId }
      })],
      ephemeral: true
    });
  }
}


export async function handleMilkMove(interaction, userId, direction) {
  const gameState = global.activeGames?.get(userId);
  if (!gameState || !gameState.active || gameState.gameOver) {
    return interaction.reply({
      embeds: [createEmbed({
        title: 'No Active Game',
        description: 'You don\'t have an active milk collection game.',
        color: 0xe74c3c,
        user: { id: userId }
      })],
      ephemeral: true
    });
  }


  const currentTime = Date.now();
  const timeElapsed = currentTime - gameState.startTime;
  if (timeElapsed >= gameState.timeLimit) {
    gameState.gameOver = true;
    gameState.active = false;
    return await endMilkFlappyGame(interaction, userId, 'Time\'s up! ⏰');
  }

  try {
    await interaction.deferUpdate();


    const bonuses = await getUserPonyBonuses(userId);
    const maxMilk = bonuses.milkLimit;


    let newRow = gameState.birdRow;
    if (direction === 'up') {
      newRow = Math.max(0, gameState.birdRow - 1);
    } else if (direction === 'down') {
      newRow = Math.min(6, gameState.birdRow + 1);
    } else if (direction === 'super_up') {
      newRow = Math.max(0, gameState.birdRow - 3);
    } else if (direction === 'super_down') {
      newRow = Math.min(6, gameState.birdRow + 3);
    }

    gameState.birdRow = newRow;


    const newObstacles = [];
    const newMilkItems = [];

    gameState.obstacles.forEach(pos => {
      const [row, col] = pos.split('-').map(Number);
      if (col > 0) {
        newObstacles.push(`${row}-${col - 1}`);
      }
    });

    gameState.milkItems.forEach(pos => {
      const [row, col] = pos.split('-').map(Number);
      if (col > 0) {
        newMilkItems.push(`${row}-${col - 1}`);
      }
    });

    gameState.obstacles = newObstacles;
    gameState.milkItems = newMilkItems;


    const cowPos = `${gameState.birdRow}-0`;
    if (gameState.milkItems.includes(cowPos)) {
      const bonuses = await getUserPonyBonuses(userId);
      const milkPerCollection = bonuses.milkMultiplier;
      gameState.score += milkPerCollection;
      gameState.milkItems = gameState.milkItems.filter(pos => pos !== cowPos);
    }


    if (gameState.obstacles.includes(cowPos)) {
      gameState.gameOver = true;
      gameState.active = false;
      return await endMilkFlappyGame(interaction, userId);
    }


    if (Math.random() < 0.6) {

      const upperPipeHeight = Math.floor(Math.random() * 3) + 1;
      

      const gapSize = 2;
      

      const lowerPipeStart = upperPipeHeight + gapSize;
      

      const lowerPipeHeight = 7 - lowerPipeStart;
      
      if (lowerPipeHeight >= 1 && lowerPipeHeight <= 3) {

        for (let row = 0; row < upperPipeHeight; row++) {
          gameState.obstacles.push(`${row}-6`);
        }
        

        for (let row = lowerPipeStart; row < 7; row++) {
          gameState.obstacles.push(`${row}-6`);
        }
        

        if (Math.random() < 0.5) {
          const gapRow = upperPipeHeight + Math.floor(gapSize / 2);
          gameState.milkItems.push(`${gapRow}-6`);
        }
      }
    }


    if (gameState.score >= 15) {
      gameState.gameOver = true;
      gameState.active = false;
      return await endMilkFlappyGame(interaction, userId);
    }


    let gameField = '';
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const pos = `${row}-${col}`;
        if (col === 0 && row === gameState.birdRow) {
          gameField += '🐄';
        } else if (gameState.obstacles.includes(pos)) {
          gameField += '🟢';
        } else if (gameState.milkItems.includes(pos)) {
          gameField += '🥛';
        } else {
          gameField += '🟦';
        }
      }
      gameField += '\n';
    }


    const currentTime = Date.now();
    const timeElapsed = currentTime - gameState.startTime;
    const timeRemaining = Math.max(0, gameState.timeLimit - timeElapsed);
    const seconds = Math.ceil(timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeDisplay = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;

    const embed = createEmbed({
      title: '🥛 Milk Collection Game',
      description: `Guide the cow through the green pipes and collect milk!\n\nScore: ${gameState.score}/${maxMilk} 🥛\nTime: ${timeDisplay} ⏰\n\n${gameField}\n\n🐄 = Cow\n🟢 = Pipes (avoid!)\n🥛 = Milk (collect!)\n🟦 = Sky`,
      color: 0x3498db,
      user: { id: userId }
    });

    const upButton = new ButtonBuilder()
      .setCustomId(`milk_move_up_${userId}`)
      .setLabel('⬆️ Up')
      .setStyle(ButtonStyle.Primary);

    const downButton = new ButtonBuilder()
      .setCustomId(`milk_move_down_${userId}`)
      .setLabel('⬇️ Down')
      .setStyle(ButtonStyle.Primary);

    const superUpButton = new ButtonBuilder()
      .setCustomId(`milk_move_super_up_${userId}`)
      .setLabel('⏫ Super Up')
      .setStyle(ButtonStyle.Secondary);

    const superDownButton = new ButtonBuilder()
      .setCustomId(`milk_move_super_down_${userId}`)
      .setLabel('⏬ Super Down')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(upButton, superUpButton);
    const row2 = new ActionRowBuilder().addComponents(downButton, superDownButton);

    return await interaction.editReply({
      embeds: [embed],
      components: [row1, row2]
    });

  } catch (error) {
    console.error('Error in milk game move:', error);
  }
}


export async function endMilkFlappyGame(interaction, userId, reason = null) {
  try {
    const gameState = global.activeGames?.get(userId);
    if (!gameState) return;


    if (gameState.score > 0) {
      const { updateResources, getResourcesByUserId } = await import('../../models/ResourceModel.js');
      const currentResources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0, milk: 0 };
      

      const bonuses = await getUserPonyBonuses(userId);
      const totalMilk = gameState.score * bonuses.milkMultiplier;
      

      await updateResources(userId, {
        wood: currentResources.wood,
        stone: currentResources.stone,
        tools: currentResources.tools,
        milk: (currentResources.milk || 0) + totalMilk
      });
      

      gameState.finalReward = totalMilk;
      gameState.multiplier = bonuses.milkMultiplier;
    }


    const { query } = await import('../../utils/database.js');
    await query(
      'UPDATE user_farms SET harvest_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
    console.log(`Cleared harvest status for user ${userId} after milk collection`);


    await query(
      'DELETE FROM production_timers WHERE user_id = ? AND production_type = ?',
      [userId, 'milk']
    );


    const { startHarvest } = await import('../../models/FarmModel.js');
    await startHarvest(userId);


    global.activeGames?.delete(userId);


    let resultMessage = reason ? reason : '🎉 Harvest completed successfully!';
    let color = 0x00ff00;
    

    const bonuses = await getUserPonyBonuses(userId);
    const maxMilk = bonuses.milkLimit;
    
    if (!reason) {
      if (gameState.score >= maxMilk) {
        resultMessage += ' Perfect collection!';
      } else if (gameState.score >= Math.floor(maxMilk * 0.66)) {
        resultMessage += ' Great job!';
      } else if (gameState.score >= Math.floor(maxMilk * 0.33)) {
        resultMessage += ' Good effort!';
      } else {
        resultMessage += ' Keep practicing!';
      }
    }

    const finalReward = gameState.finalReward || gameState.score;
    const multiplier = gameState.multiplier || 1;
    let rewardText = `**Reward:** +${finalReward} 🥛 milk`;
    if (multiplier > 1) {
      rewardText += ` (${gameState.score} × ${multiplier} Milky Way bonus!)`;
    }

    const finalEmbed = createEmbed({
      title: '🥛 Milk Harvest Complete!',
      description: `${resultMessage}\n\n**Milk Collected:** ${gameState.score}/${maxMilk} bottles 🥛\n${rewardText}\n\nYour fresh milk has been added to your resources!`,
      color: color,
      user: { id: userId }
    });


    try {
      return await interaction.editReply({
        embeds: [finalEmbed],
        components: []
      });
    } catch (editError) {

      if (interaction.message) {
        return await interaction.message.edit({
          embeds: [finalEmbed],
          components: []
        });
      }
      console.error('Could not update milk game message:', editError);
    }

  } catch (error) {
    console.error('Error ending milk flappy game:', error);
  }
}


async function handleFarmHarvestView(interaction, userId) {
  try {
    await interaction.deferUpdate();
    

    const resources = await getResourcesByUserId(userId) || { apples: 0, eggs: 0, milk: 0 };
    
    const embed = createEmbed({
      title: '🌾 My Harvest',
      description: `Here are your collected harvest resources:\n\n🍎 **Apples:** ${resources.apples || 0}\n🥚 **Eggs:** ${resources.eggs || 0}\n🥛 **Milk:** ${resources.milk || 0}\n\nYou can trade your harvest resources for cases! The more resources you have, the better rewards you can get.`,
      color: 0x03168f,
      user: interaction.user
    });


    const buttons = [];
    

    const appleTradeButton = new ButtonBuilder()
      .setCustomId(`farm_trade_apples_${userId}`)
      .setLabel(`Trade Apples (${resources.apples || 0})`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🍎')
      .setDisabled((resources.apples || 0) < 10);
    buttons.push(appleTradeButton);


    const eggTradeButton = new ButtonBuilder()
      .setCustomId(`farm_trade_eggs_${userId}`)
      .setLabel(`Trade Eggs (${resources.eggs || 0})`)
      .setStyle(ButtonStyle.Secondary) 
      .setEmoji('🥚')
      .setDisabled((resources.eggs || 0) < 10);
    buttons.push(eggTradeButton);


    const milkTradeButton = new ButtonBuilder()
      .setCustomId(`farm_trade_milk_${userId}`)
      .setLabel(`Trade Milk (${resources.milk || 0})`)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🥛')
      .setDisabled((resources.milk || 0) < 10);
    buttons.push(milkTradeButton);


    const backButton = new ButtonBuilder()
      .setCustomId(`farm_back_main_${userId}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Primary);


    const row1 = new ActionRowBuilder().addComponents(buttons);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    return await interaction.editReply({
      embeds: [embed],
      components: [row1, row2]
    });

  } catch (error) {
    console.error('Error viewing farm harvest:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while viewing your harvest.',
        color: 0xe74c3c,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function handleFarmPonyBonuses(interaction, userId) {
  try {
    await interaction.deferUpdate();
    
    const bonuses = await getUserPonyBonuses(userId);
    
    let description = `**🐎 Earth Ponies (${bonuses.earthCount}):**\n`;
    if (bonuses.earthCount >= 20) {
      description += `🍎 Apple Production: **4x multiplier** (limit: 40)\n`;
    } else if (bonuses.earthCount >= 10) {
      description += `🍎 Apple Production: **3x multiplier** (limit: 25)\n`;
    } else if (bonuses.earthCount >= 5) {
      description += `🍎 Apple Production: **2x multiplier** (limit: 25)\n`;
    } else {
      description += `🍎 Apple Production: **1x multiplier** (limit: 15)\n`;
    }
    description += `*Need 5/10/20 earth ponies for bonuses*\n\n`;

    description += `**🦅 Pegasus Ponies (${bonuses.pegasusCount}):**\n`;
    if (bonuses.pegasusCount >= 20) {
      description += `🥚 Egg Production: **4x multiplier** (limit: 40)\n`;
    } else if (bonuses.pegasusCount >= 10) {
      description += `🥚 Egg Production: **3x multiplier** (limit: 25)\n`;
    } else if (bonuses.pegasusCount >= 5) {
      description += `🥚 Egg Production: **2x multiplier** (limit: 25)\n`;
    } else {
      description += `🥚 Egg Production: **1x multiplier** (limit: 15)\n`;
    }
    description += `*Need 5/10/20 pegasus ponies for bonuses*\n\n`;

    description += `**🥛 Special Ponies:**\n`;
    if (bonuses.hasMilkyWay) {
      description += `✅ **Milky Way** - Milk Production: **5x multiplier** (limit: 50)\n`;
    } else {
      description += `❌ **Milky Way** - Milk Production: **1x multiplier** (limit: 15)\n`;
      description += `*Find Milky Way pony for massive milk bonus!*\n`;
    }

    description += `\n**How to get ponies:**\n`;
    description += `• Use \`/friendship\` command to encounter wild ponies\n`;
    description += `• Trade with other players\n`;
    description += `• Participate in events`;

    const embed = createEmbed({
      title: '🦄 Pony Production Bonuses',
      description: description,
      color: 0x9b59b6,
      user: interaction.user
    });

    const backButton = new ButtonBuilder()
      .setCustomId(`farm_back_${userId}`)
      .setLabel('Back to Farm')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(backButton);

    return await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

  } catch (error) {
    console.error('Error viewing pony bonuses:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while viewing pony bonuses.',
        color: 0xe74c3c,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function handleFarmTrade(interaction, userId, resourceType) {
  try {
    await interaction.deferUpdate();
    

    const resources = await getResourcesByUserId(userId) || { apples: 0, eggs: 0, milk: 0, case: 0 };
    console.log(`[TRADE DEBUG] User ${userId} resources before trade:`, resources);
    
    const resourceAmount = resources[resourceType] || 0;
    

    if (resourceAmount < 10) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Insufficient Resources',
          description: `You need at least 10 ${resourceType} to trade, but you only have ${resourceAmount}.`,
          color: 0xe74c3c,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
    

    const random = Math.random();
    let caseAmount;
    if (random < 0.60) {
      caseAmount = 1;
    } else if (random < 0.85) {
      caseAmount = 2;
    } else {
      caseAmount = 3;
    }
    

    

    const resourcesUsed = 10;
    

    const newResources = { ...resources };
    newResources[resourceType] = resourceAmount - resourcesUsed;
    

    const currentCases = newResources.cases || 0;
    newResources.cases = currentCases + caseAmount;
    
    console.log(`[TRADE DEBUG] Resources before update:`, resources);
    console.log(`[TRADE DEBUG] Resources after update:`, newResources);
    
    await updateResources(userId, newResources);
    

    const verifyResources = await getResourcesByUserId(userId);
    console.log(`[TRADE DEBUG] Resources after save:`, verifyResources);
    
    const resourceEmojis = {
      apples: '🍎',
      eggs: '🥚', 
      milk: '🥛'
    };
    
    const embed = createEmbed({
      title: '✅ Trade Successful!',
      description: `You traded **${resourcesUsed}** ${resourceEmojis[resourceType]} ${resourceType} for **${caseAmount}** case${caseAmount > 1 ? 's' : ''}!\n\n<:case:1417301084291993712> Cases received: ${caseAmount}\n${resourceEmojis[resourceType]} ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} remaining: ${newResources[resourceType]}`,
      color: 0x00ff00,
      user: interaction.user
    });
    

    const backButton = new ButtonBuilder()
      .setCustomId(`farm_harvest_view_${userId}`)
      .setLabel('Back to Harvest')
      .setStyle(ButtonStyle.Primary);
      
    const actionRow = new ActionRowBuilder().addComponents(backButton);
    
    return await interaction.editReply({
      embeds: [embed],
      components: [actionRow]
    });
    
  } catch (error) {
    console.error('Error trading harvest:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while trading your harvest.',
        color: 0xe74c3c,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}

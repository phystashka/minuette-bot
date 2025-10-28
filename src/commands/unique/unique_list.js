import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  AttachmentBuilder,
  MessageFlags
} from 'discord.js';
import { query, getRow } from '../../utils/database.js';
import { getPony } from '../../utils/pony/index.js';
import { getHarmony, removeHarmony } from '../../models/HarmonyModel.js';
import { 
  getUniquePonyUpgrade, 
  upgradeUniquePony, 
  getAllUserUniqueUpgrades 
} from '../../models/UniquePonyModel.js';
import { getImageInfo } from '../../utils/imageResolver.js';

const UPGRADE_COSTS = [0, 500, 1000, 2000];
const CRIME_BONUSES = [0, 25, 35, 45];
const ECHO_UPGRADE_COST = 1500;

function createErrorContainer(message) {
  const container = new ContainerBuilder();
  
  const errorText = new TextDisplayBuilder()
    .setContent(`**❌ Error**\n-# ${message}`);
  container.addTextDisplayComponents(errorText);
  
  return container;
}

export async function execute(interaction) {
  try {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    const pony = await getPony(userId);
    if (!pony) {
      const noPonyContainer = createErrorContainer('You need to create a pony first with `/equestria`!');
      return await interaction.editReply({
        content: '',
        components: [noPonyContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    const uniquePonies = await query(
      'SELECT name, description, image FROM pony_friends WHERE rarity = ? ORDER BY name',
      ['UNIQUE']
    );
    
    if (uniquePonies.length === 0) {
      const noUniquesContainer = createErrorContainer('No unique ponies found in database.');
      return await interaction.editReply({
        content: '',
        components: [noUniquesContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    await displayUniquePonyPage(interaction, userId, 0, uniquePonies);
    
  } catch (error) {
    console.error('Error in unique ponies list:', error);
    
    const errorContainer = createErrorContainer('Failed to load unique ponies. Please try again later.');
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '',
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    } else {
      await interaction.editReply({
        content: '',
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
}

async function displayUniquePonyPage(interaction, userId, currentIndex, uniquePonies) {
  try {
    const userHarmony = await getHarmony(userId);
    const userUpgrades = await getAllUserUniqueUpgrades(userId);
    const upgradeMap = new Map(userUpgrades.map(u => [u.pony_name, u.upgrade_level]));
    
    const userCollection = await query(
      'SELECT pf.name FROM pony_friends pf JOIN friendship f ON pf.id = f.friend_id WHERE f.user_id = ?',
      [userId]
    );
    const ownedPonies = new Set(userCollection.map(p => p.name));
    
    const profilePony = await getRow(
      'SELECT pf.name FROM pony_friends pf JOIN friendship f ON pf.id = f.friend_id WHERE f.user_id = ? AND f.is_profile_pony = 1',
      [userId]
    );
    const profilePonyName = profilePony?.name || null;
    
    const currentPony = uniquePonies[currentIndex];
    const owned = ownedPonies.has(currentPony.name);
    const upgradeLevel = upgradeMap.get(currentPony.name) || 0;
    const isEquipped = profilePonyName === currentPony.name;
    
    let statusText = '';
    if (!owned) {
      statusText = '❌ Not owned';
    } else {
      statusText = `✅ Owned`;
      if (isEquipped) {
        statusText += ' 📌 (Equipped)';
      }
      
      if (currentPony.name === 'Lucky Roll' && upgradeLevel > 0) {
        statusText += ` | Crime boost: +${CRIME_BONUSES[upgradeLevel]}%`;
      }
      
      if (currentPony.name === 'Echo' && upgradeLevel > 0) {
        statusText += ` | Feed efficiency: x2`;
      }
    }
    
    let upgradeInfo = '';
    let upgradeDescription = '';
    
    if (currentPony.name === 'Echo') {
      if (upgradeLevel < 1) {
        upgradeInfo = `**Upgrade Level:** ${upgradeLevel}/1\n**Upgrade Cost:** ${ECHO_UPGRADE_COST} harmony`;
      } else {
        upgradeInfo = `**Upgrade Level:** 1/1`;
      }
    } else {
      if (upgradeLevel < 3) {
        const nextCost = UPGRADE_COSTS[upgradeLevel + 1];
        upgradeInfo = `**Upgrade Level:** ${upgradeLevel}/3\n**Next Upgrade Cost:** ${nextCost} harmony`;
      } else {
        upgradeInfo = `**Upgrade Level:** 3/3`;
      }
    }

    if (currentPony.name === 'Lucky Roll') {
      upgradeDescription = `Improves success chance for \/crime.\nLevels:\n• Lvl 1: +${CRIME_BONUSES[1]}% success\n• Lvl 2: +${CRIME_BONUSES[2]}% success\n• Lvl 3: +${CRIME_BONUSES[3]}% success`;
    } else if (currentPony.name === 'Echo') {
      upgradeDescription = `Doubles feeding efficiency in \/feed.\nApple: 2 levels instead of 1\nEggs: 4 levels instead of 2\nMilk: 6 levels instead of 3`;
    } else {
      upgradeDescription = 'No upgrades available for this pony yet.';
    }
    
    let headerText = `**🌟 Unique Ponies Collection**\n-# Page ${currentIndex + 1}/${uniquePonies.length} • Your harmony: ${userHarmony} <:harmony:1416514347789844541>\n\n`;
    
    if (currentPony.name === 'Lucky Roll' && owned && isEquipped && upgradeLevel > 0) {
      headerText += `**⭐ Active Bonus:** Lucky Roll (+${CRIME_BONUSES[upgradeLevel]}% crime success)\n\n`;
    }
    
    if (currentPony.name === 'Echo' && owned && isEquipped && upgradeLevel > 0) {
      headerText += `**⭐ Active Bonus:** Echo (x2 feeding efficiency)\n\n`;
    }
    
    const container = new ContainerBuilder();
    
    const headerTextDisplay = new TextDisplayBuilder()
      .setContent(headerText);
    container.addTextDisplayComponents(headerTextDisplay);
    
    const separator1 = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);
    container.addSeparatorComponents(separator1);
    
    const ponyNameText = new TextDisplayBuilder()
      .setContent(`**${currentPony.name}**`);
    container.addTextDisplayComponents(ponyNameText);
    
    const ponyDescText = new TextDisplayBuilder()
      .setContent(currentPony.description);
    container.addTextDisplayComponents(ponyDescText);
    
    const files = [];
    if (currentPony.image) {
      const imageInfo = getImageInfo(currentPony.image);
      if (imageInfo && imageInfo.type === 'attachment') {
        const ponyGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL(`attachment://${imageInfo.filename}`)
          );
        container.addMediaGalleryComponents(ponyGallery);
        
        files.push(new AttachmentBuilder(imageInfo.attachmentPath, { name: imageInfo.filename }));
      } else if (imageInfo && imageInfo.type === 'url') {
        const ponyGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL(currentPony.image)
          );
        container.addMediaGalleryComponents(ponyGallery);
      }
    }
    
    const statusTextDisplay = new TextDisplayBuilder()
      .setContent(statusText);
    container.addTextDisplayComponents(statusTextDisplay);
    
    if (upgradeInfo) {
      const separator2 = new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small);
      container.addSeparatorComponents(separator2);
      
      const upgradeTextDisplay = new TextDisplayBuilder()
        .setContent(upgradeInfo);
      container.addTextDisplayComponents(upgradeTextDisplay);
      
      const upgradeDescDisplay = new TextDisplayBuilder()
        .setContent(`**Upgrade effect:** ${upgradeDescription}`);
      container.addTextDisplayComponents(upgradeDescDisplay);
    }
    
    const buttons = [];
    
    const prevButton = new ButtonBuilder()
      .setCustomId(`unique_prev_${userId}_${currentIndex}`)
      .setEmoji('<:previous:1422550660401860738>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex <= 0);
    buttons.push(prevButton);
    
    if (currentPony.name === 'Lucky Roll' && owned && upgradeLevel < 3) {
      const nextCost = UPGRADE_COSTS[upgradeLevel + 1];
      const canUpgrade = userHarmony >= nextCost;
      
      const upgradeButton = new ButtonBuilder()
        .setCustomId(`upgrade_lucky_roll_${userId}_${currentIndex}`)
        .setLabel(`Upgrade (${nextCost})`)
        .setEmoji('<:harmony:1416514347789844541>')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canUpgrade);
      buttons.push(upgradeButton);
    } else if (currentPony.name === 'Echo' && owned && upgradeLevel < 1) {
      const canUpgrade = userHarmony >= ECHO_UPGRADE_COST;
      
      const upgradeButton = new ButtonBuilder()
        .setCustomId(`upgrade_echo_${userId}_${currentIndex}`)
        .setLabel(`Upgrade (${ECHO_UPGRADE_COST})`)
        .setEmoji('<:harmony:1416514347789844541>')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canUpgrade);
      buttons.push(upgradeButton);
    } else {
      const upgradeButton = new ButtonBuilder()
        .setCustomId(`upgrade_disabled_${userId}`)
        .setLabel('Upgrade')
        .setEmoji('<:harmony:1416514347789844541>')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
      buttons.push(upgradeButton);
    }
    
    const nextButton = new ButtonBuilder()
      .setCustomId(`unique_next_${userId}_${currentIndex}`)
      .setEmoji('<:next:1422550658846031953>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex >= uniquePonies.length - 1);
    buttons.push(nextButton);
    
    const actionRow = new ActionRowBuilder().addComponents(buttons);
    container.addActionRowComponents(actionRow);
    
    const replyOptions = {
      content: '',
      components: [container],
      flags: MessageFlags.IsComponentsV2
    };
    
    if (files.length > 0) {
      replyOptions.files = files;
    }
    
    await interaction.editReply(replyOptions);
    
  } catch (error) {
    console.error('Error displaying unique pony page:', error);
    
    const errorContainer = createErrorContainer('Failed to display unique pony. Please try again later.');
    await interaction.editReply({
      content: '',
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

export async function handleNavigationButton(interaction) {
  try {
    const parts = interaction.customId.split('_');
    const direction = parts[1];
    const userId = parts[2];
    const currentIndex = parseInt(parts[3]);
    
    if (interaction.user.id !== userId) {
      const accessDeniedContainer = createErrorContainer('You can only navigate your own unique ponies list.');
      return await interaction.reply({
        content: '',
        components: [accessDeniedContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    await interaction.deferUpdate();
    
    const uniquePonies = await query(
      'SELECT name, description, image FROM pony_friends WHERE rarity = ? ORDER BY name',
      ['UNIQUE']
    );
    
    let newIndex = currentIndex;
    if (direction === 'prev') {
      newIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'next') {
      newIndex = Math.min(uniquePonies.length - 1, currentIndex + 1);
    }
    
    await displayUniquePonyPage(interaction, userId, newIndex, uniquePonies);
    
  } catch (error) {
    console.error('Error handling navigation:', error);
    
    const errorContainer = createErrorContainer('Failed to navigate. Please try again.');
    await interaction.editReply({
      content: '',
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

export async function handleUpgradeButton(interaction) {
  try {
    const parts = interaction.customId.split('_');
    const userId = parts[3];
    const currentIndex = parseInt(parts[4]) || 0;
    
    if (interaction.user.id !== userId) {
      const accessDeniedContainer = createErrorContainer('You can only upgrade your own ponies.');
      return await interaction.reply({
        content: '',
        components: [accessDeniedContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    await interaction.deferUpdate();
    
    const userHarmony = await getHarmony(userId);
    const currentLevel = await getUniquePonyUpgrade(userId, 'Lucky Roll');
    
    if (currentLevel >= 3) {
      const maxLevelContainer = createErrorContainer('Lucky Roll is already at maximum level.');
      return await interaction.editReply({
        content: '',
        components: [maxLevelContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    const upgradeCost = UPGRADE_COSTS[currentLevel + 1];
    
    if (userHarmony < upgradeCost) {
      const insufficientContainer = createErrorContainer(`You need ${upgradeCost} harmony to upgrade Lucky Roll. You have ${userHarmony}.`);
      return await interaction.editReply({
        content: '',
        components: [insufficientContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    const userCollection = await query(
      'SELECT pf.name FROM pony_friends pf JOIN friendship f ON pf.id = f.friend_id WHERE f.user_id = ? AND pf.name = ?',
      [userId, 'Lucky Roll']
    );
    
    if (userCollection.length === 0) {
      const notOwnedContainer = createErrorContainer('You need to own Lucky Roll to upgrade it.');
      return await interaction.editReply({
        content: '',
        components: [notOwnedContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    const newLevel = currentLevel + 1;
    const success = await upgradeUniquePony(userId, 'Lucky Roll', newLevel);
    
    if (!success) {
      const upgradeFailContainer = createErrorContainer('Failed to upgrade Lucky Roll. Please try again.');
      return await interaction.editReply({
        content: '',
        components: [upgradeFailContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    await removeHarmony(userId, upgradeCost);
    
    const successContainer = new ContainerBuilder();
    const successText = new TextDisplayBuilder()
      .setContent(`**✅ Upgrade Successful!**\n-# Lucky Roll upgraded to level ${newLevel}/3\n\nCrime success boost: +${CRIME_BONUSES[newLevel]}%\nHarmony spent: ${upgradeCost} <:harmony:1416514347789844541>`);
    successContainer.addTextDisplayComponents(successText);
    
    const backButton = new ButtonBuilder()
      .setCustomId(`unique_back_${userId}_${currentIndex}`)
      .setLabel('Back to Unique Ponies')
      .setStyle(ButtonStyle.Secondary);
    
    const actionRow = new ActionRowBuilder().addComponents(backButton);
    successContainer.addActionRowComponents(actionRow);
    
    await interaction.editReply({
      content: '',
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
  } catch (error) {
    console.error('Error upgrading Lucky Roll:', error);
    
    const errorContainer = createErrorContainer('An error occurred while upgrading Lucky Roll.');
    await interaction.editReply({
      content: '',
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

export async function handleBackButton(interaction) {
  try {
    const parts = interaction.customId.split('_');
    const userId = parts[2];
    const currentIndex = parseInt(parts[3]) || 0;
    
    if (interaction.user.id !== userId) {
      const accessDeniedContainer = createErrorContainer('You can only view your own unique ponies.');
      return await interaction.reply({
        content: '',
        components: [accessDeniedContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    await interaction.deferUpdate();
    
    const uniquePonies = await query(
      'SELECT name, description, image FROM pony_friends WHERE rarity = ? ORDER BY name',
      ['UNIQUE']
    );
    
    await displayUniquePonyPage(interaction, userId, currentIndex, uniquePonies);
    
  } catch (error) {
    console.error('Error handling back button:', error);
    
    const errorContainer = createErrorContainer('Failed to go back. Please try again.');
    await interaction.editReply({
      content: '',
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

export async function handleUniquePonyButton(interaction) {
  try {
    const customId = interaction.customId;
    const parts = customId.split('_');
    const action = parts[1]; 
    const userId = parts[2];
    const currentIndex = parseInt(parts[3]) || 0;
    
    if (interaction.user.id !== userId) {
      const accessDeniedContainer = createErrorContainer('You can only use your own unique ponies buttons.');
      return await interaction.reply({
        content: '',
        components: [accessDeniedContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    await interaction.deferUpdate();
    
    const uniquePonies = await query(
      'SELECT name, description, image FROM pony_friends WHERE rarity = ? ORDER BY name',
      ['UNIQUE']
    );
    
    if (action === 'prev') {
      const newIndex = Math.max(0, currentIndex - 1);
      await displayUniquePonyPage(interaction, userId, newIndex, uniquePonies);
    } else if (action === 'next') {
      const newIndex = Math.min(uniquePonies.length - 1, currentIndex + 1);
      await displayUniquePonyPage(interaction, userId, newIndex, uniquePonies);
    } else if (customId.startsWith('upgrade_lucky_roll_')) {
      const userHarmony = await getHarmony(userId);
      const currentUpgrade = await getUniquePonyUpgrade(userId, 'Lucky Roll');
      const currentLevel = currentUpgrade ? currentUpgrade.upgrade_level : 0;
      
      if (currentLevel >= 3) {
        const maxLevelContainer = createErrorContainer('Lucky Roll is already at maximum level!');
        return await interaction.editReply({
          content: '',
          components: [maxLevelContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
      
      const upgradeCost = UPGRADE_COSTS[currentLevel + 1];
      
      if (userHarmony < upgradeCost) {
        const insufficientContainer = createErrorContainer(`Not enough harmony! You need ${upgradeCost} harmony but only have ${userHarmony}.`);
        return await interaction.editReply({
          content: '',
          components: [insufficientContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
      
      await removeHarmony(userId, upgradeCost);
      await upgradeUniquePony(userId, 'Lucky Roll', currentLevel + 1);
    
      await displayUniquePonyPage(interaction, userId, currentIndex, uniquePonies);
    } else if (customId.startsWith('upgrade_echo_')) {
      const userHarmony = await getHarmony(userId);
      const currentUpgrade = await getUniquePonyUpgrade(userId, 'Echo');
      const currentLevel = currentUpgrade ? currentUpgrade.upgrade_level : 0;
      
      if (currentLevel >= 1) {
        const maxLevelContainer = createErrorContainer('Echo is already at maximum level!');
        return await interaction.editReply({
          content: '',
          components: [maxLevelContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
      
      if (userHarmony < ECHO_UPGRADE_COST) {
        const insufficientContainer = createErrorContainer(`Not enough harmony! You need ${ECHO_UPGRADE_COST} harmony but only have ${userHarmony}.`);
        return await interaction.editReply({
          content: '',
          components: [insufficientContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
      
      await removeHarmony(userId, ECHO_UPGRADE_COST);
      await upgradeUniquePony(userId, 'Echo', 1);
      
      await displayUniquePonyPage(interaction, userId, currentIndex, uniquePonies);
    }
    
    return true;
  } catch (error) {
    console.error('Error handling unique pony button:', error);
    
    const errorContainer = createErrorContainer('Failed to handle button interaction. Please try again.');
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '',
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    } else {
      await interaction.editReply({
        content: '',
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    return false;
  }
}
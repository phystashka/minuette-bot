import { SlashCommandBuilder, AttachmentBuilder, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { 
  getBingoCard, 
  createBingoCard, 
  createBingoTable 
} from '../../models/BingoModel.js';
import { 
  generateRandomBingoGrid, 
  createBingoImageWithHeader 
} from '../../utils/bingoGenerator.js';
import { 
  getBingoImageFromCache, 
  setBingoImageCache 
} from '../../utils/bingoImageCache.js';
import { 
  calculateBingoRewardForDisplay 
} from '../../utils/bingoManager.js';

function createLoadingContainer() {
  const container = new ContainerBuilder();
  
  const loadingText = new TextDisplayBuilder()
    .setContent('<a:loading_line:1416130253428097135> **Loading your bingo card...**');
  container.addTextDisplayComponents(loadingText);
  
  return container;
}

function getHammerTime(date) {
  const timestamp = Math.floor(date.getTime() / 1000);
  return `<t:${timestamp}:R>`;
}

function getNextBingoResetTime() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCHours(24, 0, 0, 0);
  return nextMidnight;
}

function logBingoGrid(userId, username, gridData, completedPositions) {
  console.log(`\n[BINGO GRID] User: ${username} (${userId})`);
  console.log('┌─────┬─────┬─────┬─────┬─────┐');
  
  for (let row = 0; row < 5; row++) {
    let rowText = '│';
    for (let col = 0; col < 5; col++) {
      const position = row * 5 + col;
      const ponyName = gridData[position];
      const isCompleted = completedPositions.includes(position);
      
      let displayName = ponyName.replace(/_/g, ' ').substring(0, 3);
      if (isCompleted) {
        displayName = `[X]${displayName}`.substring(0, 5);
      }
      displayName = displayName.padEnd(5);
      
      rowText += displayName + '│';
    }
    console.log(rowText);
    
    if (row < 4) {
      console.log('├─────┼─────┼─────┼─────┼─────┤');
    }
  }
  
  console.log('└─────┴─────┴─────┴─────┴─────┘');
  
  console.log('\n[BINGO POSITIONS]');
  for (let row = 0; row < 5; row++) {
    let positions = '';
    let ponies = '';
    for (let col = 0; col < 5; col++) {
      const position = row * 5 + col;
      const ponyName = gridData[position];
      const isCompleted = completedPositions.includes(position);
      
      positions += (position + 1).toString().padEnd(3);
      ponies += (isCompleted ? '[X] ' : '') + ponyName.replace(/_/g, ' ') + (col < 4 ? ', ' : '');
    }
    console.log(`${positions} | ${ponies}`);
  }
  console.log(`Completed positions: [${completedPositions.map(p => p + 1).join(', ')}]\n`);
}

export const data = new SlashCommandBuilder()
  .setName('bingo')
  .setDescription('View your pony bingo card or generate a new one');

export async function execute(interaction) {
  try {
    const loadingContainer = createLoadingContainer();
    await interaction.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    await createBingoTable();

    const userId = interaction.user.id;
    const guildId = userId === '1372601851781972038' ? null : interaction.guild?.id;

    let bingoCard = await getBingoCard(userId);

    if (!bingoCard) {
      try {
        const gridData = await generateRandomBingoGrid();
        await createBingoCard(userId, gridData);
        bingoCard = await getBingoCard(userId);
      } catch (error) {
        console.error('Error creating bingo card:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**❌ Bingo Card Generation Failed**\n\nUnable to generate your bingo card. Please make sure there are enough pony images available and try again later.');
          
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
          
        return interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }

    let gridData, completedPositions;
    try {
      gridData = JSON.parse(bingoCard.grid_data);
      completedPositions = JSON.parse(bingoCard.completed_positions);
    } catch (error) {
      console.error('Error parsing bingo card data:', error);
      
      const errorText = new TextDisplayBuilder()
        .setContent('**❌ Data Loading Error**\n\nUnable to load your bingo card data. Please try the command again.');
        
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
        
      return interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    logBingoGrid(userId, interaction.user.username, gridData, completedPositions);

    let imageBuffer;
    try {
      imageBuffer = getBingoImageFromCache(userId, gridData, completedPositions);
      
      if (!imageBuffer) {
        imageBuffer = await createBingoImageWithHeader(gridData, completedPositions);
        setBingoImageCache(userId, gridData, completedPositions, imageBuffer);
      }
    } catch (error) {
      console.error('Error creating bingo image:', error);
      
      const errorText = new TextDisplayBuilder()
        .setContent('**🖼️ Image Generation Error**\n\nUnable to generate your bingo card image. Please try again later.');
        
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
        
      return interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const potentialReward = calculateBingoRewardForDisplay(gridData);
    const nextResetTime = getNextBingoResetTime();
    const hammerTime = getHammerTime(nextResetTime);
    
    const attachment = new AttachmentBuilder(imageBuffer, { 
      name: 'bingo-card.png' 
    });

    const mediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://bingo-card.png`)
      );

    let statusContent;
    let statusTitle;
    
    if (bingoCard.is_completed) {
      statusTitle = "**BINGO COMPLETED!**";
      statusContent = `Congratulations! You've completed your bingo card!\n\n**Next Card Available:** ${hammerTime}`;
    } else {
      statusTitle = "**Your Bingo Card**";
      statusContent = `**Goal:** Complete 2 different line types\n**Reset:** ${hammerTime}\n\n**Maximum Potential Reward:**\n• ${potentialReward.keys} <a:goldkey:1426332679103709314> Keys\n• ${potentialReward.bits} <:bits:1429131029628588153> Bits\n• ${potentialReward.cases} <:case:1417301084291993712> Cases`;
      
      if (potentialReward.diamonds > 0) {
        statusContent += `\n• ${potentialReward.diamonds} <a:diamond:1423629073984524298> Gems`;
      }
      
      statusContent += `\n\n**Tier:** ${potentialReward.tier}\n-# *Actual reward depends on ponies in completed lines*`;
    }

    const statusText = new TextDisplayBuilder()
      .setContent(`${statusTitle}\n\n${statusContent}`);

    const separator = new SeparatorBuilder()
      .setSpacing(SeparatorSpacingSize.Small);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(statusText)
      .addSeparatorComponents(separator)
      .addMediaGalleryComponents(mediaGallery);

    await interaction.editReply({
      components: [container],
      files: [attachment],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (error) {
    console.error('Error in bingo command:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('**⚠️ Unexpected Error**\n\nAn unexpected error occurred while processing your bingo card. Please try again later.');
      
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    if (interaction.deferred) {
      await interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
  }
}
import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
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
  calculateBingoRewardForDisplay,
  getTimeUntilBingoReset 
} from '../../utils/bingoManager.js';
import { t } from '../../utils/localization.js';

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
    await interaction.deferReply();

    await createBingoTable();

    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    let bingoCard = await getBingoCard(userId);

    if (!bingoCard) {
      try {
        const gridData = await generateRandomBingoGrid();
        await createBingoCard(userId, gridData);
        bingoCard = await getBingoCard(userId);
      } catch (error) {
        console.error('Error generating bingo card:', error);
        return interaction.editReply({
          content: 'Error generating bingo card. Please make sure there are enough pony images available.',
          ephemeral: true
        });
      }
    }

    let gridData, completedPositions;
    try {
      gridData = JSON.parse(bingoCard.grid_data);
      completedPositions = JSON.parse(bingoCard.completed_positions);
    } catch (error) {
      console.error('Error parsing bingo card data:', error);
      return interaction.editReply({
        content: 'Error loading your bingo card. Please try again.',
        ephemeral: true
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
      return interaction.editReply({
        content: 'Error generating bingo image. Please try again later.',
        ephemeral: true
      });
    }

    const potentialReward = calculateBingoRewardForDisplay(gridData);
    const timeUntilReset = getTimeUntilBingoReset();
    
    let statusText = '';
    if (bingoCard.is_completed) {
      statusText = `**COMPLETED!** New card available in: **${timeUntilReset}**`;
    } else {
      statusText = `**Goal:** Complete 2 different line types\n**Reset in:** ${timeUntilReset}\n**Max potential reward:** ${potentialReward.keys} <a:goldkey:1426332679103709314>, ${potentialReward.bits} <:bits:1411354539935666197>, ${potentialReward.cases} <:case:1417301084291993712>`;
      if (potentialReward.diamonds > 0) {
        statusText += `, ${potentialReward.diamonds} <a:diamond:1423629073984524298>`;
      }
      statusText += ` (${potentialReward.tier})\n*Actual reward depends on ponies in completed lines*`;
    }

    const attachment = new AttachmentBuilder(imageBuffer, { 
      name: 'bingo-card.png' 
    });

    await interaction.editReply({
      content: statusText,
      files: [attachment]
    });

  } catch (error) {
    console.error('Error in bingo command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'An error occurred while processing your bingo card.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: 'An error occurred while processing your bingo card.',
        ephemeral: true
      });
    }
  }
}
import { 
  getBingoCard, 
  checkPonyInBingo, 
  updateBingoCard, 
  checkBingoWin,
  getCompletedLinePositions 
} from '../models/BingoModel.js';
import { createEmbed } from './components.js';
import { invalidateBingoCache } from './bingoImageCache.js';
import { addResource, addCases } from '../models/ResourceModel.js';
import { addBits } from './pony/index.js';
import { PONY_DATA } from '../models/FriendshipModel.js';

export const checkBingoUpdate = async (userId, ponyName) => {
  try {
    const bingoCard = await getBingoCard(userId);
    if (!bingoCard || bingoCard.is_completed) {
      return null; 
    }

    const position = await checkPonyInBingo(userId, ponyName);
    if (position === null) {
      return null; 
    }

    const completedPositions = JSON.parse(bingoCard.completed_positions);
    completedPositions.push(position);

    const isWin = checkBingoWin(completedPositions);

    const lineInfo = getLineTypesCompleted(completedPositions);

    let reward = null;
    if (isWin) {
      const gridData = JSON.parse(bingoCard.grid_data);
      const completedLinePositions = getCompletedLinePositions(completedPositions);
      reward = await giveBingoRewards(userId, gridData, completedLinePositions);
    }

    await updateBingoCard(userId, completedPositions, isWin);

    invalidateBingoCache(userId);

    return {
      position,
      completedPositions,
      isWin,
      totalCompleted: completedPositions.length,
      lineTypes: lineInfo,
      reward: reward
    };

  } catch (error) {
    console.error('Error checking bingo update:', error);
    return null;
  }
};

export const createBingoUpdateEmbed = (ponyName, updateResult) => {
  const { position, completedPositions, isWin, totalCompleted, lineTypes, reward } = updateResult;
  
  if (isWin) {
    const completedLines = lineTypes.lines.join(', ');
    let rewardText = '';
    
    if (reward) {
      rewardText = `**Rewards (${reward.tier}):**\n`;
      rewardText += `+${reward.bits} bits, +${reward.keys} keys, +${reward.cases} cases`;
      if (reward.diamonds > 0) {
        rewardText += `, +${reward.diamonds} diamonds`;
      }
    }
    
    return createEmbed({
      title: 'BINGO! You Won!',
      description: `**${ponyName}** completed your bingo! You got 2 different line types!\n\n${rewardText}`,
      color: 0x00FF00,
      fields: [
        {
          name: 'Completed Lines',
          value: completedLines,
          inline: false
        }
      ],
      footer: {
        text: 'A new bingo card will be available after reset!'
      },
      timestamp: new Date()
    });
  } else {
    const progress = lineTypes.needsMore 
      ? `Need ${2 - lineTypes.count} more different line type${2 - lineTypes.count > 1 ? 's' : ''}!`
      : 'You have completed lines but need 2 different types!';
    
    return createEmbed({
      title: 'Bingo Progress!',
      description: `**${ponyName}** was on your bingo card!`,
      color: 0xF4A460,
      fields: [
        {
          name: 'Progress',
          value: progress,
          inline: false
        }
      ],
      footer: {
        text: 'Complete 2 different line types (row + column, row + diagonal, or column + diagonal) to win!'
      },
      timestamp: new Date()
    });
  }
};


export const getGridPosition = (position) => {
  const row = Math.floor(position / 5) + 1;
  const col = String.fromCharCode(65 + (position % 5)); 
  return `${col}${row}`;
};

export const getCompletedLines = (completedPositions) => {
  const grid = Array(25).fill(false);
  completedPositions.forEach(pos => {
    grid[pos] = true;
  });
  
  const completedLines = [];
  let lineTypes = { rows: 0, columns: 0, diagonals: 0 };
  
  for (let row = 0; row < 5; row++) {
    let rowComplete = true;
    for (let col = 0; col < 5; col++) {
      if (!grid[row * 5 + col]) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) {
      completedLines.push(`Row ${row + 1}`);
      lineTypes.rows++;
    }
  }

  for (let col = 0; col < 5; col++) {
    let colComplete = true;
    for (let row = 0; row < 5; row++) {
      if (!grid[row * 5 + col]) {
        colComplete = false;
        break;
      }
    }
    if (colComplete) {
      completedLines.push(`Column ${String.fromCharCode(65 + col)}`);
      lineTypes.columns++;
    }
  }

  let mainDiagonalComplete = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i * 5 + i]) {
      mainDiagonalComplete = false;
      break;
    }
  }
  if (mainDiagonalComplete) {
    completedLines.push('Main Diagonal');
    lineTypes.diagonals++;
  }
  
  let antiDiagonalComplete = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i * 5 + (4 - i)]) {
      antiDiagonalComplete = false;
      break;
    }
  }
  if (antiDiagonalComplete) {
    completedLines.push('Anti-Diagonal');
    lineTypes.diagonals++;
  }
  
  return { lines: completedLines, types: lineTypes };
};

export const getLineTypesCompleted = (completedPositions) => {
  const result = getCompletedLines(completedPositions);
  let completedLineTypes = 0;
  
  if (result.types.rows > 0) completedLineTypes++;
  if (result.types.columns > 0) completedLineTypes++;
  if (result.types.diagonals > 0) completedLineTypes++;
  
  return {
    count: completedLineTypes,
    needsMore: completedLineTypes < 2,
    lines: result.lines
  };
};

export const calculateBingoReward = (gridData, completedLinePositions) => {
  const poniesInCompletedLines = completedLinePositions.map(position => gridData[position]);
  
  const ponyRarities = poniesInCompletedLines.map(ponyName => {
    const pony = PONY_DATA.find(p => 
      p.name.toLowerCase().replace(/\s+/g, '_') === ponyName.toLowerCase()
    );
    return pony ? pony.rarity : 'BASIC';
  });

  if (ponyRarities.includes('SECRET')) {
    return {
      keys: 20,
      bits: 10000,
      cases: 30,
      diamonds: 30,
      tier: 'SECRET'
    };
  } else if (ponyRarities.includes('LEGEND')) {
    return {
      keys: 10,
      bits: 4000,
      cases: 15,
      diamonds: 10,
      tier: 'LEGENDARY'
    };
  } else if (ponyRarities.includes('MYTHIC')) {
    return {
      keys: 7,
      bits: 3000,
      cases: 10,
      diamonds: 5,
      tier: 'MYTHIC'
    };
  } else if (ponyRarities.filter(r => r === 'EPIC').length >= 2) {
    return {
      keys: 5,
      bits: 2500,
      cases: 7,
      diamonds: 0,
      tier: 'EPIC (2+)'
    };
  } else {
    return {
      keys: 3,
      bits: 1500,
      cases: 5,
      diamonds: 0,
      tier: 'BASIC/RARE'
    };
  }
};

export const calculateBingoRewardForDisplay = (gridData) => {
  const ponyRarities = gridData.map(ponyName => {
    const pony = PONY_DATA.find(p => 
      p.name.toLowerCase().replace(/\s+/g, '_') === ponyName.toLowerCase()
    );
    return pony ? pony.rarity : 'BASIC';
  });
  if (ponyRarities.includes('SECRET')) {
    return {
      keys: 20,
      bits: 10000,
      cases: 30,
      diamonds: 30,
      tier: 'SECRET'
    };
  } else if (ponyRarities.includes('LEGEND')) {
    return {
      keys: 10,
      bits: 4000,
      cases: 15,
      diamonds: 10,
      tier: 'LEGENDARY'
    };
  } else if (ponyRarities.includes('MYTHIC')) {
    return {
      keys: 7,
      bits: 3000,
      cases: 10,
      diamonds: 5,
      tier: 'MYTHIC'
    };
  } else if (ponyRarities.filter(r => r === 'EPIC').length >= 2) {
    return {
      keys: 5,
      bits: 2500,
      cases: 7,
      diamonds: 0,
      tier: 'EPIC (2+)'
    };
  } else {
    return {
      keys: 3,
      bits: 1500,
      cases: 5,
      diamonds: 0,
      tier: 'BASIC/RARE'
    };
  }
};

export const giveBingoRewards = async (userId, gridData, completedLinePositions) => {
  try {
    const reward = calculateBingoReward(gridData, completedLinePositions);

    await addBits(userId, reward.bits);
    
    if (reward.keys > 0) {
      await addResource(userId, 'keys', reward.keys);
    }
    
    if (reward.cases > 0) {
      await addCases(userId, reward.cases);
    }
  
    if (reward.diamonds > 0) {
      await addResource(userId, 'diamonds', reward.diamonds);
    }
    
    return reward;
  } catch (error) {
    console.error('Error giving bingo rewards:', error);
    throw error;
  }
};

export const getTimeUntilBingoReset = () => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCHours(24, 0, 0, 0);
  
  const timeUntilReset = nextMidnight.getTime() - now.getTime();
  const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};

export const resetAllCompletedBingoCards = async () => {
  try {
    const { getCompletedBingoCards, resetBingoCard } = await import('../models/BingoModel.js');
    const { generateRandomBingoGrid } = await import('./bingoGenerator.js');
    
    const completedCards = await getCompletedBingoCards();
    let resetCount = 0;
    
    for (const card of completedCards) {
      try {
        const newGridData = await generateRandomBingoGrid();
        await resetBingoCard(card.user_id, newGridData);
        resetCount++;
        

        invalidateBingoCache(card.user_id);
      } catch (error) {
        console.error(`Error resetting bingo card for user ${card.user_id}:`, error);
      }
    }
    
    return resetCount;
  } catch (error) {
    console.error('Error resetting completed bingo cards:', error);
    throw error;
  }
};
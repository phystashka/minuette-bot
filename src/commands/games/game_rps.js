import { 
  ContainerBuilder, 
  SectionBuilder, 
  TextDisplayBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ActionRowBuilder
} from 'discord.js';
import { query } from '../../utils/database.js';
import { addResource } from '../../models/ResourceModel.js';
import { getPonyByUserId, addBits, removeBits } from '../../models/PonyModel.js';

// Command data is now exported from game.js
// This file only contains the execute function for the rps subcommand

const activeGames = new Map();

const CHOICES = {
  rock: { emoji: '🪨', name: 'Rock' },
  paper: { emoji: '📄', name: 'Paper' },
  scissors: { emoji: '✂️', name: 'Scissors' }
};

export async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
    
    const opponent = interaction.options.getUser('opponent');
    const betAmount = interaction.options.getInteger('bet') || 0;
    const challenger = interaction.user;

    if (opponent.id === challenger.id) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('You cannot challenge yourself!');
      container.addTextDisplayComponents(errorText);
      
      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (opponent.bot) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('You cannot challenge a bot!');
      container.addTextDisplayComponents(errorText);
      
      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (betAmount > 0) {
      const challengerBits = await getUserBits(challenger.id);
      const opponentBits = await getUserBits(opponent.id);
      
      if (challengerBits < betAmount) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`You don't have enough bits! You have ${challengerBits.toLocaleString()}, need ${betAmount.toLocaleString()}.`);
        container.addTextDisplayComponents(errorText);
        
        return interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
      
      if (opponentBits < betAmount) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`<@${opponent.id}> doesn't have enough bits for this bet! They have ${opponentBits.toLocaleString()}, need ${betAmount.toLocaleString()}.`);
        container.addTextDisplayComponents(errorText);
        
        return interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }

    const container = new ContainerBuilder();
    
    let gameText = `**Rock Paper Scissors**\n\n<@${challenger.id}> challenges <@${opponent.id}>!`;
    if (betAmount > 0) {
      gameText += `\nBet: ${betAmount.toLocaleString()} <:bits:1429131029628588153>`;
    }
    
    const gameDisplay = new TextDisplayBuilder()
      .setContent(gameText);
    container.addTextDisplayComponents(gameDisplay);

    const gameButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`rps_accept_${challenger.id}_${opponent.id}_${betAmount}`)
          .setLabel('Accept')
          .setEmoji('<:like:1422566402308575402>')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`rps_decline_${challenger.id}_${opponent.id}_${betAmount}`)
          .setLabel('Decline')
          .setEmoji('<:dislike:1422566400433717259>')
          .setStyle(ButtonStyle.Danger)
      );

    container.addActionRowComponents(gameButtons);

    const challengeId = `${challenger.id}_${opponent.id}_${Date.now()}`;
    
    const challengeTimeout = setTimeout(async () => {
      const challengeData = activeGames.get(challengeId);
      if (challengeData && challengeData.phase === 'challenge') {
        try {
          const timeoutContainer = new ContainerBuilder();
          const timeoutText = new TextDisplayBuilder()
            .setContent(`**Rock Paper Scissors**\n\n~~<@${challenger.id}> challenges <@${opponent.id}>!~~\n\n**Challenge expired** - No response received within 1 minute.`);
          timeoutContainer.addTextDisplayComponents(timeoutText);

          await interaction.editReply({
            components: [timeoutContainer],
            flags: MessageFlags.IsComponentsV2
          });
        } catch (error) {
          console.error('Error handling challenge timeout:', error);
        }
        activeGames.delete(challengeId);
      }
    }, 60000);
    
    activeGames.set(challengeId, {
      challenger: challenger.id,
      opponent: opponent.id,
      betAmount: betAmount,
      phase: 'challenge',
      createdAt: Date.now(),
      challengeTimeout: challengeTimeout
    });

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (error) {
    console.error('Error in rockpaperscissors command:', error);
    
    try {
      await interaction.editReply({
        content: 'An error occurred while creating the game.',
        components: []
      });
    } catch (editError) {
      await interaction.reply({
        content: 'An error occurred while creating the game.',
        ephemeral: true
      });
    }
  }
}

async function startGame(interaction, challenger, opponent, betAmount) {
  const gameId = `${challenger.id}_${opponent.id}_${Date.now()}`;
  
  const challengeKey = `${challenger.id}_${opponent.id}`;
  for (const [key, value] of activeGames.entries()) {
    if (key.startsWith(challengeKey) && value.phase === 'challenge' && value.challengeTimeout) {
      clearTimeout(value.challengeTimeout);
      activeGames.delete(key);
      break;
    }
  }
  
  const gameState = {
    challenger: challenger.id,
    opponent: opponent.id,
    choices: new Map(),
    phase: 'playing',
    betAmount: betAmount,
    createdAt: Date.now()
  };
  
  activeGames.set(gameId, gameState);

  const container = new ContainerBuilder();
  
  let gameText = `**Rock Paper Scissors**\n\n${challenger.displayName} vs ${opponent.displayName}`;
  if (betAmount > 0) {
    gameText += `\nBet: ${betAmount.toLocaleString()} <:bits:1429131029628588153>`;
  }
  gameText += '\n\nMake your choice!';
  
  const gameDisplay = new TextDisplayBuilder()
    .setContent(gameText);
  container.addTextDisplayComponents(gameDisplay);

  const choiceButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`rps_choice_rock_${gameId}`)
        .setEmoji('🪨')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`rps_choice_paper_${gameId}`)
        .setEmoji('📄')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`rps_choice_scissors_${gameId}`)
        .setEmoji('✂️')
        .setStyle(ButtonStyle.Secondary)
    );

  container.addActionRowComponents(choiceButtons);

  setTimeout(() => {
    handleGameTimeout(interaction, challenger, opponent, gameId);
  }, 60000);

  await interaction.update({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleGameTimeout(interaction, challenger, opponent, gameId) {
  try {
    const container = new ContainerBuilder();
    
    const timeoutText = new TextDisplayBuilder()
      .setContent(`**Game Expired**\n\nThe rock-paper-scissors game between ${challenger.displayName} and ${opponent.displayName} has timed out.`);
    container.addTextDisplayComponents(timeoutText);

    const timeoutSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Game Timed Out')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('disabled')
          .setLabel('Expired')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

    container.addSectionComponents(timeoutSection);

    activeGames.delete(gameId);

    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  } catch (error) {
    console.error('Error handling game timeout:', error);
  }
}

async function handleChoice(interaction, choice, gameId) {
  const gameState = activeGames.get(gameId);
  
  if (!gameState) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('This game is no longer active.');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

  if (interaction.user.id !== gameState.challenger && interaction.user.id !== gameState.opponent) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('You are not part of this game!');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

  if (gameState.choices.has(interaction.user.id)) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('You have already made your choice!');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

  gameState.choices.set(interaction.user.id, choice);

  if (gameState.choices.size === 2) {
    await startCountdown(interaction, gameState, gameId);
  } else {
    const container = new ContainerBuilder();
    
    const waitingText = new TextDisplayBuilder()
      .setContent(`**Rock Paper Scissors**\n\nWaiting for the other player...`);
    container.addTextDisplayComponents(waitingText);

    const choiceButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`rps_choice_rock_${gameId}`)
          .setEmoji('🪨')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`rps_choice_paper_${gameId}`)
          .setEmoji('📄')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`rps_choice_scissors_${gameId}`)
          .setEmoji('✂️')
          .setStyle(ButtonStyle.Secondary)
      );

    container.addActionRowComponents(choiceButtons);

    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

async function startCountdown(interaction, gameState, gameId) {
  for (let i = 3; i >= 1; i--) {
    const container = new ContainerBuilder();
    const countdownText = new TextDisplayBuilder()
      .setContent(`**Rock Paper Scissors**\n\nBoth players chose!\n\nRevealing results in ${i}...`);
    container.addTextDisplayComponents(countdownText);

    await interaction.message.edit({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  await revealResults(interaction, gameState, gameId);
}

async function revealResults(interaction, gameState, gameId) {
  const challengerChoice = gameState.choices.get(gameState.challenger);
  const opponentChoice = gameState.choices.get(gameState.opponent);
  
  const result = determineWinner(challengerChoice, opponentChoice);
  
  let resultText = `**Rock Paper Scissors Results**\n\n`;
  resultText += `<@${gameState.challenger}>: ${CHOICES[challengerChoice].emoji} ${CHOICES[challengerChoice].name}\n`;
  resultText += `<@${gameState.opponent}>: ${CHOICES[opponentChoice].emoji} ${CHOICES[opponentChoice].name}\n\n`;
  
  if (result === 'tie') {
    resultText += 'It\'s a tie!';
  } else if (result === 'challenger') {
    resultText += `<@${gameState.challenger}> wins!`;
    try {
      await addResource(gameState.challenger, 'magic_coins', 1);
      resultText += `\n\n+1 <:magic_coin:1431797469666217985> Magic Coin!`;
    } catch (error) {
      console.error('Error awarding magic coin:', error);
    }
    
    if (gameState.betAmount > 0) {
      await processBetWin(gameState.challenger, gameState.opponent, gameState.betAmount);
      resultText += `\nWon ${gameState.betAmount.toLocaleString()} <:bits:1429131029628588153>!`;
    }
  } else {
    resultText += `<@${gameState.opponent}> wins!`;
    try {
      await addResource(gameState.opponent, 'magic_coins', 1);
      resultText += `\n\n+1 <:magic_coin:1431797469666217985> Magic Coin!`;
    } catch (error) {
      console.error('Error awarding magic coin:', error);
    }
    
    if (gameState.betAmount > 0) {
      await processBetWin(gameState.opponent, gameState.challenger, gameState.betAmount);
      resultText += `\nWon ${gameState.betAmount.toLocaleString()} <:bits:1429131029628588153>!`;
    }
  }

  const container = new ContainerBuilder();
  const resultDisplay = new TextDisplayBuilder()
    .setContent(resultText);
  container.addTextDisplayComponents(resultDisplay);

  activeGames.delete(gameId);

  await interaction.message.edit({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

function determineWinner(choice1, choice2) {
  if (choice1 === choice2) return 'tie';
  
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) {
    return 'challenger';
  }
  
  return 'opponent';
}

export async function handleButtonInteraction(interaction) {
  try {
    const { customId } = interaction;
    
    if (customId.startsWith('rps_accept_')) {
      const parts = customId.split('_');
      const challengerId = parts[2];
      const opponentId = parts[3];
      const betAmount = parseInt(parts[4]) || 0;
      
      if (interaction.user.id !== challengerId && interaction.user.id !== opponentId) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('This challenge is not for you!');
        container.addTextDisplayComponents(errorText);
        
        return await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
      
      if (interaction.user.id !== opponentId) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('Only the challenged player can accept!');
        container.addTextDisplayComponents(errorText);
        
        return await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      const challenger = await interaction.client.users.fetch(challengerId);
      const opponent = interaction.user;
      
      await startGame(interaction, challenger, opponent, betAmount);
      
    } else if (customId.startsWith('rps_decline_')) {
      const parts = customId.split('_');
      const challengerId = parts[2];
      const opponentId = parts[3];
      
      if (interaction.user.id !== challengerId && interaction.user.id !== opponentId) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('This challenge is not for you!');
        container.addTextDisplayComponents(errorText);
        
        return await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
      
      if (interaction.user.id !== opponentId) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('Only the challenged player can decline!');
        container.addTextDisplayComponents(errorText);
        
        return await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      const challengeKey = `${challengerId}_${opponentId}`;
      for (const [key, value] of activeGames.entries()) {
        if (key.startsWith(challengeKey) && value.phase === 'challenge' && value.challengeTimeout) {
          clearTimeout(value.challengeTimeout);
          activeGames.delete(key);
          break;
        }
      }

      const container = new ContainerBuilder();
      const declineText = new TextDisplayBuilder()
        .setContent(`**Game Declined**\n\n<@${challengerId}>'s challenge was declined by <@${opponentId}>.`);
      container.addTextDisplayComponents(declineText);

      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
      
    } else if (customId.startsWith('rps_choice_')) {
      const parts = customId.split('_');
      const choice = parts[2];
      const gameId = parts.slice(3).join('_');
      const gameState = activeGames.get(gameId);
      
      if (!gameState) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('Game not found or expired!');
        container.addTextDisplayComponents(errorText);
        
        return await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
      
      if (interaction.user.id !== gameState.challenger && interaction.user.id !== gameState.opponent) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('You are not part of this game!');
        container.addTextDisplayComponents(errorText);
        
        return await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
      
      await handleChoice(interaction, choice, gameId);
    }
  } catch (error) {
    console.error('Error in RPS button interaction:', error);
  }
}

async function getUserBits(userId) {
  try {
    const pony = await getPonyByUserId(userId);
    return pony ? pony.bits : 0;
  } catch (error) {
    console.error('Error getting user bits:', error);
    return 0;
  }
}

async function processBetWin(winnerId, loserId, amount) {
  try {
    await addBits(winnerId, amount);
    await removeBits(loserId, amount);
  } catch (error) {
    console.error('Error processing bet:', error);
  }
}

export const category = 'utility';
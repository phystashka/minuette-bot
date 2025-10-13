
import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { query } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('rockpaperscissors')
  .setDescription('Play Rock Paper Scissors with another user')
  .setDMPermission(true)
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2])
  .addUserOption(option =>
    option
      .setName('opponent')
      .setDescription('User you want to play against')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('bet')
      .setDescription('Amount of bits to bet (optional, max 100,000)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(100000)
  );


const activeGames = new Map();

export async function execute(interaction) {
  await interaction.deferReply();
  
  try {
    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const betAmount = interaction.options.getInteger('bet') || 0;
    

    

    if (opponent.id === challenger.id) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: "❌ Invalid Game",
          description: "You cannot play against yourself!",
          color: 0xED4245
        })]
      });
    }
    
    if (opponent.bot) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: "❌ Invalid Game", 
          description: "You cannot play against a bot!",
          color: 0xED4245
        })]
      });
    }
    

    if (betAmount > 0) {
      const challengerBits = await getUserBits(challenger.id);
      const opponentBits = await getUserBits(opponent.id);
      

      
      if (challengerBits < betAmount) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: "❌ Insufficient Funds",
            description: `You don't have enough <:bits:1411354539935666197>! You have ${challengerBits.toLocaleString()}, but need ${betAmount.toLocaleString()}.`,
            color: 0xED4245
          })]
        });
      }
      
      if (opponentBits < betAmount) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: "❌ Insufficient Funds",
            description: `${opponent.displayName} doesn't have enough <:bits:1411354539935666197>! They have ${opponentBits.toLocaleString()}, but need ${betAmount.toLocaleString()}.`,
            color: 0xED4245
          })]
        });
      }
    }
    

    interaction.betAmount = betAmount;
    

    const inviteEmbed = createEmbed({
      title: "🪨📄✂️ Rock Paper Scissors Game Invitation",
      description: `${challenger.displayName} challenges ${opponent.displayName} to a game of Rock Paper Scissors!${betAmount > 0 ? `\n\n**Bet:** ${betAmount.toLocaleString()} <:bits:1411354539935666197>` : ''}\n\n${opponent.displayName}, do you accept the challenge?`,
      color: 0x5865F2,
      thumbnail: challenger.displayAvatarURL()
    });
    

    const inviteButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('rps_accept')
          .setEmoji('<:like:1422566402308575402>')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rps_decline')
          .setEmoji('<:dislike:1422566400433717259>')
          .setStyle(ButtonStyle.Danger)
      );
    
    const message = await interaction.editReply({
      embeds: [inviteEmbed],
      components: [inviteButtons]
    });
    

    const inviteCollector = message.createMessageComponentCollector({
      filter: i => (i.user.id === opponent.id || i.user.id === challenger.id) && 
                   (i.customId === 'rps_accept' || i.customId === 'rps_decline'),
      time: 60000
    });
    
    inviteCollector.on('collect', async (buttonInteraction) => {
      await buttonInteraction.deferUpdate();
      
      if (buttonInteraction.user.id !== opponent.id) {
        return buttonInteraction.followUp({
          content: "Only the challenged player can accept or decline!",
          ephemeral: true
        });
      }
      
      if (buttonInteraction.customId === 'rps_decline') {
        await buttonInteraction.editReply({
          embeds: [createEmbed({
            title: "🚫 Game Declined",
            description: `${opponent.displayName} declined the challenge.`,
            color: 0xED4245
          })],
          components: []
        });
        inviteCollector.stop();
        return;
      }
      

      buttonInteraction.betAmount = interaction.betAmount;
      await startGame(buttonInteraction, challenger, opponent);
      inviteCollector.stop();
    });
    
    inviteCollector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        interaction.editReply({
          embeds: [createEmbed({
            title: "⏰ Game Expired",
            description: "The invitation has expired.",
            color: 0xFEE75C
          })],
          components: []
        });
      }
    });
    
  } catch (error) {
    console.error('Error in rockpaperscissors command:', error);
    await interaction.editReply({
      embeds: [createEmbed({
        title: "❌ Error",
        description: "An error occurred while starting the game.",
        color: 0xED4245
      })]
    });
  }
}

async function startGame(interaction, player1, player2) {

  const firstPlayer = Math.random() < 0.5 ? player1 : player2;
  const secondPlayer = firstPlayer.id === player1.id ? player2 : player1;
  

  const gameState = {
    player1: player1.id,
    player2: player2.id,
    firstPlayer: firstPlayer.id,
    secondPlayer: secondPlayer.id,
    choices: new Map(),
    phase: 'first_choice',
    gameOver: false,
    betAmount: interaction.betAmount || 0
  };
  

  

  const gameEmbed = createGameEmbed(gameState, player1, player2);
  const gameButtons = createChoiceButtons();
  
  const message = await interaction.editReply({
    embeds: [gameEmbed],
    components: gameButtons
  });
  

  activeGames.set(message.id, gameState);
  

  const gameCollector = message.createMessageComponentCollector({
    filter: i => i.customId.startsWith('rps_'),
    time: 120000
  });
  
  gameCollector.on('collect', async (buttonInteraction) => {
    await handleGameChoice(buttonInteraction, message.id, player1, player2);
  });
  
  gameCollector.on('end', (collected, reason) => {
    if (reason === 'time') {
      const currentGame = activeGames.get(message.id);
      if (currentGame && !currentGame.gameOver) {
        interaction.editReply({
          embeds: [createEmbed({
            title: "⏰ Game Expired",
            description: "The game has expired due to inactivity.",
            color: 0xFEE75C
          })],
          components: []
        });
      }
    }
    activeGames.delete(message.id);
  });
}

async function handleGameChoice(interaction, messageId, player1, player2) {
  const gameState = activeGames.get(messageId);
  
  if (!gameState) {
    return interaction.reply({
      content: "This game is no longer active.",
      ephemeral: true
    });
  }
  
  if (gameState.gameOver) {
    return interaction.reply({
      content: "This game has already ended.",
      ephemeral: true
    });
  }
  

  if (interaction.user.id !== gameState.player1 && interaction.user.id !== gameState.player2) {
    return interaction.reply({
      content: "You are not part of this game!",
      ephemeral: true
    });
  }
  

  if (gameState.phase === 'first_choice' && interaction.user.id !== gameState.firstPlayer) {
    const firstPlayerName = gameState.firstPlayer === player1.id ? player1.displayName : player2.displayName;
    return interaction.reply({
      content: `It's ${firstPlayerName}'s turn to choose first!`,
      ephemeral: true
    });
  }
  
  if (gameState.phase === 'second_choice' && interaction.user.id !== gameState.secondPlayer) {
    const secondPlayerName = gameState.secondPlayer === player1.id ? player1.displayName : player2.displayName;
    return interaction.reply({
      content: `It's ${secondPlayerName}'s turn to choose!`,
      ephemeral: true
    });
  }
  

  if (gameState.choices.has(interaction.user.id)) {
    return interaction.reply({
      content: "You have already made your choice!",
      ephemeral: true
    });
  }
  

  const choice = interaction.customId.split('_')[1];
  

  gameState.choices.set(interaction.user.id, choice);
  
  await interaction.deferUpdate();
  

  if (gameState.phase === 'first_choice') {

    gameState.phase = 'second_choice';
    
    const gameEmbed = createGameEmbed(gameState, player1, player2);
    const gameButtons = createChoiceButtons();
    
    await interaction.editReply({
      embeds: [gameEmbed],
      components: gameButtons
    });
    
  } else if (gameState.phase === 'second_choice') {

    gameState.phase = 'revealing';
    gameState.gameOver = true;
    
    await revealResults(interaction, messageId, player1, player2);
  }
}

async function revealResults(interaction, messageId, player1, player2) {
  const gameState = activeGames.get(messageId);
  

  const countdownEmojis = ['🪨', '📄', '✂️'];
  
  for (let i = 0; i < 3; i++) {
    const countdownEmbed = createEmbed({
      title: "🪨📄✂️ Rock Paper Scissors",
      description: `⠀⠀⠀⠀⠀⠀⠀⠀${countdownEmojis[i]}⠀⠀⠀⠀⠀⠀⠀⠀\n\n${3 - i}...`,
      color: 0x5865F2
    });
    
    await interaction.editReply({
      embeds: [countdownEmbed],
      components: []
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  

  const player1Choice = gameState.choices.get(gameState.player1);
  const player2Choice = gameState.choices.get(gameState.player2);
  
  const winner = determineWinner(player1Choice, player2Choice);
  
  const choiceEmojis = {
    rock: '🪨',
    paper: '📄',
    scissors: '✂️'
  };
  
  const choiceNames = {
    rock: 'Rock',
    paper: 'Paper',
    scissors: 'Scissors'
  };
  
  let title, description, color;
  
  if (winner === 'tie') {
    title = "🤝 It's a Tie!";
    description = "Both players chose the same!";
    color = 0xFEE75C;
  } else if (winner === 'player1') {
    title = `🎉 ${player1.displayName} Wins!`;
    description = `${choiceNames[player1Choice]} beats ${choiceNames[player2Choice]}!${gameState.betAmount > 0 ? `\n\n**Winnings:** ${gameState.betAmount.toLocaleString()} <:bits:1411354539935666197>` : ''}`;
    color = 0x57F287;
  } else {
    title = `🎉 ${player2.displayName} Wins!`;
    description = `${choiceNames[player2Choice]} beats ${choiceNames[player1Choice]}!${gameState.betAmount > 0 ? `\n\n**Winnings:** ${gameState.betAmount.toLocaleString()} <:bits:1411354539935666197>` : ''}`;
    color = 0x57F287;
  }
  
  const resultEmbed = createEmbed({
    title,
    description,
    color
  });
  
  resultEmbed.addFields([
    {
      name: '🎮 Results',
      value: `${player1.displayName}: ${choiceEmojis[player1Choice]} ${choiceNames[player1Choice]}\n${player2.displayName}: ${choiceEmojis[player2Choice]} ${choiceNames[player2Choice]}${gameState.betAmount > 0 ? `\n\n**Bet:** ${gameState.betAmount.toLocaleString()} <:bits:1411354539935666197> each` : ''}`,
      inline: false
    }
  ]);
  
  await interaction.editReply({
    embeds: [resultEmbed],
    components: []
  });
  

  if (winner !== 'tie') {
    try {
      const winnerId = winner === 'player1' ? player1.id : player2.id;
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(winnerId, 'rps_wins');

      
      if (gameState.betAmount > 0) {
        await addQuestProgress(winnerId, 'earn_bits', gameState.betAmount);

      }
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
  }
  

  if (gameState.betAmount > 0) {
    await handleBetPayout(gameState, player1, player2, winner);
  }
  

  setTimeout(() => {
    activeGames.delete(messageId);
  }, 60000);
}

function createGameEmbed(gameState, player1, player2) {
  let title, description, color;
  
  if (gameState.phase === 'first_choice') {
    const firstPlayerName = gameState.firstPlayer === player1.id ? player1.displayName : player2.displayName;
    title = "🪨📄✂️ Rock Paper Scissors";
    description = `${firstPlayerName}, make your choice!`;
    color = 0x5865F2;
  } else if (gameState.phase === 'second_choice') {
    const secondPlayerName = gameState.secondPlayer === player1.id ? player1.displayName : player2.displayName;
    const firstPlayerName = gameState.firstPlayer === player1.id ? player1.displayName : player2.displayName;
    title = "🪨📄✂️ Rock Paper Scissors";
    description = `${firstPlayerName} has made their choice!\n${secondPlayerName}, make your choice!`;
    color = 0x5865F2;
  }
  
  const embed = createEmbed({
    title,
    description,
    color
  });
  
  const playersValue = `${player1.displayName} ⠀vs⠀ ${player2.displayName}${gameState.betAmount > 0 ? `\n**Bet:** ${gameState.betAmount.toLocaleString()} <:bits:1411354539935666197> each` : ''}`;
  
  embed.addFields([
    { 
      name: '👥 Players', 
      value: playersValue, 
      inline: false 
    }
  ]);
  
  return embed;
}

function createChoiceButtons() {
  const actionRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('rps_rock')
        .setEmoji('🪨')
        .setLabel('Rock')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rps_paper')
        .setEmoji('📄')
        .setLabel('Paper')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rps_scissors')
        .setEmoji('✂️')
        .setLabel('Scissors')
        .setStyle(ButtonStyle.Secondary)
    );
  
  return [actionRow];
}

function determineWinner(player1Choice, player2Choice) {
  if (player1Choice === player2Choice) {
    return 'tie';
  }
  
  const winConditions = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper'
  };
  
  if (winConditions[player1Choice] === player2Choice) {
    return 'player1';
  } else {
    return 'player2';
  }
}


async function getUserBits(userId) {
  try {
    const result = await query('SELECT bits FROM ponies WHERE user_id = ?', [userId]);
    return result.length > 0 ? result[0].bits : 0;
  } catch (error) {
    console.error('Error getting user bits:', error);
    return 0;
  }
}

async function updateUserBits(userId, amount) {
  try {

    const result = await query('UPDATE ponies SET bits = bits + ? WHERE user_id = ?', [amount, userId]);

  } catch (error) {
    console.error('RPS: Error updating user bits:', error);
  }
}

async function ensureUserExists(userId) {
  try {
    const user = await query('SELECT user_id FROM ponies WHERE user_id = ?', [userId]);
    if (user.length === 0) {

      await query('INSERT INTO ponies (user_id, bits) VALUES (?, 0)', [userId]);
    }
  } catch (error) {
    console.error('RPS: Error ensuring user exists:', error);
  }
}

async function handleBetPayout(gameState, player1, player2, winner) {
  if (gameState.betAmount <= 0) return;
  
  try {

    
    if (winner === 'tie') {

      return;
    }
    
    const winnerId = winner === 'player1' ? player1.id : player2.id;
    const loserId = winner === 'player1' ? player2.id : player1.id;
    

    

    await ensureUserExists(winnerId);
    await ensureUserExists(loserId);
    

    const winnerBalanceBefore = await getUserBits(winnerId);
    const loserBalanceBefore = await getUserBits(loserId);

    

    await updateUserBits(loserId, -gameState.betAmount);
    await updateUserBits(winnerId, gameState.betAmount);
    

    const winnerBalanceAfter = await getUserBits(winnerId);
    const loserBalanceAfter = await getUserBits(loserId);

    
  } catch (error) {
    console.error('RPS: Error handling bet payout:', error);
  }
}

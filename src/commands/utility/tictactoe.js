
import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { query } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('tictactoe')
  .setDescription('Play Tic Tac Toe with another user')
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

const turnTimers = new Map();

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
      title: "🎮 Tic Tac Toe Game Invitation",
      description: `${challenger.displayName} challenges ${opponent.displayName} to a game of Tic Tac Toe!${betAmount > 0 ? `\n\n**Bet:** ${betAmount.toLocaleString()} <:bits:1411354539935666197>` : ''}\n\n${opponent.displayName}, do you accept the challenge?`,
      color: 0x5865F2,
      thumbnail: challenger.displayAvatarURL()
    });
    

    const inviteButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ttt_accept')
          .setEmoji('<:like:1422566402308575402>')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ttt_decline')
          .setEmoji('<:dislike:1422566400433717259>')
          .setStyle(ButtonStyle.Danger)
      );
    
    const message = await interaction.editReply({
      embeds: [inviteEmbed],
      components: [inviteButtons]
    });
    

    const inviteCollector = message.createMessageComponentCollector({
      filter: i => (i.user.id === opponent.id || i.user.id === challenger.id) && 
                   (i.customId === 'ttt_accept' || i.customId === 'ttt_decline'),
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
      
      if (buttonInteraction.customId === 'ttt_decline') {
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
    console.error('Error in tictactoe command:', error);
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

  const startingPlayer = Math.random() < 0.5 ? player1 : player2;
  

  const player1Symbol = startingPlayer.id === player1.id ? '❌' : '⭕';
  const player2Symbol = startingPlayer.id === player1.id ? '⭕' : '❌';
  

  const gameState = {
    board: Array(9).fill(null),
    currentPlayer: startingPlayer.id,
    player1: player1.id,
    player2: player2.id,
    player1Symbol,
    player2Symbol,
    gameOver: false,
    winner: null,
    turnStartTime: Date.now(),
    betAmount: interaction.betAmount || 0
  };
  

  

  const gameEmbed = createGameEmbed(gameState, player1, player2);
  const gameButtons = createGameButtons(gameState);
  
  const message = await interaction.editReply({
    embeds: [gameEmbed],
    components: gameButtons
  });
  

  activeGames.set(message.id, gameState);
  

  startTurnTimer(message.id, interaction, player1, player2);
  

  const gameCollector = message.createMessageComponentCollector({
    filter: i => i.customId.startsWith('ttt_cell_'),
    time: 300000
  });
  
  gameCollector.on('collect', async (buttonInteraction) => {
    await handleGameMove(buttonInteraction, message.id, player1, player2);
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

    clearTurnTimer(message.id);
    activeGames.delete(message.id);
  });
}


function startTurnTimer(messageId, interaction, player1, player2) {

  clearTurnTimer(messageId);
  
  const timer = setTimeout(async () => {
    const gameState = activeGames.get(messageId);
    if (!gameState || gameState.gameOver) return;
    

    gameState.gameOver = true;
    gameState.winner = 'tie';
    
    const drawEmbed = createEmbed({
      title: "⏰ Time's Up!",
      description: "The game ended in a draw due to inactivity (1 minute timeout).",
      color: 0xFEE75C
    });
    
    try {
      await interaction.editReply({
        embeds: [drawEmbed],
        components: createGameButtons(gameState)
      });
    } catch (error) {
      console.error('Error updating game on timeout:', error);
    }
    

    activeGames.delete(messageId);
    turnTimers.delete(messageId);
  }, 60000);
  
  turnTimers.set(messageId, timer);
}

function clearTurnTimer(messageId) {
  const timer = turnTimers.get(messageId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(messageId);
  }
}

async function handleGameMove(interaction, messageId, player1, player2) {
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
  

  if (interaction.user.id !== gameState.currentPlayer) {
    const currentPlayerName = gameState.currentPlayer === player1.id ? player1.displayName : player2.displayName;
    return interaction.reply({
      content: `It's ${currentPlayerName}'s turn!`,
      ephemeral: true
    });
  }
  

  if (interaction.user.id !== gameState.player1 && interaction.user.id !== gameState.player2) {
    return interaction.reply({
      content: "You are not part of this game!",
      ephemeral: true
    });
  }
  

  const cellIndex = parseInt(interaction.customId.split('_')[2]);
  

  if (gameState.board[cellIndex] !== null) {
    return interaction.reply({
      content: "This cell is already occupied!",
      ephemeral: true
    });
  }
  

  const currentSymbol = interaction.user.id === gameState.player1 ? gameState.player1Symbol : gameState.player2Symbol;
  gameState.board[cellIndex] = currentSymbol;
  

  clearTurnTimer(messageId);
  

  const winner = checkWinner(gameState.board);
  if (winner) {

    gameState.gameOver = true;
    gameState.winner = interaction.user.id;
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(interaction.user.id, 'tictactoe_wins');

      
      if (gameState.betAmount > 0) {
        await addQuestProgress(interaction.user.id, 'earn_bits', gameState.betAmount);

      }
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    

    if (gameState.betAmount > 0) {

      await handleBetPayout(gameState, player1, player2);
    }
  } else if (gameState.board.every(cell => cell !== null)) {


    gameState.gameOver = true;
    gameState.winner = 'tie';
  } else {

    gameState.currentPlayer = gameState.currentPlayer === gameState.player1 ? gameState.player2 : gameState.player1;
    gameState.turnStartTime = Date.now();
  }
  

  const gameEmbed = createGameEmbed(gameState, player1, player2);
  const gameButtons = createGameButtons(gameState);
  
  await interaction.update({
    embeds: [gameEmbed],
    components: gameButtons
  });
  

  if (gameState.gameOver) {
    clearTurnTimer(messageId);
    
    setTimeout(() => {
      activeGames.delete(messageId);
    }, 60000);
  } else {

    startTurnTimer(messageId, interaction, player1, player2);
  }
}

function createGameEmbed(gameState, player1, player2) {
  const { board, currentPlayer, player1Symbol, player2Symbol, gameOver, winner, betAmount } = gameState;
  

  let boardDisplay = '';
  for (let i = 0; i < 9; i += 3) {
    const row = (board[i] || '⬜') + '​' + (board[i + 1] || '⬜') + '​' + (board[i + 2] || '⬜');
    boardDisplay += '⠀⠀⠀⠀⠀' + row + '⠀⠀⠀⠀⠀\n';
  }
  
  let title, description, color;
  
  if (gameOver) {
    if (winner === 'tie') {
      title = "🤝 It's a Tie!";
      description = "The game ended in a draw!";
      color = 0xFEE75C;
    } else {
      const winnerName = winner === player1.id ? player1.displayName : player2.displayName;
      const winnerSymbol = winner === player1.id ? player1Symbol : player2Symbol;
      title = `🎉 ${winnerName} Wins!`;
      description = `Congratulations ${winnerName} (${winnerSymbol})!${betAmount > 0 ? `\n\n**Winnings:** ${betAmount.toLocaleString()} <:bits:1411354539935666197>` : ''}`;
      color = 0x57F287;
    }
  } else {
    const currentPlayerName = currentPlayer === player1.id ? player1.displayName : player2.displayName;
    const currentSymbol = currentPlayer === player1.id ? player1Symbol : player2Symbol;
    title = "🎮 Tic Tac Toe";
    description = `${currentPlayerName}'s turn (${currentSymbol})`;
    color = 0x5865F2;
  }
  
  const embed = createEmbed({
    title,
    description: description + '\n\n' + boardDisplay,
    color
  });
  
  const playersValue = `⠀⠀${player1.displayName} ${player1Symbol} ⠀vs⠀ ${player2.displayName} ${player2Symbol}⠀⠀${betAmount > 0 ? `\n**Bet:** ${betAmount.toLocaleString()} <:bits:1411354539935666197> each` : ''}`;
  
  embed.addFields([
    { 
      name: '👥 Players', 
      value: playersValue, 
      inline: false 
    }
  ]);
  
  return embed;
}

function createGameButtons(gameState) {
  const { board, gameOver } = gameState;
  
  const rows = [];
  

  for (let row = 0; row < 3; row++) {
    const actionRow = new ActionRowBuilder();
    
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const isOccupied = board[index] !== null;
      
      const button = new ButtonBuilder()
        .setCustomId(`ttt_cell_${index}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(isOccupied || gameOver);
      
      if (isOccupied) {
        button.setEmoji(board[index]);
      } else {

        button.setLabel('⠀⠀⠀');
      }
      
      actionRow.addComponents(button);
    }
    
    rows.push(actionRow);
  }
  
  return rows;
}

function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  
  return null;
}


async function getUserBits(userId) {
  try {

    const result = await query('SELECT bits FROM ponies WHERE user_id = ?', [userId]);
    const bits = result.length > 0 ? result[0].bits : 0;

    return bits;
  } catch (error) {
    console.error('Error getting user bits:', error);
    return 0;
  }
}

async function updateUserBits(userId, amount) {
  try {

    const result = await query('UPDATE ponies SET bits = bits + ? WHERE user_id = ?', [amount, userId]);

  } catch (error) {
    console.error('Error updating user bits:', error);
  }
}

async function ensureUserExists(userId) {
  try {
    const user = await query('SELECT user_id FROM ponies WHERE user_id = ?', [userId]);
    if (user.length === 0) {

      await query('INSERT INTO ponies (user_id, bits) VALUES (?, 0)', [userId]);
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
  }
}

async function handleBetPayout(gameState, player1, player2) {
  if (gameState.betAmount <= 0) return;
  
  try {

    
    if (gameState.winner === 'tie') {

      return;
    }
    
    const winnerId = gameState.winner;
    const loserId = winnerId === player1.id ? player2.id : player1.id;
    const winnerName = winnerId === player1.id ? player1.displayName : player2.displayName;
    const loserName = winnerId === player1.id ? player2.displayName : player1.displayName;
    

    

    await ensureUserExists(winnerId);
    await ensureUserExists(loserId);
    

    const winnerBitsBefore = await getUserBits(winnerId);
    const loserBitsBefore = await getUserBits(loserId);

    

    await updateUserBits(loserId, -gameState.betAmount);
    await updateUserBits(winnerId, gameState.betAmount);
    

    const winnerBitsAfter = await getUserBits(winnerId);
    const loserBitsAfter = await getUserBits(loserId);


    
  } catch (error) {
    console.error('❌ Error handling bet payout:', error);
  }
}

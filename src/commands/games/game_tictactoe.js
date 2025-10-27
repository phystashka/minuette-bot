
import { 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { query } from '../../utils/database.js';
import { addResource } from '../../models/ResourceModel.js';
import { getPonyByUserId, addBits, removeBits } from '../../models/PonyModel.js';

// Command data is now exported from game.js
// This file only contains the execute function for the tictactoe subcommand

const activeGames = new Map();

const turnTimers = new Map();

export async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
    
    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const betAmount = interaction.options.getInteger('bet') || 0;

    if (opponent.id === challenger.id) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('❌ You cannot play against yourself!');
      container.addTextDisplayComponents(errorText);
      
      return interaction.editReply({
        embeds: [],
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    if (opponent.bot) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('❌ You cannot play against a bot!');
      container.addTextDisplayComponents(errorText);
      
      return interaction.editReply({
        embeds: [],
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
          .setContent(`❌ You don't have enough bits! You have ${challengerBits.toLocaleString()}, but need ${betAmount.toLocaleString()}.`);
        container.addTextDisplayComponents(errorText);
        
        return interaction.editReply({
          embeds: [],
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
      
      if (opponentBits < betAmount) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`❌ ${opponent.displayName} doesn't have enough bits! They have ${opponentBits.toLocaleString()}, but need ${betAmount.toLocaleString()}.`);
        container.addTextDisplayComponents(errorText);
        
        return interaction.editReply({
          embeds: [],
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }

    const container = new ContainerBuilder();
    
    let gameText = `**Tic Tac Toe Game Invitation**\n\n<@${challenger.id}> challenges <@${opponent.id}> to a game of Tic Tac Toe!`;
    if (betAmount > 0) {
      gameText += `\n\nBet: ${betAmount.toLocaleString()} <:bits:1429131029628588153>`;
    }
    gameText += `\n\n<@${opponent.id}>, do you accept the challenge?`;
    
    const gameDisplay = new TextDisplayBuilder()
      .setContent(gameText);
    container.addTextDisplayComponents(gameDisplay);

    const gameButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_accept_${challenger.id}_${opponent.id}_${betAmount}`)
          .setLabel('Accept')
          .setEmoji('<:like:1422566402308575402>')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ttt_decline_${challenger.id}_${opponent.id}_${betAmount}`)
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
            .setContent(`**Tic Tac Toe**\n\n~~<@${challenger.id}> challenges <@${opponent.id}>!~~\n\n**Challenge expired** - No response received within 1 minute.`);
          timeoutContainer.addTextDisplayComponents(timeoutText);

          await interaction.editReply({
            embeds: [],
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
      embeds: [],
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (error) {
    console.error('Error in tictactoe command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while creating the game.',
        ephemeral: true
      });
    } else {
      await interaction.editReply({
        embeds: [],
        content: 'An error occurred while creating the game.'
      });
    }
  }
}

async function startGame(interaction, player1, player2, betAmount) {
  const gameId = `${player1.id}_${player2.id}_${Date.now()}`;
  
  const challengeKey = `${player1.id}_${player2.id}`;
  for (const [key, value] of activeGames.entries()) {
    if (key.startsWith(challengeKey) && value.phase === 'challenge' && value.challengeTimeout) {
      clearTimeout(value.challengeTimeout);
      activeGames.delete(key);
      break;
    }
  }

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
    betAmount: betAmount,
    phase: 'playing'
  };

  activeGames.set(gameId, gameState);

  const { container } = await createGameContainer(gameState, player1, player2, gameId);
  const boardImage = await createBoardImage(gameState.board);
  const boardAttachment = new AttachmentBuilder(boardImage, { name: 'tictactoe.png' });
  
  await interaction.update({
    components: [container],
    files: [boardAttachment],
    flags: MessageFlags.IsComponentsV2
  });

  startTurnTimer(gameId, interaction, player1, player2);
}

function startTurnTimer(gameId, interaction, player1, player2) {
  clearTurnTimer(gameId);
  
  const timer = setTimeout(async () => {
    const gameState = activeGames.get(gameId);
    if (!gameState || gameState.gameOver) return;

    gameState.gameOver = true;
    gameState.winner = 'tie';
    
    const container = new ContainerBuilder();
    const timeoutText = new TextDisplayBuilder()
      .setContent(`**Tic Tac Toe**\n\n**Time's Up!**\n\nThe game ended in a draw due to inactivity (1 minute timeout).`);
    container.addTextDisplayComponents(timeoutText);
    
    const boardImage = await createBoardImage(gameState.board);
    const boardAttachment = new AttachmentBuilder(boardImage, { name: 'tictactoe.png' });
    
    try {
      await interaction.message.edit({
        components: [container],
        files: [boardAttachment],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error('Error updating game on timeout:', error);
    }

    activeGames.delete(gameId);
    turnTimers.delete(gameId);
  }, 60000);
  
  turnTimers.set(gameId, timer);
}

function clearTurnTimer(gameId) {
  const timer = turnTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(gameId);
  }
}

async function handleGameMove(interaction, cellIndex, gameId) {
  const gameState = activeGames.get(gameId);
  
  if (!gameState) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('❌ This game is no longer active.');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }
  
  if (gameState.gameOver) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('❌ This game has already ended.');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

  if (interaction.user.id !== gameState.currentPlayer) {
    const player1 = await interaction.client.users.fetch(gameState.player1);
    const player2 = await interaction.client.users.fetch(gameState.player2);
    const currentPlayerName = gameState.currentPlayer === gameState.player1 ? player1.displayName : player2.displayName;
    
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent(`❌ It's ${currentPlayerName}'s turn!`);
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

  if (gameState.board[cellIndex] !== null) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('❌ This cell is already occupied!');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

  const currentSymbol = interaction.user.id === gameState.player1 ? gameState.player1Symbol : gameState.player2Symbol;
  gameState.board[cellIndex] = currentSymbol;

  clearTurnTimer(gameId);

  const winner = checkWinner(gameState.board);
  const player1 = await interaction.client.users.fetch(gameState.player1);
  const player2 = await interaction.client.users.fetch(gameState.player2);
  
  if (winner) {
    gameState.gameOver = true;
    gameState.winner = interaction.user.id;

    const coinsAwarded = Math.floor(Math.random() * 3) + 1;
    gameState.coinsAwarded = coinsAwarded;
    try {
      await addResource(interaction.user.id, 'magic_coins', coinsAwarded);
      console.log(`Awarded ${coinsAwarded} magic coins to ${interaction.user.id} for TicTacToe victory`);
    } catch (error) {
      console.error('Error awarding magic coins:', error);
    }

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

  const { container } = await createGameContainer(gameState, player1, player2, gameId);
  const boardImage = await createBoardImage(gameState.board);
  const boardAttachment = new AttachmentBuilder(boardImage, { name: 'tictactoe.png' });
  
  await interaction.update({
    components: [container],
    files: [boardAttachment],
    flags: MessageFlags.IsComponentsV2
  });

  if (gameState.gameOver) {
    clearTurnTimer(gameId);
    
    setTimeout(() => {
      activeGames.delete(gameId);
    }, 60000);
  } else {
    startTurnTimer(gameId, interaction, player1, player2);
  }
}

async function createGameContainer(gameState, player1, player2, gameId) {
  const { board, currentPlayer, player1Symbol, player2Symbol, gameOver, winner, betAmount, coinsAwarded } = gameState;
  
  const container = new ContainerBuilder();
  
  let gameText;
  
  if (gameOver) {
    if (winner === 'tie') {
      gameText = `**Tic Tac Toe**\n\n**It's a Tie!**\n\nThe game ended in a draw!`;
    } else {
      const winnerName = winner === player1.id ? player1.displayName : player2.displayName;
      const winnerSymbol = winner === player1.id ? player1Symbol : player2Symbol;
      gameText = `**Tic Tac Toe**\n\n**${winnerName} Wins!**\n\nCongratulations ${winnerName} (${winnerSymbol})!`;
      
      if (coinsAwarded) {
        gameText += `\n\n+${coinsAwarded} <:magic_coin:1431797469666217985> Magic Coin${coinsAwarded > 1 ? 's' : ''}!`;
      }
      
      if (betAmount > 0) {
        gameText += `\n**Winnings:** ${betAmount.toLocaleString()} <:bits:1429131029628588153>`;
      }
    }
  } else {
    const currentPlayerName = currentPlayer === player1.id ? player1.displayName : player2.displayName;
    const currentSymbol = currentPlayer === player1.id ? player1Symbol : player2Symbol;
    gameText = `**Tic Tac Toe**\n\n${currentPlayerName}'s turn (${currentSymbol})`;
  }
  
  let playersInfo = `**Players:** ${player1.displayName} ${player1Symbol} vs ${player2.displayName} ${player2Symbol}`;
  if (betAmount > 0) {
    playersInfo += `\n**Bet:** ${betAmount.toLocaleString()} <:bits:1429131029628588153> each`;
  }
  
  gameText += `\n\n${playersInfo}`;
  
  const gameDisplay = new TextDisplayBuilder()
    .setContent(gameText);
  container.addTextDisplayComponents(gameDisplay);

  const mediaGallery = new MediaGalleryBuilder()
    .addItems(
      new MediaGalleryItemBuilder()
        .setURL('attachment://tictactoe.png')
    );
  container.addMediaGalleryComponents(mediaGallery);

  if (!gameOver) {
    for (let row = 0; row < 3; row++) {
      const gameButtons = new ActionRowBuilder();
      
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        const isOccupied = board[index] !== null;
        
        const button = new ButtonBuilder()
          .setCustomId(`ttt_cell_${index}_${gameId}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(isOccupied);
        
        if (isOccupied) {
          button.setEmoji(board[index]);
        } else {
          button.setLabel('⠀⠀⠀');
        }
        
        gameButtons.addComponents(button);
      }
      
      container.addActionRowComponents(gameButtons);
    }
  }
  
  return { container };
}

async function createBoardImage(board) {
  const canvas = createCanvas(300, 300);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#2F3136';
  ctx.fillRect(0, 0, 300, 300);
  
  ctx.strokeStyle = '#40444B';
  ctx.lineWidth = 4;
  
  ctx.beginPath();
  ctx.moveTo(100, 0);
  ctx.lineTo(100, 300);
  ctx.moveTo(200, 0);
  ctx.lineTo(200, 300);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(0, 100);
  ctx.lineTo(300, 100);
  ctx.moveTo(0, 200);
  ctx.lineTo(300, 200);
  ctx.stroke();
  
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = col * 100 + 50;
    const y = row * 100 + 50;
    
    if (board[i] === '❌') {
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(x - 25, y - 25);
      ctx.lineTo(x + 25, y + 25);
      ctx.moveTo(x + 25, y - 25);
      ctx.lineTo(x - 25, y + 25);
      ctx.stroke();
    } else if (board[i] === '⭕') {
      ctx.strokeStyle = '#3498DB';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
  
  return canvas.toBuffer('image/png');
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
    const pony = await getPonyByUserId(userId);
    return pony ? pony.bits : 0;
  } catch (error) {
    console.error('Error getting user bits:', error);
    return 0;
  }
}

async function updateUserBits(userId, amount) {
  try {
    if (amount > 0) {
      await addBits(userId, amount);
    } else {
      await removeBits(userId, Math.abs(amount));
    }
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

export async function handleButtonInteraction(interaction) {
  try {
    const { customId } = interaction;
    
    if (customId.startsWith('ttt_accept_')) {
      const parts = customId.split('_');
      const challengerId = parts[2];
      const opponentId = parts[3];
      const betAmount = parseInt(parts[4]) || 0;
      
      if (interaction.user.id !== challengerId && interaction.user.id !== opponentId) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('❌ This challenge is not for you!');
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
          .setContent('❌ Only the challenged player can accept!');
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
      
    } else if (customId.startsWith('ttt_decline_')) {
      const parts = customId.split('_');
      const challengerId = parts[2];
      const opponentId = parts[3];
      
      if (interaction.user.id !== challengerId && interaction.user.id !== opponentId) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('❌ This challenge is not for you!');
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
          .setContent('❌ Only the challenged player can decline!');
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
      
    } else if (customId.startsWith('ttt_cell_')) {
      const parts = customId.split('_');
      const cellIndex = parseInt(parts[2]);
      const gameId = parts.slice(3).join('_');
      const gameState = activeGames.get(gameId);
      
      if (!gameState) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('❌ Game not found or expired!');
        container.addTextDisplayComponents(errorText);
        
        return await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
      
      if (interaction.user.id !== gameState.player1 && interaction.user.id !== gameState.player2) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('❌ You are not part of this game!');
        container.addTextDisplayComponents(errorText);
        
        return await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
      
      await handleGameMove(interaction, cellIndex, gameId);
    }
  } catch (error) {
    console.error('Error in TTT button interaction:', error);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('❌ An error occurred while processing your move.');
        container.addTextDisplayComponents(errorText);
        
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error response:', replyError);
    }
  }
}

export const category = 'utility';

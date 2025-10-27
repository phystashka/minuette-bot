import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  AttachmentBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} from 'discord.js';
import { createCanvas, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { addResource } from '../../models/ResourceModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const fontPath = path.join(__dirname, '../../public/fonts');
  registerFont(path.join(fontPath, 'Poppins-Bold.ttf'), { family: 'Poppins-Bold' });
  registerFont(path.join(fontPath, 'Poppins-Regular.ttf'), { family: 'Poppins-Regular' });
} catch (error) {
  console.log('Font loading failed, using default fonts');
}

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;
const TURN_TIMEOUT = 30000;
const EMPTY = 0;
const PLAYER1 = 1;
const PLAYER2 = 2;

const activeGames = new Map();
const gameTimeouts = new Map();
const turnTimers = new Map();

function clearGameTimeout(gameId) {
  const timeoutId = gameTimeouts.get(gameId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    gameTimeouts.delete(gameId);
  }
}

function clearTurnTimeout(gameId) {
  const timer = turnTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(gameId);
  }
}

function setTurnTimeout(gameId, currentPlayer, mainInteraction) {
  clearTurnTimeout(gameId);
  
  const timer = setTimeout(async () => {
    try {
      const game = activeGames.get(gameId);
      if (!game || game.phase !== 'playing') return;
      
      const winner = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
      const winnerUser = winner === PLAYER1 ? game.player1 : game.player2;
      const timedOutUser = currentPlayer === PLAYER1 ? game.player1 : game.player2;
      
      const coinsAwarded = Math.floor(Math.random() * 3) + 1;
      try {
        await addResource(winnerUser.id, 'magic_coins', coinsAwarded);
        console.log(`Awarded ${coinsAwarded} magic coins to ${winnerUser.id} for Connect4 victory by timeout`);
      } catch (error) {
        console.error('Error awarding magic coins:', error);
      }
      
      const timeoutImage = await createConnect4Image(game.board, winner, null, true);
      
      const timeoutContainer = new ContainerBuilder();
      const timeoutMediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('attachment://connect4_timeout.png')
        );
      timeoutContainer.addMediaGalleryComponents(timeoutMediaGallery);
      
      const timeoutText = new TextDisplayBuilder()
        .setContent(`**Game Over - Timeout!**\n\n${timedOutUser.displayName} took too long to make a move!\n\n**${winnerUser.displayName} wins by timeout!**\n\n+${coinsAwarded} <:magic_coin:1431797469666217985> Magic Coin${coinsAwarded > 1 ? 's' : ''}!`);
      timeoutContainer.addTextDisplayComponents(timeoutText);
      
      await mainInteraction.editReply({
        components: [timeoutContainer],
        files: [new AttachmentBuilder(timeoutImage, { name: 'connect4_timeout.png' })],
        flags: MessageFlags.IsComponentsV2
      });
      
      activeGames.delete(gameId);
      turnTimers.delete(gameId);
    } catch (error) {
      console.error('Error handling turn timeout:', error);
    }
  }, TURN_TIMEOUT);
  
  turnTimers.set(gameId, timer);
}

async function createConnect4Image(board, winner = null, winningLine = null, isTimeout = false) {
  const canvas = createCanvas(450, 430);
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 430);
  gradient.addColorStop(0, '#2C2F33');
  gradient.addColorStop(1, '#23272A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 450, 430);

  const cellSize = 50;
  const headerHeight = 50; 
  const boardWidth = BOARD_WIDTH * cellSize;
  const boardHeight = BOARD_HEIGHT * cellSize;
  const totalHeight = headerHeight + boardHeight;
  const boardX = (450 - boardWidth) / 2;
  const boardY = (430 - totalHeight) / 2;
  
  ctx.fillStyle = '#4A90E2';
  ctx.fillRect(boardX, boardY, boardWidth, totalHeight);
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  ctx.fillRect(boardX, boardY, boardWidth, totalHeight);
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  ctx.font = 'bold 28px Poppins-Bold, Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let col = 0; col < BOARD_WIDTH; col++) {
    const x = boardX + col * cellSize + cellSize / 2;
    const y = boardY + headerHeight / 2;
    ctx.fillText((col + 1).toString(), x, y);
  }

  const gameStartY = boardY + headerHeight;
  
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    for (let col = 0; col < BOARD_WIDTH; col++) {
      const x = boardX + col * cellSize + cellSize / 2;
      const y = gameStartY + row * cellSize + cellSize / 2;
      
      ctx.fillStyle = '#2C2F33';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      
      const piece = board[row][col];
      if (piece !== EMPTY) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        if (piece === PLAYER1) {
          ctx.fillStyle = '#E74C3C';
        } else {
          ctx.fillStyle = '#F1C40F';
        }
        
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        const shineGradient = ctx.createRadialGradient(x - 6, y - 6, 0, x, y, 18);
        if (piece === PLAYER1) {
          shineGradient.addColorStop(0, '#FF6B6B');
          shineGradient.addColorStop(1, '#C0392B');
        } else {
          shineGradient.addColorStop(0, '#F4D03F');
          shineGradient.addColorStop(1, '#D68910');
        }
        ctx.fillStyle = shineGradient;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  if (winner && winningLine && !isTimeout) {
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    const startX = boardX + winningLine[0].col * cellSize + cellSize / 2;
    const startY = gameStartY + winningLine[0].row * cellSize + cellSize / 2;
    const endX = boardX + winningLine[3].col * cellSize + cellSize / 2;
    const endY = gameStartY + winningLine[3].row * cellSize + cellSize / 2;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
  
  return canvas.toBuffer();
}

function createGameDisplay(board, game, gameId) {
  const container = new ContainerBuilder();
  
  const currentPlayerName = game.currentPlayer === PLAYER1 ? game.player1.displayName : game.player2.displayName;
  const currentPlayerEmoji = game.currentPlayer === PLAYER1 ? '🔴' : '🟡';
  
  const gameText = new TextDisplayBuilder()
    .setContent(`**Connect 4 Game**\n\n**Players:**\n🔴 ${game.player1.displayName}\n🟡 ${game.player2.displayName}\n\n**Current Turn:** ${currentPlayerEmoji} ${currentPlayerName}\n\n*Each player has 30 seconds to make a move!*`);
  container.addTextDisplayComponents(gameText);

  const mediaGallery = new MediaGalleryBuilder()
    .addItems(
      new MediaGalleryItemBuilder()
        .setURL('attachment://connect4.png')
    );
  container.addMediaGalleryComponents(mediaGallery);

  const currentUserId = game.currentPlayer === PLAYER1 ? game.player1.id : game.player2.id;
  const buttonStyle = game.currentPlayer === PLAYER1 ? ButtonStyle.Danger : ButtonStyle.Primary;
  
  const emojis = [
    '<:one:1431776877365825741>',
    '<:two:1431776875574984814>',
    '<:three:1431776874186539169>',
    '<:four:1431776872253096050>',
    '<:five:1431776870604603402>',
    '<:six:1431776868050272276>',
    '<:seven:1431776866301247538>'
  ];
  
  const row1Buttons = new ActionRowBuilder();
  for (let col = 0; col < 5; col++) {
    const isValidMove = board[0][col] === EMPTY;
    row1Buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`connect4_move_${gameId}_${col}_${currentUserId}`)
        .setEmoji(emojis[col])
        .setStyle(buttonStyle)
        .setDisabled(!isValidMove)
    );
  }
  container.addActionRowComponents(row1Buttons);
  
  const row2Buttons = new ActionRowBuilder();
  for (let col = 5; col < 7; col++) {
    const isValidMove = board[0][col] === EMPTY;
    row2Buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`connect4_move_${gameId}_${col}_${currentUserId}`)
        .setEmoji(emojis[col])
        .setStyle(buttonStyle)
        .setDisabled(!isValidMove)
    );
  }
  container.addActionRowComponents(row2Buttons);
  
  return { container };
}

function isValidMove(board, col) {
  return col >= 0 && col < BOARD_WIDTH && board[0][col] === EMPTY;
}

function makeMove(board, col, player) {
  for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      board[row][col] = player;
      return { row, col };
    }
  }
  return null;
}

function checkWin(board, row, col, player) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];
  
  for (const [dx, dy] of directions) {
    const line = [];
    
    for (let i = -3; i <= 3; i++) {
      const newRow = row + i * dx;
      const newCol = col + i * dy;
      
      if (newRow >= 0 && newRow < BOARD_HEIGHT && 
          newCol >= 0 && newCol < BOARD_WIDTH && 
          board[newRow][newCol] === player) {
        line.push({ row: newRow, col: newCol });
      } else {
        if (line.length >= 4) break;
        line.length = 0;
      }
    }
    
    if (line.length >= 4) {
      return line.slice(0, 4);
    }
  }
  
  return null;
}

function isBoardFull(board) {
  for (let col = 0; col < BOARD_WIDTH; col++) {
    if (board[0][col] === EMPTY) {
      return false;
    }
  }
  return true;
}

function createEmptyBoard() {
  const board = [];
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_WIDTH; col++) {
      board[row][col] = EMPTY;
    }
  }
  return board;
}

const connect4Command = {
  data: new SlashCommandBuilder()
    .setName('game_connect4')
    .setDescription('Start a Connect 4 game!')
    .addUserOption(option =>
      option.setName('opponent')
        .setDescription('Player to challenge')
        .setRequired(true)),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
      
      const challenger = interaction.user;
        const opponent = interaction.options.getUser('opponent');

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

      const container = new ContainerBuilder();
      
      const gameText = `**Connect 4 Game Invitation**\n\n<@${challenger.id}> challenges <@${opponent.id}> to a game of Connect 4!\n\n<@${opponent.id}>, do you accept the challenge?`;
      
      const gameDisplay = new TextDisplayBuilder()
        .setContent(gameText);
      container.addTextDisplayComponents(gameDisplay);

      const gameButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`connect4_accept_${challenger.id}_${opponent.id}`)
            .setLabel('Accept')
            .setEmoji('<:like:1422566402308575402>')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`connect4_decline_${challenger.id}_${opponent.id}`)
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
              .setContent(`**Connect 4**\n\n~~<@${challenger.id}> challenges <@${opponent.id}>!~~\n\n**Challenge expired** - No response received within 1 minute.`);
            timeoutContainer.addTextDisplayComponents(timeoutText);

            await interaction.editReply({
              embeds: [],
              components: [timeoutContainer],
              flags: MessageFlags.IsComponentsV2
            });
          } catch (error) {
            if (error.code === 10008 || error.code === 10062 || error.code === 50027) {
              console.log('Connect4 challenge timeout - interaction no longer available');
            } else {
              console.error('Error updating expired challenge:', error);
            }
          }
          
          activeGames.delete(challengeId);
        }
      }, 60000);
      
      activeGames.set(challengeId, {
        phase: 'challenge',
        challenger,
        opponent,
        timeout: challengeTimeout,
        mainInteraction: interaction
      });

      await interaction.editReply({
        embeds: [],
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error('Error in Connect4 execute:', error);
      
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('❌ An error occurred while starting the game. Please try again.');
      container.addTextDisplayComponents(errorText);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          embeds: [],
          components: [container]
        });
      }
    }
  },

  async handleButton(interaction) {
    const customId = interaction.customId;
    
    try {
      if (customId.startsWith('connect4_accept_') || customId.startsWith('connect4_decline_')) {
        const parts = customId.split('_');
        const action = parts[1];
        const challengerId = parts[2];
        const opponentId = parts[3];
        
        if (interaction.user.id !== opponentId) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent('❌ Only the challenged player can respond to this invitation!');
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
          });
        }
        
        let challengeData = null;
        let challengeId = null;
        for (const [id, data] of activeGames.entries()) {
          if (data.phase === 'challenge' && 
              data.challenger.id === challengerId && 
              data.opponent.id === opponentId) {
            challengeData = data;
            challengeId = id;
            break;
          }
        }
        
        if (!challengeData) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent('❌ Challenge not found or has expired!');
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
          });
        }
        
        clearTimeout(challengeData.timeout);
        activeGames.delete(challengeId);
        
        if (action === 'decline') {
          const container = new ContainerBuilder();
          const declineText = new TextDisplayBuilder()
            .setContent(`**Connect 4**\n\n~~<@${challengerId}> challenges <@${opponentId}>!~~\n\n**Challenge declined** by <@${opponentId}>.`);
          container.addTextDisplayComponents(declineText);

          await interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
          return;
        }
        
        await interaction.deferUpdate();
        
        const gameId = `${challengerId}-${opponentId}-${Date.now()}`;
        const board = createEmptyBoard();
        
        const game = {
          id: gameId,
          player1: challengeData.challenger,
          player2: challengeData.opponent,
          board: board,
          currentPlayer: PLAYER1,
          phase: 'playing',
          mainInteraction: challengeData.mainInteraction
        };
        
        activeGames.set(gameId, game);
        
        const boardImage = await createConnect4Image(board);
        const { container } = createGameDisplay(board, game, gameId);
        
        await interaction.editReply({
          components: [container],
          files: [new AttachmentBuilder(boardImage, { name: 'connect4.png' })],
          flags: MessageFlags.IsComponentsV2
        });
        
        setTurnTimeout(gameId, PLAYER1, challengeData.mainInteraction);
        return;
      }
      
      if (customId.startsWith('connect4_move_')) {
        const parts = customId.split('_');
        const userId = parts[parts.length - 1];
        const col = parseInt(parts[parts.length - 2]);
        const gameId = parts.slice(2, parts.length - 2).join('_');
        
        const game = activeGames.get(gameId);
        if (!game) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent('❌ This game has ended or expired!');
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
          });
        }

        const currentUserId = game.currentPlayer === PLAYER1 ? game.player1.id : game.player2.id;
        if (interaction.user.id !== currentUserId) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent('❌ It\'s not your turn!');
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
          });
        }

        if (!isValidMove(game.board, col)) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent('❌ Column is full! Choose another column.');
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true
          });
        }

        await interaction.deferUpdate();

        clearTurnTimeout(gameId);

        const moveResult = makeMove(game.board, col, game.currentPlayer);
        
        const winningLine = checkWin(game.board, moveResult.row, moveResult.col, game.currentPlayer);
        
        if (winningLine) {
          const winnerUser = game.currentPlayer === PLAYER1 ? game.player1 : game.player2;
          
          const coinsAwarded = Math.floor(Math.random() * 3) + 1;
          try {
            await addResource(winnerUser.id, 'magic_coins', coinsAwarded);
            console.log(`Awarded ${coinsAwarded} magic coins to ${winnerUser.id} for Connect4 victory`);
          } catch (error) {
            console.error('Error awarding magic coins:', error);
          }
          
          const boardImage = await createConnect4Image(game.board, game.currentPlayer, winningLine);
          
          const container = new ContainerBuilder();
          const winText = new TextDisplayBuilder()
            .setContent(`**GAME OVER!**\n\n**Winner:** ${game.currentPlayer === PLAYER1 ? '🔴' : '🟡'} ${winnerUser.displayName}\n\n**Connect 4 achieved!**\n\n+${coinsAwarded} <:magic_coin:1431797469666217985> Magic Coin${coinsAwarded > 1 ? 's' : ''}!`);
          container.addTextDisplayComponents(winText);
          
          const mediaGallery = new MediaGalleryBuilder()
            .addItems(
              new MediaGalleryItemBuilder()
                .setURL('attachment://connect4.png')
            );
          container.addMediaGalleryComponents(mediaGallery);

          await interaction.editReply({
            components: [container],
            files: [new AttachmentBuilder(boardImage, { name: 'connect4.png' })],
            flags: MessageFlags.IsComponentsV2
          });

          activeGames.delete(gameId);
          return;
        }
        
        if (isBoardFull(game.board)) {
          const boardImage = await createConnect4Image(game.board);
          
          const container = new ContainerBuilder();
          const tieText = new TextDisplayBuilder()
            .setContent(`**GAME OVER - TIE!**\n\nThe board is full and no one achieved Connect 4!\n\nGood game both players!`);
          container.addTextDisplayComponents(tieText);
          
          const mediaGallery = new MediaGalleryBuilder()
            .addItems(
              new MediaGalleryItemBuilder()
                .setURL('attachment://connect4.png')
            );
          container.addMediaGalleryComponents(mediaGallery);

          await interaction.editReply({
            components: [container],
            files: [new AttachmentBuilder(boardImage, { name: 'connect4.png' })],
            flags: MessageFlags.IsComponentsV2
          });

          activeGames.delete(gameId);
          return;
        }
        
        game.currentPlayer = game.currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
        
        const boardImage = await createConnect4Image(game.board);
        const { container } = createGameDisplay(game.board, game, gameId);
        
        await interaction.editReply({
          components: [container],
          files: [new AttachmentBuilder(boardImage, { name: 'connect4.png' })],
          flags: MessageFlags.IsComponentsV2
        });
        
        setTurnTimeout(gameId, game.currentPlayer, game.mainInteraction);
      }
    } catch (error) {
      console.error('Error in Connect4 handleButton:', error);
      
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('❌ An error occurred while processing your move. Please try again.');
      container.addTextDisplayComponents(errorText);
      
      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
  }
};

export const execute = connect4Command.execute;

export default connect4Command;
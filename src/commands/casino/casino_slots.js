import { 
  SlashCommandBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { getUserById } from '../../models/UserModel.js';
import { getResourcesByUserId } from '../../models/ResourceModel.js';
import { addBits, getPonyByUserId } from '../../models/PonyModel.js';
import { updateResources } from '../../models/ResourceModel.js';

// Casino slots game - now used as a subcommand

const CHIPS_EMOJI = '<:chips:1431269385405993010>';
const CHIPS_BUY_RATE = 110;
const CHIPS_SELL_RATE = 90;

const activeSlotSessions = new Map();

const sessionTimeouts = new Map();

const commandCooldowns = new Map();
const COMMAND_COOLDOWN = 60000;

const BUTTON_TIMEOUT = 30000;

function clearSessionTimeout(userId) {
  const timeoutId = sessionTimeouts.get(userId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    sessionTimeouts.delete(userId);
  }
}

function setSessionTimeout(userId, mainInteraction) {
  clearSessionTimeout(userId);
  
  const timeoutId = setTimeout(async () => {
    try {
      if (!mainInteraction.isRepliable()) {
        console.log(`Session timeout for user ${userId}: interaction expired, skipping update`);
        return;
      }
      
      const container = new ContainerBuilder();
      const timeoutText = new TextDisplayBuilder()
        .setContent('**⏰ Session Expired**\n\nSession has timed out due to inactivity. Use `/casino_slots` to start a new game.');
      container.addTextDisplayComponents(timeoutText);
      
      await mainInteraction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      if (error.code === 10008 || error.status === 404) {
        console.log(`Session timeout for user ${userId}: interaction already expired`);
      } else {
        console.error('Error handling session timeout:', error);
      }
    }
    
    activeSlotSessions.delete(userId);
    sessionTimeouts.delete(userId);
  }, BUTTON_TIMEOUT);
  
  sessionTimeouts.set(userId, timeoutId);
}

function createCasinoDisclaimer() {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent('**Our Stance on Gambling**');
  container.addTextDisplayComponents(titleText);
  
  const mainText = new TextDisplayBuilder()
    .setContent('It is important to remember that gambling is not a way to make money, real or fake. It is a form of entertainment and should be treated as such. If you or someone you know is struggling with gambling addiction, please seek help.\n\nAdditionally, please remember that the odds are always in favor of the house. The house always wins.');
  container.addTextDisplayComponents(mainText);
  
  const additionalText = new TextDisplayBuilder()
    .setContent('**Remember:** This casino feature uses virtual currency (bits/chips) and is for entertainment purposes only. This bot does not promote real money gambling.');
  container.addTextDisplayComponents(additionalText);
  
  return container;
}

const SLOT_SYMBOLS = [
  '<a:cherry:1431285482905407590>',
  '<:lemon:1431285485774569482>',
  '<a:bell:1431285480892268615>',
  '<:star:1431285490568663101>',
  '<:money:1431285486957236405>',
  '<a:diamond:1431285484440649778>',
  '<:seven:1431285488593014784>'
];

const SYMBOL_IMAGES = {
  '<a:cherry:1431285482905407590>': 'cherry.gif',
  '<:lemon:1431285485774569482>': 'lemon.png', 
  '<a:bell:1431285480892268615>': 'bell.gif',
  '<:star:1431285490568663101>': 'star.png',
  '<:money:1431285486957236405>': 'money.png',
  '<a:diamond:1431285484440649778>': 'diamond.gif',
  '<:seven:1431285488593014784>': 'seven.png'
};

const EMPTY_SLOT = '❓';

function getRandomSymbol() {
  return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
}

function generateSlotCombination() {
  const shouldWin = Math.random() < 0.25;
  
  if (shouldWin) {
    const winType = Math.random();
    
    if (winType < 0.15) {
      const symbol = getRandomSymbol();
      return [symbol, symbol, symbol];
    } else {
      const symbol1 = getRandomSymbol();
      const symbol2 = getRandomSymbol();
      const position = Math.floor(Math.random() * 3);
      
      if (position === 0) {
        return [symbol1, symbol1, symbol2];
      } else if (position === 1) {
        return [symbol1, symbol2, symbol1];
      } else {
        return [symbol1, symbol2, symbol2];
      }
    }
  } else {
    let symbols = [];
    do {
      symbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    } while (
      (symbols[0] === symbols[1]) || 
      (symbols[1] === symbols[2]) || 
      (symbols[0] === symbols[2])
    );
    return symbols;
  }
}

async function getUserChips(userId) {
  try {
    const resourceData = await getResourcesByUserId(userId);
    return resourceData?.chips || 0;
  } catch (error) {
    console.error('Error getting user chips:', error);
    return 0;
  }
}

async function drawSymbolImage(ctx, symbol, x, y, size = 60) {
  try {
    if (symbol === '❓') {
      ctx.fillStyle = '#95A5A6';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y);
      return;
    }

    const imageFile = SYMBOL_IMAGES[symbol];
    if (!imageFile) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x, y);
      return;
    }

    const imagePath = `./src/public/casino/${imageFile}`;
    const image = await loadImage(imagePath);
    
    const imageSize = size;
    ctx.drawImage(image, x - imageSize/2, y - imageSize/2, imageSize, imageSize);
    
  } catch (error) {
    console.error(`Error loading symbol image for ${symbol}:`, error);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, y);
  }
}

async function createSlotMachineImage(symbols = null, isSpinning = false) {
  const canvas = createCanvas(400, 150);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 150);
  gradient.addColorStop(0, '#2C2F33');
  gradient.addColorStop(1, '#23272A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 150);

  ctx.strokeStyle = '#7289DA';
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, 390, 140);

  for (let i = 0; i < 3; i++) {
    const x = 30 + (i * 120);
    const y = 25;
    const width = 100;
    const height = 100;

    ctx.fillStyle = '#36393F';
    ctx.fillRect(x, y, width, height);
    
    ctx.strokeStyle = '#7289DA';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    const centerX = x + 50;
    const centerY = y + 50;
    
    if (isSpinning) {
      await drawSymbolImage(ctx, '❓', centerX, centerY, 60);
    } else if (symbols && symbols[i]) {
      await drawSymbolImage(ctx, symbols[i], centerX, centerY, 60);
    } else {
      await drawSymbolImage(ctx, '❓', centerX, centerY, 60);
    }
  }

  return canvas.toBuffer();
}

function calculateWinnings(symbols, betAmount) {
  const [symbol1, symbol2, symbol3] = symbols;
  
  if (symbol1 === symbol2 && symbol2 === symbol3) {
    if (symbol1 === '<a:diamond:1431285484440649778>') return betAmount * 20;
    if (symbol1 === '<:seven:1431285488593014784>') return betAmount * 15;
    if (symbol1 === '<:money:1431285486957236405>') return betAmount * 10;
    if (symbol1 === '<:star:1431285490568663101>') return betAmount * 8;
    if (symbol1 === '<a:bell:1431285480892268615>') return betAmount * 6;
    if (symbol1 === '<:lemon:1431285485774569482>') return betAmount * 4;
    if (symbol1 === '<a:cherry:1431285482905407590>') return betAmount * 3;
  }
  
  if (symbol1 === symbol2 || symbol2 === symbol3 || symbol1 === symbol3) {
    return Math.floor(betAmount * 1.5);
  }
  
  return 0;
}

async function addChips(userId, amount) {
  try {
    await getResourcesByUserId(userId);
    
    const currentChips = await getUserChips(userId);
    await updateResources(userId, { chips: currentChips + amount });
    
    console.log(`Added ${amount} chips to user ${userId}. New total: ${currentChips + amount}`);
    return true;
  } catch (error) {
    console.error('Error adding chips:', error);
    return false;
  }
}

async function buyChips(userId, chipAmount) {
  try {
    const totalCost = chipAmount * CHIPS_BUY_RATE;
    
    const ponyData = await getPonyByUserId(userId);
    if (!ponyData || ponyData.bits < totalCost) {
      return {
        success: false,
        message: `You don't have enough bits! You need **${totalCost.toLocaleString()}** <:bits:1411354539935666197> but have **${ponyData?.bits || 0}**.`
      };
    }
    
    await addBits(userId, -totalCost);
    const addResult = await addChips(userId, chipAmount);
    
    console.log(`Buy chips result for user ${userId}: ${addResult}, chips: ${chipAmount}, cost: ${totalCost}`);
    
    return {
      success: true,
      chipsReceived: chipAmount,
      bitsSpent: totalCost
    };
  } catch (error) {
    console.error('Error buying chips:', error);
    return {
      success: false,
      message: 'An error occurred while buying chips. Please try again.'
    };
  }
}

async function sellChips(userId, chipAmount) {
  try {
    const currentChips = await getUserChips(userId);
    if (currentChips < chipAmount) {
      return {
        success: false,
        message: `You don't have enough chips! You have **${currentChips}** ${CHIPS_EMOJI} but need **${chipAmount}**.`
      };
    }
    
    const totalEarnings = chipAmount * CHIPS_SELL_RATE;
    
    await addChips(userId, -chipAmount);
    await addBits(userId, totalEarnings);
    
    return {
      success: true,
      chipsSold: chipAmount,
      bitsEarned: totalEarnings
    };
  } catch (error) {
    console.error('Error selling chips:', error);
    return {
      success: false,
      message: 'An error occurred while selling chips. Please try again.'
    };
  }
}

export async function execute(interaction) {
  const betAmount = interaction.options.getInteger('amount');
  const userId = interaction.user.id;

  try {
    const now = Date.now();
    const lastUsed = commandCooldowns.get(userId);
    if (lastUsed && (now - lastUsed) < COMMAND_COOLDOWN) {
      const timeLeft = Math.ceil((COMMAND_COOLDOWN - (now - lastUsed)) / 1000);
      
      const { createCooldownContainer } = await import('../../utils/cooldownManager.js');
      const cooldownContainer = createCooldownContainer(timeLeft);
      
      return interaction.reply({
        components: [cooldownContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    commandCooldowns.set(userId, now);

    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

    const userData = await getUserById(userId);
    if (!userData) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('You need to register first! Use `/equestria` to get started.');
      container.addTextDisplayComponents(errorText);

      return interaction.editReply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const currentChips = await getUserChips(userId);

    if (currentChips < betAmount) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent(`You don't have enough chips! You have **${currentChips}** ${CHIPS_EMOJI} but need **${betAmount}**.\n\n**Buy chips:** 1 ${CHIPS_EMOJI} = ${CHIPS_BUY_RATE} <:bits:1411354539935666197>`);
      container.addTextDisplayComponents(errorText);

      const buyButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_slots_buy_chips_100_${userId}`)
            .setLabel(`Buy 100`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_buy_chips_500_${userId}`)
            .setLabel(`Buy 500`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_buy_chips_1000_${userId}`)
            .setLabel(`Buy 1000`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Primary)
        );

      return interaction.editReply({
        content: '',
        components: [container, buyButtons],
        flags: MessageFlags.IsComponentsV2
      });
    }

    activeSlotSessions.set(userId, {
      betAmount,
      lastWin: false,
      canDouble: false,
      mainInteraction: interaction
    });

    const slotImage = await createSlotMachineImage();

    const container = new ContainerBuilder();
    
    const mediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL('attachment://slots.png')
      );
    container.addMediaGalleryComponents(mediaGallery);

    const slotText = new TextDisplayBuilder()
      .setContent(`**Casino Slots**\n\n**Bet:** ${betAmount.toLocaleString()} ${CHIPS_EMOJI}\n**Your Chips:** ${currentChips.toLocaleString()} ${CHIPS_EMOJI}\n\n**Exchange Rates:**\nBuy: 1 ${CHIPS_EMOJI} = ${CHIPS_BUY_RATE} <:bits:1411354539935666197>\nSell: 1 ${CHIPS_EMOJI} = ${CHIPS_SELL_RATE} <:bits:1411354539935666197>`);
    container.addTextDisplayComponents(slotText);

    const gameButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`casino_slots_spin_${userId}`)
          .setLabel('Spin')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`casino_slots_change_bet_${userId}`)
          .setLabel('Change Bet')
          .setStyle(ButtonStyle.Secondary)
      );

    const chipButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`casino_slots_buy_chips_100_${userId}`)
          .setLabel('Buy 100')
          .setEmoji('<:chips:1431269385405993010>')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`casino_slots_buy_chips_500_${userId}`)
          .setLabel('Buy 500')
          .setEmoji('<:chips:1431269385405993010>')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`casino_slots_sell_chips_100_${userId}`)
          .setLabel('Sell 100')
          .setEmoji('<:chips:1431269385405993010>')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(currentChips < 100),
        new ButtonBuilder()
          .setCustomId(`casino_slots_sell_chips_500_${userId}`)
          .setLabel('Sell 500')
          .setEmoji('<:chips:1431269385405993010>')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(currentChips < 500)
      );

    const infoButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`casino_disclaimer_${userId}`)
          .setEmoji('<:warning:1431753596583542794>')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      content: '',
      components: [container, gameButtons, chipButtons, infoButtons],
      files: [new AttachmentBuilder(slotImage, { name: 'slots.png' })],
      flags: MessageFlags.IsComponentsV2
    });

    setSessionTimeout(userId, interaction);

  } catch (error) {
    console.error('Error in slots command:', error);
    
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred. Please try again.');
    container.addTextDisplayComponents(errorText);

    if (interaction.deferred) {
      await interaction.editReply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      await interaction.reply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  }
}

export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  if (!customId.endsWith(`_${userId}`)) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('This is not your session!');
    container.addTextDisplayComponents(errorText);

    return interaction.reply({
      content: '',
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }

  try {
    const session = activeSlotSessions.get(userId);
    if (session && session.mainInteraction) {
      setSessionTimeout(userId, session.mainInteraction);
    }

    if (customId.startsWith('casino_slots_buy_chips_')) {
      const chipAmount = parseInt(customId.split('_')[4]);
      const buyResult = await buyChips(userId, chipAmount);
      
      if (!buyResult.success) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`${buyResult.message}`);
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder();
      const successText = new TextDisplayBuilder()
        .setContent(`Successfully bought **${buyResult.chipsReceived}** ${CHIPS_EMOJI} for **${buyResult.bitsSpent.toLocaleString()}** <:bits:1411354539935666197>!\n\nYou can now use \`/casino_slots\` to play!`);
      container.addTextDisplayComponents(successText);

      return interaction.reply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (customId.startsWith('casino_slots_sell_chips_')) {
      const chipAmount = parseInt(customId.split('_')[4]);
      const sellResult = await sellChips(userId, chipAmount);
      
      if (!sellResult.success) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`${sellResult.message}`);
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder();
      const successText = new TextDisplayBuilder()
        .setContent(`Successfully sold **${sellResult.chipsSold}** ${CHIPS_EMOJI} for **${sellResult.bitsEarned.toLocaleString()}** <:bits:1411354539935666197>!`);
      container.addTextDisplayComponents(successText);

      return interaction.reply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (customId.startsWith('casino_slots_change_bet_')) {
      const session = activeSlotSessions.get(userId);
      if (!session) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('Session expired! Use `/casino_slots` to start a new game.');
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      const container = new ContainerBuilder();
      const betText = new TextDisplayBuilder()
        .setContent(`**Change Your Bet**\n\nCurrent bet: **${session.betAmount}** ${CHIPS_EMOJI}\nYour chips: **${await getUserChips(userId)}** ${CHIPS_EMOJI}\n\nSelect a new bet amount:`);
      container.addTextDisplayComponents(betText);

      const betButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_slots_set_bet_50_${userId}`)
            .setLabel('50')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_set_bet_100_${userId}`)
            .setLabel('100')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_set_bet_250_${userId}`)
            .setLabel('250')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_set_bet_500_${userId}`)
            .setLabel('500')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Primary)
        );

      const betButtons2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_slots_set_bet_1000_${userId}`)
            .setLabel('1000')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_set_bet_2500_${userId}`)
            .setLabel('2500')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`casino_slots_set_bet_5000_${userId}`)
            .setLabel('5000')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Danger)
        );

      return interaction.reply({
        components: [container, betButtons, betButtons2],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    if (customId.startsWith('casino_slots_set_bet_')) {
      const newBet = parseInt(customId.split('_')[4]);
      const currentChips = await getUserChips(userId);
      
      if (currentChips < newBet) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`Not enough chips! You need **${newBet}** ${CHIPS_EMOJI} but have **${currentChips}**.`);
        container.addTextDisplayComponents(errorText);

        return interaction.update({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const session = activeSlotSessions.get(userId);
      if (session) {
        activeSlotSessions.set(userId, {
          ...session,
          betAmount: newBet
        });
      }

      const container = new ContainerBuilder();
      const successText = new TextDisplayBuilder()
        .setContent(`**Bet Updated!**\n\nNew bet amount: **${newBet}** ${CHIPS_EMOJI}\nYour chips: **${currentChips}** ${CHIPS_EMOJI}\n\nYou can now spin with your new bet!`);
      container.addTextDisplayComponents(successText);

      return interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (customId.startsWith('casino_slots_double_')) {
      const session = activeSlotSessions.get(userId);
      if (!session || !session.canDouble) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('Double down not available! You need to win first and have enough chips.');
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      const doubleBet = session.betAmount * 2;
      const currentChips = await getUserChips(userId);
      
      if (currentChips < doubleBet) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`Not enough chips for double down! You need **${doubleBet}** ${CHIPS_EMOJI} but have **${currentChips}**.`);
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
      }

      const symbols = generateSlotCombination();
      const baseWinnings = calculateWinnings(symbols, doubleBet);
      const finalWinnings = baseWinnings > 0 ? baseWinnings * 3 : 0;
      const isWin = finalWinnings > 0;

      const newChips = isWin ? currentChips + finalWinnings - doubleBet : currentChips - doubleBet;
      await addChips(userId, -doubleBet + (isWin ? finalWinnings : 0));

      const resultImage = await createSlotMachineImage(symbols, false);
      const resultContainer = new ContainerBuilder();
      const resultMediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('attachment://slots.png')
        );
      resultContainer.addMediaGalleryComponents(resultMediaGallery);

      let resultText = `**DOUBLE DOWN RESULT**\n\n**${symbols.join(' ')}**\n\n`;
      if (isWin) {
        resultText += `**MASSIVE WIN!**\n`;
        resultText += `You won **${finalWinnings.toLocaleString()}** ${CHIPS_EMOJI}!\n`;
        resultText += `Net gain: **+${(finalWinnings - doubleBet).toLocaleString()}** ${CHIPS_EMOJI}\n`;
      } else {
        resultText += `**BUST!**\n`;
        resultText += `You lost **${doubleBet.toLocaleString()}** ${CHIPS_EMOJI}\n`;
      }
      
      resultText += `\nChips: **${newChips.toLocaleString()}** ${CHIPS_EMOJI}`;

      const resultTextDisplay = new TextDisplayBuilder()
        .setContent(resultText);
      resultContainer.addTextDisplayComponents(resultTextDisplay);

      activeSlotSessions.set(userId, {
        betAmount: session.betAmount,
        lastWin: isWin,
        canDouble: false,
        mainInteraction: session.mainInteraction
      });

      const finalChips = await getUserChips(userId);
      const controlRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_slots_spin_${userId}`)
            .setLabel('Continue Playing')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(finalChips < session.betAmount),
          new ButtonBuilder()
            .setCustomId(`casino_slots_change_bet_${userId}`)
            .setLabel('Change Bet')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.update({
        components: [resultContainer, controlRow],
        files: [new AttachmentBuilder(resultImage, { name: 'slots.png' })],
        flags: MessageFlags.IsComponentsV2
      });
      
      return;
    }

    if (customId.startsWith('casino_slots_spin_')) {
      const session = activeSlotSessions.get(userId);
      if (!session) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('Slot session expired! Use `/casino_slots` to start a new game.');
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const currentChips = await getUserChips(userId);
      if (currentChips < session.betAmount) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`Not enough chips! You need **${session.betAmount}** ${CHIPS_EMOJI} but have **${currentChips}**.`);
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const spinFrames = [
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
        [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()],
      ];
      
      for (let frame = 0; frame < spinFrames.length; frame++) {
        const frameImage = await createSlotMachineImage(spinFrames[frame], false);
        
        const container = new ContainerBuilder();
        const mediaGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL('attachment://slots.png')
          );
        container.addMediaGalleryComponents(mediaGallery);

        const spinningText = new TextDisplayBuilder()
          .setContent('Spinning...');
        container.addTextDisplayComponents(spinningText);

        if (frame === 0) {
          await interaction.update({
            content: '',
            components: [container],
            files: [new AttachmentBuilder(frameImage, { name: 'slots.png' })],
            flags: MessageFlags.IsComponentsV2
          });
        } else {
          await interaction.editReply({
            content: '',
            components: [container],
            files: [new AttachmentBuilder(frameImage, { name: 'slots.png' })],
            flags: MessageFlags.IsComponentsV2
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const symbols = generateSlotCombination();
      const winnings = calculateWinnings(symbols, session.betAmount);
      const isWin = winnings > 0;

      const finalChips = isWin ? currentChips + winnings - session.betAmount : currentChips - session.betAmount;
      await addChips(userId, -session.betAmount + (isWin ? winnings : 0));

      const newChips = await getUserChips(userId);

      const resultImage = await createSlotMachineImage(symbols, false);

      const resultContainer = new ContainerBuilder();
      const resultMediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('attachment://slots.png')
        );
      resultContainer.addMediaGalleryComponents(resultMediaGallery);

      let resultText = `**${symbols.join(' ')}**\n\n`;
      if (isWin) {
        resultText += `You **won** **${winnings.toLocaleString()}** ${CHIPS_EMOJI}!\n`;
        resultText += `Net gain: **+${(winnings - session.betAmount).toLocaleString()}** ${CHIPS_EMOJI}\n`;
      } else {
        resultText += `You **lost** **${session.betAmount.toLocaleString()}** ${CHIPS_EMOJI}\n`;
      }
      
      resultText += `\nChips: **${newChips.toLocaleString()}** ${CHIPS_EMOJI}`;

      const resultTextDisplay = new TextDisplayBuilder()
        .setContent(resultText);
      resultContainer.addTextDisplayComponents(resultTextDisplay);

      activeSlotSessions.set(userId, {
        betAmount: session.betAmount,
        lastWin: isWin,
        canDouble: isWin && newChips >= (session.betAmount * 2),
        mainInteraction: session.mainInteraction
      });

      const canAffordNextSpin = newChips >= session.betAmount;
      const canAffordDouble = isWin && newChips >= (session.betAmount * 2);
      
      const controlRow1 = new ActionRowBuilder();
      if (canAffordNextSpin) {
        if (canAffordDouble) {
          controlRow1.addComponents(
            new ButtonBuilder()
              .setCustomId(`casino_slots_spin_${userId}`)
              .setLabel('Spin Again')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`casino_slots_double_${userId}`)
              .setLabel('Double Down')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`casino_slots_change_bet_${userId}`)
              .setLabel('Change Bet')
              .setStyle(ButtonStyle.Secondary)
          );
        } else {
          controlRow1.addComponents(
            new ButtonBuilder()
              .setCustomId(`casino_slots_spin_${userId}`)
              .setLabel('Spin Again')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`casino_slots_change_bet_${userId}`)
              .setLabel('Change Bet')
              .setStyle(ButtonStyle.Secondary)
          );
        }
      } else {
        controlRow1.addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_slots_buy_chips_500_${userId}`)
            .setLabel('Top Up')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`casino_slots_buy_chips_1000_${userId}`)
            .setLabel('High Roller')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_change_bet_${userId}`)
            .setLabel('Change Bet')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      const controlRow2 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_slots_buy_chips_100_${userId}`)
            .setLabel(`Buy 100`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_buy_chips_500_${userId}`)
            .setLabel(`Buy 500`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_slots_sell_chips_100_${userId}`)
            .setLabel(`Sell 100`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(newChips < 100),
          new ButtonBuilder()
            .setCustomId(`casino_slots_sell_chips_500_${userId}`)
            .setLabel(`Sell 500`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(newChips < 500)
        );

      const infoRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_disclaimer_${userId}`)
            .setEmoji('<:warning:1431753596583542794>')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({
        content: '',
        components: [resultContainer, controlRow1, controlRow2, infoRow],
        files: [new AttachmentBuilder(resultImage, { name: 'slots.png' })],
        flags: MessageFlags.IsComponentsV2
      });

    }

  } catch (error) {
    console.error('Error in slots button interaction:', error);
    
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred. Please try again.');
    container.addTextDisplayComponents(errorText);

    await interaction.reply({
      content: '',
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }
}
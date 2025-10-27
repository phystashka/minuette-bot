import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from '@discordjs/builders';
import { MessageFlags } from 'discord.js';
import { Canvas, createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCooldownContainer } from '../../utils/cooldownManager.js';
import { getUserById } from '../../models/UserModel.js';
import { getResourcesByUserId, updateResources } from '../../models/ResourceModel.js';
import { addBits, getPonyByUserId } from '../../models/PonyModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const fontPath = path.join(__dirname, '../../public/fonts');
  registerFont(path.join(fontPath, 'Poppins-Bold.ttf'), { family: 'Poppins-Bold' });
  registerFont(path.join(fontPath, 'Poppins-Regular.ttf'), { family: 'Poppins-Regular' });
} catch (error) {
  console.log('Font loading failed, using default fonts');
}

const CHIPS_EMOJI = '<:chips:1431269385405993010>';
const CHIPS_BUY_RATE = 110;
const CHIPS_SELL_RATE = 90;
const MIN_BET = 5;
const MAX_BET = 1000;
const MIN_NUMBER = 1;
const MAX_NUMBER = 100;
const OVER_MIN = 50;
const OVER_MAX = 85;
const UNDER_MIN = 16;
const UNDER_MAX = 50;

const dicePath = path.join(__dirname, '../../public/casino/dice/dice.png');

const activeDiceSessions = new Map();

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
        .setContent('**⏰ Session Expired**\n\nSession has timed out due to inactivity. Use `/casino_dice` to start a new game.');
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
    
    activeDiceSessions.delete(userId);
    sessionTimeouts.delete(userId);
  }, BUTTON_TIMEOUT);
  
  sessionTimeouts.set(userId, timeoutId);
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
      chipsBought: chipAmount,
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

async function createDiceResultImage(result = null) {
  if (result === null) {
    return null;
  }
  
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, 200, 200);
  
  ctx.fillStyle = '#FF0000';
  ctx.font = 'bold 72px Poppins-Bold, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(result.toString(), 100, 100);
  
  return canvas.toBuffer();
}

function calculateDicePayout(bet, choice, targetNumber, result) {
  let winChance;
  
  if (choice === 'over') {
    winChance = (100 - targetNumber) / 100;
  } else {
    winChance = (targetNumber - 1) / 100;
  }
  
  const houseEdge = 0.05;
  const fairMultiplier = 1 / winChance;
  const actualMultiplier = fairMultiplier * (1 - houseEdge);
  
  const payout = Math.floor(bet * actualMultiplier);
  
  let isWin = false;
  if (choice === 'over' && result > targetNumber) {
    isWin = true;
  } else if (choice === 'under' && result < targetNumber) {
    isWin = true;
  }
  
  return {
    isWin,
    payout: isWin ? payout : 0,
    multiplier: actualMultiplier,
    winChance: winChance * 100
  };
}

// Casino dice game - now used as a subcommand
const casinoDiceCommand = {
  async execute(interaction) {
    const userId = interaction.user.id;
    const choice = interaction.options.getString('choice');
    const targetNumber = interaction.options.getInteger('number');
    let betAmount = interaction.options.getInteger('bet') || 50;

    try {
      const cooldownExpiry = commandCooldowns.get(userId);
      if (cooldownExpiry && Date.now() < cooldownExpiry) {
        const remainingTime = Math.ceil((cooldownExpiry - Date.now()) / 1000);
        return interaction.reply({
          components: [createCooldownContainer(remainingTime, 'casino_dice')],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      if (choice === 'over') {
        if (targetNumber > OVER_MAX) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent(`❌ **Invalid Target**\n\nFor "over" bets, target number must be ${OVER_MAX} or less to ensure fair odds.`);
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        if (targetNumber < OVER_MIN) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent(`❌ **Invalid Target**\n\nFor "over" bets, target number must be ${OVER_MIN} or higher for fair gameplay.`);
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
      }

      if (choice === 'under') {
        if (targetNumber < UNDER_MIN) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent(`❌ **Invalid Target**\n\nFor "under" bets, target number must be ${UNDER_MIN} or higher to ensure fair odds.`);
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        if (targetNumber > UNDER_MAX) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent(`❌ **Invalid Target**\n\nFor "under" bets, target number must be ${UNDER_MAX} or less for fair gameplay.`);
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
      }

      const currentChips = await getUserChips(userId);
      if (currentChips < betAmount) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`❌ **Not Enough Chips**\n\nYou need **${betAmount.toLocaleString()}** ${CHIPS_EMOJI} but have **${currentChips.toLocaleString()}** ${CHIPS_EMOJI}.\n\nUse the buy buttons below to get more chips!`);
        container.addTextDisplayComponents(errorText);

        const buyButtons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`casino_dice_buy_chips_100_${userId}`)
              .setLabel('Buy 100')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`casino_dice_buy_chips_500_${userId}`)
              .setLabel('Buy 500')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Secondary)
          );

        return interaction.reply({
          components: [container, buyButtons],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      commandCooldowns.set(userId, Date.now() + COMMAND_COOLDOWN);

      const gameInfo = calculateDicePayout(betAmount, choice, targetNumber, 0);

      activeDiceSessions.set(userId, {
        betAmount,
        choice,
        targetNumber,
        gameInfo,
        mainInteraction: interaction
      });

      const gameContainer = new ContainerBuilder();
      const diceMediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('attachment://dice.png')
        );
      gameContainer.addMediaGalleryComponents(diceMediaGallery);

      const gameText = new TextDisplayBuilder()
        .setContent(`**🎲 Casino Dice Game**\n\n**Your Bet:** ${betAmount.toLocaleString()} ${CHIPS_EMOJI}\n**Choice:** ${choice.toUpperCase()} ${targetNumber}\n**Win Chance:** ${gameInfo.winChance.toFixed(1)}%\n**Potential Payout:** ${gameInfo.payout.toLocaleString()} ${CHIPS_EMOJI}\n**Multiplier:** ${gameInfo.multiplier.toFixed(2)}x\n\n**Your Chips:** ${currentChips.toLocaleString()} ${CHIPS_EMOJI}\n\n**Exchange Rates:**\nBuy: 1 ${CHIPS_EMOJI} = ${CHIPS_BUY_RATE} <:bits:1411354539935666197>\nSell: 1 ${CHIPS_EMOJI} = ${CHIPS_SELL_RATE} <:bits:1411354539935666197>`);
      gameContainer.addTextDisplayComponents(gameText);

      const gameButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_dice_roll_${userId}`)
            .setLabel('🎲 Roll Dice')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`casino_dice_change_bet_${userId}`)
            .setLabel('Change Bet')
            .setStyle(ButtonStyle.Secondary)
        );

      const chipButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_dice_buy_chips_100_${userId}`)
            .setLabel('Buy 100')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_dice_buy_chips_500_${userId}`)
            .setLabel('Buy 500')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_dice_sell_chips_100_${userId}`)
            .setLabel('Sell 100')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(currentChips < 100),
          new ButtonBuilder()
            .setCustomId(`casino_dice_sell_chips_500_${userId}`)
            .setLabel('Sell 500')
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(currentChips < 500)
        );

      const infoRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_disclaimer_${userId}`)
            .setEmoji('<:warning:1431753596583542794>')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.reply({
        components: [gameContainer, gameButtons, chipButtons, infoRow],
        files: [new AttachmentBuilder(dicePath, { name: 'dice.png' })],
        flags: MessageFlags.IsComponentsV2
      });

      setSessionTimeout(userId, interaction);

    } catch (error) {
      console.error('Error in dice command:', error);
      
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('An error occurred while setting up the dice game. Please try again.');
      container.addTextDisplayComponents(errorText);

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  },

  async handleButton(interaction) {
    const customId = interaction.customId;
    const userId = customId.split('_').pop();
    
    if (interaction.user.id !== userId) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('❌ You can only use your own casino buttons!');
      container.addTextDisplayComponents(errorText);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    try {
      const session = activeDiceSessions.get(userId);
      if (session && session.mainInteraction) {
        setSessionTimeout(userId, session.mainInteraction);
      }

      if (customId.startsWith('casino_dice_roll_')) {
        const session = activeDiceSessions.get(userId);
        if (!session) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent('Session expired! Use `/casino_dice` to start a new game.');
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }

        const rollingContainer = new ContainerBuilder();
        const rollingMediaGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL('attachment://dice_rolling.png')
          );
        rollingContainer.addMediaGalleryComponents(rollingMediaGallery);

        const rollingText = new TextDisplayBuilder()
          .setContent(`**🎲 Rolling the dice...**\n\nBetting ${session.choice.toUpperCase()} ${session.targetNumber}\nStake: **${session.betAmount.toLocaleString()}** ${CHIPS_EMOJI}`);
        rollingContainer.addTextDisplayComponents(rollingText);

        await interaction.update({
          components: [rollingContainer],
          files: [new AttachmentBuilder(dicePath, { name: 'dice_rolling.png' })],
          flags: MessageFlags.IsComponentsV2
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        let result;
        const shouldLose = Math.random() < 0.65;
        
        if (shouldLose) {
          if (session.choice === 'over') {
            result = Math.floor(Math.random() * session.targetNumber) + 1;
          } else {
            result = Math.floor(Math.random() * (100 - session.targetNumber + 1)) + session.targetNumber;
          }
        } else {
          result = Math.floor(Math.random() * 100) + 1;
        }
        
        const gameResult = calculateDicePayout(session.betAmount, session.choice, session.targetNumber, result);

        await addChips(userId, -session.betAmount + gameResult.payout);
        const newChips = await getUserChips(userId);

        const resultImage = await createDiceResultImage(result);

        const resultContainer = new ContainerBuilder();
        const resultMediaGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL('attachment://dice.png'),
            new MediaGalleryItemBuilder()
              .setURL('attachment://dice_result.png')
          );
        resultContainer.addMediaGalleryComponents(resultMediaGallery);

        let resultText = `**🎲 Dice Result: ${result}**\n\n`;
        resultText += `**Your bet:** ${session.choice.toUpperCase()} ${session.targetNumber}\n`;
        
        if (gameResult.isWin) {
          resultText += `**🎉 YOU WON!** 🎉\n`;
          resultText += `**Payout:** ${gameResult.payout.toLocaleString()} ${CHIPS_EMOJI}\n`;
          resultText += `**Net gain:** +${(gameResult.payout - session.betAmount).toLocaleString()} ${CHIPS_EMOJI}\n`;
        } else {
          resultText += `**😔 You lost** ${session.betAmount.toLocaleString()} ${CHIPS_EMOJI}\n`;
        }
        
        resultText += `\n**Your chips:** ${newChips.toLocaleString()} ${CHIPS_EMOJI}`;

        const resultTextDisplay = new TextDisplayBuilder()
          .setContent(resultText);
        resultContainer.addTextDisplayComponents(resultTextDisplay);

        const canAffordAnotherRoll = newChips >= session.betAmount;
        
        const controlButtons = new ActionRowBuilder();
        if (canAffordAnotherRoll) {
          controlButtons.addComponents(
            new ButtonBuilder()
              .setCustomId(`casino_dice_roll_${userId}`)
              .setLabel('🎲 Roll Again')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`casino_dice_change_bet_${userId}`)
              .setLabel('Change Bet')
              .setStyle(ButtonStyle.Secondary)
          );
        } else {
          controlButtons.addComponents(
            new ButtonBuilder()
              .setCustomId(`casino_dice_buy_chips_500_${userId}`)
              .setLabel('Top Up')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`casino_dice_change_bet_${userId}`)
              .setLabel('Change Bet')
              .setStyle(ButtonStyle.Secondary)
          );
        }

        const chipButtons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`casino_dice_buy_chips_100_${userId}`)
              .setLabel('Buy 100')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`casino_dice_buy_chips_500_${userId}`)
              .setLabel('Buy 500')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`casino_dice_sell_chips_100_${userId}`)
              .setLabel('Sell 100')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Danger)
              .setDisabled(newChips < 100),
            new ButtonBuilder()
              .setCustomId(`casino_dice_sell_chips_500_${userId}`)
              .setLabel('Sell 500')
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

        const files = [new AttachmentBuilder(dicePath, { name: 'dice.png' })];
        if (resultImage) {
          files.push(new AttachmentBuilder(resultImage, { name: 'dice_result.png' }));
        }

        await interaction.editReply({
          components: [resultContainer, controlButtons, chipButtons, infoRow],
          files: files,
          flags: MessageFlags.IsComponentsV2
        });

        return;
      }

      if (customId.startsWith('casino_dice_buy_chips_')) {
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
          .setContent(`Successfully bought **${buyResult.chipsBought}** ${CHIPS_EMOJI} for **${buyResult.bitsSpent.toLocaleString()}** <:bits:1411354539935666197>!`);
        container.addTextDisplayComponents(successText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      if (customId.startsWith('casino_dice_sell_chips_')) {
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

      if (customId.startsWith('casino_dice_change_bet_')) {
        const session = activeDiceSessions.get(userId);
        if (!session) {
          const container = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent('Session expired! Use `/casino_dice` to start a new game.');
          container.addTextDisplayComponents(errorText);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }

        const container = new ContainerBuilder();
        const betText = new TextDisplayBuilder()
          .setContent(`**Change Your Bet**\n\nCurrent bet: **${session.betAmount}** ${CHIPS_EMOJI}\nCurrent target: **${session.choice.toUpperCase()} ${session.targetNumber}**\nYour chips: **${await getUserChips(userId)}** ${CHIPS_EMOJI}\n\nSelect a new bet amount:`);
        container.addTextDisplayComponents(betText);

        const betButtons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`casino_dice_set_bet_50_${userId}`)
              .setLabel('50')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`casino_dice_set_bet_100_${userId}`)
              .setLabel('100')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`casino_dice_set_bet_250_${userId}`)
              .setLabel('250')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`casino_dice_set_bet_500_${userId}`)
              .setLabel('500')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Primary)
          );

        const betButtons2 = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`casino_dice_set_bet_1000_${userId}`)
              .setLabel('1000')
              .setEmoji('<:chips:1431269385405993010>')
              .setStyle(ButtonStyle.Primary)
          );

        return interaction.reply({
          components: [container, betButtons, betButtons2],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      if (customId.startsWith('casino_dice_set_bet_')) {
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

        const session = activeDiceSessions.get(userId);
        if (session) {
          const newGameInfo = calculateDicePayout(newBet, session.choice, session.targetNumber, 0);
          activeDiceSessions.set(userId, {
            ...session,
            betAmount: newBet,
            gameInfo: newGameInfo
          });

          const container = new ContainerBuilder();
          const successText = new TextDisplayBuilder()
            .setContent(`✅ **Bet Updated!**\n\nNew bet: **${newBet}** ${CHIPS_EMOJI}\nTarget: **${session.choice.toUpperCase()} ${session.targetNumber}**\nWin chance: **${newGameInfo.winChance.toFixed(1)}%**\nPotential payout: **${newGameInfo.payout.toLocaleString()}** ${CHIPS_EMOJI}`);
          container.addTextDisplayComponents(successText);

          return interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

    } catch (error) {
      console.error('Error in dice button interaction:', error);
      
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
};

export default casinoDiceCommand;
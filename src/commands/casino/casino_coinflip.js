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
import { getUserById } from '../../models/UserModel.js';
import { getResourcesByUserId, updateResources } from '../../models/ResourceModel.js';
import { addBits, getPonyByUserId } from '../../models/PonyModel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Casino coinflip game - now used as a subcommand

const CHIPS_EMOJI = '<:chips:1431269385405993010>';
const CHIPS_BUY_RATE = 110;
const CHIPS_SELL_RATE = 90;

const activeCoinflipSessions = new Map();

const sessionTimeouts = new Map();

const commandCooldowns = new Map();
const COMMAND_COOLDOWN = 60000;

const BUTTON_TIMEOUT = 30000;

function clearSessionTimeout(sessionId) {
  const timeoutId = sessionTimeouts.get(sessionId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    sessionTimeouts.delete(sessionId);
  }
}

function setSessionTimeout(sessionId, interaction) {
  clearSessionTimeout(sessionId);
  
  const timeoutId = setTimeout(async () => {
    try {
      if (!interaction.isRepliable()) {
        console.log(`Coinflip session timeout for ${sessionId}: interaction expired, skipping update`);
        return;
      }
      
      const container = new ContainerBuilder();
      const timeoutText = new TextDisplayBuilder()
        .setContent('**⏰ Session Expired**\n\nButtons have been disabled due to inactivity. Use `/casino_coinflip` to start a new game.');
      container.addTextDisplayComponents(timeoutText);
      
      const disabledButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('disabled_accept')
            .setLabel('Accept Challenge (Expired)')
            .setEmoji('<:like:1422566402308575402>')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('disabled_decline')
            .setLabel('Decline Challenge (Expired)')
            .setEmoji('<:dislike:1422566400433717259>')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
      
      await interaction.editReply({
        components: [container, disabledButtons],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      if (error.code === 10008 || error.status === 404) {
        console.log(`Coinflip session timeout for ${sessionId}: interaction already expired`);
      } else {
        console.error('Error handling coinflip session timeout:', error);
      }
    }
    
    activeCoinflipSessions.delete(sessionId);
    sessionTimeouts.delete(sessionId);
  }, BUTTON_TIMEOUT);
  
  sessionTimeouts.set(sessionId, timeoutId);
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

const COIN_SIDES = {
  heads: 'coin1.png',
  tails: 'coin2.png'
};

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
    await addChips(userId, chipAmount);
    console.log(`User ${userId} bought ${chipAmount} chips for ${totalCost} bits`);
    
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
        message: `You don't have enough chips! You have **${currentChips}** ${CHIPS_EMOJI} but tried to sell **${chipAmount}**.`
      };
    }
    
    const totalEarned = chipAmount * CHIPS_SELL_RATE;
    
    await addChips(userId, -chipAmount);
    await addBits(userId, totalEarned);
    console.log(`User ${userId} sold ${chipAmount} chips for ${totalEarned} bits`);
    
    return {
      success: true,
      chipsSold: chipAmount,
      bitsEarned: totalEarned
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
  const opponent = interaction.options.getUser('opponent');
  const choice = interaction.options.getString('choice');
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

    if (opponent.id === userId) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('You cannot play against yourself!');
      container.addTextDisplayComponents(errorText);

      return interaction.editReply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (opponent.bot) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('You cannot play against a bot!');
      container.addTextDisplayComponents(errorText);

      return interaction.editReply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

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

    const opponentData = await getUserById(opponent.id);
    if (!opponentData) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent(`${opponent.username} needs to register first! They need to use \`/equestria\` to get started.`);
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

      const buyChipsRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`casino_coinflip_buy_chips_100_${userId}`)
            .setLabel(`Buy 100`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_coinflip_buy_chips_500_${userId}`)
            .setLabel(`Buy 500`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`casino_coinflip_buy_chips_1000_${userId}`)
            .setLabel(`Buy 1000`)
            .setEmoji('<:chips:1431269385405993010>')
            .setStyle(ButtonStyle.Secondary),
        );

      return interaction.editReply({
        content: '',
        components: [container, buyChipsRow],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const opponentChips = await getUserChips(opponent.id);

    if (opponentChips < betAmount) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent(`${opponent.username} doesn't have enough chips! They have **${opponentChips}** ${CHIPS_EMOJI} but need **${betAmount}**.`);
      container.addTextDisplayComponents(errorText);

      return interaction.editReply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    activeCoinflipSessions.set(userId, {
      opponent: opponent.id,
      betAmount,
      challengerChoice: choice,
      opponentChoice: choice === 'heads' ? 'tails' : 'heads'
    });

    const container = new ContainerBuilder();
    
    const challengeText = new TextDisplayBuilder()
      .setContent(`**Coinflip Challenge!**\n\n**${interaction.user.username}** challenges **${opponent.username}**!\n\n**Bet:** ${betAmount.toLocaleString()} ${CHIPS_EMOJI}\n**${interaction.user.username}'s choice:** ${choice === 'heads' ? 'Heads (Eagle)' : 'Tails'}\n**${opponent.username}'s choice:** ${choice === 'heads' ? 'Tails' : 'Heads (Eagle)'}\n\n${opponent.toString()}, do you accept this challenge?`);
    container.addTextDisplayComponents(challengeText);

    const responseRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`casino_coinflip_accept_${userId}_${opponent.id}`)
          .setLabel('Accept Challenge')
          .setEmoji('<:like:1422566402308575402>')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`casino_coinflip_decline_${userId}_${opponent.id}`)
          .setLabel('Decline Challenge')
          .setEmoji('<:dislike:1422566400433717259>')
          .setStyle(ButtonStyle.Danger)
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
      components: [container, responseRow, infoButtons],
      flags: MessageFlags.IsComponentsV2
    });

    const sessionId = `${userId}_${opponent.id}`;
    setSessionTimeout(sessionId, interaction);

  } catch (error) {
    console.error('Error in coinflip command:', error);
    
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

  try {
    if (customId.startsWith('casino_coinflip_accept_') || customId.startsWith('casino_coinflip_decline_')) {
      const parts = customId.split('_');
      const challengerId = parts[3];
      const opponentId = parts[4];
      const sessionId = `${challengerId}_${opponentId}`;
      
      clearSessionTimeout(sessionId);
    }

    if (customId.startsWith('casino_coinflip_buy_chips_')) {
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
        .setContent(`Successfully bought **${buyResult.chipsReceived}** ${CHIPS_EMOJI} for **${buyResult.bitsSpent.toLocaleString()}** <:bits:1411354539935666197>!\n\nYou can now use \`/coinflip\` to play!`);
      container.addTextDisplayComponents(successText);

      return interaction.reply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (customId.startsWith('casino_coinflip_sell_chips_')) {
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

    if (customId.startsWith('casino_coinflip_accept_')) {
      const parts = customId.split('_');
      const challengerId = parts[3];
      const opponentId = parts[4];

      if (userId !== opponentId) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('This challenge is not for you!');
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const session = activeCoinflipSessions.get(challengerId);
      if (!session) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('Challenge session expired! Use `/casino_coinflip` to start a new game.');
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const challengerChips = await getUserChips(challengerId);
      const opponentChips = await getUserChips(opponentId);

      if (challengerChips < session.betAmount) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`Challenger doesn't have enough chips anymore!`);
        container.addTextDisplayComponents(errorText);

        activeCoinflipSessions.delete(challengerId);
        return interaction.update({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (opponentChips < session.betAmount) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent(`You don't have enough chips anymore!`);
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      await startCoinflip(interaction, challengerId, opponentId, session);
    }

    if (customId.startsWith('casino_coinflip_decline_')) {
      const parts = customId.split('_');
      const challengerId = parts[3];
      const opponentId = parts[4];

      if (userId !== opponentId) {
        const container = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('This challenge is not for you!');
        container.addTextDisplayComponents(errorText);

        return interaction.reply({
          content: '',
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }

      const container = new ContainerBuilder();
      const declineText = new TextDisplayBuilder()
        .setContent(`**Challenge Declined!**\n\n${interaction.user.username} declined the coinflip challenge.`);
      container.addTextDisplayComponents(declineText);

      activeCoinflipSessions.delete(challengerId);
      
      await interaction.update({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

  } catch (error) {
    console.error('Error in coinflip button interaction:', error);
    
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

async function startCoinflip(interaction, challengerId, opponentId, session) {
  async function safeUpdate(interaction, updatePayload) {
    try {
      if (interaction.replied || interaction.deferred) {
        return await interaction.editReply(updatePayload);
      } else {
        return await interaction.update(updatePayload);
      }
    } catch (err) {
      try {
        return await interaction.editReply(updatePayload);
      } catch (err2) {
        console.error('Both update and editReply failed in safeUpdate:', err, err2);
        throw err2;
      }
    }
  }
  const flipFrames = ['coin1.png', 'coin2.png', 'coin1.png', 'coin2.png'];
  
  for (let frame = 0; frame < flipFrames.length; frame++) {
    const frameImage = path.join(__dirname, '../../public/coinflip', flipFrames[frame]);
    
    const container = new ContainerBuilder();
    const mediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${flipFrames[frame]}`)
      );
    container.addMediaGalleryComponents(mediaGallery);

    const flippingText = new TextDisplayBuilder()
      .setContent('Flipping coin...');
    container.addTextDisplayComponents(flippingText);

    await safeUpdate(interaction, {
      content: '',
      components: [container],
      files: [new AttachmentBuilder(frameImage, { name: flipFrames[frame] })],
      flags: MessageFlags.IsComponentsV2
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const winner = result === session.challengerChoice ? challengerId : opponentId;
  const loser = winner === challengerId ? opponentId : challengerId;

  await addChips(winner, session.betAmount);
  await addChips(loser, -session.betAmount);

  const finalImage = path.join(__dirname, '../../public/coinflip', COIN_SIDES[result]);
  
  const resultContainer = new ContainerBuilder();
  const resultMediaGallery = new MediaGalleryBuilder()
    .addItems(
      new MediaGalleryItemBuilder()
        .setURL(`attachment://${COIN_SIDES[result]}`)
    );
  resultContainer.addMediaGalleryComponents(resultMediaGallery);

  const challenger = await interaction.client.users.fetch(challengerId);
  const opponent = await interaction.client.users.fetch(opponentId);
  const winnerUser = winner === challengerId ? challenger : opponent;

  let resultText = `**${result === 'heads' ? 'Heads (Eagle)' : 'Tails'}!**\n\n`;
  resultText += `**${winnerUser.username}** wins **${(session.betAmount * 2).toLocaleString()}** ${CHIPS_EMOJI}!\n\n`;
  resultText += `**Final chips:**\n`;
  
  const finalChallengerChips = await getUserChips(challengerId);
  const finalOpponentChips = await getUserChips(opponentId);
  
  resultText += `${challenger.username}: **${finalChallengerChips.toLocaleString()}** ${CHIPS_EMOJI}\n`;
  resultText += `${opponent.username}: **${finalOpponentChips.toLocaleString()}** ${CHIPS_EMOJI}`;

  const resultTextDisplay = new TextDisplayBuilder()
    .setContent(resultText);
  resultContainer.addTextDisplayComponents(resultTextDisplay);

  await interaction.editReply({
    content: '',
    components: [resultContainer],
    files: [new AttachmentBuilder(finalImage, { name: COIN_SIDES[result] })],
    flags: MessageFlags.IsComponentsV2
  });

  activeCoinflipSessions.delete(challengerId);
}

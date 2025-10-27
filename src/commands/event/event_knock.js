import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getResourceAmount, removeResource, addResource } from '../../models/ResourceModel.js';
import { removeHarmony } from '../../models/HarmonyModel.js';
import { removeBits } from '../../models/PonyModel.js';


const KNOCK_COOLDOWN = 15 * 60 * 1000;
const knockCooldowns = new Map();

// Halloween trick-or-treat knock - now used as a subcommand

export async function execute(interaction) {
  try {
    const knocker = interaction.user;
    const knockerId = knocker.id;
    
    const now = Date.now();
    const lastKnock = knockCooldowns.get(knockerId);
    
    if (lastKnock && (now - lastKnock) < KNOCK_COOLDOWN) {
      const timeLeft = KNOCK_COOLDOWN - (now - lastKnock);
      const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
      
      const cooldownEmbed = createEmbed({
        title: '🕐 Cooldown Active',
        description: `You recently visited someone's house!\n\nYou can knock on doors again in **${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}**.`,
        color: 0x03168f,
        user: knocker
      });
      
      return await interaction.reply({
        embeds: [cooldownEmbed],
        flags: MessageFlags.Ephemeral
      });
    }
    
    const targetUser = interaction.options.getUser('user');
    

    if (targetUser.id === knocker.id) {
      return await interaction.reply({
        content: 'You cannot knock on your own door!',
        flags: MessageFlags.Ephemeral
      });
    }
    

    if (targetUser.bot) {
      return await interaction.reply({
        content: 'You cannot knock on a bot\'s door!',
        flags: MessageFlags.Ephemeral
      });
    }
    
    const embed = createEmbed({
      title: 'Halloween Knock!',
      description: `**${knocker.username}** is knocking on your door!\n\n*Knock knock...* 🚪\n\nWhat will you do?`,
      color: 0x03168f,
      user: knocker
    });
    
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`knock_open_${knocker.id}_${targetUser.id}`)
          .setLabel('Open Door')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🚪'),
        new ButtonBuilder()
          .setCustomId(`knock_ignore_${knocker.id}_${targetUser.id}`)
          .setLabel('Ignore')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('😴')
      );
    
    await interaction.reply({
      content: `${targetUser}`,
      embeds: [embed],
      components: [buttons]
    });
    

    knockCooldowns.set(knockerId, now);
    
  } catch (error) {
    console.error('Error in knock command:', error);
    await interaction.reply({
      content: 'An error occurred while knocking on the door.',
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleKnockButton(interaction) {
  try {
    const [action, subAction, knockerId, targetId] = interaction.customId.split('_');
    
    if (interaction.user.id !== targetId) {
      return await interaction.reply({
        content: 'Only the person being knocked can respond!',
        flags: MessageFlags.Ephemeral
      });
    }
    
    const knocker = await interaction.client.users.fetch(knockerId);
    const target = interaction.user;
    
    if (subAction === 'ignore') {
      const embed = createEmbed({
        title: '😴 Door Ignored',
        description: `**${target.username}** decided to ignore the knocking...\n\n*${knocker.username} walks away disappointed.*`,
        color: 0x03168f,
        user: target
      });
      
      await interaction.update({
        content: `${knocker}`,
        embeds: [embed],
        components: []
      });
      return;
    }
    
    if (subAction === 'open') {
      const embed = createEmbed({
        title: '🚪 Door Opened!',
        description: `**${target.username}** opens the door...\n\n**${knocker.username}**: "Trick or Treat!"\n\nWhat will you choose?`,
        color: 0x03168f,
        user: target
      });
      
      const choices = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`trick_treat_${knockerId}_${targetId}`)
            .setLabel('Give Treats (Sweet)')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🍬'),
          new ButtonBuilder()
            .setCustomId(`trick_trick_${knockerId}_${targetId}`)
            .setLabel('Give Tricks (Mean)')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🎨')
        );
      
      await interaction.update({
        content: `${knocker}`,
        embeds: [embed],
        components: [choices]
      });
      return;
    }
    
  } catch (error) {
    console.error('Error in knock button handler:', error);
    await interaction.reply({
      content: 'An error occurred while processing your response.',
      flags: MessageFlags.Ephemeral
    });
  }
}

export async function handleTrickTreatButton(interaction) {
  try {
    const [action, choice, knockerId, targetId] = interaction.customId.split('_');
    

    if (interaction.user.id !== targetId) {
      return await interaction.reply({
        content: 'Only the person being knocked can respond!',
        flags: MessageFlags.Ephemeral
      });
    }
    
    const knocker = await interaction.client.users.fetch(knockerId);
    const target = interaction.user;
    
    if (choice === 'treat') {

      const targetCandies = await getResourceAmount(targetId, 'candies');
      
      if (targetCandies >= 20) {

        await removeResource(targetId, 'candies', 20);
        await addResource(knockerId, 'candies', 20);
        
        const embed = createEmbed({
          title: '🍬 Sweet Treats Given!',
          description: `**${target.username}** generously gave **${knocker.username}** 🍬 20 candies!\n\n*What a sweet Halloween spirit!*`,
          color: 0x00FF00,
          image: 'https://i.imgur.com/uc6vDYW.gif',
          user: target
        });
        
        await interaction.update({
          content: `${knocker}`,
          embeds: [embed],
          components: []
        });
      } else {
        const embed = createEmbed({
          title: '🍬 No Treats Available',
          description: `**${target.username}** wanted to give candies but had none!\n\n*${knocker.username} leaves empty-handed but understanding.*`,
          color: 0xFFFF00,
          user: target
        });
        
        await interaction.update({
          content: `${knocker}`,
          embeds: [embed],
          components: []
        });
      }
    } else if (choice === 'trick') {

      await removeHarmony(targetId, 50, 'Halloween trick - chose to be mean to visitors');
      await removeBits(targetId, 1500);
      
      const embed = createEmbed({
        title: '🎨 Door Gets Painted!',
        description: `**${target.username}** chose to be mean and give tricks!\n\n*But **${knocker.username}** paints your door in revenge!*\n\n**${target.username}** lost:\n• <:harmony:1416514347789844541> 50 Harmony (bad reputation)\n• <:bits:1411354539935666197> 1,500 Bits (cleaning costs)`,
        color: 0xFF0000,
        user: target
      });
      
      await interaction.update({
        content: `${knocker}`,
        embeds: [embed],
        components: []
      });
    }
    
  } catch (error) {
    console.error('Error in trick/treat button handler:', error);
    await interaction.reply({
      content: 'An error occurred while processing your choice.',
      flags: MessageFlags.Ephemeral
    });
  }
}

export const guildOnly = false;
import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/components.js';
import { isDonator, setDonatorEmoji, getDonatorEmoji } from '../../models/DonatorModel.js';

export const data = new SlashCommandBuilder()
  .setName('emoji')
  .setDescription('Set your custom emoji for leaderboards (Donators only)')
  .setDescriptionLocalizations({
    'ru': 'Установить ваше кастомное эмодзи для лидербордов (только для донатеров)'
  })
  .setDMPermission(false)
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('Set your custom emoji')
      .addStringOption(option =>
        option.setName('emoji')
          .setDescription('The emoji to use (can be custom or unicode)')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove your custom emoji'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View your current custom emoji'));

export async function execute(interaction) {
  try {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    

    const userIsDonator = await isDonator(userId);
    if (!userIsDonator) {
      const embed = errorEmbed(
        'This command is only available for donators! 🎁\n\n' +
        'To become a donator, use `/donate` and purchase at least two collections.',
        'Donators Only'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    console.log(`🎁 Donator emoji command ${subcommand} executed by ${interaction.user.tag}`);

    switch (subcommand) {
      case 'set':
        await handleSetEmoji(interaction);
        break;
      case 'remove':
        await handleRemoveEmoji(interaction);
        break;
      case 'view':
        await handleViewEmoji(interaction);
        break;
    }

  } catch (error) {
    console.error('🎁 Error in donator_emoji command:', error);
    const embed = errorEmbed('An error occurred while processing your request.', 'Command Error');
    
    if (!interaction.replied) {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }
}

async function handleSetEmoji(interaction) {
  try {
    const emoji = interaction.options.getString('emoji');
    const userId = interaction.user.id;
    

    if (emoji.length > 100) {
      const embed = errorEmbed(
        'The emoji is too long. Please use a shorter emoji.',
        'Invalid Emoji'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    

    if (emoji.includes(':') && emoji.includes('<') && emoji.includes('>')) {

      const emojiMatch = emoji.match(/<a?:\w+:(\d+)>/);
      if (emojiMatch) {
        const emojiId = emojiMatch[1];
        try {

          const testEmoji = interaction.client.emojis.cache.get(emojiId);
          if (!testEmoji) {
            const embed = errorEmbed(
              'I don\'t have access to this custom emoji. Please use an emoji from a server where I\'m present.',
              'Emoji Not Accessible'
            );
            return interaction.reply({ embeds: [embed], ephemeral: true });
          }
        } catch (error) {
          const embed = errorEmbed(
            'Invalid custom emoji format. Please try again with a valid emoji.',
            'Invalid Emoji'
          );
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }
    }
    
    const result = await setDonatorEmoji(userId, emoji);
    
    if (result.success) {
      const embed = successEmbed(
        `Your custom emoji has been set to ${emoji}!\n\n` +
        'It will now appear next to your name in leaderboards.',
        'Emoji Updated'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      const embed = errorEmbed(result.message, 'Error Setting Emoji');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error setting donator emoji:', error);
    const embed = errorEmbed('Failed to set emoji. Please try again.', 'Database Error');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleRemoveEmoji(interaction) {
  try {
    const userId = interaction.user.id;
    const result = await setDonatorEmoji(userId, null);
    
    if (result.success) {
      const embed = successEmbed(
        'Your custom emoji has been removed.\n\n' +
        'Your name will now appear without a custom emoji in leaderboards.',
        'Emoji Removed'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      const embed = errorEmbed(result.message, 'Error Removing Emoji');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error removing donator emoji:', error);
    const embed = errorEmbed('Failed to remove emoji. Please try again.', 'Database Error');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleViewEmoji(interaction) {
  try {
    const userId = interaction.user.id;
    const currentEmoji = await getDonatorEmoji(userId);
    
    if (currentEmoji) {
      const embed = successEmbed(
        `Your current custom emoji is: ${currentEmoji}\n\n` +
        'This emoji appears next to your name in leaderboards.',
        'Current Emoji'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      const embed = errorEmbed(
        'You don\'t have a custom emoji set.\n\n' +
        'Use `/emoji set` to set one!',
        'No Emoji Set'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error viewing donator emoji:', error);
    const embed = errorEmbed('Failed to view emoji. Please try again.', 'Database Error');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export default {
  data,
  execute
};
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/components.js';
import { addDonator, removeDonator, getDonator } from '../../models/DonatorModel.js';

export const data = new SlashCommandBuilder()
  .setName('donator_set')
  .setDescription('Add or remove donator status (Bot owner only)')
  .setDMPermission(false)
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a user as donator')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The user to grant donator status')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove donator status from a user')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The user to remove donator status from')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('check')
      .setDescription('Check if a user is a donator')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('The user to check donator status')
          .setRequired(true)))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);


export const guildOnly = true;
export const guildId = '1415332959728304170';

export async function execute(interaction) {
  try {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    

    const authorizedUserId = '259347882052812800';
    if (interaction.user.id !== authorizedUserId) {
      const embed = errorEmbed('You are not authorized to use this command.', 'Access Denied');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (interaction.guild.id !== '1415332959728304170') {
      const embed = errorEmbed('This command can only be used in the designated server.', 'Wrong Server');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    console.log(`🎁 Donator command ${subcommand} executed by ${interaction.user.tag} for user ${targetUser.tag}`);

    switch (subcommand) {
      case 'add':
        await handleAddDonator(interaction, targetUser);
        break;
      case 'remove':
        await handleRemoveDonator(interaction, targetUser);
        break;
      case 'check':
        await handleCheckDonator(interaction, targetUser);
        break;
    }

  } catch (error) {
    console.error('🎁 Error in donator_set command:', error);
    const embed = errorEmbed('An error occurred while processing your request.', 'Command Error');
    
    if (!interaction.replied) {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }
}

async function handleAddDonator(interaction, targetUser) {
  try {
    const username = targetUser.username;
    const result = await addDonator(targetUser.id, username);
    
    if (result.success) {
      const embed = successEmbed(
        `${targetUser.username} (${targetUser.id}) has been added as a donator! 🎁`,
        'Donator Added'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      const embed = errorEmbed(result.message, 'Error Adding Donator');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error adding donator:', error);
    const embed = errorEmbed('Failed to add donator. Please try again.', 'Database Error');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleRemoveDonator(interaction, targetUser) {
  try {
    const result = await removeDonator(targetUser.id);
    
    if (result.success) {
      const embed = successEmbed(
        `${targetUser.username} (${targetUser.id}) has been removed from donators.`,
        'Donator Removed'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      const embed = errorEmbed(result.message, 'Error Removing Donator');
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error removing donator:', error);
    const embed = errorEmbed('Failed to remove donator. Please try again.', 'Database Error');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleCheckDonator(interaction, targetUser) {
  try {
    const donator = await getDonator(targetUser.id);
    
    if (donator) {
      const embed = successEmbed(
        `${targetUser.username} is a donator! 🎁\n` +
        `**Added:** ${new Date(donator.created_at).toLocaleDateString()}\n` +
        `**Custom Emoji:** ${donator.custom_emoji || 'None set'}`,
        'Donator Status'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      const embed = errorEmbed(
        `${targetUser.username} is not a donator.`,
        'Not a Donator'
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error checking donator:', error);
    const embed = errorEmbed('Failed to check donator status. Please try again.', 'Database Error');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export default {
  data,
  execute
};
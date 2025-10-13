import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/components.js';
import { config } from '../../config/config.js';

export const data = new SlashCommandBuilder()
  .setName('leave_guild')
  .setDescription('Leave a specific guild/server (Bot owner only)')
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName('guild_id')
      .setDescription('The ID of the guild to leave')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Optional reason for leaving the guild')
      .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);


export const guildOnly = true;
export const guildId = '1415332959728304170';

export async function execute(interaction) {
  try {
    const guildIdToLeave = interaction.options.getString('guild_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    

    const authorizedUserId = '259347882052812800';
    if (interaction.user.id !== authorizedUserId) {
      const embed = errorEmbed('You are not authorized to use this command.', 'Access Denied');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (interaction.guild.id !== '1415332959728304170') {
      const embed = errorEmbed('This command can only be used in the designated server.', 'Wrong Server');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (!/^\d{17,19}$/.test(guildIdToLeave)) {
      const embed = errorEmbed('Invalid guild ID format. Please provide a valid Discord guild ID.', 'Invalid ID');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const targetGuild = interaction.client.guilds.cache.get(guildIdToLeave);
    
    if (!targetGuild) {
      const embed = errorEmbed(
        `Guild with ID \`${guildIdToLeave}\` not found.\n\n` +
        `**Possible reasons:**\n` +
        `• The bot is not in that guild\n` +
        `• Invalid guild ID\n` +
        `• Guild may have been deleted`,
        'Guild Not Found'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (guildIdToLeave === interaction.guild.id) {
      const embed = errorEmbed(
        'Cannot leave the current guild using this command.\n\n' +
        'If you want to leave this guild, use the command from another server.',
        'Cannot Leave Current Guild'
      );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const confirmationEmbed = new EmbedBuilder()
      .setTitle('⚠️ Guild Leave Confirmation')
      .setDescription(
        `**You are about to leave the following guild:**\n\n` +
        `**Guild Name:** ${targetGuild.name}\n` +
        `**Guild ID:** \`${targetGuild.id}\`\n` +
        `**Member Count:** ${targetGuild.memberCount || 'Unknown'}\n` +
        `**Owner:** <@${targetGuild.ownerId}>\n\n` +
        `**Reason:** ${reason}\n\n` +
        `**⚠️ Warning:** This action cannot be undone. The bot will need to be re-invited to rejoin.`
      )
      .setColor(0xFEE75C)
      .setTimestamp()
      .setFooter({ 
        text: 'Guild leave operation',
        iconURL: interaction.client.user.displayAvatarURL()
      });

    if (targetGuild.iconURL()) {
      confirmationEmbed.setThumbnail(targetGuild.iconURL());
    }

    await interaction.reply({ embeds: [confirmationEmbed], ephemeral: true });

    try {

      await targetGuild.leave();
      

      const successConfirmation = successEmbed(
        `Successfully left guild: **${targetGuild.name}** (\`${targetGuild.id}\`)\n\n` +
        `**Reason:** ${reason}\n` +
        `**Left at:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        'Guild Left Successfully! 👋'
      );
      
      await interaction.followUp({ embeds: [successConfirmation], ephemeral: true });
      
    } catch (leaveError) {
      console.error('Failed to leave guild:', leaveError);
      
      const failureEmbed = errorEmbed(
        `Failed to leave guild: **${targetGuild.name}** (\`${targetGuild.id}\`)\n\n` +
        `**Error:** ${leaveError.message}\n\n` +
        `**Possible reasons:**\n` +
        `• Network connectivity issues\n` +
        `• Discord API rate limits\n` +
        `• Unknown Discord error`,
        'Failed to Leave Guild ❌'
      );
      
      await interaction.followUp({ embeds: [failureEmbed], ephemeral: true });
    }

  } catch (error) {
    console.error('Error in leave_guild command:', error);
    
    const embed = errorEmbed(
      'An unexpected error occurred while processing the command.',
      'Command Error'
    );
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}
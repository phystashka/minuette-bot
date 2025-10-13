import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { setBloodMoonChannel } from '../../models/BloodMoonModel.js';

export const data = new SlashCommandBuilder()
  .setName('set_blood_notify')
  .setDescription('Set the channel for Blood Moon event notifications')
  .setDMPermission(false)
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Channel to send Blood Moon notifications')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const execute = async (interaction) => {
  try {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;


    const permissions = channel.permissionsFor(interaction.guild.members.me);
    if (!permissions.has(PermissionFlagsBits.SendMessages)) {
      const errorEmbed = createEmbed({
        title: 'Error',
        description: `I don't have permission to send messages in ${channel}`,
        color: 0xff4444
      });
      return await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
    }


    const success = await setBloodMoonChannel(guildId, channel.id);

    if (success) {
      const successEmbed = createEmbed({
        title: '🩸 Blood Moon Notifications Enabled',
        description: `Blood Moon event notifications will now be sent to ${channel}`,
        color: 0x44ff44
      });
      await interaction.reply({ embeds: [successEmbed] });
    } else {
      const errorEmbed = createEmbed({
        title: 'Error',
        description: 'Failed to set up Blood Moon notifications. Please try again.',
        color: 0xff4444
      });
      await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
    }

  } catch (error) {
    console.error('Error in set_blood_notify command:', error);
    const errorEmbed = createEmbed({
      title: 'Error',
      description: 'An error occurred while setting up Blood Moon notifications',
      color: 0xff4444
    });
    await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
  }
};
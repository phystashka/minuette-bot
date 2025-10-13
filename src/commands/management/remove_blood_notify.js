import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { removeBloodMoonChannel } from '../../models/BloodMoonModel.js';

export const data = new SlashCommandBuilder()
  .setName('remove_blood_notify')
  .setDescription('Remove Blood Moon event notifications from this server')
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const execute = async (interaction) => {
  try {
    const guildId = interaction.guild.id;


    const removed = await removeBloodMoonChannel(guildId);

    if (removed) {
      const successEmbed = createEmbed({
        title: '🩸 Blood Moon Notifications Disabled',
        description: 'Blood Moon event notifications have been disabled for this server',
        color: 0x44ff44
      });
      await interaction.reply({ embeds: [successEmbed] });
    } else {
      const infoEmbed = createEmbed({
        title: 'Blood Moon Notifications',
        description: 'Blood Moon notifications were not enabled for this server',
        color: 0x0099ff
      });
      await interaction.reply({ embeds: [infoEmbed], flags: [MessageFlags.Ephemeral] });
    }

  } catch (error) {
    console.error('Error in remove_blood_notify command:', error);
    const errorEmbed = createEmbed({
      title: 'Error',
      description: 'An error occurred while removing Blood Moon notifications',
      color: 0xff4444
    });
    await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
  }
};
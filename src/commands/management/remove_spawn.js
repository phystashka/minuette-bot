import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getSpawnChannels, removeAllSpawnChannels } from '../../models/SpawnChannelModel.js';

export const data = new SlashCommandBuilder()
  .setName('remove_spawn')
  .setDescription('Disable automatic pony spawning')
  .setDescriptionLocalizations({
    'ru': 'Отключить автоматический спавн пони'
  })
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  try {

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const embed = createEmbed({
        title: 'Access Denied',
        description: 'You need "Manage Server" permission to use this command.',
        color: 0x03168f,
        user: interaction.user
      });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const guildId = interaction.guild.id;


    const currentChannels = await getSpawnChannels(guildId);
    
    if (!currentChannels || currentChannels.length === 0) {
      const embed = createEmbed({
        title: 'No Spawn Channels',
        description: 'There are no spawn channels set for this server.',
        color: 0x03168f,
        user: interaction.user
      });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const removedCount = await removeAllSpawnChannels(guildId);

    const embed = createEmbed({
      title: 'Spawn Disabled',
      description: `Automatic pony spawning has been disabled for this server.\nRemoved ${removedCount} spawn channel(s).`,
      color: 0x03168f,
      user: interaction.user
    });

    return interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in remove_spawn command:', error);
    
    const embed = createEmbed({
      title: 'Error',
      description: 'An error occurred while disabling spawn.',
      color: 0x03168f,
      user: interaction.user
    });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export const guildOnly = true;
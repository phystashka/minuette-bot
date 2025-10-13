import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { setSpawnChannel, getSpawnChannels } from '../../models/SpawnChannelModel.js';

export const data = new SlashCommandBuilder()
  .setName('set_spawn')
  .setDescription('Set a channel for automatic pony spawning')
  .setDescriptionLocalizations({
    'ru': 'Установить канал для автоматического спавна пони'
  })
  .setDMPermission(false)
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Channel where ponies will spawn automatically')
      .setDescriptionLocalizations({
        'ru': 'Канал где будут автоматически появляться пони'
      })
      .setRequired(true)
  )
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

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;


    if (channel.type !== 0) {
      const embed = createEmbed({
        title: 'Invalid Channel',
        description: 'Please select a text channel.',
        color: 0x03168f,
        user: interaction.user
      });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
      const embed = createEmbed({
        title: 'Missing Permissions',
        description: 'I need permission to send messages and embed links in that channel.',
        color: 0x03168f,
        user: interaction.user
      });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const result = await setSpawnChannel(guildId, channel.id);

    if (!result.success) {
      const embed = createEmbed({
        title: 'Error',
        description: result.error,
        color: 0xff0000,
        user: interaction.user
      });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const allChannels = await getSpawnChannels(guildId);
    const channelList = allChannels.map(ch => `<#${ch.channel_id}>`).join(', ');

    const embed = createEmbed({
      title: 'Spawn Channel Added',
      description: `${channel} has been added to automatic pony spawning.\n\n**Active spawn channels (${result.channelCount}/5):**\n${channelList}`,
      color: 0x03168f,
      user: interaction.user
    });

    return interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in set_spawn command:', error);
    
    const embed = createEmbed({
      title: 'Error',
      description: 'An error occurred while setting the spawn channel.',
      color: 0x03168f,
      user: interaction.user
    });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export const guildOnly = true;
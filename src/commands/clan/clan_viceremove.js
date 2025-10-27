import { SlashCommandBuilder } from 'discord.js';
import { getClanByOwnerId, updateClanVice } from '../../models/ClanModel.js';
import { createEmbed } from '../../utils/components.js';

// Clan vice removal - now used as a subcommand

export async function execute(interaction) {
  const clan = await getClanByOwnerId(interaction.user.id);


  if (!clan) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ No Clan',
        description: 'You need to create a clan first using `/clan`.',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  if (!clan.vice_owner_id) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ No Vice Leader',
        description: 'Your clan doesn\'t have a vice leader assigned.',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }

  try {

    const viceUser = await interaction.client.users.fetch(clan.vice_owner_id);


    await updateClanVice(interaction.user.id, null);


    try {
      const { sendDMWithDelete } = await import('../../utils/components.js');
      await sendDMWithDelete(viceUser, { 
        content: `📉 You have been removed as vice leader of clan **${clan.name}**.\n\nYou remain a member of the clan.` 
      });
    } catch (error) {
      console.log(`Failed to send DM to user ${clan.vice_owner_id}: ${error.message}`);
    }

    await interaction.reply({
      embeds: [createEmbed({
        title: '✅ Vice Leader Removed',
        description: `**${viceUser.username}** has been removed as vice leader of clan **${clan.name}**.`,
        color: 0x00FF00
      })],
      ephemeral: false
    });

  } catch (error) {
    console.error('Error removing vice leader:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while removing vice leader!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }
}
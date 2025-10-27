import { SlashCommandBuilder } from 'discord.js';
import { getClanByOwnerId, updateClanVice, getClanMember } from '../../models/ClanModel.js';
import { createEmbed } from '../../utils/components.js';

// Clan vice promotion - now used as a subcommand

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
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


  if (user.id === interaction.user.id) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Invalid Action',
        description: 'You cannot assign yourself as vice leader!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  if (user.bot) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Invalid User',
        description: 'Cannot assign bots as clan vice leaders!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  const memberInfo = await getClanMember(clan.id, user.id);
  if (!memberInfo) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Not a Member',
        description: `**${user.username}** is not a member of your clan! Use \`/clan_invite\` to invite them first.`,
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }

  try {

    await updateClanVice(interaction.user.id, user.id);


    try {
      const { sendDMWithDelete } = await import('../../utils/components.js');
      await sendDMWithDelete(user, { 
        content: `🎉 You have been assigned as vice leader of clan **${clan.name}**!\n\nClan owner: <@${interaction.user.id}>` 
      });
    } catch (error) {
      console.log(`Failed to send DM to user ${user.id}: ${error.message}`);
    }

    await interaction.reply({
      embeds: [createEmbed({
        title: 'Vice Leader Assigned',
        description: `**${user.username}** has been assigned as vice leader of clan **${clan.name}**`,
        color: 0x00FF00
      })],
      ephemeral: false
    });

  } catch (error) {
    console.error('Error assigning vice leader:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while assigning vice leader!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }
}
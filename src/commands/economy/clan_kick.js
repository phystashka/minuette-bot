import { SlashCommandBuilder } from 'discord.js';
import { getClanByOwnerId, getClanMember, getClanById } from '../../models/ClanModel.js';
import { createEmbed } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('clan_kick')
  .setDescription('Kick a member from your clan')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to kick from the clan')
      .setRequired(true)
  )
  .setDMPermission(false);

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('user');
  

  const ownerClan = await getClanByOwnerId(interaction.user.id);
  
  let userClan = null;
  let userRole = null;
  
  if (ownerClan) {

    userClan = ownerClan;
    userRole = 'owner';
  } else {

    const { query } = await import('../../utils/database.js');
    const viceClanResult = await query('SELECT * FROM clans WHERE vice_owner_id = ?', [interaction.user.id]);
    
    if (viceClanResult.length > 0) {
      userClan = viceClanResult[0];
      userRole = 'vice';
    }
  }


  if (!userClan || (userRole !== 'owner' && userRole !== 'vice')) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ No Permission',
        description: 'You need to be a clan owner or vice leader to kick members.',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  if (targetUser.id === interaction.user.id) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Invalid Action',
        description: 'You cannot kick yourself! Use `/clan_leave` instead.',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  if (targetUser.bot) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Invalid User',
        description: 'Cannot kick bots from clan!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  if (targetUser.id === userClan.owner_id) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Cannot Kick Owner',
        description: 'You cannot kick the clan owner!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  if (userRole === 'vice' && targetUser.id === userClan.vice_owner_id) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Cannot Kick Vice',
        description: 'Vice leaders cannot kick other vice leaders!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  const memberInfo = await getClanMember(userClan.id, targetUser.id);
  if (!memberInfo) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Not a Member',
        description: `**${targetUser.username}** is not a member of your clan!`,
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }

  try {

    const { query } = await import('../../utils/database.js');
    await query('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?', [userClan.id, targetUser.id]);


    if (targetUser.id === userClan.vice_owner_id) {
      const { updateClanVice } = await import('../../models/ClanModel.js');
      await updateClanVice(userClan.owner_id, null);
    }


    const { updateMemberCount } = await import('../../models/ClanModel.js');
    await updateMemberCount(userClan.id, userClan.member_count - 1);


    try {
      const { sendDMWithDelete } = await import('../../utils/components.js');
      await sendDMWithDelete(targetUser, { 
        content: `🚪 You have been kicked from clan **${userClan.name}** by **${interaction.user.username}**.` 
      });
    } catch (error) {
      console.log(`Failed to send DM to user ${targetUser.id}: ${error.message}`);
    }

    await interaction.reply({
      embeds: [createEmbed({
        title: '✅ Member Kicked',
        description: `**${targetUser.username}** has been kicked from clan **${userClan.name}**.`,
        color: 0x00FF00
      })],
      ephemeral: false
    });

  } catch (error) {
    console.error('Error kicking member:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while kicking the member!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }
}
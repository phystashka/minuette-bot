import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { getClanByOwnerId, getClanByOwnerOrVice, isUserInTargetGuild, getUserClan } from '../../models/ClanModel.js';
import { createEmbed } from '../../utils/components.js';

const TARGET_GUILD_ID = '1369338076178026596';

export const data = new SlashCommandBuilder()
  .setName('clan_invite')
  .setDescription('Invite a user to your clan')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to invite to your clan')
      .setRequired(true)
  )
  .setDMPermission(false);

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const clan = await getClanByOwnerOrVice(interaction.user.id);


  if (!clan) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ No Permission',
        description: 'You need to be a clan owner or vice leader to invite members. Create your own clan using `/clan` or ask your clan leader to promote you.',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  if (user.id === interaction.user.id) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Invalid Action',
        description: 'You cannot invite yourself to your clan!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  if (user.bot) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Invalid User',
        description: 'Cannot invite bots to clan!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  const userClan = await getUserClan(user.id);
  if (userClan) {
    const roleText = userClan.userRole === 'owner' ? 'owner' : 'member';
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ User Already In Clan',
        description: `**${user.username}** is already in a clan!\n\n🏰 Clan: **${userClan.name}**\n👤 Role: **${roleText}**\n\nUsers can only be in one clan at a time.`,
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }


  const isUserOnServer = await isUserInTargetGuild(interaction.client, user.id, TARGET_GUILD_ID);
  if (!isUserOnServer) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ User Not On Server',
        description: 'The user you want to invite must be a member of the target server!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }

  try {

    const acceptButton = new ButtonBuilder()
      .setCustomId(`clan_invite_accept_${clan.id}_${user.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success)

    const declineButton = new ButtonBuilder()
      .setCustomId(`clan_invite_decline_${clan.id}_${user.id}`)
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder()
      .addComponents(acceptButton, declineButton);


    const roleIcon = clan.userRole === 'owner' ? '👑' : '🔸';
    const roleText = clan.userRole === 'owner' ? 'Owner' : 'Vice Leader';
    
    const inviteMessage = `**${interaction.user.username}** (${roleIcon} ${roleText}) invites you to join clan **${clan.name}**!\n\n` +
      `Clan Level: **${clan.level}**\n` +
      `Members: **${clan.member_count}**\n\n` +
      `*Choose your response below:*`;

    try {
      const { sendDMWithDelete } = await import('../../utils/components.js');
      const dmMessage = await sendDMWithDelete(user, {
        embeds: [createEmbed({
          title: 'Clan Invitation',
          description: inviteMessage,
          color: 0x3498DB
        })],
        components: [row]
      });



      
      await interaction.reply({
        embeds: [createEmbed({
          title: '✅ Invitation Sent',
          description: `Invitation sent to **${user.username}** via direct message!\n\nClan: **${clan.name}**\n${roleIcon} ${roleText}: <@${interaction.user.id}>`,
          color: 0x00FF00
        })],
        ephemeral: false
      });
      
    } catch (dmError) {

      
      await interaction.reply({
        embeds: [createEmbed({
          title: '❌ DM Failed',
          description: `Failed to send invitation to **${user.username}** via direct message!\n\n🔒 User may have DMs disabled from server members.\n💡 Try inviting the user personally or through general chat.`,
          color: 0xFF0000
        })],
        ephemeral: true
      });
    }

  } catch (error) {
    console.error('Error sending invitation:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while sending invitation!',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }
}

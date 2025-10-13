import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getResourcesByUserId, updateResources } from '../../models/ResourceModel.js';
import { checkUserVoted, getVoteUrl } from '../../utils/topgg.js';
import { getUnclaimedVotes, claimVotes, getUserVoteStats, recordVote, canUserVote } from '../../models/VoteModel.js';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote for the bot and get rewards')
  .setDMPermission(true);

export async function execute(interaction) {
  try {
    const voteButton = new ButtonBuilder()
      .setLabel('Vote on Top.gg')
      .setStyle(ButtonStyle.Link)
      .setURL(getVoteUrl());
      
    const claimButton = new ButtonBuilder()
      .setCustomId('claim_vote_rewards')
      .setLabel('Claim Rewards')
      .setStyle(ButtonStyle.Success);
    
    const row = new ActionRowBuilder().addComponents(voteButton, claimButton);
    
    const embed = createEmbed({
      title: 'Vote for Minuette Bot',
      description: `Support us by voting on Top.gg!\n\n**Rewards for voting:**\n<a:diamond:1423629073984524298> **10 Diamonds**\n<a:goldkey:1426332679103709314> **5 Keys**\n\n**How to get rewards:**\n1. Click "Vote on Top.gg"\n2. Complete the vote\n3. Return and click "Claim Rewards"`,
      color: 0x9b59b6,
      user: interaction.user
    });
    
    embed.setFooter({ 
      text: 'You can vote every 12 hours',
      iconURL: interaction.client.user.displayAvatarURL()
    });
    
    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
    
  } catch (error) {
    console.error('Error in vote command:', error);
    
    const errorEmbed = createEmbed({
      title: 'Error',
      description: 'An error occurred while processing the vote command.',
      color: 0xe74c3c,
      user: interaction.user
    });
    
    await interaction.reply({
      embeds: [errorEmbed],
      ephemeral: true
    });
  }
}

export async function handleClaimRewards(interaction) {
  try {
    await interaction.deferUpdate();
    
    const userId = interaction.user.id;
    
    try {
      const canVote = await canUserVote(userId);
      if (!canVote) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: 'Cooldown Active',
            description: 'You can only claim vote rewards once every 12 hours!\n\nPlease wait before claiming again.',
            color: 0xe74c3c,
            user: interaction.user
          })],
          components: []
        });
      }
    } catch (error) {
      console.log('Cooldown check failed:', error.message);
    }
    
    try {
      const hasVoted = await checkUserVoted(userId);
      if (!hasVoted) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: 'Vote Required',
            description: 'You need to vote on Top.gg first before claiming rewards!\n\n1. Click "Vote on Top.gg" button\n2. Complete the vote\n3. Come back and claim rewards',
            color: 0xe74c3c,
            user: interaction.user
          })],
          components: []
        });
      }
    } catch (error) {
      console.log('Top.gg check failed, allowing reward anyway:', error.message);
    }
    


    let userResources = await getResourcesByUserId(userId);
    if (!userResources) {
      userResources = { diamonds: 0, keys: 0 };
    }

    const diamondsReward = 10;
    const keysReward = 5;
    
    await updateResources(userId, {
      diamonds: (userResources.diamonds || 0) + diamondsReward,
      keys: (userResources.keys || 0) + keysReward
    });
    
    try {
      await recordVote(userId);
    } catch (error) {
      console.log('Failed to record vote:', error.message);
    }
    
    const successEmbed = createEmbed({
      title: 'Rewards Claimed!',
      description: `Thank you for voting! You received:\n\n<a:diamond:1423629073984524298> **${diamondsReward} Diamonds**\n<a:goldkey:1426332679103709314> **${keysReward} Keys**\n\n*Vote again in 12 hours for more rewards!*`,
      color: 0x27ae60,
      user: interaction.user
    });
    
    await interaction.editReply({
      embeds: [successEmbed],
      components: []
    });
    
  } catch (error) {
    console.error('Error in handleClaimRewards:', error);
    
    const errorEmbed = createEmbed({
      title: 'Error',
      description: 'An error occurred while claiming your rewards. Please try again later.',
      color: 0xe74c3c,
      user: interaction.user
    });
    
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

export const guildOnly = false;
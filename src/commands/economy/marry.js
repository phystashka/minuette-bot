import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } from 'discord.js';
import { createMarriage, getMarriageByUser } from '../../models/MarriageModel.js';
import { createEmbed } from '../../utils/components.js';


const cooldowns = new Map();
const COOLDOWN_TIME = 2 * 60 * 1000;


const activeProposals = new Map();

export const data = new SlashCommandBuilder()
  .setName('marry')
  .setDescription('Propose marriage to another user!')
  .setDescriptionLocalizations({
    'ru': 'Предложить брак другому пользователю!'
  })
  .setDMPermission(false)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user you want to marry')
      .setDescriptionLocalizations({
        'ru': 'Пользователь, которому вы хотите предложить брак'
      })
      .setRequired(true)
  );

export async function execute(interaction) {
  const proposer = interaction.user;
  const guild = interaction.guild;
  const target = interaction.options.getUser('user');

  const userId = proposer.id;
  const now = Date.now();
  
  if (cooldowns.has(userId)) {
    const expirationTime = cooldowns.get(userId) + COOLDOWN_TIME;
    
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = Math.floor(timeLeft % 60);
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Command Cooldown',
          description: `You can use this command again in \`${minutes}m ${seconds}s\`.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
  }

  cooldowns.set(userId, now);

  if (target.bot) {
    return interaction.reply({ 
      embeds: [createEmbed({
        title: 'Marriage Proposal',
        description: 'You cannot marry a bot!',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true 
    });
  }

  if (proposer.id === target.id) {
    return interaction.reply({ 
      embeds: [createEmbed({
        title: 'Marriage Proposal',
        description: 'You cannot marry yourself!',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true 
    });
  }

  if (target.bot) {
    return interaction.reply({ 
      embeds: [createEmbed({
        title: 'Marriage Proposal',
        description: 'You cannot marry a bot!',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true 
    });
  }

  const proposerMarriage = await getMarriageByUser(proposer.id);
  const targetMarriage = await getMarriageByUser(target.id);
  if (proposerMarriage) {
    return interaction.reply({ 
      embeds: [createEmbed({
        title: 'Marriage Proposal',
        description: 'You are already married!',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true 
    });
  }
  if (targetMarriage) {
    return interaction.reply({ 
      embeds: [createEmbed({
        title: 'Marriage Proposal',
        description: 'This user is already married!',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true 
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('Marriage Proposal')
    .setDescription(`${proposer} wants to marry ${target}!`)
    .setColor(0x03168f)
    .setThumbnail(proposer.displayAvatarURL({ dynamic: true }))

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('marry_accept')
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('marry_decline')
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger)
  );

  let dmSent = false;
  let dmMessage = null;
  try {
    dmMessage = await target.send({
      embeds: [embed],
      components: [row]
    });
    dmSent = true;
    

    const proposalKey = `${proposer.id}_${target.id}`;
    

    const timeoutId = setTimeout(async () => {
      activeProposals.delete(proposalKey);
      

      try {
        await dmMessage.edit({
          embeds: [embed],
          components: [],
          content: '⏰ This marriage proposal has expired.'
        });
      } catch (error) {
        console.error('Error disabling expired marriage proposal buttons:', error);
      }
    }, 60_000);
    
    activeProposals.set(proposalKey, {
      proposerId: proposer.id,
      targetId: target.id,
      guildId: guild.id,
      channelId: interaction.channel.id,
      messageId: dmMessage.id,
      timestamp: Date.now(),
      timeoutId: timeoutId
    });
    
  } catch (error) {
    console.error('Failed to send DM:', error);
  }

  let reply;
  if (dmSent) {
    reply = await interaction.reply({
      embeds: [createEmbed({
        title: 'Marriage Proposal',
        description: `Marriage proposal sent to **${target.username}**!`,
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: false
    });
  } else {
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Marriage Proposal',
        description: `Could not send marriage proposal to **${target.username}** - their DMs are blocked.`,
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }



}


export async function handleMarriageButton(interaction) {
  const { customId, user } = interaction;
  

  let proposalKey = null;
  let proposal = null;
  
  for (const [key, prop] of activeProposals.entries()) {
    if (prop.targetId === user.id) {
      proposalKey = key;
      proposal = prop;
      break;
    }
  }
  
  if (!proposal) {
    return interaction.reply({
      content: 'This marriage proposal has expired or is no longer valid.',
      ephemeral: true
    });
  }
  

  if (proposal.timeoutId) {
    clearTimeout(proposal.timeoutId);
  }
  

  activeProposals.delete(proposalKey);
  
  try {
    const guild = interaction.client.guilds.cache.get(proposal.guildId);
    const proposer = await interaction.client.users.fetch(proposal.proposerId);
    const target = user;
    

    const embed = new EmbedBuilder()
      .setTitle('Marriage Proposal')
      .setDescription(`${proposer} wants to marry ${target}!`)
      .setColor(0x03168f)
      .setThumbnail(proposer.displayAvatarURL({ dynamic: true }));
    
    if (customId === 'marry_accept') {

      const proposerMarriage = await getMarriageByUser(proposer.id);
      const targetMarriage = await getMarriageByUser(target.id);
      
      if (proposerMarriage) {
        return interaction.update({
          embeds: [embed],
          components: [],
          content: `❌ ${proposer.username} is already married to someone else!`
        });
      }
      
      if (targetMarriage) {
        return interaction.update({
          embeds: [embed],
          components: [],
          content: `❌ You are already married to someone else!`
        });
      }
      

      await createMarriage(proposer.id, target.id, proposal.guildId);
      
      await interaction.update({
        embeds: [embed],
        components: [],
        content: `💍 Congratulations! You and ${proposer.username} are now married!`
      });
      

      try {
        const channel = guild.channels.cache.get(proposal.channelId);
        if (channel && channel.isTextBased()) {
          await channel.send({
            embeds: [createEmbed({
              title: 'Marriage',
              description: `${target} and ${proposer} are now married!`,
              color: 0x03168f,
              user: proposer
            })]
          });
        }
      } catch (error) {
        console.error('Failed to send marriage confirmation to channel:', error);
      }
      
    } else {

      await interaction.update({
        embeds: [embed],
        components: [],
        content: `❌ You declined ${proposer.username}'s marriage proposal.`
      });
      

      try {
        const channel = guild.channels.cache.get(proposal.channelId);
        if (channel && channel.isTextBased()) {
          await channel.send({
            embeds: [createEmbed({
              title: 'Marriage Proposal',
              description: `${target} declined the marriage proposal.`,
              color: 0x03168f,
              user: proposer
            })]
          });
        }
      } catch (error) {
        console.error('Failed to send marriage decline notification to channel:', error);
      }
    }
    
  } catch (error) {
    console.error('Error handling marriage button:', error);
    return interaction.reply({
      content: 'An error occurred while processing your response. Please try again.',
      ephemeral: true
    });
  }
}

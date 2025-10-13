import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, EmbedBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getMarriageByUser } from '../../models/MarriageModel.js';
import { getChildrenByParents, getAdoptionByChild, createAdoption } from '../../models/AdoptionModel.js';

const cooldowns = new Map();
const COOLDOWN_TIME = 2 * 60 * 1000;


const activeProposals = new Map();

export const data = new SlashCommandBuilder()
  .setName('adopt')
  .setDescription('Propose adoption to another user')
  .setDescriptionLocalizations({
    'ru': 'Предложить усыновление другому пользователю'
  })
  .setDMPermission(false)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('User you want to adopt')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('type')
      .setDescription('Relationship type')
      .setRequired(true)
      .addChoices(
        { name: 'Son', value: 'son' },
        { name: 'Daughter', value: 'daughter' }
      )
  );

export async function execute(interaction) {
  try {
    const targetUser = interaction.options.getUser('user');
    const childType = interaction.options.getString('type');
    const requester = interaction.user;

    const userId = requester.id;
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

    if (targetUser.bot) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Adoption Request',
          description: 'You cannot adopt a bot!',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (targetUser.id === requester.id) {
      return interaction.reply({
        content: '❌ You cannot adopt yourself!',
        ephemeral: true
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        content: '❌ You cannot adopt bots!',
        ephemeral: true
      });
    }

    const requesterMarriage = await getMarriageByUser(requester.id);
    if (!requesterMarriage) {
      return interaction.reply({
        content: '❌ You must be married to adopt a child!',
        ephemeral: true
      });
    }

    const partnerId = requesterMarriage.partner_id;
    let partner;
    try {
      partner = await interaction.guild.members.fetch(partnerId);
    } catch (error) {
      return interaction.reply({
        content: '❌ Your marriage partner is not found on this server!',
        ephemeral: true
      });
    }

    if (targetUser.id === partnerId) {
      return interaction.reply({
        content: '❌ You cannot adopt your spouse!',
        ephemeral: true
      });
    }

    const existingChildren = await getChildrenByParents(requester.id, partnerId);
    if (existingChildren && existingChildren.length > 0) {
      return interaction.reply({
        content: '❌ You already have an adopted child! Only one adoption is allowed per family.',
        ephemeral: true
      });
    }

    const targetAsChild = await getAdoptionByChild(targetUser.id);
    if (targetAsChild) {
      return interaction.reply({
        content: '❌ This user is already adopted by another family!',
        ephemeral: true
      });    
    }

    const targetMarriage = await getMarriageByUser(targetUser.id);
    if (targetMarriage) {
      return interaction.reply({
        content: '❌ You cannot adopt someone who is already married!',
        ephemeral: true
      });
    }

    const embed = createEmbed({
      title: 'Adoption Proposal',
      description: `${requester} and ${partner.user} want to adopt you as their **${childType}**!`,
      color: 0x03168f,
      thumbnail: requester.displayAvatarURL({ dynamic: true })
    });

    const acceptButton = new ButtonBuilder()
      .setCustomId('adopt_accept')
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);

    const declineButton = new ButtonBuilder()
      .setCustomId('adopt_decline')
      .setLabel('Decline')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
      .addComponents(acceptButton, declineButton);

    let dmSent = false;
    let dmMessage = null;
    try {
      const { sendDMWithDelete } = await import('../../utils/components.js');
      dmMessage = await sendDMWithDelete(targetUser, {
        embeds: [embed],
        components: [row]
      });
      dmSent = true;
      

      const proposalKey = `${requester.id}_${targetUser.id}_${Date.now()}`;
      

      const timeoutId = setTimeout(async () => {
        activeProposals.delete(proposalKey);
        

        try {
          await dmMessage.edit({
            embeds: [embed],
            components: [],
            content: '⏰ This adoption proposal has expired.'
          });
        } catch (error) {
          console.error('Error disabling expired adoption proposal buttons:', error);
        }
        

        try {
          const channel = interaction.guild.channels.cache.get(interaction.channel.id);
          if (channel && channel.isTextBased()) {
            await channel.send({
              embeds: [createEmbed({
                title: 'Adoption Proposal',
                description: `Adoption proposal to ${targetUser} has expired.`,
                color: 0x03168f,
                user: interaction.user
              })]
            });
          }
        } catch (error) {
          console.error('Failed to send adoption expiry notification to channel:', error);
        }
      }, 60_000);
      
      activeProposals.set(proposalKey, {
        requesterId: requester.id,
        partnerId: partnerId,
        targetId: targetUser.id,
        childType: childType,
        guildId: interaction.guild.id,
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
          title: 'Adoption Proposal',
          description: `Adoption proposal sent to **${targetUser.username}**!`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: false
      });
    } else {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Adoption Proposal',
          description: `Could not send adoption proposal to **${targetUser.username}** - their DMs are blocked.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }




  } catch (error) {
    console.error('Error in adopt command:', error);
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Adoption Error',
        description: 'An error occurred while processing the adoption proposal.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


export async function handleAdoptionButton(interaction) {
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
      content: 'This adoption proposal has expired or is no longer valid.',
      ephemeral: true
    });
  }
  

  if (proposal.timeoutId) {
    clearTimeout(proposal.timeoutId);
  }
  

  activeProposals.delete(proposalKey);
  
  try {
    const guild = interaction.client.guilds.cache.get(proposal.guildId);
    const requester = await interaction.client.users.fetch(proposal.requesterId);
    const partner = await interaction.client.users.fetch(proposal.partnerId);
    const target = user;
    

    const embed = createEmbed({
      title: 'Adoption Proposal',
      description: `${requester} and ${partner} want to adopt ${target} as their **${proposal.childType}**!`,
      color: 0x03168f,
      user: requester
    });
    
    if (customId === 'adopt_accept') {
      try {

        const existingAdoption = await getAdoptionByChild(target.id);
        if (existingAdoption) {
          return interaction.update({
            embeds: [embed],
            components: [],
            content: `❌ You are already adopted by someone else!`
          });
        }
        

        await createAdoption(requester.id, partner.id, target.id, proposal.childType, proposal.guildId);
        
        await interaction.update({
          embeds: [embed],
          components: [],
          content: `💝 Congratulations! ${requester.username} and ${partner.username} have adopted you as their **${proposal.childType}**!`
        });
        

        try {
          const channel = guild.channels.cache.get(proposal.channelId);
          if (channel && channel.isTextBased()) {
            await channel.send({
              embeds: [createEmbed({
                title: 'Adoption',
                description: `${requester} and ${partner} have adopted ${target} as their **${proposal.childType}**!`,
                color: 0x03168f,
                user: requester
              })]
            });
          }
        } catch (error) {
          console.error('Failed to send adoption confirmation to channel:', error);
        }
        
      } catch (error) {
        console.error('Error creating adoption:', error);
        
        await interaction.update({
          embeds: [embed],
          components: [],
          content: `❌ An error occurred while processing the adoption.`
        });
      }
      
    } else {

      await interaction.update({
        embeds: [embed],
        components: [],
        content: `❌ You declined the adoption proposal from ${requester.username} and ${partner.username}.`
      });
      

      try {
        const channel = guild.channels.cache.get(proposal.channelId);
        if (channel && channel.isTextBased()) {
          await channel.send({
            embeds: [createEmbed({
              title: 'Adoption Proposal',
              description: `${target} declined the adoption proposal.`,
              color: 0x03168f,
              user: requester
            })]
          });
        }
      } catch (error) {
        console.error('Failed to send adoption decline notification to channel:', error);
      }
    }
    
  } catch (error) {
    console.error('Error handling adoption button:', error);
    return interaction.reply({
      content: 'An error occurred while processing your response. Please try again.',
      ephemeral: true
    });
  }
}

export const guildOnly = true;

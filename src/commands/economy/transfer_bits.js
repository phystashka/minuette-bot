import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getPony, removeBits, addBits } from '../../utils/pony/index.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { t } from '../../utils/localization.js';


const cooldowns = new Map();
const COOLDOWN_DURATION = 2 * 60 * 1000;

export const data = new SlashCommandBuilder()
  .setName('transfer_bits')
  .setDescription('Transfer bits to another user')
  .setDescriptionLocalizations({
    'ru': 'Перевести биты другому пользователю'
  })
  .setDMPermission(false)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The user to transfer bits to')
      .setDescriptionLocalizations({
        'ru': 'Пользователь, которому перевести биты'
      })
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('amount')
      .setDescription('Amount of bits to transfer')
      .setDescriptionLocalizations({
        'ru': 'Количество битов для перевода'
      })
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    

    const now = Date.now();
    const cooldownExpires = cooldowns.get(userId);
    
    if (cooldownExpires && now < cooldownExpires) {
      const timeLeft = Math.ceil((cooldownExpires - now) / 1000);
      return interaction.reply({
        embeds: [
          createEmbed({
            title: 'Cooldown Active',
            description: `You can use this command again in \`${timeLeft} seconds\`.`,
            color: 0x03168f
          })
        ],
        ephemeral: true
      });
    }
    
    if (userId === targetUser.id) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: 'Error',
            description: 'You cannot transfer bits to yourself!',
            color: 0x03168f
          })
        ],
        ephemeral: true
      });
    }
    
    if (targetUser.bot) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: 'Error',
            description: 'You cannot transfer bits to bots!',
            color: 0x03168f
          })
        ],
        ephemeral: true
      });
    }
    
    const senderPony = await getPony(userId);
    if (!senderPony) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: await t('equestria.no_pony_title', guildId),
            description: await t('equestria.no_pony_description', guildId),
            color: 0x03168f
          })
        ],
        ephemeral: true
      });
    }
    
    const receiverPony = await getPony(targetUser.id);
    if (!receiverPony) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: '❌ Pony not found',
            description: `${targetUser.username} doesn't have a pony! They need to create a pony using the \`/equestria\` command.`,
            color: 0x03168f
          })
        ],
        ephemeral: true
      });
    }
    
    if (senderPony.bits < amount) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: '❌ Insufficient bits',
            description: `You don't have enough bits to transfer! You have ${senderPony.bits} bits.`,
            color: 0x03168f
          })
        ],
        ephemeral: true
      });
    }


    cooldowns.set(userId, now + COOLDOWN_DURATION);
    
    const transferId = `transfer_${userId}_${targetUser.id}_${Date.now()}`;
    
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${transferId}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`decline_${transferId}`)
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger)
      );
    
    const transferMessage = await interaction.reply({
      embeds: [
        createEmbed({
          title: 'Bits Transfer',
          description: `${interaction.user} wants to transfer \`${amount} bits\` to ${targetUser}.\n${targetUser}, do you accept this transfer?`,
          color: 0x03168f,
        })
      ],
      components: [actionRow],
      fetchReply: true
    });
    

    const collector = transferMessage.createMessageComponentCollector({ 
      time: 120000
    });
    
    collector.on('collect', async (buttonInteraction) => {

      if (buttonInteraction.user.id !== targetUser.id) {
        return buttonInteraction.reply({
          embeds: [
            createEmbed({
              title: '❌ Access Denied',
              description: 'Only the recipient can respond to this transfer request.',
              color: 0x03168f
            })
          ],
          ephemeral: true
        });
      }
      
      const isAccept = buttonInteraction.customId.startsWith('accept_');
      
      if (isAccept) {

        const currentSenderPony = await getPony(userId);
        if (currentSenderPony.bits < amount) {
          return buttonInteraction.update({
            embeds: [
              createEmbed({
                title: '❌ Transfer Failed',
                description: `${interaction.user} no longer has enough bits for this transfer!`,
                color: 0x03168f
              })
            ],
            components: []
          });
        }
        

        await removeBits(userId, amount);
        await addBits(targetUser.id, amount);
        
        const updatedSenderPony = await getPony(userId);
        const updatedReceiverPony = await getPony(targetUser.id);
        
        await buttonInteraction.update({
          embeds: [
            createEmbed({
              title: 'Transfer Completed',
              description: `${targetUser} accepted the transfer!\n \`${amount} bits\` have been transferred from ${interaction.user} to ${targetUser}.`,
              color: 0x03168f
            })
          ],
          components: []
        });
        
        collector.stop();
      } else {


        cooldowns.delete(userId);
        
        await buttonInteraction.update({
          embeds: [
            createEmbed({
              title: '❌ Transfer Declined',
              description: `${targetUser} declined the transfer request.`,
              color: 0x03168f
            })
          ],
          components: []
        });
        
        collector.stop();
      }
    });
    
    collector.on('end', async (collected) => {
      if (collected.size === 0) {

        cooldowns.delete(userId);
        
        await interaction.editReply({
          embeds: [
            createEmbed({
              title: '⏰ Transfer Expired',
              description: 'The transfer request has expired.',
              color: 0x03168f
            })
          ],
          components: []
        });
      }
    });
    
  } catch (error) {
    console.error('Error in transfer_bits command:', error);
    

    cooldowns.delete(interaction.user.id);
    
    const errorEmbed = createEmbed({
      title: '❌ Error',
      description: `An error occurred during the transfer: ${error.message}`,
      color: 0x03168f
    });

    if (!interaction.replied) {
      return interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true
      });
    } else {
      return interaction.editReply({
        embeds: [errorEmbed],
        components: []
      });
    }
  }
} 

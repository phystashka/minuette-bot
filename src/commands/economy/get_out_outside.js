import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getUserPonyByUniqueId, removePonyByFriendshipId } from '../../models/FriendshipModel.js';

export const data = new SlashCommandBuilder()
  .setName('get_out_outside')
  .setDescription('Remove ponies from your collection (favorites must be unfavorited first)')
  .addStringOption(option =>
    option
      .setName('pony_ids')
      .setDescription('Pony unique IDs separated by commas (e.g., 1242, 235, 242)')
      .setRequired(true)
  )
  .setDMPermission(false);

export async function execute(interaction) {
  const userId = interaction.user.id;
  const ponyIdsInput = interaction.options.getString('pony_ids');

  try {

    const ponyIds = ponyIdsInput
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(id => parseInt(id))
      .filter(id => !isNaN(id));

    if (ponyIds.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Invalid Input',
          description: 'Please provide valid pony IDs separated by commas.\n\nExample: `1242, 235, 242`',
          color: 0xFF0000
        })],
        ephemeral: true
      });
    }

    if (ponyIds.length > 50) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Too Many Ponies',
          description: 'You can only remove up to 50 ponies at once for safety.',
          color: 0xFF0000
        })],
        ephemeral: true
      });
    }


    const poniesInfo = [];
    const notFound = [];
    const favorites = [];

    for (const ponyId of ponyIds) {
      const friendship = await getUserPonyByUniqueId(userId, ponyId);
      
      if (!friendship) {
        notFound.push(ponyId);
        continue;
      }

      if (friendship.is_favorite === 1) {
        favorites.push({ id: ponyId, name: friendship.name });
        continue;
      }

      poniesInfo.push({
        id: ponyId,
        name: friendship.name,
        rarity: friendship.rarity,
        friendship_level: friendship.friendship_level || 1,
        friendship_id: friendship.friendship_id
      });
    }


    let errorMessage = '';
    
    if (notFound.length > 0) {
      errorMessage += `**Not found:** ${notFound.join(', ')}\n`;
    }
    
    if (favorites.length > 0) {
      errorMessage += `**Cannot remove favorites:** ${favorites.map(p => `${p.name} (ID: ${p.id})`).join(', ')}\n`;
      errorMessage += `Use \`/fav_remove\` to unfavorite them first.\n`;
    }

    if (poniesInfo.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'No Ponies to Remove',
          description: errorMessage || 'No valid ponies found to remove.',
          color: 0xFF0000
        })],
        ephemeral: true
      });
    }


    const confirmEmbed = new EmbedBuilder()
      .setTitle('Confirm Pony Removal')
      .setColor(0xFF6B35)
      .setDescription(
        `You are about to **permanently remove** the following ${poniesInfo.length} pony${poniesInfo.length > 1 ? 'ies' : ''} from your collection:\n\n` +
        poniesInfo.map(pony => 
          `• **${pony.name}** (ID: ${pony.id}, ${pony.rarity}, Level ${pony.friendship_level})`
        ).join('\n') +
        `\n\n${errorMessage ? `**Issues:**\n${errorMessage}\n` : ''}` +
        `**WARNING: This action cannot be undone!**\n` +
        `**You will lose all friendship progress with these ponies!**`
      )
      .setFooter({ text: 'Click "Confirm" to proceed or "Cancel" to abort' });


    const confirmRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_remove_${userId}_${poniesInfo.map(p => p.id).join(',')}`)
          .setLabel('Confirm Removal')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId(`cancel_remove_${userId}`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('❌')
      );

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [confirmRow],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error in get_out_outside command:', error);
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while processing your request. Please try again.',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }
}


export async function handleConfirmation(interaction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  if (customId.startsWith('cancel_remove_')) {
    const buttonUserId = customId.split('_')[2];
    
    if (userId !== buttonUserId) {
      return interaction.reply({
        content: 'You can only interact with your own removal confirmation.',
        ephemeral: true
      });
    }

    await interaction.update({
      embeds: [createEmbed({
        title: 'Removal Cancelled',
        description: 'Pony removal has been cancelled. Your ponies are safe!',
        color: 0x00FF00
      })],
      components: []
    });
    return;
  }

  if (customId.startsWith('confirm_remove_')) {
    const parts = customId.split('_');
    const buttonUserId = parts[2];
    const ponyIds = parts[3].split(',').map(id => parseInt(id));
    
    if (userId !== buttonUserId) {
      return interaction.reply({
        content: 'You can only interact with your own removal confirmation.',
        ephemeral: true
      });
    }

    try {
      await interaction.deferUpdate();

      const removed = [];
      const failed = [];


      for (const ponyId of ponyIds) {
        try {
          const friendship = await getUserPonyByUniqueId(userId, ponyId);
          
          if (!friendship) {
            failed.push({ id: ponyId, reason: 'Not found' });
            continue;
          }


          const removeResult = await removePonyByFriendshipId(userId, ponyId);
          
          if (!removeResult.success) {
            failed.push({ 
              id: ponyId, 
              reason: removeResult.error || 'Failed to remove from collection', 
              name: friendship.name 
            });
            continue;
          }

          removed.push({
            id: ponyId,
            name: friendship.name,
            rarity: friendship.rarity
          });

        } catch (error) {
          console.error(`Error removing pony ${ponyId}:`, error);
          failed.push({ id: ponyId, reason: 'Database error' });
        }
      }


      let resultDescription = '';
      
      if (removed.length > 0) {
        resultDescription += `**Successfully removed ${removed.length} pony${removed.length > 1 ? 'ies' : ''}:**\n`;
        resultDescription += removed.map(pony => 
          `• **${pony.name}** (ID: ${pony.id}, ${pony.rarity})`
        ).join('\n');
        resultDescription += '\n\n';
      }

      if (failed.length > 0) {
        resultDescription += `**Failed to remove ${failed.length} pony${failed.length > 1 ? 'ies' : ''}:**\n`;
        resultDescription += failed.map(pony => 
          `• ID ${pony.id}: ${pony.reason}${pony.name ? ` (${pony.name})` : ''}`
        ).join('\n');
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle(removed.length > 0 ? '✅ Pony Removal Complete' : '❌ Pony Removal Failed')
        .setColor(removed.length > 0 ? 0x00FF00 : 0xFF0000)
        .setDescription(resultDescription || 'No ponies were processed.')
        .setFooter({ 
          text: removed.length > 0 ? 'Farewell to the removed ponies!' : 'Please check the issues and try again.' 
        });

      await interaction.editReply({
        embeds: [resultEmbed],
        components: []
      });

    } catch (error) {
      console.error('Error during pony removal confirmation:', error);
      await interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'An error occurred during pony removal. Please try again.',
          color: 0xFF0000
        })],
        components: []
      });
    }
  }
}
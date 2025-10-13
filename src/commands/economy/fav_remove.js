import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getUserPonyByUniqueId } from '../../models/FriendshipModel.js';
import { checkCooldown, setCooldown, createCooldownEmbed } from '../../utils/cooldownManager.js';
import { query } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('fav_remove')
  .setDescription('Remove one of your ponies from favorites')
  .addStringOption(option =>
    option
      .setName('unique_id')
      .setDescription('The unique ID of your pony')
      .setRequired(true)
  )
  .setDMPermission(false);

export async function execute(interaction) {
  const userId = interaction.user.id;
  const uniqueId = interaction.options.getString('unique_id');

  try {

    const friendship = await getUserPonyByUniqueId(userId, uniqueId);
    
    if (!friendship) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Pony Not Found',
          description: `You don't have a pony with unique ID: \`${uniqueId}\`\n\nUse \`/myponies\` to see your ponies and their unique IDs.`,
          color: 0x03168f
        })],
        ephemeral: true
      });
    }


    if (friendship.is_favorite === 0) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Not a Favorite',
          description: `**${friendship.name}** is not marked as your favorite pony.\n\n**Unique ID:** \`${uniqueId}\`\n\nUse \`/fav_add ${uniqueId}\` to add it to favorites.`,
          color: 0x03168f,
          thumbnail: friendship.image_url
        })],
        ephemeral: true
      });
    }


    await query(
      'UPDATE friendship SET is_favorite = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id = ?',
      [userId, uniqueId]
    );


    await interaction.reply({
      embeds: [createEmbed({
        title: '💔 Favorite Removed',
        description: `Successfully removed **${friendship.name}** from your favorites.\n\n**Unique ID:** \`${uniqueId}\`\n\n*The heart icon will no longer appear next to this pony.*`,
        color: 0x808080,
        thumbnail: friendship.image_url
      })]
    });

  } catch (error) {
    console.error('Error in fav_remove command:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while removing the pony from favorites. Please try again later.',
        color: 0x03168f
      })],
      ephemeral: true
    });
  }
}
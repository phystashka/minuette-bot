import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getUserPonyByUniqueId } from '../../models/FriendshipModel.js';
import { checkCooldown, setCooldown, createCooldownEmbed } from '../../utils/cooldownManager.js';
import { query } from '../../utils/database.js';

export const data = new SlashCommandBuilder()
  .setName('fav_add')
  .setDescription('Mark one of your ponies as favorite')
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


    if (friendship.is_favorite === 1) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Already Favorite! ❤️',
          description: `**${friendship.name}** is already marked as your favorite pony!\n\n**Unique ID:** \`${uniqueId}\``,
          color: 0x03168f,
          thumbnail: friendship.image_url
        })],
        ephemeral: true
      });
    }


    await query(
      'UPDATE friendship SET is_favorite = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id = ?',
      [userId, uniqueId]
    );


    await interaction.reply({
      embeds: [createEmbed({
        title: '❤️ Favorite Added!',
        description: `Successfully marked **${friendship.name}** as your favorite pony!\n\n**Unique ID:** \`${uniqueId}\`\n\n*You'll now see a heart icon next to this pony in your collection.*`,
        color: 0xff69b4,
        thumbnail: friendship.image_url
      })]
    });

  } catch (error) {
    console.error('Error in fav_add command:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while adding the pony to favorites. Please try again later.',
        color: 0x03168f
      })],
      ephemeral: true
    });
  }
}
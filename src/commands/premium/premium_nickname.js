import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import FriendshipModel, { getUserPonyByUniqueId, updateCustomNickname, clearCustomNickname } from '../../models/FriendshipModel.js';
import { checkCooldown, setCooldown, createCooldownContainer } from '../../utils/cooldownManager.js';
import { isDonator } from '../../models/DonatorModel.js';

// Command is now a subcommand of /premium
// export const data = new SlashCommandBuilder()
//   .setName('nickname')
//   .setDescription('Give a custom nickname to one of your ponies (Donators only)')
//   .addStringOption(option =>
//     option
//       .setName('unique_id')
//       .setDescription('The unique ID of your pony')
//       .setRequired(true)
//   )
//   .addStringOption(option =>
//     option
//       .setName('new_name')
//       .setDescription('New nickname for your pony (max 30 characters, emojis allowed)')
//       .setRequired(true)
//   )
//   .setDMPermission(false);

export async function execute(interaction) {
  const userId = interaction.user.id;
  const uniqueId = interaction.options.getString('unique_id');
  const newName = interaction.options.getString('new_name');


  const userIsDonator = await isDonator(userId);
  if (!userIsDonator) {
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Donators Only! 🎁',
        description: 'This command is only available for donators!\n\nTo become a donator, use `/donate` and purchase at least two collections.',
        color: 0x03168f
      })],
      ephemeral: true
    });
  }

  try {

    if (newName.length > 30) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'Nickname must be 30 characters or less!',
          color: 0x03168f
        })],
        ephemeral: true
      });
    }


    if (newName.trim().length === 0) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'Nickname cannot be empty!',
          color: 0x03168f
        })],
        ephemeral: true
      });
    }


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


    await updateCustomNickname(userId, uniqueId, newName);


    const updatedFriendship = await getUserPonyByUniqueId(userId, uniqueId);
    const originalName = updatedFriendship.original_name || updatedFriendship.name;


    await interaction.reply({
      embeds: [createEmbed({
        title: '✨ Nickname Updated!',
        description: `Successfully renamed your pony!\n\n**Original Name:** ${originalName}\n**New Nickname:** ${newName}\n**Unique ID:** \`${uniqueId}\``,
        color: 0x00ff00,
        thumbnail: updatedFriendship.image_url
      })]
    });

  } catch (error) {
    console.error('Error in nickname command:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while updating the nickname. Please try again later.',
        color: 0x03168f
      })],
      ephemeral: true
    });
  }
}
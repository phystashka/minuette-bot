import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getUserPonyByUniqueId, clearCustomNickname } from '../../models/FriendshipModel.js';
import { checkCooldown, setCooldown, createCooldownContainer } from '../../utils/cooldownManager.js';
import { isDonator } from '../../models/DonatorModel.js';

// Command is now a subcommand of /premium

export async function execute(interaction) {
  const userId = interaction.user.id;
  const uniqueId = interaction.options.getString('unique_id');


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


  const cooldownResult = checkCooldown(userId, 'nickname', 30000);
  if (!cooldownResult.canUse) {
    return interaction.reply({
      components: [createCooldownContainer(cooldownResult.timeLeft)],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

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


    if (!friendship.custom_name) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'No Custom Nickname',
          description: `This pony doesn't have a custom nickname to remove.\n\n**Current Name:** ${friendship.name}\n**Unique ID:** \`${uniqueId}\``,
          color: 0x03168f,
          thumbnail: friendship.image_url
        })],
        ephemeral: true
      });
    }

    const originalName = friendship.original_name || friendship.name;
    const removedNickname = friendship.custom_name;


    await clearCustomNickname(userId, uniqueId);


    setCooldown(userId, 'nickname');


    await interaction.reply({
      embeds: [createEmbed({
        title: '🗑️ Nickname Removed!',
        description: `Successfully removed custom nickname from your pony!\n\n**Removed Nickname:** ~~${removedNickname}~~\n**Original Name:** ${originalName}\n**Unique ID:** \`${uniqueId}\`\n\n*Your pony will now display its original name.*`,
        color: 0x00ff00,
        thumbnail: friendship.image_url
      })]
    });

  } catch (error) {
    console.error('Error in nickclear command:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while removing the nickname. Please try again later.',
        color: 0x03168f
      })],
      ephemeral: true
    });
  }
}
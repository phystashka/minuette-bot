import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { addGifts } from '../../models/ResourceModel.js';
import { successEmbed, errorEmbed } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('give_gift')
  .setDescription('Give a donation gift to a user (Admin only)')
  .setDMPermission(false)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to give the gift to')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);


export const guildOnly = true;
export const guildId = '1415332959728304170';

export async function execute(interaction) {
  try {
    const targetUser = interaction.options.getUser('user');
    

    const authorizedUserId = '259347882052812800';
    if (interaction.user.id !== authorizedUserId) {
      const embed = errorEmbed('You are not authorized to use this command.', 'Access Denied');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (interaction.guild.id !== '1415332959728304170') {
      const embed = errorEmbed('This command can only be used in the designated server.', 'Wrong Server');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    console.log(`Giving gift to user ${targetUser.id}...`);
    const newGiftCount = await addGifts(targetUser.id, 1);
    console.log(`New gift count for user ${targetUser.id}: ${newGiftCount}`);


    const embed = successEmbed(
      `Successfully gave 1 donation gift <:giftdonate:1418946982030082170> to ${targetUser.displayName || targetUser.username}!\n\n` +
      `They now have **${newGiftCount}** gift(s) total.\n\n` +
      `*They can use \`/case\` command to open their gift and receive exclusive rewards!*`,
      'Gift Given! 🎁'
    );

    await interaction.reply({ embeds: [embed] });


    try {
      const dmEmbed = successEmbed(
        `<:giftdonate:1418946982030082170> **You have received a donation gift!**\n\n` +
        `Thank you for your purchase! Your exclusive donation gift has been delivered.\n\n` +
        `Use the \`/case\` command to open your gift and receive exclusive rewards including:\n` +
        'Thank You for Your Support! 💝'
      );
      
      const { sendDMWithDelete } = await import('../../utils/components.js');
      await sendDMWithDelete(targetUser, { embeds: [dmEmbed] });
      console.log(`Successfully sent DM notification to user ${targetUser.id}`);
    } catch (dmError) {
      console.log(`Could not send DM to user ${targetUser.id}: ${dmError.message}`);

    }

  } catch (error) {
    console.error('Error in give_gift command:', error);
    const embed = errorEmbed('An error occurred while giving the gift.', 'Error');
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
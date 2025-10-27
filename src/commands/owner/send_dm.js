import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('send_dm')
  .setDescription('Send a direct message to a user (Bot owner only)')
  .setDMPermission(false)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to send a message to')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('message')
      .setDescription('The message to send')
      .setRequired(true))
  .addAttachmentOption(option =>
    option.setName('image')
      .setDescription('Optional image to attach to the message')
      .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);


export const guildOnly = true;
export const guildId = '1415332959728304170';

export async function execute(interaction) {
  try {
    const targetUser = interaction.options.getUser('user');
    const message = interaction.options.getString('message');
    const attachment = interaction.options.getAttachment('image');
    

    const authorizedUserId = '259347882052812800';
    if (interaction.user.id !== authorizedUserId) {
      const embed = errorEmbed('You are not authorized to use this command.', 'Access Denied');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (interaction.guild.id !== '1415332959728304170') {
      const embed = errorEmbed('This command can only be used in the designated server.', 'Wrong Server');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (attachment && !attachment.contentType?.startsWith('image/')) {
      const embed = errorEmbed('The attachment must be an image file.', 'Invalid Attachment');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const dmEmbed = new EmbedBuilder()
      .setTitle('📬 Message from Minuette Bot Developer')
      .setDescription(message)
      .setColor(0x7B68EE)
      .setTimestamp()
      .setFooter({ 
        text: 'This is a direct communication from the bot developer',
        iconURL: interaction.client.user.displayAvatarURL()
      });


    if (attachment) {
      dmEmbed.setImage(attachment.url);
    }

    try {

      const { sendDMWithDelete } = await import('../../utils/components.js');
      await sendDMWithDelete(targetUser, { embeds: [dmEmbed] });
      

      const successConfirmation = successEmbed(
        `Message successfully sent to ${targetUser.displayName || targetUser.username} (${targetUser.tag})!\n\n` +
        `**Message:** ${message}` +
        (attachment ? `\n**Image:** Attached` : ''),
        'DM Sent Successfully! 📬'
      );
      
      await interaction.reply({ embeds: [successConfirmation], ephemeral: true });
      
    } catch (dmError) {
      console.error('Failed to send DM:', dmError);
      

      if (dmError.code === 50007) {
        const failureEmbed = errorEmbed(
          `Cannot send a direct message to ${targetUser.displayName || targetUser.username} (${targetUser.tag}).\n\n` +
          `**Reason:** User has disabled DMs from server members or has blocked the bot.\n\n` +
          `**Message that failed to send:** ${message}` +
          (attachment ? `\n**Image:** ${attachment.name}` : ''),
          'DM Failed - User Has Closed DMs 🔒'
        );
        
        await interaction.reply({ embeds: [failureEmbed], ephemeral: true });
      } else {

        const failureEmbed = errorEmbed(
          `Failed to send message to ${targetUser.displayName || targetUser.username} (${targetUser.tag}).\n\n` +
          `**Error:** ${dmError.message}\n\n` +
          `**Message that failed to send:** ${message}` +
          (attachment ? `\n**Image:** ${attachment.name}` : ''),
          'DM Failed - Unknown Error ❌'
        );
        
        await interaction.reply({ embeds: [failureEmbed], ephemeral: true });
      }
    }

  } catch (error) {
    console.error('Error in send_dm command:', error);
    
    const embed = errorEmbed(
      'An unexpected error occurred while processing the command.',
      'Command Error'
    );
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}

import { handleSpawnGuess } from '../utils/autoSpawn.js';
import { addMessageToCache } from '../utils/messageCacheManager.js';
import { EmbedBuilder, ChannelType } from 'discord.js';



export const name = 'messageCreate';
export const once = false;

const DM_FORWARD_CHANNEL_ID = '1423584192821985330';
const ADMIN_USER_ID = '259347882052812800';

export const execute = async (message) => {
  try {

    if (message.author.bot) {
      return;
    }


    const isDM = !message.guild || message.channel.type === ChannelType.DM;
    
    if (isDM) {
      console.log(`🔄 Processing DM from ${message.author.tag}`);
      try {
        const forwardChannel = await message.client.channels.fetch(DM_FORWARD_CHANNEL_ID);
        if (forwardChannel) {
          const isFromAdmin = message.author.id === ADMIN_USER_ID;
          const dmEmbed = new EmbedBuilder()
            .setTitle(isFromAdmin ? '👑 Admin DM Message' : '📨 New DM Message')
            .setDescription(message.content || '*No text content*')
            .setColor(isFromAdmin ? 0xFF6B6B : 0x3498DB)
            .setAuthor({
              name: `${message.author.displayName || message.author.username} (${message.author.tag})${isFromAdmin ? ' [ADMIN]' : ''}`,
              iconURL: message.author.displayAvatarURL()
            })
            .addFields({
              name: 'User ID',
              value: message.author.id,
              inline: true
            })
            .setTimestamp()
            .setFooter({
              text: isFromAdmin ? 'Admin message logged' : 'Reply to this message to send response to user',
              iconURL: message.client.user.displayAvatarURL()
            });


          if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
              dmEmbed.setImage(attachment.url);
            } else {
              dmEmbed.addFields({
                name: 'Attachment',
                value: `[${attachment.name}](${attachment.url})`,
                inline: false
              });
            }
          }

          const sentMessage = await forwardChannel.send({ embeds: [dmEmbed] });
          

          if (!message.client.dmMessageMap) {
            message.client.dmMessageMap = new Map();
          }
          message.client.dmMessageMap.set(sentMessage.id, {
            originalUserId: message.author.id,
            originalMessageId: message.id
          });

          console.log(`✅ Forwarded DM from ${message.author.tag} to admin channel`);
        }
      } catch (error) {
        console.error('❌ Error forwarding DM:', error);
      }
      return;
    }


    if (message.guild && message.channel.id === DM_FORWARD_CHANNEL_ID && message.author.id === ADMIN_USER_ID) {
      if (message.reference && message.reference.messageId) {
        try {
          const dmMessageMap = message.client.dmMessageMap || new Map();
          const mappedData = dmMessageMap.get(message.reference.messageId);
          
          if (mappedData) {
            const targetUser = await message.client.users.fetch(mappedData.originalUserId);
            if (targetUser) {
              try {
                await targetUser.send(message.content);
                await message.react('✅');
                console.log(`Sent reply to ${targetUser.tag}`);
              } catch (dmError) {
                await message.react('❌');
                await message.reply(`Failed to send message to ${targetUser.tag}: User has DMs disabled or blocked the bot.`);
                console.error(`Failed to send reply to ${targetUser.tag}:`, dmError);
              }
            }
          }
        } catch (error) {
          console.error('Error handling reply to DM:', error);
          await message.react('❌');
        }
      }
      return;
    }
    

    if (message.guild) {
      try {

        if (message.content.startsWith('.spawn')) {
          const args = message.content.slice(6).trim().split(/ +/);
          const { handleSpawnCommand } = await import('../commands/management/spawn.js');
          await handleSpawnCommand(message, args);
          return;
        }
        
        if (message.content.startsWith('.pony')) {
          const args = message.content.slice(5).trim().split(/ +/);
          const { handlePonyCommand } = await import('../commands/management/pony.js');
          await handlePonyCommand(message, args);
          return;
        }
        

        const wasGuessHandled = await handleSpawnGuess(message, message.content.trim());
        if (wasGuessHandled) {
          return;
        }
        

        addMessageToCache(message.author.id, message.guild.id, message.channel.id, message.channel);
        
      } catch (error) {
        console.error('Message handling error:', error);
      }
    }
    
  } catch (error) {
    console.error('Error in messageCreate event handler:', error);
  }
}; 
import { handleSpawnGuess } from '../utils/autoSpawn.js';
import { addMessageToCache } from '../utils/messageCacheManager.js';
import { loadDMMap, saveDMMap } from '../utils/dmMapStore.js';
import { EmbedBuilder, ChannelType } from 'discord.js';

let persistentDMMap = loadDMMap();

export const name = 'messageCreate';
export const once = false;

const DM_FORWARD_CHANNEL_ID = '1423584192821985330';
const ADMIN_USER_ID = '1372601851781972038';

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

          const messageOptions = { embeds: [dmEmbed] };
          
          if (message.attachments.size > 0) {
            messageOptions.files = Array.from(message.attachments.values()).map(attachment => ({
              attachment: attachment.url,
              name: attachment.name
            }));
          }

          if (message.stickers.size > 0) {
            const stickerUrls = Array.from(message.stickers.values()).map(sticker => {
              return `https://media.discordapp.net/stickers/${sticker.id}.${sticker.format === 1 ? 'png' : sticker.format === 2 ? 'png' : 'gif'}`;
            });
            
            if (!messageOptions.files) messageOptions.files = [];
            stickerUrls.forEach((url, index) => {
              messageOptions.files.push({
                attachment: url,
                name: `sticker_${index}.${url.includes('.gif') ? 'gif' : 'png'}`
              });
            });
          }

          const sentMessage = await forwardChannel.send(messageOptions);
          
          persistentDMMap.set(sentMessage.id, {
            originalUserId: message.author.id,
            originalMessageId: message.id
          });
          saveDMMap(persistentDMMap);

          console.log(`✅ Forwarded DM from ${message.author.tag} to admin channel`);
        }
      } catch (error) {
        console.error('❌ Error forwarding DM:', error);
      }
      return;
    }


    if (message.guild && message.channel.id === DM_FORWARD_CHANNEL_ID && message.author.id === ADMIN_USER_ID) {
      console.log(`Admin reply detected in DM forward channel`);
      if (message.reference && message.reference.messageId) {
        console.log(`Reply to message ID: ${message.reference.messageId}`);
        try {
          const mappedData = persistentDMMap.get(message.reference.messageId);
          console.log(`Mapped data:`, mappedData);
          
          if (mappedData) {
            const targetUser = await message.client.users.fetch(mappedData.originalUserId);
            if (targetUser) {
              try {
                const replyOptions = {};
                
                if (message.content) {
                  replyOptions.content = message.content;
                }
                
                if (message.attachments.size > 0) {
                  replyOptions.files = Array.from(message.attachments.values()).map(attachment => ({
                    attachment: attachment.url,
                    name: attachment.name
                  }));
                }

                if (message.stickers.size > 0) {
                  const stickerUrls = Array.from(message.stickers.values()).map(sticker => {
                    return `https://media.discordapp.net/stickers/${sticker.id}.${sticker.format === 1 ? 'png' : sticker.format === 2 ? 'png' : 'gif'}`;
                  });
                  
                  if (!replyOptions.files) replyOptions.files = [];
                  stickerUrls.forEach((url, index) => {
                    replyOptions.files.push({
                      attachment: url,
                      name: `sticker_${index}.${url.includes('.gif') ? 'gif' : 'png'}`
                    });
                  });
                }
                
                if (!replyOptions.content && !replyOptions.files) {
                  replyOptions.content = '*Empty message*';
                }
                
                await targetUser.send(replyOptions);
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
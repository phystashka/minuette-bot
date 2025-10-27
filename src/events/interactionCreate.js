import { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import { canUseTesting } from '../utils/permissions.js';

const CACHE_EXPIRY = 5 * 60 * 1000;


function cleanupCache() {
  if (!global.profileCache) return;
  
  const now = Date.now();
  for (const [key, data] of global.profileCache.entries()) {
    if (now - data.timestamp > CACHE_EXPIRY) {
      global.profileCache.delete(key);
    }
  }
}


setInterval(cleanupCache, 10 * 60 * 1000);
import { errorEmbed } from '../utils/components.js';
import { errors } from '../utils/validators.js';
import { logCommand } from '../utils/logger.js';
import { checkCooldown, setCooldown, createCooldownContainer } from '../utils/cooldownManager.js';
import { getMarriageByUser, deleteMarriage } from '../models/MarriageModel.js';
import { getChildrenByParents, getAdoptionByChild, deleteAdoption, getFamilyByMember } from '../models/AdoptionModel.js';
import { handleDerpiPagination } from '../utils/derpi/index.js';
import { handleCaseButton } from '../commands/economy/case.js';
import { handleInventoryInteraction } from '../commands/economy/inventory.js';
import { handleBundlePreview, handleBundlePurchase, handleElementsOfInsanityButton, handleElementsOfInsanityPurchase, handleBackToShop } from '../commands/premium/premium_shop.js';
import { requirePony } from '../utils/pony/index.js';
import { 
  addBits, 
  getPony, 
  getRaces, 
  updatePony, 
  validatePonyName, 
  validatePonyAge, 
  validatePonyRace, 
  validatePonyDescription, 
  createPonyEmbed,
  hasAllFriends
} from '../utils/pony/index.js';
import { createEmbed, createButton, createActionRow } from '../utils/components.js';
import { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle
} from 'discord.js';

export const name = 'interactionCreate';
export const once = false;

const economyCommands = ['adventure', 'resources', 'friendship', 'zecora', 'crime', 'balance', 'protection', 'leaders', 'farm', 'knock', 'adopt', 'battle', 'case', 'decorate', 'feed', 'inventory', 'myponies', 'profile', 'timely', 'trade', 'transfer', 'bug', 'donate', 'pony_alerts', 'set_spawn', 'remove_spawn', 'clan', 'clan_invite', 'clan_emblem', 'clan_vice', 'clan_viceremove', 'artifacts'];

export const execute = async (interaction) => {
  if (interaction.isChatInputCommand()) {
    console.log(`🎯 Command received: ${interaction.commandName} by ${interaction.user.tag}`);
    const command = interaction.client.commands.get(interaction.commandName);
    
    if (!command) {
      console.log(`❌ Command not found: ${interaction.commandName}`);
      return;
    }

    if (process.env.NODE_ENV === 'development' && !canUseTesting(interaction.user.id)) {
      return interaction.reply({
        content: 'I lost my toothpaste <a:shook:1425845208658219128><a:shook:1425845208658219128><a:shook:1425845208658219128>',
        ephemeral: true
      });
    }


    const cooldownCheck = checkCooldown(interaction.user.id, interaction.commandName);
    
    if (!cooldownCheck.canUse) {
      const cooldownContainer = createCooldownContainer(cooldownCheck.timeLeft);
      return interaction.reply({
        components: [cooldownContainer],
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
    
    try {
      console.log(`⚡ Executing command: ${interaction.commandName}`);
      

      setCooldown(interaction.user.id, interaction.commandName);
      
      if (economyCommands.includes(interaction.commandName)) {
        await requirePony(interaction, async () => {
          await command.execute(interaction);
        });
      } else {
        await command.execute(interaction);
      }
      console.log(`✅ Command completed: ${interaction.commandName}`);
      
      logCommand(interaction.client, interaction).catch(() => {});
    } catch (error) {
      console.error(`❌ Error executing command ${interaction.commandName}:`, error);
      console.error(`❌ Error details:`, {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status
      });
      
      try {
        const errorMessage = errorEmbed(await errors.COMMAND_ERROR(interaction.guild?.id));
        
        console.log(`🔧 Interaction state: replied=${interaction.replied}, deferred=${interaction.deferred}`);
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorMessage], flags: 64 });
        } else {
          await interaction.reply({ embeds: [errorMessage], flags: 64 });
        }
      } catch (replyError) {
        console.error('❌ Error sending error message:', replyError);
      }
    }
  }
  
  if (interaction.isButton()) {
    if (process.env.NODE_ENV === 'development' && !canUseTesting(interaction.user.id)) {
      return interaction.reply({
        content: 'I lost my toothpaste <a:shook:1425845208658219128><a:shook:1425845208658219128><a:shook:1425845208658219128>',
        ephemeral: true
      });
    }
    
    try {
      const { customId } = interaction;
      

      if (customId.startsWith('delete_dm_message_')) {
        const [, , , userId] = customId.split('_');
        
        if (interaction.user.id !== userId) {
          return interaction.reply({
            content: 'You can only delete your own messages!',
            ephemeral: true
          });
        }
        
        try {
          await interaction.message.delete();
        } catch (error) {
          console.error('Error deleting DM message:', error);
          return interaction.reply({
            content: 'Failed to delete message.',
            ephemeral: true
          });
        }
        return;
      }
      

      if (customId.startsWith('clan_')) {

        if (customId.startsWith('clan_invite_accept_') || customId.startsWith('clan_invite_decline_')) {
          await handleClanInviteButtons(interaction);
          return;
        }
        

        const clanCommand = interaction.client.commands.get('clan');
        if (clanCommand && clanCommand.handleButtonInteraction) {
          await clanCommand.handleButtonInteraction(interaction);
          return;
        }
      }
      

      if (customId === 'donate_collection_standard' || customId === 'donate_collection_halloween') {
        const { createEmbed } = await import('../utils/components.js');
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
        
        let collectionEmbed;
        
        if (customId === 'donate_collection_standard') {
          collectionEmbed = createEmbed({
            title: '🎁 Standard Collection ($25)',
            description: `**Standard Donation Rewards:**

**<:giftdonate:1418946982030082170> Exclusive Content:**
> **Unique Profile Theme** - Special exclusive design
> **Exclusive Pony: Flawless** - Legendary rarity pony
- 📌 A pony with a unique rarity cannot be stolen
> **2 Secret Ponies: Woona & Cewestia** - Ultra-rare collectibles

⏰ **Limited Time Offer - Available for 7 more days!**
After that, this collection will no longer be available.

**💳 Payment Methods:**
> **Wise**, **Ko-fi**, **Patreon**

**📬 How to Get This Collection:**
Send a direct message to <@259347882052812800> (trixonna) and mention "Standard Collection"

*Thank you for supporting Minuette Bot! ❤️*`,
            color: 0x3498DB,
            user: interaction.user
          });
        } else {
          collectionEmbed = createEmbed({
            title: '🎃 Halloween Collection ($25)',
            description: `**Halloween Donation Rewards:**

**👻 Spooky Exclusive Content:**
> **Halloween Profile Theme** 
> **Unique Pony: Sadako** 
> **Secret Pony: Midnight Blossom**
> **Custom Pony: Pumpkin Seed**
> **Unique Skin: SciTwilight**

**💳 Payment Methods:**
> **Wise**, **Ko-fi**, **Patreon**

**📬 How to Get This Collection:**
Send a direct message to <@259347882052812800> (trixonna) and mention "Halloween Collection"

*Thank you for supporting Minuette Bot! 🎃*`,
            color: 0xFF4500,
            user: interaction.user,
            image: 'https://i.imgur.com/oTD5HgO.png'
          });
        }


        const backRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('donate_back')
              .setLabel('Back to Collections')
              .setStyle(ButtonStyle.Secondary)
          );
        

        try {
          await interaction.update({
            embeds: [collectionEmbed],
            files: [],
            components: [backRow]
          });
        } catch (error) {
          if (error.code === 10062) {
            console.log('Interaction expired, sending new message');
            try {
              await interaction.channel.send({
                content: `${interaction.user}, here's the information you requested:`,
                embeds: [collectionEmbed],
                files: [],
                components: [backRow]
              });
            } catch (channelError) {
              console.error('Error sending message to channel:', channelError);
            }
          } else {
            throw error;
          }
        }
        return;
      }
      

      if (customId === 'donate_back') {
        const { createEmbed } = await import('../utils/components.js');
        const { getAllDonators } = await import('../models/DonatorModel.js');
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
        

        const donators = await getAllDonators();
        

        let donatorsText = '';
        if (donators && donators.length > 0) {

          const donatorsList = [];
          for (const donator of donators) {
            try {
              const user = await interaction.client.users.fetch(donator.user_id);
              donatorsList.push(`• ${user.username}`);
            } catch (error) {

              donatorsList.push(`• ${donator.username || 'Unknown User'}`);
            }
          }
          donatorsText = `\n\n**🎁 Our Amazing Donators:**\n${donatorsList.join('\n')}`;
        }
        

        const mainEmbed = createEmbed({
          title: '💖 Support Minuette Bot Development',
          description: `**Help us keep Minuette Bot growing and improving!**

Your donation directly supports the development of new features, bug fixes, and server maintenance costs.

**🎁 Choose Your Collection:**
Choose between two exclusive donation reward collections below!

**✨ To Get Donator Status:**
Purchase at least two collections to support the bot and unlock exclusive features!

**🌟 Donator Benefits:**
• Custom emoji in leaderboards (use \`/donator_emoji set\`)
• Exclusive donator recognition
• Priority support
• Same privileges as developers for leaderboard customization${donatorsText}`,
          color: 0x000000,
          user: interaction.user
        });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('donate_collection_standard')
              .setLabel('Standard Collection')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🎁'),
            new ButtonBuilder()
              .setCustomId('donate_collection_halloween') 
              .setLabel('Halloween Collection')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🎃')
          );

        try {
          await interaction.update({
            embeds: [mainEmbed],
            files: [],
            components: [row]
          });
        } catch (error) {
          if (error.code === 10062) {
            console.log('Interaction expired, sending new message');
            try {
              await interaction.channel.send({
                content: `${interaction.user}, here's the donation information:`,
                embeds: [mainEmbed],
                files: [],
                components: [row]
              });
            } catch (channelError) {
              console.error('Error sending message to channel:', channelError);
            }
          } else {
            throw error;
          }
        }
        return;
      }

      if (customId === 'claim_vote_rewards') {
        const { handleClaimRewards } = await import('../commands/utility/vote.js');
        await handleClaimRewards(interaction);
        return;
      }
      
      if (customId.startsWith('mane6quiz_')) {
        const { handleButtonInteraction } = await import('../commands/utility/utility_mane6quiz.js');
        await handleButtonInteraction(interaction);
        return;
      }
      
      if (customId.startsWith('market_')) {
        const { handleButtonInteraction } = await import('../commands/economy/market.js');
        await handleButtonInteraction(interaction);
        return;
      }
      
      if (customId.startsWith('rps_')) {
        const { handleButtonInteraction } = await import('../commands/utility/game_rps.js');
        await handleButtonInteraction(interaction);
        return;
      }
      
      if (customId.startsWith('ttt_')) {
        const { handleButtonInteraction } = await import('../commands/utility/game_tictactoe.js');
        await handleButtonInteraction(interaction);
        return;
      }

      if (customId.startsWith('connect4_')) {
        const connect4Command = await import('../commands/utility/game_connect4.js');
        await connect4Command.default.handleButton(interaction);
        return;
      }

      if (customId.startsWith('hangpony_')) {
        const { handleButtonInteraction } = await import('../commands/games/game_hangpony.js');
        await handleButtonInteraction(interaction);
        return;
      }

      if (customId.startsWith('casino_disclaimer_')) {
        const container = new ContainerBuilder();
        
        const titleText = new TextDisplayBuilder()
          .setContent('**Our Stance on Gambling**');
        container.addTextDisplayComponents(titleText);
        
        const mainText = new TextDisplayBuilder()
          .setContent('It is important to remember that gambling is not a way to make money, real or fake. It is a form of entertainment and should be treated as such. If you or someone you know is struggling with gambling addiction, please seek help.\n\nAdditionally, please remember that the odds are always in favor of the house. The house always wins.');
        container.addTextDisplayComponents(mainText);
        
        const additionalText = new TextDisplayBuilder()
          .setContent('**Remember:** This casino feature uses virtual currency (bits/chips) and is for entertainment purposes only. This bot does not promote real money gambling.');
        container.addTextDisplayComponents(additionalText);
        
        await interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
        });
        return;
      }

      if (customId.startsWith('casino_slots_')) {
        const { handleButtonInteraction } = await import('../commands/economy/casino_slots.js');
        await handleButtonInteraction(interaction);
        return;
      }

      if (customId.startsWith('casino_dice_')) {
        const casinoDice = await import('../commands/economy/casino_dice.js');
        await casinoDice.default.handleButton(interaction);
        return;
      }

      if (customId.startsWith('connect4_move_')) {
        const connect4 = await import('../commands/utility/connect4.js');
        await connect4.default.handleButton(interaction);
        return;
      }

      if (customId.startsWith('casino_coinflip_')) {
        const { handleButtonInteraction } = await import('../commands/economy/casino_coinflip.js');
        await handleButtonInteraction(interaction);
        return;
      }

      if (customId.startsWith('ignite_spark_')) {
        const { handleButtonInteraction } = await import('../commands/economy/ignite_spark.js');
        await handleButtonInteraction(interaction);
        return;
      }

      if (customId.startsWith('game_left_') || customId.startsWith('game_right_')) {
        const { handleGameMove } = await import('../commands/economy/farm.js');
        const userId = customId.split('_')[2];
        const direction = customId.split('_')[1];
        
        console.log(`Game button clicked: ${customId}, direction: ${direction}, userId: ${userId}`);
        
        await handleGameMove(interaction, userId, direction);
        return;
      }


      if (customId.startsWith('snake_up_') || customId.startsWith('snake_down_') || 
          customId.startsWith('snake_left_') || customId.startsWith('snake_right_')) {
        const { handleSnakeMove } = await import('../commands/economy/farm.js');
        const userId = customId.split('_')[2];
        const direction = customId.split('_')[1];
        
        console.log(`Snake button clicked: ${customId}, direction: ${direction}, userId: ${userId}`);
        
        await handleSnakeMove(interaction, userId, direction);
        return;
      }

      if (customId.startsWith('buy_card_')) {
        const { handleButton } = await import('../commands/economy/card_shop.js');
        await handleButton(interaction);
        return;
      }

      if (customId.startsWith('milk_move_')) {
        const { handleMilkMove } = await import('../commands/economy/farm.js');
        const parts = customId.split('_');
        const userId = parts[parts.length - 1];
        let direction = parts[2];
        if (parts[3] && parts[3] !== userId) {
          direction += '_' + parts[3];
        }
        
        console.log(`Milk button clicked: ${customId}, direction: ${direction}, userId: ${userId}`);
        
        await handleMilkMove(interaction, userId, direction);
        return;
      }
      

      if (customId.startsWith('toggle_notification_')) {
        const { handleNotificationButton } = await import('../commands/economy/adventure.js');
        const handled = await handleNotificationButton(interaction);
        if (handled) return;
      }
      
      if (customId.startsWith('friendship_grid_prev_') || 
          customId.startsWith('friendship_grid_next_') ||
          customId.startsWith('friendship_grid_filter_') ||
          customId.startsWith('friendship_family_filter_') ||
          customId.startsWith('friendship_search_') ||
          customId.startsWith('friendship_list_prev_') || 
          customId.startsWith('friendship_list_next_') ||
          customId.startsWith('friendship_list_toggle_favorites_') ||
          customId.startsWith('friendship_list_toggle_canon_') ||
          customId.startsWith('friendship_detailed_view_') ||
          customId.startsWith('friendship_detailed_prev_') ||
          customId.startsWith('friendship_detailed_next_') ||
          customId.startsWith('friendship_toggle_favorite_') ||
          customId.startsWith('friendship_back_to_list_') ||
          customId.startsWith('friendship_back_to_grid_') ||
          customId.startsWith('friendship_select_pony_') ||
          customId.startsWith('friendship_search_prev_') ||
          customId.startsWith('friendship_search_next_') ||
          customId.startsWith('friendship_clothing_') ||
          customId.startsWith('clothing_') ||
          customId.startsWith('friendship_delete_pony_')) {
        

        return;
      }
      
      if (customId.startsWith('buy_') && 
         customId.includes('_item')) {

        return;
      }
      
      if (customId.startsWith('approve-bits-') || customId.startsWith('deny-bits-')) {
        const isApprove = customId.startsWith('approve-bits-');
        const parts = customId.split('-');
        const userId = parts[2];
        const bitsAmount = parseInt(parts[3]);

        const pony = await getPony(userId);
        if (!pony) {
          return interaction.reply({
            embeds: [
              createEmbed({
                title: '❌ Error',
                description: 'This user no longer has a pony in the database.',
                color: 0xED4245
              })
            ],
            ephemeral: true
          }).catch(err => {
            console.error('Failed to reply to interaction:', err);
          });
        }
        
        if (isApprove) {
          const success = await addBits(userId, bitsAmount);
          
          if (success) {
            try {
              const user = await interaction.client.users.fetch(userId);
              const { sendDMWithDelete } = await import('../utils/components.js');
              await sendDMWithDelete(user, {
                embeds: [
                  createEmbed({
                    title: '💰 Bits Return Approved',
                    description: `Your request for **${bitsAmount} bits** has been approved by the Equestria Bank!\n\n**${bitsAmount} bits** have been added to your account.\n\nCurrent balance: **${pony.bits + bitsAmount} bits**`,
                    color: 0x57F287,
                    thumbnail: 'https://i.imgur.com/YkisIrz.png'
                  })
                ]
              }).catch(err => console.error('Failed to send DM to user:', err));
            } catch (error) {
              console.error('Failed to fetch user or send DM:', error);
            }
            
            try {
              await interaction.update({
                embeds: [
                  createEmbed({
                    title: '✅ Request Approved',
                    description: `You've approved the request for <@${userId}>.\n\n**${bitsAmount} bits** have been added to their account.\n\nCurrent balance: **${pony.bits + bitsAmount} bits**`,
                    color: 0x57F287
                  })
                ],
                components: []
              });
            } catch (error) {
              if (error.code === 10062) {
                console.log('Interaction expired, but bits were successfully added');
              } else {
                console.error('Failed to update interaction:', error);
              }
            }
            return;
          } else {
            return interaction.reply({
              embeds: [
                createEmbed({
                  title: '❌ Error',
                  description: 'Failed to add bits to the user\'s account.',
                  color: 0xED4245
                })
              ],
              ephemeral: true
            }).catch(err => {
              console.error('Failed to reply to interaction:', err);
            });
          }
        } else {
          try {
            const user = await interaction.client.users.fetch(userId);
            const { sendDMWithDelete } = await import('../utils/components.js');
            await sendDMWithDelete(user, {
              embeds: [
                createEmbed({
                  title: '❌ Bits Return Denied',
                  description: `Your request for **${bitsAmount} bits** has been denied by the Equestria Bank.\n\nIf you believe this is an error, please contact the server administrators.`,
                  color: 0xED4245,
                  thumbnail: 'https://i.imgur.com/YkisIrz.png'
                })
              ]
            }).catch(err => console.error('Failed to send DM to user:', err));
          } catch (error) {
            console.error('Failed to fetch user or send DM:', error);
          }
          
          try {
            await interaction.update({
              embeds: [
                createEmbed({
                  title: '❌ Request Denied',
                  description: `You've denied the request for <@${userId}>.`,
                  color: 0xED4245
                })
              ],
              components: []
            });
          } catch (error) {
            if (error.code === 10062) {
              console.log('Interaction expired, but request was processed');

            } else {
              console.error('Failed to update interaction:', error);
            }
          }
          return;
        }
      }
      

      if (customId.startsWith('open_case_')) {
        return await handleCaseButton(interaction);
      }
      
      if (customId.startsWith('inventory_')) {
        return await handleInventoryInteraction(interaction);
      }
      
      if (customId.startsWith('myponies_')) {
        const messageOwnerId = interaction.message?.interaction?.user?.id;
        if (messageOwnerId && messageOwnerId !== interaction.user.id) {
          const { createAccessErrorContainer } = await import('../commands/economy/myponies.js');
          const container = createAccessErrorContainer(
            'Access Denied',
            'This is not your ponies list!'
          );
          
          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        
        await interaction.deferUpdate();
        
        const { showPonyListPage } = await import('../commands/economy/myponies.js');
        
        const userId = interaction.user.id;
        const customId = interaction.customId;
 
        const { userPonyData } = await import('../commands/economy/myponies.js');
        const storedUserData = userPonyData.get(userId);
        const currentSearchQuery = storedUserData?.searchQuery || '';
        
        if (customId.startsWith('myponies_filter_')) {
          const newFilter = customId.replace('myponies_filter_', '');
          const currentSortBy = storedUserData?.sortBy || 'id';
          const currentFavoritesOnly = storedUserData?.favoritesOnly || false;
          return await showPonyListPage(interaction, userId, 1, newFilter, currentSearchQuery, currentSortBy, currentFavoritesOnly);
        } 
        
        if (customId.startsWith('myponies_sort_')) {
          const newSortBy = customId.replace('myponies_sort_', '');
          const currentFilter = storedUserData?.filter || 'all';
          const currentFavoritesOnly = storedUserData?.favoritesOnly || false;
          return await showPonyListPage(interaction, userId, 1, currentFilter, currentSearchQuery, newSortBy, currentFavoritesOnly);
        } 
        
        if (customId.startsWith('myponies_favorites_')) {
          const favAction = customId.replace('myponies_favorites_', '');
          const newFavoritesOnly = favAction === 'on';
          const currentFilter = storedUserData?.filter || 'all';
          const currentSortBy = storedUserData?.sortBy || 'id';

          const { isDonator } = await import('../models/DonatorModel.js');
          const { getUserFriends } = await import('../models/FriendshipModel.js');
          const { createEmbed } = await import('../utils/components.js');
          
          const userIsDonator = await isDonator(userId);
          const allUserFriends = await getUserFriends(userId, false);
          const hasFavorites = allUserFriends.some(pony => pony.is_favorite === 1);
          
          if (!userIsDonator && newFavoritesOnly) {
            return interaction.followUp({
              embeds: [createEmbed({
                title: 'Donators Only! 🎁',
                description: 'The favorites filter is only available for donators!\n\nTo become a donator, use `/donate` and purchase at least two collections.',
                color: 0x03168f
              })],
              ephemeral: true
            });
          }
          
          if (!hasFavorites && newFavoritesOnly) {
            return interaction.followUp({
              embeds: [createEmbed({
                title: 'No Favorites! ❤️',
                description: 'You don\'t have any favorite ponies yet!\n\nTo add favorites, use `/favorite` command with a pony ID.',
                color: 0x03168f
              })],
              ephemeral: true
            });
          }
          
          return await showPonyListPage(interaction, userId, 1, currentFilter, currentSearchQuery, currentSortBy, newFavoritesOnly);
        } 
        
        if (customId.startsWith('myponies_')) {
          const parts = customId.split('_');
          const action = parts[1];
          
          let newPage = 1;
          
          if (action === 'first') {
            newPage = 1;
          } else if (action === 'last') {
            newPage = parseInt(parts[2]);
          } else if (action === 'prev' || action === 'next') {
            newPage = parseInt(parts[2]);
          }
          
          const filter = parts[parts.length - 1];
          const currentSortBy = storedUserData?.sortBy || 'id';
          const currentFavoritesOnly = storedUserData?.favoritesOnly || false;
          return await showPonyListPage(interaction, userId, newPage, filter, currentSearchQuery, currentSortBy, currentFavoritesOnly);
        }
        
        return;
      }

      if (customId.startsWith('artifact_purchase_')) {
        const { handleInteraction } = await import('../commands/economy/artifacts.js');
        return await handleInteraction(interaction);
      }
      
      if (customId.startsWith('artifact_back_')) {
        const { handleInteraction } = await import('../commands/economy/artifacts.js');
        return await handleInteraction(interaction);
      }
      
      if (customId.startsWith('bundle_purchase_')) {
        return await handleBundlePurchase(interaction);
      }
      
      if (customId === 'elements_of_insanity_button') {
        return await handleElementsOfInsanityButton(interaction);
      }
      
      if (customId.startsWith('purchase_elements_of_insanity_')) {
        return await handleElementsOfInsanityPurchase(interaction);
      }
      
      if (customId.startsWith('back_to_shop_')) {
        return await handleBackToShop(interaction);
      }
      

      if (customId.startsWith('open_gift_')) {
        const { handleGiftButton } = await import('../commands/economy/case.js');
        return await handleGiftButton(interaction);
      }
      

      if (customId.startsWith('knock_')) {
        const { handleKnockButton } = await import('../commands/economy/knock.js');
        return await handleKnockButton(interaction);
      }
      

      if (customId.startsWith('trick_')) {
        const { handleTrickTreatButton } = await import('../commands/economy/knock.js');
        return await handleTrickTreatButton(interaction);
      }
      

      if (customId.startsWith('battle_select_')) {
        const { handleBattleSelect } = await import('../commands/economy/battle.js');
        return await handleBattleSelect(interaction);
      }
      
      if (customId.startsWith('battle.attack.')) {
        const { handleBattleAttack } = await import('../commands/economy/battle.js');
        return await handleBattleAttack(interaction);
      }
      
      if (customId.startsWith('battle.heal.')) {
        const { handleBattleHeal } = await import('../commands/economy/battle.js');
        return await handleBattleHeal(interaction);
      }
      
      if (customId.startsWith('battle.dodge.')) {
        const { handleBattleDodge } = await import('../commands/economy/battle.js');
        return await handleBattleDodge(interaction);
      }
      

      if (customId.startsWith('decorate.upgrade.')) {
        const { handleDecorationUpgrade } = await import('../commands/economy/decorate.js');
        return await handleDecorationUpgrade(interaction);
      }
      
      if (customId.startsWith('decorate.info.')) {
        const { handleDecorationInfo } = await import('../commands/economy/decorate.js');
        return await handleDecorationInfo(interaction);
      }
      

      if (customId.startsWith('zecora_')) {
        const { handleZecoraButton } = await import('../commands/economy/zecora.js/index.js');
        return await handleZecoraButton(interaction);
      }
      

      if (customId.startsWith('catch_spawn_') || customId.startsWith('guess_spawn_')) {
        return await interaction.reply({
          content: '❌ This button is no longer supported. Please reply to the spawn message with the pony name instead!',
          ephemeral: true
        });
      }
      

      if (customId.startsWith('trade_')) {
        const { handleTradeButton } = await import('../commands/economy/trade.js');
        return await handleTradeButton(interaction);
      }
      

      if (customId === 'marry_accept' || customId === 'marry_decline') {
        const { handleMarriageButton } = await import('../commands/economy/marry.js');
        return await handleMarriageButton(interaction);
      }
      

      if (customId === 'adopt_accept' || customId === 'adopt_decline') {
        const { handleAdoptionButton } = await import('../commands/economy/adopt.js');
        return await handleAdoptionButton(interaction);
      }
      
      if (customId.startsWith('top_prev_') || customId.startsWith('top_next_') || customId.startsWith('top_filter_')) {
        try {
          const command = interaction.client.commands.get('topequestria');
          if (!command) return;
          
          const messageInteractionUserId = interaction.message.interaction?.user?.id;
          if (messageInteractionUserId && interaction.user.id !== messageInteractionUserId) {
            return interaction.reply({
              content: await errors.NOT_ORIGINAL_USER(interaction.guildId),
              ephemeral: true
            });
          }
          
          const pageMatch = customId.match(/_(prev|next)_(\d+)$/);
          if (!pageMatch) return;
          
          const direction = pageMatch[1];
          const currentPage = parseInt(pageMatch[2]);
          const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
          

          const newInteraction = {
            ...interaction,
            options: {
              getInteger: (name) => name === 'page' ? newPage : null
            },
            isButton: () => true,
            isChatInputCommand: () => false,

            update: interaction.update.bind(interaction),
            reply: interaction.reply.bind(interaction),
            followUp: interaction.followUp.bind(interaction),
            deferred: interaction.deferred,
            replied: interaction.replied
          };
          
          await command.execute(newInteraction);
        } catch (error) {
          console.error('Error handling top pagination button:', error);
          
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              embeds: [errorEmbed(await errors.COMMAND_ERROR(interaction.guild?.id))],
              ephemeral: true
            }).catch(err => console.error('Failed to reply with error:', err));
          }
        }
        return;
      }
      

      if (customId.startsWith('leaders_')) {
        try {

          const messageInteractionUserId = interaction.message.interaction?.user?.id;
          if (messageInteractionUserId && interaction.user.id !== messageInteractionUserId) {
            return interaction.reply({
              content: await errors.NOT_ORIGINAL_USER(interaction.guildId),
              ephemeral: true
            });
          }
          
          const command = interaction.client.commands.get('leaders');
          if (!command) return;
          
          await command.execute(interaction);
        } catch (error) {
          console.error('Error handling leaders button:', error);
          
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              embeds: [errorEmbed(await errors.COMMAND_ERROR(interaction.guild?.id))],
              ephemeral: true
            }).catch(err => console.error('Failed to reply with error:', err));
          }
        }
        return;
      }
      

      if (customId.startsWith('family_')) {

        const targetUserId = customId.replace('family_', '');
        

        if (targetUserId && targetUserId !== interaction.user.id) {
          await interaction.reply({
            content: '❌ You can only view your own family information!',
            ephemeral: true
          });
          return;
        }
        
        await handleFamilyButton(interaction);
        return;
      }


      if (customId.startsWith('edit_pony_')) {
        const { handleBackgroundCatalog } = await import('../commands/economy/profile.js');
        await handleBackgroundCatalog(interaction);
        return;
      }


      if (customId.startsWith('change_pony_')) {
        const userId = customId.replace('change_pony_', '');
        

        if (userId && userId !== interaction.user.id) {
          await interaction.reply({
            content: '❌ You can only change your own profile pony!',
            ephemeral: true
          });
          return;
        }
        
        const { handleChangePony } = await import('../commands/economy/profile.js');
        await handleChangePony(interaction, userId);
        return;
      }


      if (customId.startsWith('back_to_profile_')) {
        await handleBackToProfile(interaction);
        return;
      }


      if (customId.startsWith('divorce_') || 
          customId.startsWith('abandon_adoption_') ||
          customId.startsWith('leave_family_')) {
        await handleFamilyAction(interaction);
        return;
      }


      if (customId.startsWith('background_catalog') ||
          customId.startsWith('background_selector_') ||
          customId.startsWith('background_purchase_') ||
          customId.startsWith('background_apply_') ||
          customId.startsWith('background_back_to_profile')) {
        

        let targetUserId;
        if (customId.startsWith('background_catalog_')) {
          targetUserId = customId.replace('background_catalog_', '');
        } else if (customId.startsWith('background_selector_')) {
          targetUserId = customId.replace('background_selector_', '');
        } else if (customId.startsWith('background_purchase_')) {
          const parts = customId.split('_');
          targetUserId = parts[2];
        } else if (customId.startsWith('background_apply_')) {
          const parts = customId.split('_');
          targetUserId = parts[2];
        } else if (customId.startsWith('background_back_to_profile')) {
          targetUserId = customId.replace('background_back_to_profile_', '');
        }
        

        if (targetUserId && targetUserId !== interaction.user.id) {
          await interaction.reply({
            content: '❌ You can only manage your own profile backgrounds!',
            ephemeral: true
          });
          return;
        }
        
        const { handleBackgroundCatalog } = await import('../commands/economy/profile.js');
        await handleBackgroundCatalog(interaction);
        return;
      }
      if (customId.startsWith('derpi_prev_') || customId.startsWith('derpi_next_')) {
        await handleDerpiPagination(interaction);
        return;
      }
      

      if (customId.startsWith('claim_breeding_')) {
        const { handleClaimBreeding } = await import('../commands/economy/breed.js');
        await handleClaimBreeding(interaction);
        return;
      }
      

      if (customId.startsWith('breed_')) {
        const { handleBreedingButtons } = await import('../commands/economy/breed.js');
        await handleBreedingButtons(interaction);
        return;
      }
      

      if (customId.startsWith('rebirth_')) {
        const { handleRebirthButtons } = await import('../commands/economy/rebirth.js');
        await handleRebirthButtons(interaction);
        return;
      }
      
      if (customId.startsWith('aimod_')) {

        return;
      }


      
      if (customId === 'request_resources') {


        return;
      }

      if (customId.startsWith('farm_')) {
        const farmCommand = interaction.client.commands.get('farm');
        if (farmCommand && farmCommand.handleFarmInteraction) {
          await farmCommand.handleFarmInteraction(interaction);
        }
        return;
      }


      if (customId.startsWith('confirm_remove_') || customId.startsWith('cancel_remove_')) {
        const { handleConfirmation } = await import('../commands/economy/get_out_outside.js');
        await handleConfirmation(interaction);
        return;
      }

      if (customId.startsWith('voice_select_')) {
        const { handleVoiceInteraction } = await import('../commands/utility/voice.js');
        await handleVoiceInteraction(interaction);
        return;
      }

      if (customId.startsWith('bank_')) {
        const command = interaction.client.commands.get('balance');
        if (command && command.handleButton) {
          await command.handleButton(interaction);
        }
        return;
      }
      
      if (customId === 'roulette_change_stake') {
        return interaction.reply({
          embeds: [
            createEmbed({
              title: '💰 Change Your Bet',
              description: 'Please use the `/casino roulette` command again with a new bet type or amount.',
              color: 0x9B59B6
            })
          ],
          ephemeral: true
        });
      }
    } catch (error) {
      console.error(`Error handling button interaction: ${error.message}`);
      console.error(`Stack trace:`, error.stack);
    }
  }
  
  if (interaction.isStringSelectMenu()) {
    if (process.env.NODE_ENV === 'development' && !canUseTesting(interaction.user.id)) {
      return interaction.reply({
        content: 'I lost my toothpaste <a:shook:1425845208658219128><a:shook:1425845208658219128><a:shook:1425845208658219128>',
        ephemeral: true
      });
    }
    
    try {
      const { customId, values } = interaction;
      

      if (customId.startsWith('artifact_preview_')) {
        const { handleInteraction } = await import('../commands/economy/artifacts.js');
        await handleInteraction(interaction);
        return;
      }
      
      if (customId.startsWith('bundle_preview_')) {
        await handleBundlePreview(interaction);
        return;
      }
      
      if (customId.startsWith('background_selector_')) {
        const { handleBackgroundCatalog } = await import('../commands/economy/profile.js');
        await handleBackgroundCatalog(interaction);
        return;
      }
      

      

      if (customId.startsWith('clan_flag_select_')) {
        const clanCommand = interaction.client.commands.get('clan');
        if (clanCommand && clanCommand.handleSelectMenu) {
          await clanCommand.handleSelectMenu(interaction);
          return;
        }
      }
      
      if (customId.startsWith('farm_production_view_')) {
        const farmCommand = interaction.client.commands.get('farm');
        if (farmCommand && farmCommand.handleFarmProductionView) {
          await farmCommand.handleFarmProductionView(interaction);
        }
        return;
      }
      
      if (customId.startsWith('farm_production_')) {
        const farmCommand = interaction.client.commands.get('farm');
        if (farmCommand && farmCommand.handleFarmProductionSelect) {
          await farmCommand.handleFarmProductionSelect(interaction);
        }
        return;
      }
      
      if (customId.startsWith('change_production_')) {
        const userId = customId.replace('change_production_', '');
        

        if (interaction.user.id !== userId) {
          return await interaction.reply({
            content: 'You can only change your own farm production.',
            ephemeral: true
          });
        }
        
        const { handleProductionChange } = await import('../commands/economy/profile.js');
        await handleProductionChange(interaction, userId, values[0]);
        return;
      }
      
      if (customId === 'edit-pony-select') {
        const pony = await getPony(interaction.user.id);
        if (!pony) {
          return interaction.reply({
            embeds: [
              createEmbed({
                title: '❌ Error',
                description: 'You do not have a pony to edit.',
                color: 0xED4245
              })
            ],
            ephemeral: true
          });
        }
        
        const selectedValue = values[0];
        
        switch (selectedValue) {
          case 'edit_name': {
            const modal = new ModalBuilder()
              .setCustomId('edit-pony-name-modal')
              .setTitle('Edit Pony Name');
            
            const nameInput = new TextInputBuilder()
              .setCustomId('pony-name')
              .setLabel('New Pony Name (3-32 characters)')
              .setStyle(TextInputStyle.Short)
              .setMinLength(3)
              .setMaxLength(32)
              .setValue(pony.pony_name || 'Unnamed Pony')
              .setRequired(true);
            
            const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
            modal.addComponents(firstActionRow);
            
            await interaction.showModal(modal);
            break;
          }
          
          case 'edit_age': {
            const modal = new ModalBuilder()
              .setCustomId('edit-pony-age-modal')
              .setTitle('Edit Pony Age');
            
            const ageInput = new TextInputBuilder()
              .setCustomId('pony-age')
              .setLabel('New Pony Age (1-1000)')
              .setStyle(TextInputStyle.Short)
              .setMinLength(1)
              .setMaxLength(4)
              .setValue(pony.pony_age?.toString() || '1')
              .setPlaceholder('Enter a number between 1 and 1000')
              .setRequired(true);
            
            const firstActionRow = new ActionRowBuilder().addComponents(ageInput);
            modal.addComponents(firstActionRow);
            
            await interaction.showModal(modal);
            break;
          }
          
          case 'edit_race': {
            const races = getRaces();
            const currentRace = pony.pony_race || 'earth';
            
            const modal = new ModalBuilder()
              .setCustomId('edit-pony-race-modal')
              .setTitle('Edit Pony Race');
            
            const raceInput = new TextInputBuilder()
              .setCustomId('pony-race')
              .setLabel('New Pony Race')
              .setStyle(TextInputStyle.Short)
              .setValue(currentRace)
              .setPlaceholder('earth, unicorn, pegasus, alicorn, bat, crystal')
              .setRequired(true);
            
            const firstActionRow = new ActionRowBuilder().addComponents(raceInput);
            modal.addComponents(firstActionRow);
            
            await interaction.showModal(modal);
            break;
          }
          
          case 'edit_description': {
            const modal = new ModalBuilder()
              .setCustomId('edit-pony-description-modal')
              .setTitle('Edit Pony Description');
            
            const descriptionInput = new TextInputBuilder()
              .setCustomId('pony-description')
              .setLabel('New Pony Description (up to 1000 characters)')
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(1000)
              .setValue(pony.pony_description || 'My little pony')
              .setRequired(true);
            
            const firstActionRow = new ActionRowBuilder().addComponents(descriptionInput);
            modal.addComponents(firstActionRow);
            
            await interaction.showModal(modal);
            break;
          }

        }
        
        return;
      }


    } catch (error) {
      console.error(`Error handling select menu interaction: ${error.message}`);
      console.error(`Stack trace:`, error.stack);
    }
  }
  
  if (interaction.isModalSubmit()) {
    if (process.env.NODE_ENV === 'development' && !canUseTesting(interaction.user.id)) {
      return interaction.reply({
        content: 'I lost my toothpaste <a:shook:1425845208658219128><a:shook:1425845208658219128><a:shook:1425845208658219128>',
        ephemeral: true
      });
    }
    
    try {
      const { customId } = interaction;
      

      if (customId.startsWith('clan_')) {
        const clanCommand = interaction.client.commands.get('clan');
        if (clanCommand && clanCommand.handleModalSubmit) {
          await clanCommand.handleModalSubmit(interaction);
          return;
        }
      }
      
      if (customId === 'resources_modal') {
        await handleGoldenCarrotModal(interaction);
        return;
      }
      
      if (customId.startsWith('shop_edit_price_') || customId.startsWith('shop_edit_description_')) {
        await handleShopModalSubmit(interaction);
        return;
      }
      
      if (customId.startsWith('trade_manage_pony_')) {
        const { handleTradeModal } = await import('../commands/economy/trade.js');
        await handleTradeModal(interaction);
        return;
      }
      
      if (customId.startsWith('hangpony_')) {
        const { handleModalSubmit } = await import('../commands/games/game_hangpony.js');
        await handleModalSubmit(interaction);
        return;
      }
      

      if (customId === 'breed_modal') {
        const { handleBreedingModal } = await import('../commands/economy/breed.js');
        await handleBreedingModal(interaction);
        return;
      }
      

      if (customId.startsWith('breed_modal_pony')) {
        const { handleBreedingPonyModal } = await import('../commands/economy/breed.js');
        await handleBreedingPonyModal(interaction);
        return;
      }
      
      if (customId.startsWith('friendship_search_modal_') || customId.startsWith('friendship_search_detailed_modal_')) {

        await interaction.deferUpdate();
        
        const { searchPony } = await import('../commands/economy/friendship.js');
        const parts = customId.split('_');
        const isDetailed = customId.includes('detailed');
        const filter = parts[parts.length - 2];
        const targetUserId = parts[parts.length - 1];
        

        if (interaction.user.id !== targetUserId) {
          await interaction.editReply({
            content: 'You can only search in your own friendship collection.',
            components: []
          });
          return;
        }
        
        const searchQuery = interaction.fields.getTextInputValue('search_query');
        
        await searchPony(interaction, interaction.user.id, searchQuery, filter, isDetailed);
        return;
      }
      
      if (customId.startsWith('edit_pony_modal_')) {
        const { handleEditPonyModal } = await import('../commands/economy/profile.js');
        await handleEditPonyModal(interaction);
        return;
      }
      
      if (customId.startsWith('change_pony_modal_')) {
        const { handleChangePonyModal } = await import('../commands/economy/profile.js');
        await handleChangePonyModal(interaction);
        return;
      }
      
      if (customId.startsWith('guess_spawn_modal_')) {
        return await interaction.reply({
          content: '❌ This modal is no longer supported. Please reply to the spawn message with the pony name instead!',
          ephemeral: true
        });
      }
      
      if (customId.startsWith('friendship_confirm_delete_')) {
        await interaction.deferUpdate();
        
        const confirmationText = interaction.fields.getTextInputValue('delete_confirmation');
        
        if (confirmationText.toLowerCase() !== 'confirm') {
          await interaction.editReply({
            embeds: [
              createEmbed({
                title: '❌ Deletion Cancelled',
                description: 'Pony deletion cancelled. You must type "Confirm" exactly to delete a pony.',
                color: 0xED4245
              })
            ],
            components: []
          });
          return;
        }
        

        const parts = customId.split('_');
        const friendId = parseInt(parts[3], 10);
        const currentIndex = parseInt(parts[4], 10);
        const onlyFavs = parts[5] === 'true';
        const filter = parts[6];
        const targetUserId = parts[7];
        const userId = interaction.user.id;
        

        if (userId !== targetUserId) {
          await interaction.editReply({
            embeds: [
              createEmbed({
                title: '❌ Access Denied',
                description: 'You can only remove ponies from your own collection.',
                color: 0xED4245
              })
            ],
            components: []
          });
          return;
        }
        

        const { removePonyFromCollection } = await import('../models/FriendshipModel.js');
        const { t } = await import('../utils/localization.js');
        

        const result = await removePonyFromCollection(userId, friendId);
        
        if (result.success) {

          const { query } = await import('../utils/database.js');
          const ponyInfo = await query('SELECT name FROM pony_friends WHERE id = ?', [friendId]);
          const ponyName = ponyInfo && ponyInfo.length > 0 ? ponyInfo[0].name : 'Unknown Pony';
          
          await interaction.editReply({
            embeds: [
              createEmbed({
                title: '✅ Pony Removed',
                description: `${ponyName} has been removed from your collection.`,
                color: 0x57F287
              })
            ],
            components: []
          });
          

          setTimeout(async () => {
            try {
              const { showGridPage } = await import('../commands/economy/friendship.js');
              await showGridPage(interaction, userId, 1, filter);
            } catch (error) {
              console.error('Error returning to grid after deletion:', error);
            }
          }, 2000);
        } else {
          await interaction.editReply({
            embeds: [
              createEmbed({
                title: '❌ Deletion Failed',
                description: `Failed to remove pony: ${result.error}`,
                color: 0xED4245
              })
            ],
            components: []
          });
        }
        return;
      }
      
      if (customId.startsWith('edit-pony-')) {
        const userId = interaction.user.id;
        const pony = await getPony(userId);
        
        if (!pony) {
          return interaction.reply({
            embeds: [
              createEmbed({
                title: '❌ Error',
                description: 'You do not have a pony to edit.',
                color: 0xED4245
              })
            ],
            ephemeral: true
          });
        }
        
        let updateData = {};
        let validationError = null;
        
        switch (customId) {
          case 'edit-pony-name-modal': {
            const name = interaction.fields.getTextInputValue('pony-name');
            
            try {
              validatePonyName(name);
              updateData.pony_name = name;
            } catch (error) {
              if (name.length < 3) {
                validationError = "Your pony's name must be at least 3 characters long.";
              } else if (name.length > 32) {
                validationError = "Your pony's name cannot exceed 32 characters.";
              } else {
                validationError = "Please provide a valid name for your pony.";
              }
            }
            break;
          }
          
          case 'edit-pony-age-modal': {
            const ageStr = interaction.fields.getTextInputValue('pony-age');
            const age = parseInt(ageStr);
            
            try {
              validatePonyAge(age);
              updateData.pony_age = age;
            } catch (error) {
              if (isNaN(age)) {
                validationError = "Please enter a valid number for your pony's age.";
              } else if (age < 1) {
                validationError = "Your pony must be at least 1 year old.";
              } else if (age > 1000) {
                validationError = "Your pony cannot be older than 1000 years.";
              } else {
                validationError = "Please provide a valid age for your pony (1-1000).";
              }
            }
            break;
          }
          
          case 'edit-pony-race-modal': {
            const raceInput = interaction.fields.getTextInputValue('pony-race').toLowerCase();
            
            try {
              const normalizedRace = validatePonyRace(raceInput);
              updateData.pony_race = normalizedRace;
            } catch (error) {
              const validRaces = getRaces();
              validationError = `Invalid pony race. Please choose from: ${validRaces.join(', ')}`;
            }
            break;
          }
          
          case 'edit-pony-description-modal': {
            const description = interaction.fields.getTextInputValue('pony-description');
            
            try {
              validatePonyDescription(description);
              updateData.pony_description = description;
            } catch (error) {
              if (!description) {
                validationError = "Your pony's description cannot be empty.";
              } else if (description.length > 1000) {
                validationError = "Your pony's description cannot exceed 1000 characters.";
              } else {
                validationError = "Please provide a valid description for your pony.";
              }
            }
            break;
          }
        }
        
        if (validationError) {
          return interaction.reply({
            embeds: [
              createEmbed({
                title: '❌ Validation Error',
                description: validationError,
                color: 0xED4245
              })
            ],
            ephemeral: true
          });
        }
        
        try {
          const updatedPony = await updatePony(userId, updateData);
          
          const fieldName = customId.replace('edit-pony-', '').replace('-modal', '');
          const fieldNames = {
            'name': 'name',
            'age': 'age',
            'race': 'race',
            'description': 'description'
          };
          
          const ponyEmbed = createPonyEmbed(updatedPony, interaction.user);
          
          return interaction.reply({
            embeds: [
              createEmbed({
                title: '✅ Pony Updated',
                description: `You have successfully changed your pony's ${fieldNames[fieldName]}!`,
                color: 0x57F287
              }),
              ponyEmbed
            ],
            ephemeral: true
          });
        } catch (error) {
          return interaction.reply({
            embeds: [
              createEmbed({
                title: '❌ Error',
                description: `An error occurred while updating the pony: ${error.message}`,
                color: 0xED4245
              })
            ],
            ephemeral: true
          });
        }
      }
      


      /*
      if (customId.startsWith('guess_pony_')) {
        const { handleModal } = await import('../commands/economy/adventure.js');
        if (handleModal) {
          await handleModal(interaction);
          return;
        }
      }
      */
    } catch (error) {
      console.error(`Error handling modal submission: ${error.message}`);
      console.error(`Stack trace:`, error.stack);
      
      await interaction.reply({ 
        embeds: [errorEmbed(await errors.COMMAND_ERROR(interaction.guild?.id))],
        ephemeral: true 
      }).catch(e => console.error('Failed to send error message:', e));
    }
  }
};


async function handleFamilyButton(interaction) {
  try {
    const loadingContainer = new ContainerBuilder();
    const loadingText = new TextDisplayBuilder()
      .setContent('<a:loading_line:1416130253428097135> **Loading family profile...**');
    loadingContainer.addTextDisplayComponents(loadingText);

    await interaction.update({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    const userId = interaction.customId.split('_')[1];
    

    if (interaction.user.id !== userId) {
      const errorContainer = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('**❌ Access Denied**\n\nYou can only view your own family!');
      errorContainer.addTextDisplayComponents(errorText);
      
      return interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }


    const marriage = await getMarriageByUser(userId);
    const adoptionAsChild = await getAdoptionByChild(userId);
    

    let adoptedChildren = [];
    if (marriage) {
      try {
        adoptedChildren = await getChildrenByParents(userId, marriage.partner_id);
        console.log('Adopted children found:', adoptedChildren);
      } catch (error) {
        console.error('Error fetching adopted children:', error);
      }
    }

    console.log('Family data:', { marriage: !!marriage, adoptionAsChild: !!adoptionAsChild, adoptedChildren: adoptedChildren.length });

    if (!marriage && !adoptionAsChild && adoptedChildren.length === 0) {
      const noFamilyContainer = new ContainerBuilder();
      const noFamilyText = new TextDisplayBuilder()
        .setContent('**👥 No Family Members**\n\nYou don\'t have any family members yet! You can get married or adopt ponies to build your family.');
      noFamilyContainer.addTextDisplayComponents(noFamilyText);
      
      return interaction.editReply({
        components: [noFamilyContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }


    let marriageData = null;
    let adoptionData = null;


    if (marriage) {
      let partnerName = 'Unknown User';
      let partnerAvatar = null;
      
      try {

        const partnerUser = await interaction.client.users.fetch(marriage.partner_id);
        partnerName = partnerUser.username;
        partnerAvatar = partnerUser.displayAvatarURL({ format: 'png', size: 512 });
      } catch (error) {
        console.error('Error fetching partner user:', error);
      }


      let marriageTimeText = 'Unknown date';
      if (marriage.married_at) {
        try {
          const marriedAt = new Date(marriage.married_at);
          const now = new Date();
          const diffMs = now - marriedAt;
          
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
          
          if (days > 0) {
            marriageTimeText = `${days} days together`;
          } else if (hours > 0) {
            marriageTimeText = `${hours} hours together`;
          } else {
            marriageTimeText = `${minutes} minutes together`;
          }
        } catch (error) {
          console.error('Error calculating marriage time:', error);
        }
      }

      marriageData = {
        partnerName,
        partnerAvatar,
        marriageTime: marriageTimeText
      };
    }


    if (adoptionAsChild) {
      let childName = 'Unknown User';
      let childAvatar = null;
      
      try {
        const childUser = await interaction.client.users.fetch(adoptionAsChild.child_id);
        childName = childUser.username;
        childAvatar = childUser.displayAvatarURL({ format: 'png', size: 512 });
      } catch (error) {
        console.error('Error fetching child user:', error);
      }

      adoptionData = {
        childName,
        childAvatar,
        role: adoptionAsChild.role || 'child'
      };
    }


    if (!adoptionData && adoptedChildren.length > 0) {

      const firstChild = adoptedChildren[0];
      let childName = 'Unknown User';
      let childAvatar = null;
      
      try {
        const childUser = await interaction.client.users.fetch(firstChild.child_id);
        childName = childUser.username;
        childAvatar = childUser.displayAvatarURL({ format: 'png', size: 512 });
      } catch (error) {
        console.error('Error fetching adopted child user:', error);
      }

      adoptionData = {
        childName,
        childAvatar,
        role: firstChild.role || 'child'
      };
    }


    const { generateFamilyProfile } = await import('../commands/economy/profile.js');
    const familyCanvas = await generateFamilyProfile(interaction.user, marriageData, adoptionData);
    
    const familyBuffer = familyCanvas.toBuffer('image/png');
    const familyAttachment = new AttachmentBuilder(familyBuffer, { name: 'family.png' });


    const buttons = [];


    if (marriage) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`divorce_${marriage.partner_id}`)
          .setLabel('Divorce')
          .setStyle(ButtonStyle.Danger)
      );
    }


    if (adoptionAsChild) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`leave_family_${adoptionAsChild.parent1_id}_${adoptionAsChild.parent2_id}`)
          .setLabel('Leave Family')
          .setStyle(ButtonStyle.Danger)
      );
    }


    if (adoptedChildren.length > 0) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`abandon_adoption_${adoptedChildren[0].child_id}`)
          .setLabel('Abandon Adoption')
          .setStyle(ButtonStyle.Danger)
      );
    }


    const components = buttons.length > 0 ? [new ActionRowBuilder().addComponents(buttons)] : [];

    const familyContainer = new ContainerBuilder();
    
    const familyMedia = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL('attachment://family.png')
      );
    familyContainer.addMediaGalleryComponents(familyMedia);
    
    if (components.length > 0) {
      familyContainer.addActionRowComponents(...components);
    }

    await interaction.editReply({
      components: [familyContainer],
      files: [familyAttachment],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (error) {
    console.error('Error in handleFamilyButton:', error);
    
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('**❌ Error Loading Family**\n\nAn error occurred while loading your family. Please try again later.');
    errorContainer.addTextDisplayComponents(errorText);
    
    await interaction.editReply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}


async function handleFamilyAction(interaction) {
  try {
    const { customId } = interaction;

    if (customId.startsWith('divorce_')) {
      const partnerId = customId.split('_')[1];
      

      const children = await getChildrenByParents(interaction.user.id, partnerId);
      if (children && children.length > 0) {
        const errorText = new TextDisplayBuilder()
          .setContent('**❌ Cannot Divorce**\n\nYou cannot divorce while you have adopted children. Please abandon the adoption first.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        return interaction.update({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
          files: []
        });
      }


      await deleteMarriage(interaction.user.id, partnerId);

      const successText = new TextDisplayBuilder()
        .setContent('**💔 Divorced**\n\nYou have divorced. Your marriage has been ended.');
      
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(successText);

      await interaction.update({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        files: []
      });

    } else if (customId.startsWith('abandon_adoption_')) {
      const childId = customId.split('_')[2];


      const marriage = await getMarriageByUser(interaction.user.id);
      if (!marriage) {
        const errorText = new TextDisplayBuilder()
          .setContent('**❌ Error**\n\nMarriage not found.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        return interaction.update({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2,
          files: []
        });
      }


      await deleteAdoption(interaction.user.id, marriage.partner_id, childId);

      const successText = new TextDisplayBuilder()
        .setContent('**✅ Adoption Abandoned**\n\nYou have abandoned the adoption. The child is no longer part of your family.');
      
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(successText);

      await interaction.update({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        files: []
      });

    } else if (customId.startsWith('leave_family_')) {
      const parts = customId.split('_');
      const parent1Id = parts[2];
      const parent2Id = parts[3];


      await deleteAdoption(parent1Id, parent2Id, interaction.user.id);

      const successText = new TextDisplayBuilder()
        .setContent('**✅ Left Family**\n\nYou have left your family. You are no longer their adopted child.');
      
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(successText);

      await interaction.update({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2,
        files: []
      });
    }

  } catch (error) {
    console.error('Error in handleFamilyAction:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('**❌ Error**\n\nAn error occurred while processing your family action.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.update({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2,
      files: []
    });
  }
}


async function handleBackToProfile(interaction) {
  try {
    const userId = interaction.customId.split('_')[3];
    

    if (interaction.user.id !== userId) {
      return interaction.update({
        content: 'You can only view your own profile!',
        embeds: [],
        components: []
      });
    }


    const cacheKey = `${userId}_${interaction.guild.id}`;
    if (global.profileCache && global.profileCache.has(cacheKey)) {
      const cached = global.profileCache.get(cacheKey);
      

      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        const attachment = new AttachmentBuilder(cached.buffer, { name: 'profile.png' });
        
        return interaction.update({
          content: null,
          embeds: [],
          files: [attachment],
          components: cached.components
        });
      } else {

        global.profileCache.delete(cacheKey);
      }
    }


    const { createCanvas, loadImage } = await import('canvas');
    const path = await import('path');
    const fs = await import('fs');
    
    const UserModel = (await import('../models/UserModel.js')).default;
    const MarriageModel = (await import('../models/MarriageModel.js')).default;
    const AdoptionModel = (await import('../models/AdoptionModel.js')).default;


    const targetUser = await interaction.client.users.fetch(userId);
    let userRecord = await UserModel.getUserById(targetUser.id);
    
    if (!userRecord) {
      userRecord = await UserModel.createUser(targetUser.id, interaction.guild.id, targetUser.username);
    }


    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');


    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    let avatar;
    try {
      avatar = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
    } catch (error) {
      console.error('Error loading avatar:', error);
      avatar = null;
    }

    if (avatar) {

      ctx.save();
      ctx.beginPath();
      ctx.arc(150, 150, 80, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 70, 70, 160, 160);
      ctx.restore();
    }


    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });

    await interaction.update({
      content: null,
      embeds: [],
      files: [attachment],
      components: []
    });

  } catch (error) {
    console.error('Error in handleBackToProfile:', error);
    
    try {
      await interaction.update({
        content: 'An error occurred while loading your profile.',
        embeds: [],
        components: []
      });
    } catch (updateError) {
      if (updateError.code === 10062) {

        console.log('Interaction expired while trying to go back to profile');
      } else {
        console.error('Failed to update interaction:', updateError);
      }
    }
  }
}


async function handleClanInviteButtons(interaction) {
  try {
    const { customId } = interaction;
    const [action, type, actionType, clanId, userId] = customId.split('_');
    

    if (interaction.user.id !== userId) {
      return await interaction.reply({
        embeds: [createEmbed({
          title: '❌ Access Denied',
          description: 'This invitation is not for you!',
          color: 0xFF0000
        })],
        ephemeral: true
      });
    }

    const { getClanById, addClanMember, updateMemberCount, isUserInTargetGuild } = await import('../models/ClanModel.js');
    
    if (actionType === 'accept') {

      const clan = await getClanById(parseInt(clanId));
      if (!clan) {
        return await interaction.update({
          embeds: [createEmbed({
            title: '❌ Clan Not Found',
            description: 'This clan no longer exists.',
            color: 0xFF0000
          })],
          components: []
        });
      }


      const TARGET_GUILD_ID = '1369338076178026596';
      
      


      await addClanMember(parseInt(clanId), userId, 'member');
      

      

      await updateMemberCount(parseInt(clanId), clan.member_count + 1);

      await interaction.update({
        embeds: [createEmbed({
          title: '✅ Invitation Accepted',
          description: `You have successfully joined clan **${clan.name}**!\n\nWelcome to the clan! 🎉`,
          color: 0x00FF00
        })],
        components: []
      });

    } else if (actionType === 'decline') {

      await interaction.update({
        embeds: [createEmbed({
          title: '❌ Invitation Declined',
          description: 'You have declined the clan invitation.',
          color: 0xFF0000
        })],
        components: []
      });
    }

  } catch (error) {
    console.error('Error handling clan invite buttons:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while processing your response.',
        color: 0xFF0000
      })],
      ephemeral: true
    });
  }
} 
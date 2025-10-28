import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags
} from 'discord.js';
import { getPony } from '../../utils/pony/index.js';
import { 
  getFriendRequest, 
  createFriendRequest, 
  getFriendsCount,
  updateFriendRequest
} from '../../models/FriendsModel.js';

const MAX_FRIENDS = 3;
const CONFIRMATION_TIMEOUT = 15000;
const DM_REQUEST_TIMEOUT = 60000; 

const confirmationTimeouts = new Map();
const dmRequestTimeouts = new Map(); 

function createErrorContainer(message) {
  const container = new ContainerBuilder();
  
  const errorText = new TextDisplayBuilder()
    .setContent(`**❌ Error**\n-# ${message}`);
  container.addTextDisplayComponents(errorText);
  
  return container;
}

function createConfirmationContainer(targetUser, userId) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`**🤝 Friend Request Confirmation**`);
  container.addTextDisplayComponents(titleText);
  
  const questionText = new TextDisplayBuilder()
    .setContent(`Are you sure you want to add **${targetUser.username}** as a friend?`);
  container.addTextDisplayComponents(questionText);
  
  const separator1 = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);
  container.addSeparatorComponents(separator1);
  
  const benefitsText = new TextDisplayBuilder()
    .setContent(`**Friend Benefits:**\n• You can give and take bits from each other without confirmation\n• You can transfer items to each other (except diamonds, harmony, and magic coins)`);
  container.addTextDisplayComponents(benefitsText);
  
  const separator2 = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);
  container.addSeparatorComponents(separator2);
  
  const warningText = new TextDisplayBuilder()
    .setContent(`**⚠️ Warning:**\nDo not add users as friends if you don't trust them. They can scam you and take all your resources without your knowledge. Only add friends you trust for convenient item trading.`);
  container.addTextDisplayComponents(warningText);
  
  const confirmButton = new ButtonBuilder()
    .setCustomId(`friend_confirm_${userId}_${targetUser.id}`)
    .setLabel('Confirm')
    .setEmoji('<:like:1422566402308575402>')
    .setStyle(ButtonStyle.Success);
    
  const cancelButton = new ButtonBuilder()
    .setCustomId(`friend_cancel_${userId}_${targetUser.id}`)
    .setLabel('Cancel')
    .setEmoji('<:dislike:1422566400433717259>')
    .setStyle(ButtonStyle.Danger);
  
  const actionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
  container.addActionRowComponents(actionRow);
  
  return container;
}

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const targetUser = interaction.options.getUser('user');
    const targetId = targetUser.id;

    const userPony = await getPony(userId);
    if (!userPony) {
      const noPonyContainer = createErrorContainer('You need to create a pony first with `/equestria`!');
      return await interaction.reply({
        content: '',
        components: [noPonyContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    const targetPony = await getPony(targetId);
    if (!targetPony) {
      const noTargetPonyContainer = createErrorContainer(`${targetUser.username} needs to create a pony first with \`/equestria\`!`);
      return await interaction.reply({
        content: '',
        components: [noTargetPonyContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    if (userId === targetId) {
      const selfAddContainer = createErrorContainer('You cannot add yourself as a friend!');
      return await interaction.reply({
        content: '',
        components: [selfAddContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const userFriendsCount = await getFriendsCount(userId);
    if (userFriendsCount >= MAX_FRIENDS) {
      const maxFriendsContainer = createErrorContainer(`You have reached the maximum number of friends (${MAX_FRIENDS}). Remove a friend first.`);
      return await interaction.reply({
        content: '',
        components: [maxFriendsContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    const targetFriendsCount = await getFriendsCount(targetId);
    if (targetFriendsCount >= MAX_FRIENDS) {
      const targetMaxFriendsContainer = createErrorContainer(`${targetUser.username} has reached the maximum number of friends (${MAX_FRIENDS}).`);
      return await interaction.reply({
        content: '',
        components: [targetMaxFriendsContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    const existingRequest = await getFriendRequest(userId, targetId);
    if (existingRequest) {
      let message = '';
      switch (existingRequest.status) {
        case 'accepted':
          message = `You are already friends with ${targetUser.username}!`;
          break;
        case 'pending':
          if (existingRequest.requester_id === userId) {
            message = `You already sent a friend request to ${targetUser.username}!`;
          } else {
            message = `${targetUser.username} already sent you a friend request!`;
          }
          break;
        case 'declined':
          message = `Your friend request to ${targetUser.username} was declined.`;
          break;
      }
      
      const existingContainer = createErrorContainer(message);
      return await interaction.reply({
        content: '',
        components: [existingContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    const confirmationContainer = createConfirmationContainer(targetUser, userId);
    
    const response = await interaction.reply({
      content: '',
      components: [confirmationContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });

    const timeoutKey = `${userId}_${targetId}`;
    
    const timeoutId = setTimeout(async () => {
      try {
        const timeoutContainer = new ContainerBuilder();
        const timeoutText = new TextDisplayBuilder()
          .setContent(`~~**🤝 Friend Request Confirmation**~~\n\n**⏰ Confirmation timeout**\nYou took too long to respond. Please try again.`);
        timeoutContainer.addTextDisplayComponents(timeoutText);
        
        await interaction.editReply({
          content: '',
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2
        });
        
        confirmationTimeouts.delete(timeoutKey);
      } catch (error) {
        console.debug('Timeout edit error:', error);
      }
    }, CONFIRMATION_TIMEOUT);
    
    confirmationTimeouts.set(timeoutKey, timeoutId);
    
  } catch (error) {
    console.error('Error in friend add:', error);
    
    const errorContainer = createErrorContainer('Failed to process friend request. Please try again later.');
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '',
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    } else {
      await interaction.editReply({
        content: '',
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
}

export async function handleFriendButton(interaction) {
  try {
    const customId = interaction.customId;
    const parts = customId.split('_');
    const action = parts[1]; 
    const requesterId = parts[2];
    const targetId = parts[3];

    if ((action === 'confirm' || action === 'cancel') && interaction.user.id !== requesterId) {
      return await interaction.reply({
        content: 'You can only respond to your own friend request confirmation.',
        ephemeral: true
      });
    }
    
    if ((action === 'accept' || action === 'decline') && interaction.user.id !== targetId) {
      return await interaction.reply({
        content: 'You can only respond to friend requests sent to you.',
        ephemeral: true
      });
    }
    
    await interaction.deferUpdate();
    
    if (action === 'cancel') {
      const timeoutKey = `${requesterId}_${targetId}`;
      const timeoutId = confirmationTimeouts.get(timeoutKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
        confirmationTimeouts.delete(timeoutKey);
      }
      
      const cancelContainer = new ContainerBuilder();
      const cancelText = new TextDisplayBuilder()
        .setContent(`~~**🤝 Friend Request Confirmation**~~\n\n**❌ Cancelled**\nFriend request cancelled.`);
      cancelContainer.addTextDisplayComponents(cancelText);
      
      await interaction.editReply({
        content: '',
        components: [cancelContainer],
        flags: MessageFlags.IsComponentsV2
      });
      
      return true;
    }
    
    if (action === 'confirm') {
      const timeoutKey = `${requesterId}_${targetId}`;
      const timeoutId = confirmationTimeouts.get(timeoutKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
        confirmationTimeouts.delete(timeoutKey);
      }
      
      const success = await createFriendRequest(requesterId, targetId);
      
      if (!success) {
        const errorContainer = createErrorContainer('Failed to send friend request. Please try again.');
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }

      const sentContainer = new ContainerBuilder();
      const sentText = new TextDisplayBuilder()
        .setContent(`**✅ Friend Request Sent**\nYour friend request has been sent to <@${targetId}>. They will receive a notification to accept or decline.`);
      sentContainer.addTextDisplayComponents(sentText);
      
      await interaction.editReply({
        content: '',
        components: [sentContainer],
        flags: MessageFlags.IsComponentsV2
      });
      
      try {
        const requesterUser = await interaction.client.users.fetch(requesterId);
        const targetUser = await interaction.client.users.fetch(targetId);
        
        const requestContainer = new ContainerBuilder();
        const requestText = new TextDisplayBuilder()
          .setContent(`**🤝 Friend Request**\n**${requesterUser.username}** wants to add you as a friend!`);
        requestContainer.addTextDisplayComponents(requestText);
        
        const acceptButton = new ButtonBuilder()
          .setCustomId(`friend_accept_${requesterId}_${targetId}`)
          .setLabel('Accept')
          .setEmoji('<:like:1422566402308575402>')
          .setStyle(ButtonStyle.Success);
          
        const declineButton = new ButtonBuilder()
          .setCustomId(`friend_decline_${requesterId}_${targetId}`)
          .setLabel('Decline')
          .setEmoji('<:dislike:1422566400433717259>')
          .setStyle(ButtonStyle.Danger);
        
        const requestActionRow = new ActionRowBuilder().addComponents(acceptButton, declineButton);
        requestContainer.addActionRowComponents(requestActionRow);

        let dmMessage = null;
        try {
          dmMessage = await targetUser.send({
            content: '',
            components: [requestContainer],
            flags: MessageFlags.IsComponentsV2
          });
        } catch (dmError) {
          dmMessage = await interaction.followUp({
            content: `<@${targetId}>`,
            components: [requestContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        

        if (dmMessage) {
          const dmTimeoutKey = `${requesterId}_${targetId}_dm`;
          const dmTimeoutId = setTimeout(async () => {
            try {
              const timeoutContainer = new ContainerBuilder();
              const timeoutText = new TextDisplayBuilder()
                .setContent(`~~**🤝 Friend Request**~~\n~~**${requesterUser.username}** wants to add you as a friend!~~\n\n**⏰ Request expired**\nThis friend request has timed out.`);
              timeoutContainer.addTextDisplayComponents(timeoutText);
              
              await dmMessage.edit({
                content: dmMessage.content,
                components: [timeoutContainer],
                flags: MessageFlags.IsComponentsV2
              });
              
              dmRequestTimeouts.delete(dmTimeoutKey);
            } catch (error) {
              console.debug('DM timeout edit error:', error);
            }
          }, DM_REQUEST_TIMEOUT);

          dmRequestTimeouts.set(dmTimeoutKey, { timeoutId, message: dmMessage });
        }
        
      } catch (notifyError) {
        console.error('Error notifying target user:', notifyError);
      }
      
      return true;
    }
    
    if (action === 'accept') {
      const dmTimeoutKey = `${requesterId}_${targetId}_dm`;
      const dmTimeout = dmRequestTimeouts.get(dmTimeoutKey);
      if (dmTimeout) {
        clearTimeout(dmTimeout.timeoutId);
        dmRequestTimeouts.delete(dmTimeoutKey);
      }
      
      console.log(`Attempting to accept friend request from ${requesterId} to ${targetId}`);
      const success = await updateFriendRequest(requesterId, targetId, 'accepted');
      console.log(`Friend request accept result: ${success}`);
      
      if (!success) {
        const errorContainer = createErrorContainer('Failed to accept friend request. Please try again.');
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }
      
      const acceptedContainer = new ContainerBuilder();
      const acceptedText = new TextDisplayBuilder()
        .setContent(`**✅ Friend Request Accepted**\nYou are now friends! You can exchange items and bits without confirmation.`);
      acceptedContainer.addTextDisplayComponents(acceptedText);
      
      await interaction.editReply({
        content: '',
        components: [acceptedContainer],
        flags: MessageFlags.IsComponentsV2
      });
      

      try {
        const requesterUser = await interaction.client.users.fetch(requesterId);
        const targetUser = await interaction.client.users.fetch(targetId);
        
        const notifyContainer = new ContainerBuilder();
        const notifyText = new TextDisplayBuilder()
          .setContent(`**🎉 Friend Request Accepted**\n**${targetUser.username}** accepted your friend request! You are now friends.`);
        notifyContainer.addTextDisplayComponents(notifyText);
        
        try {
          await requesterUser.send({
            content: '',
            components: [notifyContainer],
            flags: MessageFlags.IsComponentsV2
          });
        } catch (dmError) {
          console.debug('Could not send DM notification to requester');
        }
        
      } catch (notifyError) {
        console.error('Error notifying requester:', notifyError);
      }
      
      return true;
    }
    
    if (action === 'decline') {
      const dmTimeoutKey = `${requesterId}_${targetId}_dm`;
      const dmTimeout = dmRequestTimeouts.get(dmTimeoutKey);
      if (dmTimeout) {
        clearTimeout(dmTimeout.timeoutId);
        dmRequestTimeouts.delete(dmTimeoutKey);
      }
      
      console.log(`Attempting to decline friend request from ${requesterId} to ${targetId}`);
      const success = await updateFriendRequest(requesterId, targetId, 'declined');
      console.log(`Friend request decline result: ${success}`);
      
      if (!success) {
        const errorContainer = createErrorContainer('Failed to decline friend request. Please try again.');
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }
      
      const declinedContainer = new ContainerBuilder();
      const declinedText = new TextDisplayBuilder()
        .setContent(`~~**🤝 Friend Request**~~\n\n**❌ Declined**\nYou declined the friend request.`);
      declinedContainer.addTextDisplayComponents(declinedText);
      
      await interaction.editReply({
        content: '',
        components: [declinedContainer],
        flags: MessageFlags.IsComponentsV2
      });
      
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error handling friend button:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Failed to handle friend request. Please try again.',
        ephemeral: true
      });
    }
    
    return false;
  }
}
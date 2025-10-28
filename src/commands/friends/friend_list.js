import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  SeparatorBuilder, 
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} from 'discord.js';
import { getPony } from '../../utils/pony/index.js';
import { getUserFriends, removeFriend } from '../../models/FriendsModel.js';

function createErrorContainer(message) {
  const container = new ContainerBuilder();
  
  const errorText = new TextDisplayBuilder()
    .setContent(`**❌ Error**\n-# ${message}`);
  container.addTextDisplayComponents(errorText);
  
  return container;
}

export async function execute(interaction) {
  try {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    
    const pony = await getPony(userId);
    if (!pony) {
      const noPonyContainer = createErrorContainer('You need to create a pony first with `/equestria`!');
      return await interaction.editReply({
        content: '',
        components: [noPonyContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    const friends = await getUserFriends(userId);
    
    if (friends.length === 0) {
      const noFriendsContainer = new ContainerBuilder();
      
      const titleText = new TextDisplayBuilder()
        .setContent(`**Friends List**\n-# You have no friends yet`);
      noFriendsContainer.addTextDisplayComponents(titleText);
      
      const descText = new TextDisplayBuilder()
        .setContent(`Use \`/friend add\` to send friend requests!`);
      noFriendsContainer.addTextDisplayComponents(descText);
      
      const noFriendsGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('https://i.imgur.com/XLONdT9.png')
        );
      noFriendsContainer.addMediaGalleryComponents(noFriendsGallery);
      
      return await interaction.editReply({
        content: '',
        components: [noFriendsContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    await displayFriendPage(interaction, userId, 0, friends);
    
  } catch (error) {
    console.error('Error in friends list:', error);
    
    const errorContainer = createErrorContainer('Failed to load friends list. Please try again later.');
    
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

async function displayFriendPage(interaction, userId, currentIndex, friends) {
  try {
    const currentFriend = friends[currentIndex];

    const friendId = currentFriend.user_id === userId ? currentFriend.friend_id : currentFriend.user_id;
    
    const friendUser = await interaction.client.users.fetch(friendId);
    
    const friendshipDate = new Date(currentFriend.created_at);
    const formattedDate = friendshipDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let headerText = `**Friends List**\n-# Page ${currentIndex + 1}/${friends.length}\n\n`;
    
    const container = new ContainerBuilder();
    
    const headerTextDisplay = new TextDisplayBuilder()
      .setContent(headerText);
    container.addTextDisplayComponents(headerTextDisplay);
    
    const separator1 = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);
    container.addSeparatorComponents(separator1);
    
    const friendNameText = new TextDisplayBuilder()
      .setContent(`**${friendUser.username}**`);
    container.addTextDisplayComponents(friendNameText);
    
    const friendInfoText = new TextDisplayBuilder()
      .setContent(`**User ID:** ${friendId}\n**Friends since:** ${formattedDate}`);
    container.addTextDisplayComponents(friendInfoText);
    
    const avatarUrl = friendUser.displayAvatarURL({ format: 'png', size: 256 });
    const friendGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL(avatarUrl)
      );
    container.addMediaGalleryComponents(friendGallery);
    
    const benefitsText = new TextDisplayBuilder()
      .setContent(`**Friend Benefits:**\n• Can exchange bits without confirmation\n• Can transfer items (except diamonds, harmony, magic coins)`);
    container.addTextDisplayComponents(benefitsText);
    
    const buttons = [];
    
    const prevButton = new ButtonBuilder()
      .setCustomId(`friend_prev_${userId}_${currentIndex}`)
      .setEmoji('<:previous:1422550660401860738>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex <= 0);
    buttons.push(prevButton);
    
    const removeButton = new ButtonBuilder()
      .setCustomId(`friend_remove_${userId}_${friendId}_${currentIndex}`)
      .setLabel('Remove Friend')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger);
    buttons.push(removeButton);
    
    const nextButton = new ButtonBuilder()
      .setCustomId(`friend_next_${userId}_${currentIndex}`)
      .setEmoji('<:next:1422550658846031953>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentIndex >= friends.length - 1);
    buttons.push(nextButton);
    
    const actionRow = new ActionRowBuilder().addComponents(buttons);
    container.addActionRowComponents(actionRow);
    
    await interaction.editReply({
      content: '',
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
    
  } catch (error) {
    console.error('Error displaying friend page:', error);
    
    const errorContainer = createErrorContainer('Failed to display friend. Please try again later.');
    await interaction.editReply({
      content: '',
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

export async function handleFriendListButton(interaction) {
  try {
    const customId = interaction.customId;
    const parts = customId.split('_');
    const action = parts[1]; 
    
    let userId, currentIndex, friendId;
    
    if (action === 'prev' || action === 'next') {
      userId = parts[2];
      currentIndex = parseInt(parts[3]) || 0;
    } else if (action === 'remove' && parts[2] !== 'confirm' && parts[2] !== 'cancel') {
      userId = parts[2];
      friendId = parts[3];
      currentIndex = parseInt(parts[4]) || 0;
    } else if (action === 'remove' && parts[2] === 'confirm') {
      userId = parts[3];
      friendId = parts[4];
      currentIndex = parseInt(parts[5]) || 0;
    } else if (action === 'remove' && parts[2] === 'cancel') {
      userId = parts[3];
      currentIndex = parseInt(parts[4]) || 0;
    }
    
    if (interaction.user.id !== userId) {
      const accessDeniedContainer = createErrorContainer('You can only use your own friends list buttons.');
      return await interaction.reply({
        content: '',
        components: [accessDeniedContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    await interaction.deferUpdate();
    
    const friends = await getUserFriends(userId);
    
    if (action === 'prev') {
      const newIndex = Math.max(0, currentIndex - 1);
      await displayFriendPage(interaction, userId, newIndex, friends);
    } else if (action === 'next') {
      const newIndex = Math.min(friends.length - 1, currentIndex + 1);
      await displayFriendPage(interaction, userId, newIndex, friends);
    } else if (action === 'remove' && parts[2] !== 'confirm' && parts[2] !== 'cancel') {
      const confirmContainer = new ContainerBuilder();
      const confirmText = new TextDisplayBuilder()
        .setContent(`**🗑️ Remove Friend**\nAre you sure you want to remove this friend? This action cannot be undone.`);
      confirmContainer.addTextDisplayComponents(confirmText);
      
      const confirmButton = new ButtonBuilder()
        .setCustomId(`friend_remove_confirm_${userId}_${friendId}_${currentIndex}`)
        .setLabel('Confirm Remove')
        .setEmoji('<:like:1422566402308575402>')
        .setStyle(ButtonStyle.Danger);
        
      const cancelButton = new ButtonBuilder()
        .setCustomId(`friend_remove_cancel_${userId}_${currentIndex}`)
        .setLabel('Cancel')
        .setEmoji('<:dislike:1422566400433717259>')
        .setStyle(ButtonStyle.Secondary);
      
      const confirmActionRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
      confirmContainer.addActionRowComponents(confirmActionRow);
      
      await interaction.editReply({
        content: '',
        components: [confirmContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } else if (action === 'remove' && parts[2] === 'confirm') {
      const success = await removeFriend(userId, friendId);
      
      if (!success) {
        const errorContainer = createErrorContainer('Failed to remove friend. Please try again.');
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }
      
      const updatedFriends = await getUserFriends(userId);
      
      if (updatedFriends.length === 0) {
        const noFriendsContainer = new ContainerBuilder();
        
        const titleText = new TextDisplayBuilder()
          .setContent(`**Friends List**\n-# You have no friends yet`);
        noFriendsContainer.addTextDisplayComponents(titleText);
        
        const descText = new TextDisplayBuilder()
          .setContent(`Use \`/friend add\` to send friend requests!`);
        noFriendsContainer.addTextDisplayComponents(descText);
        
        const noFriendsGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL('https://i.imgur.com/XLONdT9.png')
          );
        noFriendsContainer.addMediaGalleryComponents(noFriendsGallery);
        
        await interaction.editReply({
          content: '',
          components: [noFriendsContainer],
          flags: MessageFlags.IsComponentsV2
        });
        return true;
      }
      
      const newIndex = Math.min(currentIndex, updatedFriends.length - 1);
      await displayFriendPage(interaction, userId, newIndex, updatedFriends);
      
    } else if (action === 'remove' && parts[2] === 'cancel') {
      const friends = await getUserFriends(userId);
      await displayFriendPage(interaction, userId, currentIndex, friends);
    }
    
    return true;
  } catch (error) {
    console.error('Error handling friend list button:', error);
    
    const errorContainer = createErrorContainer('Failed to handle button interaction. Please try again.');
    
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
    
    return false;
  }
}
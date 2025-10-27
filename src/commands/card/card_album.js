import { 
  SlashCommandBuilder, 
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUserCards as getUserCardsFromCardModel } from '../../models/CardModel.js';
import { getUserCards as getUserCardsFromCardsModel, getUserFavoriteCard, setUserFavoriteCard } from '../../models/CardsModel.js';
import { getUserById } from '../../models/UserModel.js';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getAvailableCards() {
  try {
    const cardsDir = path.join(__dirname, '..', '..', 'public', 'cards');
    const files = await readdir(cardsDir);
    const cardFiles = files.filter(f => f.endsWith('.png') && !f.startsWith('albom'));
    
    return cardFiles.map(file => ({
      name: file.replace('.png', '').replace(/_/g, ' '),
      fileName: file
    }));
  } catch (error) {
    console.error('Error reading cards directory:', error);
    return [
      { name: 'Rainbow Dash', fileName: 'Rainbow Dash.png' },
      { name: 'Scootaloo', fileName: 'Scootaloo.png' },
      { name: 'Twilight Sparkle', fileName: 'Twilight Sparkle.png' },
      { name: 'Lightning Dust', fileName: 'Lightning Dust.png' },
      { name: 'Songbird Serenade', fileName: 'Songbird Serenade.png' },
      { name: 'Trixie', fileName: 'Trixie.png' }
    ];
  }
}

const CARD_EMOJIS = {
  'Rainbow Dash.png': '<:RainbowDashCard:1431342012602388590>',
  'Scootaloo.png': '<:ScootalooCard:1431342025315319818>',
  'Twilight Sparkle.png': '<:TwilightSparkleCard:1431342035834634360>',
  'Lightning Dust.png': '<:LightningDustCard:1431350072280350831>',
  'Songbird Serenade.png': '<:SongbirdSerenadeCard:1431366337187418162>',
  'Trixie.png': '<:TrixieCard:1431371120497393694>'
};

const ALBUM_CACHE_EXPIRY = 2 * 60 * 1000;
if (!global.albumCache) {
  global.albumCache = new Map();
}

function cleanupAlbumCache() {
  if (!global.albumCache) return;
  
  const now = Date.now();
  for (const [key, data] of global.albumCache.entries()) {
    if (now - data.timestamp > ALBUM_CACHE_EXPIRY) {
      global.albumCache.delete(key);
    }
  }
}

setInterval(cleanupAlbumCache, 5 * 60 * 1000);

// Command data exported from card.js
// This file only contains the execute function for the album subcommand

async function createAlbumImage(userCards, username, favoriteCard, page = 0) {
  const canvas = createCanvas(1280, 716);
  const ctx = canvas.getContext('2d');

  const backgroundPath = path.join(__dirname, '../../public/cards/albom/albom1.png');
  const background = await loadImage(backgroundPath);
  ctx.drawImage(background, 0, 0, 1280, 716);

  const smallCardPositions = [
    { x: 30, y: 30 },
    { x: 215, y: 30 },
    { x: 400, y: 30 },
    { x: 30, y: 255 },
    { x: 215, y: 255 },
    { x: 400, y: 255 },
    { x: 30, y: 480 },
    { x: 215, y: 480 },
    { x: 400, y: 480 }
  ];

  const favoriteCardPosition = { x: 800, y: 65 };

  const smallCardWidth = 160;
  const smallCardHeight = 220;
  const favoriteCardWidth = 420;
  const favoriteCardHeight = 585;

  const cardsPerPage = 9;
  const startIndex = page * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  const displayCards = userCards.slice(startIndex, endIndex);

  for (let i = 0; i < smallCardPositions.length; i++) {
    const position = smallCardPositions[i];
    
    if (i < displayCards.length) {
      try {
        const cardPath = path.join(__dirname, `../../public/cards/${displayCards[i].card_name}`);
        const cardImage = await loadImage(cardPath);
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        ctx.drawImage(cardImage, position.x, position.y, smallCardWidth, smallCardHeight);
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
      } catch (error) {
        console.error(`Error loading card image ${displayCards[i].card_name}:`, error);
        drawCardPlaceholder(ctx, position.x, position.y, smallCardWidth, smallCardHeight, 'Missing');
      }
    } else {
      drawCardPlaceholder(ctx, position.x, position.y, smallCardWidth, smallCardHeight, 'Empty');
    }
  }

  if (favoriteCard) {
    try {
      const favoriteCardPath = path.join(__dirname, `../../public/cards/${favoriteCard}`);
      const favoriteCardImage = await loadImage(favoriteCardPath);
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 8;
      
      ctx.drawImage(favoriteCardImage, favoriteCardPosition.x, favoriteCardPosition.y, favoriteCardWidth, favoriteCardHeight);
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
    } catch (error) {
      console.error(`Error loading favorite card image ${favoriteCard}:`, error);
      drawCardPlaceholder(ctx, favoriteCardPosition.x, favoriteCardPosition.y, favoriteCardWidth, favoriteCardHeight, 'Set Favorite');
    }
  } else {
    drawCardPlaceholder(ctx, favoriteCardPosition.x, favoriteCardPosition.y, favoriteCardWidth, favoriteCardHeight, 'Set Favorite');
  }

  return canvas.toBuffer();
}

function drawCardPlaceholder(ctx, x, y, width, height, type) {
  if (type === 'Empty') {
    ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
  } else {
    ctx.fillStyle = 'rgba(150, 50, 50, 0.5)';
  }
  
  ctx.fillRect(x, y, width, height);
  
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  
}

export async function execute(interaction) {
  if (interaction.options.getSubcommand() !== 'album') {
    return;
  }
  
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userId = targetUser.id;

  try {
    const loadingContainer = new ContainerBuilder();
    const loadingText = new TextDisplayBuilder()
      .setContent('<a:loading_line:1416130253428097135> Loading album...');
    loadingContainer.addTextDisplayComponents(loadingText);

    await interaction.reply({
      content: '',
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    const userData = await getUserById(userId);
    if (!userData) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('User needs to register first! Use `/equestria` to get started.');
      container.addTextDisplayComponents(errorText);

      return interaction.editReply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const userCardsOld = await getUserCardsFromCardModel(userId);
    const userCardsNew = await getUserCardsFromCardsModel(userId);
    
    const userCards = userCardsNew.length > 0 ? userCardsNew : userCardsOld;
    
    const favoriteCard = await getUserFavoriteCard(userId);
    
    const uniqueCards = userCards.filter((card, index, self) => 
      index === self.findIndex(c => c.card_name === card.card_name)
    );
    const cacheKey = `album_${userId}_${JSON.stringify(uniqueCards.map(c => c.card_name).sort())}_fav_${favoriteCard || 'none'}`;
    
    let albumImageBuffer;
    
    const cached = global.albumCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ALBUM_CACHE_EXPIRY) {
      albumImageBuffer = cached.buffer;
    } else {
      albumImageBuffer = await createAlbumImage(uniqueCards, targetUser.username, favoriteCard);
      
      global.albumCache.set(cacheKey, {
        buffer: albumImageBuffer,
        timestamp: Date.now()
      });
    }

    const container = new ContainerBuilder();
    
    const mediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL('attachment://album.png')
      );
    container.addMediaGalleryComponents(mediaGallery);

    const availableCards = await getAvailableCards();
    
    const uniqueCount = uniqueCards.length;
    const totalAvailable = availableCards.length;
    
    const cardsPerPage = 9;
    const totalPages = Math.ceil(uniqueCards.length / cardsPerPage);
    const currentPage = 0;
    
    const rarityCount = {};
    uniqueCards.forEach(card => {
      rarityCount[card.rarity] = (rarityCount[card.rarity] || 0) + 1;
    });

    let collectionInfo = `**${targetUser.username}'s Card Album**\n\n`;
    collectionInfo += `**Unique Cards:** ${uniqueCount}/${totalAvailable}\n\n`;
    
    collectionInfo += `**Unique by Rarity:**\n`;
    collectionInfo += `Basic: ${rarityCount['Basic'] || 0}\n`;
    collectionInfo += `Rare: ${rarityCount['Rare'] || 0}\n`;
    collectionInfo += `Epic: ${rarityCount['Epic'] || 0}\n`;
    collectionInfo += `Legendary: ${rarityCount['Legendary'] || 0}\n`;
    collectionInfo += `Harmonious: ${rarityCount['Harmonious'] || 0}`;
    
    if (totalPages > 1) {
      collectionInfo += `\n\n**Page:** ${currentPage + 1}/${totalPages}`;
    }

    const infoText = new TextDisplayBuilder()
      .setContent(collectionInfo);
    container.addTextDisplayComponents(infoText);

    const buttons = [];
    
    const prevButton = new ButtonBuilder()
      .setCustomId(`album_prev_${userId}_${interaction.user.id}_${Math.max(0, currentPage - 1)}`)
      .setEmoji('<:previous:1422550660401860738>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0 || totalPages <= 1);
    
    buttons.push(prevButton);
    
    const collectionButton = new ButtonBuilder()
      .setCustomId(`view_collection_${userId}_${interaction.user.id}`)
      .setLabel('View Full Collection')
      .setStyle(ButtonStyle.Secondary);
    
    const setFavoriteButton = new ButtonBuilder()
      .setCustomId(`set_favorite_${userId}_${interaction.user.id}`)
      .setLabel('Set Favorite Card')
      .setStyle(ButtonStyle.Primary);
    
    const shopButton = new ButtonBuilder()
      .setCustomId(`card_shop_${interaction.user.id}`)
      .setLabel('Card Shop')
      .setEmoji('<:magic_coin:1431797469666217985>')
      .setStyle(ButtonStyle.Success);
    
    buttons.push(collectionButton, setFavoriteButton, shopButton);
    
    const nextButton = new ButtonBuilder()
      .setCustomId(`album_next_${userId}_${interaction.user.id}_${Math.min(totalPages - 1, currentPage + 1)}`)
      .setEmoji('<:next:1422550658846031953>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1 || totalPages <= 1);
    
    buttons.push(nextButton);

    const response = await interaction.editReply({
      content: '',
      components: [container, {
        type: 1,
        components: buttons
      }],
      files: [new AttachmentBuilder(albumImageBuffer, { name: 'album.png' })],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = response.createMessageComponentCollector({
      time: 300000,
      componentType: ComponentType.Button
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId.startsWith('view_collection_')) {
        await handleCollectionView(buttonInteraction, userCards, targetUser);
      } else if (buttonInteraction.customId.startsWith('set_favorite_')) {
        await handleSetFavorite(buttonInteraction, userCards, targetUser);
      } else if (buttonInteraction.customId.startsWith('card_shop_')) {
        await handleCardShop(buttonInteraction);
      } else if (buttonInteraction.customId.startsWith('album_prev_') || buttonInteraction.customId.startsWith('album_next_')) {
        await handlePagination(buttonInteraction, userCards, targetUser, favoriteCard);
      }
    });

    collector.on('end', () => {
      console.log('Album collector ended');
    });

  } catch (error) {
    console.error('Error in album command:', error);
    
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred while loading the album. Please try again.');
    container.addTextDisplayComponents(errorText);

    if (interaction.deferred) {
      await interaction.editReply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      await interaction.reply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  }
}

async function handlePagination(buttonInteraction, userCards, targetUser, favoriteCard) {
  try {
    const parts = buttonInteraction.customId.split('_');
    const newPage = parseInt(parts[parts.length - 1]);
    
    const requesterId = parts[parts.length - 2];
    if (buttonInteraction.user.id !== requesterId) {
      const notYoursText = new TextDisplayBuilder()
        .setContent('This album navigation is not for you!');
      
      const notYoursContainer = new ContainerBuilder()
        .addTextDisplayComponents(notYoursText);
      
      await buttonInteraction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [notYoursContainer]
      });
      return;
    }

    await buttonInteraction.deferUpdate();
    
    await showAlbumPage(buttonInteraction, userCards, targetUser, favoriteCard, newPage);

  } catch (error) {
    console.error('Error in handlePagination:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred while changing pages.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    if (buttonInteraction.replied || buttonInteraction.deferred) {
      await buttonInteraction.editReply({
        components: [errorContainer]
      });
    } else {
      await buttonInteraction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorContainer]
      });
    }
  }
}

async function handleCollectionView(interaction, userCards, targetUser) {
  try {
    const [, , targetUserId, requesterId] = interaction.customId.split('_');
    
    if (interaction.user.id !== requesterId) {
      const notYoursText = new TextDisplayBuilder()
        .setContent('This collection view is not for you!');
      
      const notYoursContainer = new ContainerBuilder()
        .addTextDisplayComponents(notYoursText);
      
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [notYoursContainer]
      });
      return;
    }

    let collectionText = `**📋 ${targetUser.username}'s Full Collection**\n\n`;
    
    if (userCards.length === 0) {
      collectionText += '*No cards collected yet. Use `/ignite_spark` to open card packs!*';
    } else {
      const cardsByRarity = {
        'Harmonious': [],
        'Legendary': [],
        'Epic': [],
        'Rare': [],
        'Basic': []
      };
      
      userCards.forEach(card => {
        if (cardsByRarity[card.rarity]) {
          cardsByRarity[card.rarity].push(card);
        }
      });
      
      for (const [rarity, cards] of Object.entries(cardsByRarity)) {
        if (cards.length > 0) {
          collectionText += `**${rarity}:**\n`;
          cards.forEach(card => {
            const emoji = CARD_EMOJIS[card.card_name] || '🎴';
            const cardDisplayName = card.card_name.replace('.png', '');
            collectionText += `${emoji} **${cardDisplayName}** × ${card.quantity}\n`;
          });
          collectionText += '\n';
        }
      }
      
      const totalCards = userCards.reduce((sum, card) => sum + card.quantity, 0);
      const uniqueCards = userCards.length;
      collectionText += `\n**Total Cards:** ${totalCards} (${uniqueCards} unique)`;
    }

    const collectionContainer = new ContainerBuilder();
    const collectionTextDisplay = new TextDisplayBuilder()
      .setContent(collectionText);
    collectionContainer.addTextDisplayComponents(collectionTextDisplay);

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [collectionContainer]
    });

  } catch (error) {
    console.error('Error in handleCollectionView:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred while loading the collection.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [errorContainer]
    });
  }
}

async function handleSetFavorite(interaction, userCards, targetUser) {
  try {
    const [, , targetUserId, requesterId] = interaction.customId.split('_');
    
    if (interaction.user.id !== requesterId) {
      const notYoursText = new TextDisplayBuilder()
        .setContent('You can only set your own favorite card!');
      
      const notYoursContainer = new ContainerBuilder()
        .addTextDisplayComponents(notYoursText);
      
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [notYoursContainer]
      });
      return;
    }

    if (userCards.length === 0) {
      const noCardsText = new TextDisplayBuilder()
        .setContent('You have no cards to set as favorite! Use `/ignite_spark` to open card packs first.');
      
      const noCardsContainer = new ContainerBuilder()
        .addTextDisplayComponents(noCardsText);
      
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [noCardsContainer]
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`favorite_card_modal_${targetUserId}`)
      .setTitle('Set Favorite Card');

    const cardNameInput = new TextInputBuilder()
      .setCustomId('card_name')
      .setLabel('Card Name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter the card name (e.g., Rainbow Dash)')
      .setRequired(true)
      .setMaxLength(100);

    const uniqueCards = userCards.filter((card, index, self) => 
      index === self.findIndex(c => c.card_name === card.card_name)
    );
    const cardNames = uniqueCards.map(card => card.card_name.replace('.png', '')).join(', ');

    let helpText = `Your cards: ${cardNames}`;
    if (helpText.length > 100) {
      helpText = helpText.substring(0, 97) + '...';
    }
    
    cardNameInput.setValue('');

    const actionRow = new ActionRowBuilder().addComponents(cardNameInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);

    const modalFilter = (modalInteraction) => 
      modalInteraction.customId === `favorite_card_modal_${targetUserId}` && 
      modalInteraction.user.id === interaction.user.id;

    try {
      const modalSubmission = await interaction.awaitModalSubmit({
        filter: modalFilter,
        time: 60000
      });

      const enteredName = modalSubmission.fields.getTextInputValue('card_name').trim();
      
      const matchingCard = uniqueCards.find(card => {
        const cardDisplayName = card.card_name.replace('.png', '').toLowerCase();
        const enteredNameLower = enteredName.toLowerCase();
        return cardDisplayName === enteredNameLower || card.card_name.toLowerCase() === enteredNameLower;
      });

      if (!matchingCard) {
        const invalidText = new TextDisplayBuilder()
          .setContent(`Card "${enteredName}" not found in your collection.\n\nYour available cards: ${cardNames}`);
        
        const invalidContainer = new ContainerBuilder()
          .addTextDisplayComponents(invalidText);
        
        await modalSubmission.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [invalidContainer]
        });
        return;
      }

      await setUserFavoriteCard(targetUserId, matchingCard.card_name);

      const successText = new TextDisplayBuilder()
        .setContent(`**${matchingCard.card_name.replace('.png', '')}** has been set as your favorite card!\n\nUse \`/album\` again to see the updated display.`);
      
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(successText);
      
      await modalSubmission.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [successContainer]
      });

    } catch (modalError) {
      if (modalError.code === 'INTERACTION_COLLECTOR_ERROR') {
        console.log('Set favorite modal timed out');
      } else {
        console.error('Error handling set favorite modal:', modalError);
      }
    }

  } catch (error) {
    console.error('Error in handleSetFavorite:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred while setting favorite card.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [errorContainer]
    });
  }
}

async function showAlbumPage(interaction, userCards, targetUser, favoriteCard, page) {
  const userId = targetUser.id;
  
  const uniqueCards = userCards.filter((card, index, self) => 
    index === self.findIndex(c => c.card_name === card.card_name)
  );
  
  const cardsPerPage = 9;
  const totalPages = Math.ceil(uniqueCards.length / cardsPerPage);
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  
  const cacheKey = `album_${userId}_${JSON.stringify(uniqueCards.map(c => c.card_name).sort())}_fav_${favoriteCard || 'none'}_page_${currentPage}`;
  
  let albumImageBuffer;
  
  const cached = global.albumCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ALBUM_CACHE_EXPIRY) {
    albumImageBuffer = cached.buffer;
  } else {
    albumImageBuffer = await createAlbumImage(uniqueCards, targetUser.username, favoriteCard, currentPage);
    
    global.albumCache.set(cacheKey, {
      buffer: albumImageBuffer,
      timestamp: Date.now()
    });
  }

  const container = new ContainerBuilder();
  
  const mediaGallery = new MediaGalleryBuilder()
    .addItems(
      new MediaGalleryItemBuilder()
        .setURL('attachment://album.png')
    );
  container.addMediaGalleryComponents(mediaGallery);

  const availableCards = await getAvailableCards();
  
  const uniqueCount = uniqueCards.length;
  const totalAvailable = availableCards.length;
  
  const rarityCount = {};
  uniqueCards.forEach(card => {
    rarityCount[card.rarity] = (rarityCount[card.rarity] || 0) + 1;
  });

  let collectionInfo = `**${targetUser.username}'s Card Album**\n\n`;
  collectionInfo += `**Unique Cards:** ${uniqueCount}/${totalAvailable}\n\n`;
  
  collectionInfo += `**Unique by Rarity:**\n`;
  collectionInfo += `Basic: ${rarityCount['Basic'] || 0}\n`;
  collectionInfo += `Rare: ${rarityCount['Rare'] || 0}\n`;
  collectionInfo += `Epic: ${rarityCount['Epic'] || 0}\n`;
  collectionInfo += `Legendary: ${rarityCount['Legendary'] || 0}\n`;
  collectionInfo += `Harmonious: ${rarityCount['Harmonious'] || 0}`;
  
  if (totalPages > 1) {
    collectionInfo += `\n\n**Page:** ${currentPage + 1}/${totalPages}`;
  }

  const infoText = new TextDisplayBuilder()
    .setContent(collectionInfo);
  container.addTextDisplayComponents(infoText);

  const buttons = [];
  
  const prevButton = new ButtonBuilder()
    .setCustomId(`album_prev_${userId}_${interaction.user.id}_${Math.max(0, currentPage - 1)}`)
    .setEmoji('<:previous:1422550660401860738>')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === 0 || totalPages <= 1);
  
  buttons.push(prevButton);
  
  const collectionButton = new ButtonBuilder()
    .setCustomId(`view_collection_${userId}_${interaction.user.id}`)
    .setLabel('View Full Collection')
    .setStyle(ButtonStyle.Secondary);
  
  const setFavoriteButton = new ButtonBuilder()
    .setCustomId(`set_favorite_${userId}_${interaction.user.id}`)
    .setLabel('Set Favorite Card')
    .setStyle(ButtonStyle.Primary);
  
  const shopButton = new ButtonBuilder()
    .setCustomId(`card_shop_${interaction.user.id}`)
    .setLabel('Card Shop')
    .setEmoji('<:magic_coin:1431797469666217985>')
    .setStyle(ButtonStyle.Success);
  
  buttons.push(collectionButton, setFavoriteButton, shopButton);
  
  const nextButton = new ButtonBuilder()
    .setCustomId(`album_next_${userId}_${interaction.user.id}_${Math.min(totalPages - 1, currentPage + 1)}`)
    .setEmoji('<:next:1422550658846031953>')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage >= totalPages - 1 || totalPages <= 1);
  
  buttons.push(nextButton);

  const response = await interaction.editReply({
    content: '',
    components: [container, {
      type: 1,
      components: buttons
    }],
    files: [new AttachmentBuilder(albumImageBuffer, { name: 'album.png' })],
    flags: MessageFlags.IsComponentsV2
  });

  const collector = response.createMessageComponentCollector({
    time: 300000,
    componentType: ComponentType.Button
  });

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.customId.startsWith('view_collection_')) {
      await handleCollectionView(buttonInteraction, userCards, targetUser);
    } else if (buttonInteraction.customId.startsWith('set_favorite_')) {
      await handleSetFavorite(buttonInteraction, userCards, targetUser);
    } else if (buttonInteraction.customId.startsWith('card_shop_')) {
      await handleCardShop(buttonInteraction);
    } else if (buttonInteraction.customId.startsWith('album_prev_') || buttonInteraction.customId.startsWith('album_next_')) {
      await handlePagination(buttonInteraction, userCards, targetUser, favoriteCard);
    }
  });

  collector.on('end', () => {
    console.log('Album collector ended');
  });
}

async function handleCardShop(interaction) {
  try {
    const parts = interaction.customId.split('_');
    const authorizedUserId = parts[parts.length - 1];
    
    if (interaction.user.id !== authorizedUserId) {
      const notYoursText = new TextDisplayBuilder()
        .setContent('This card shop button is not for you!');
      
      const notYoursContainer = new ContainerBuilder()
        .addTextDisplayComponents(notYoursText);
      
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [notYoursContainer]
      });
      return;
    }

    const { execute } = await import('./card_shop.js');
    await execute(interaction);
  } catch (error) {
    console.error('Error opening card shop:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('Failed to open card shop. Please try again later.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    try {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorContainer]
      });
    } catch (replyError) {
      console.log('Failed to reply with card shop error:', replyError.code);
    }
  }
}

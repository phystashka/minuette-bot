import { 
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} from 'discord.js';
import { getResourcesByUserId, removeResource, addResource } from '../../models/ResourceModel.js';
import { getUserCards, addCardToUser } from '../../models/CardsModel.js';
import { getUserById } from '../../models/UserModel.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Command data is now exported from card.js
// This file only contains the execute function for the shop subcommand

const SHOP_CARDS = [
  {
    name: 'Rainbow Dash',
    fileName: 'Rainbow Dash.png',
    price: 800,
    emoji: '<:RainbowDashCard:1431342012602388590>',
    description: 'The fastest pegasus in Equestria!'
  }
];

export async function executeShop(interaction) {
  try {
    const user = await getUserById(interaction.user.id);
    if (!user) {
      const noPonyText = new TextDisplayBuilder()
        .setContent('You need to create a pony first! Use `/equestria` to get started.');
      
      const noPonyContainer = new ContainerBuilder()
        .addTextDisplayComponents(noPonyText);
      
      return await interaction.reply({ 
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [noPonyContainer]
      });
    }

    const resources = await getResourcesByUserId(interaction.user.id);
    const magicCoins = resources?.magic_coins || 0;

    await showShop(interaction, magicCoins);
  } catch (error) {
    console.error('Error in card shop command:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred while loading the card shop.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [errorContainer]
    });
  }
}

async function showShop(interaction, magicCoins) {
  const headerText = new TextDisplayBuilder()
    .setContent(`**Card Shop**\n-# Purchase exclusive cards with Magic Coins`);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const balanceText = new TextDisplayBuilder()
    .setContent(`<:magic_coin:1431797469666217985> **Your Magic Coins:** \`${magicCoins.toLocaleString()}\``);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(headerText)
    .addSeparatorComponents(separator)
    .addTextDisplayComponents(balanceText)
    .addSeparatorComponents(separator);

  for (const card of SHOP_CARDS) {
    const cardSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${card.emoji} **${card.name}**`),
        new TextDisplayBuilder().setContent(`${card.description}\n**Price:** ${card.price.toLocaleString()} <:magic_coin:1431797469666217985> Magic Coins`)
      );

    const buyButton = new ButtonBuilder()
      .setCustomId(`buy_card_${card.name.toLowerCase().replace(/\s+/g, '_')}_${card.price}_${interaction.user.id}`)
      .setLabel(`Buy for ${card.price} Magic Coins`)
      .setStyle(magicCoins >= card.price ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(magicCoins < card.price);

    cardSection.setButtonAccessory(buyButton);
    container.addSectionComponents(cardSection);

    const attachmentName = card.fileName.replace(/\s+/g, '_');
    const cardGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${attachmentName}`)
          .setDescription(`${card.name} Card Preview`)
      );

    container.addMediaGalleryComponents(cardGallery);
  }

  const files = [];
  for (const card of SHOP_CARDS) {
    try {
      const cardImagePath = join(__dirname, '..', '..', 'public', 'cards', card.fileName);
      const attachmentName = card.fileName.replace(/\s+/g, '_');
      files.push({
        attachment: cardImagePath,
        name: attachmentName
      });
    } catch (error) {
      console.error(`Error preparing card image for ${card.name}:`, error);
    }
  }

  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    files: files
  });
}

export async function handleButton(interaction) {
  try {
    const customId = interaction.customId;
    
    if (customId.startsWith('buy_card_')) {
      const parts = customId.split('_');
      const cardName = parts.slice(2, -2).join('_').replace(/_/g, ' ');
      const price = parseInt(parts[parts.length - 2]);
      const originalUserId = parts[parts.length - 1];
      
      if (interaction.user.id !== originalUserId) {
        const notYoursText = new TextDisplayBuilder()
          .setContent('This card shop is not for you! Use `/card_shop` to open your own shop.');
        
        const notYoursContainer = new ContainerBuilder()
          .addTextDisplayComponents(notYoursText);
        
        return await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [notYoursContainer]
        });
      }

      await interaction.deferUpdate();
      
      const card = SHOP_CARDS.find(c => c.name.toLowerCase() === cardName.toLowerCase());
      if (!card) {
        const errorText = new TextDisplayBuilder()
          .setContent('Card not found in shop.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        return await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [errorContainer]
        });
      }

      const resources = await getResourcesByUserId(interaction.user.id);
      const magicCoins = resources?.magic_coins || 0;
      
      if (magicCoins < price) {
        const insufficientText = new TextDisplayBuilder()
          .setContent(`You don't have enough Magic Coins! You need ${price.toLocaleString()} but only have ${magicCoins.toLocaleString()}.`);
        
        const insufficientContainer = new ContainerBuilder()
          .addTextDisplayComponents(insufficientText);
        
        return await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [insufficientContainer]
        });
      }

      const userCards = await getUserCards(interaction.user.id);
      const hasCard = userCards.some(userCard => userCard.card_name === card.fileName);
      
      if (hasCard) {
        const alreadyOwnText = new TextDisplayBuilder()
          .setContent(`You already own the ${card.name} card!`);
        
        const alreadyOwnContainer = new ContainerBuilder()
          .addTextDisplayComponents(alreadyOwnText);
        
        return await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [alreadyOwnContainer]
        });
      }

      await removeResource(interaction.user.id, 'magic_coins', price);
      
      await addCardToUser(interaction.user.id, card.fileName, 'common');

      const attachmentName = card.fileName.replace(/\s+/g, '_');
      
      const successText = new TextDisplayBuilder()
        .setContent(`**Purchase Successful!**\n-# You bought the ${card.emoji} **${card.name}** card for ${price.toLocaleString()} <:magic_coin:1431797469666217985> Magic Coins!`);
      
      const newBalance = magicCoins - price;
      const balanceText = new TextDisplayBuilder()
        .setContent(`<:magic_coin:1431797469666217985> **Remaining Magic Coins:** \`${newBalance.toLocaleString()}\``);

      const cardGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(`attachment://${attachmentName}`)
            .setDescription(`${card.name} - Added to your collection!`)
        );

      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(successText)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(balanceText)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addMediaGalleryComponents(cardGallery);

      const cardImagePath = join(__dirname, '..', '..', 'public', 'cards', card.fileName);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [successContainer],
        files: [{
          attachment: cardImagePath,
          name: attachmentName
        }]
      });
    }
  } catch (error) {
    console.error('Error in card shop button handler:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred while processing your purchase.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    try {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    } catch (replyError) {
      console.log('Failed to reply with error in card shop:', replyError.code);
    }
  }
}
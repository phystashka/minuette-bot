import { 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ComponentType,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} from 'discord.js';
import { getResourceAmount, updateResources } from '../../models/ResourceModel.js';
import { addCardToUser, CARD_RARITIES } from '../../models/CardsModel.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Command data is now exported from card.js
// This file only contains the execute function for the spark subcommand

const CARD_EMOJIS = {
  'Rainbow Dash.png': '<:RainbowDashCard:1431342012602388590>',
  'Scootaloo.png': '<:ScootalooCard:1431342025315319818>',
  'Twilight Sparkle.png': '<:TwilightSparkleCard:1431342035834634360>',
  'Lightning Dust.png': '<:LightningDustCard:1431350072280350831>',
  'Songbird Serenade.png': '<:SongbirdSerenadeCard:1431366337187418162>',
  'Trixie.png': '<:TrixieCard:1431371120497393694>'
};

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;

    const userSparks = await getResourceAmount(userId, 'sparks');

    let statusText = `<:Sparkl:1431337628900528138> **Sparks:** \`${userSparks}\``;
    
    if (userSparks === 0) {
      statusText += `\n\n*Get sparks by finding them in cases or events*`;
    }

    const mainText = new TextDisplayBuilder()
      .setContent('**Ignite Your Spark**\n-# Open card packs to collect rare cards!');

    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);

    const igniteButton = new ButtonBuilder()
      .setCustomId(`ignite_spark_open_${userId}`)
      .setLabel('Ignite')
      .setEmoji('<:Sparkl:1431337628900528138>')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(userSparks === 0);

    const statusSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(statusText)
      )
      .setButtonAccessory(igniteButton);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(mainText)
      .addSeparatorComponents(separator)
      .addSectionComponents(statusSection)
      .addSeparatorComponents(separator);

    const response = await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });

    const collector = response.createMessageComponentCollector({
      time: 300000,
      componentType: ComponentType.Button
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        if (!buttonInteraction.isRepliable()) {
          console.log('Interaction expired for unauthorized user');
          return;
        }
        
        const notYoursText = new TextDisplayBuilder()
          .setContent('This spark is not for you!');
        
        const notYoursContainer = new ContainerBuilder()
          .addTextDisplayComponents(notYoursText);
        
        await buttonInteraction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [notYoursContainer]
        });
        return;
      }

      await handleButtonInteraction(buttonInteraction);
    });

    collector.on('end', () => {
      console.log('Ignite spark collector ended');
    });

  } catch (error) {
    console.error('Error in ignite_spark command:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      const errorText = new TextDisplayBuilder()
        .setContent('An error occurred while processing the spark.');
      
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
      
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorContainer]
      });
    }
  }
}

export async function handleButtonInteraction(interaction) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }
  } catch (deferError) {
    console.error('Failed to defer interaction:', deferError);
    return;
  }

  try {
    const userId = interaction.user.id;
    
    const currentSparks = await getResourceAmount(userId, 'sparks');
    
    if (currentSparks === 0) {
      const noSparksText = new TextDisplayBuilder()
        .setContent('❌ You don\'t have any sparks to ignite!');
      
      const noSparksContainer = new ContainerBuilder()
        .addTextDisplayComponents(noSparksText);
      
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [noSparksContainer]
      });
      return;
    }

    const openingText = new TextDisplayBuilder()
      .setContent('**Igniting your spark...**');

    const animationGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL('https://i.imgur.com/cK79hDl.gif')
          .setDescription('Card Pack Opening Animation')
      );

    const openingContainer = new ContainerBuilder()
      .addTextDisplayComponents(openingText)
      .addMediaGalleryComponents(animationGallery);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [openingContainer]
    });

    await new Promise(resolve => setTimeout(resolve, 2500));

    const wonCard = await determineCardRarity();

    await updateResources(userId, { sparks: currentSparks - 1 });

    await addCardToUser(userId, wonCard.fileName, wonCard.rarity);

    const cardEmoji = CARD_EMOJIS[wonCard.fileName] || '🎴';
    const resultText = new TextDisplayBuilder()
      .setContent(`**Card Pack Opened!**\n\n**You got a ${wonCard.rarity} card!**\n${cardEmoji} **${wonCard.name}**\n\n<:Sparkl:1431337628900528138> **Remaining sparks:** \`${currentSparks - 1}\``);

    const attachmentName = wonCard.fileName.replace(/\s+/g, '_');
    
    const cardGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${attachmentName}`)
          .setDescription(`${wonCard.rarity} - ${wonCard.name}`)
      );

    const resultContainer = new ContainerBuilder()
      .addTextDisplayComponents(resultText)
      .addMediaGalleryComponents(cardGallery);

    const cardImagePath = join(__dirname, '..', '..', 'public', 'cards', wonCard.fileName);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [resultContainer],
      files: [{
        attachment: cardImagePath,
        name: attachmentName
      }]
    });

  } catch (error) {
    console.error('Error in handleButtonInteraction:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('❌ **An error occurred while opening the card pack.**\n\nPlease try again later.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [errorContainer]
        });
      } else {
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [errorContainer]
        });
      }
    } catch (updateError) {
      console.error('Failed to send error message:', updateError);
    }
  }
}

async function determineCardRarity() {
  const cardsDir = join(__dirname, '..', '..', 'public', 'cards');
  const files = await readdir(cardsDir);
  const cardFiles = files.filter(f => f.endsWith('.png') && !f.startsWith('albom'));

  const availableCards = [];
  
  for (const file of cardFiles) {
    const cardName = file.replace('.png', '').replace(/_/g, ' ');
    
    let rarity;
    if (file === 'Rainbow Dash.png') {
      rarity = 'Harmonious';
    } else if (file === 'Twilight Sparkle.png') {
      rarity = 'Epic';
    } else if (file === 'Songbird Serenade.png') {
      rarity = 'Legendary';
    } else if (file === 'Trixie.png') {
      rarity = 'Rare';
    } else if (file === 'Scootaloo.png') {
      rarity = 'Basic';
    } else if (file === 'Lightning Dust.png') {
      rarity = 'Basic';
    } else {
      rarity = 'Basic';
    }
    
    availableCards.push({
      name: cardName,
      fileName: file,
      rarity: rarity,
      chance: CARD_RARITIES[rarity]
    });
  }

  const totalWeight = availableCards.reduce((sum, card) => sum + (1 / card.chance), 0);
  const random = Math.random() * totalWeight;
  
  let cumulativeWeight = 0;
  for (const card of availableCards) {
    cumulativeWeight += (1 / card.chance);
    if (random <= cumulativeWeight) {
      return card;
    }
  }

  return availableCards[0];
}

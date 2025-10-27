import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  StringSelectMenuBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getDiamonds, removeDiamonds, addDiamonds } from '../../models/ResourceModel.js';
import { addBits } from '../../utils/pony/index.js';
import { addHarmony, getHarmony } from '../../models/HarmonyModel.js';
import { addFriend } from '../../models/FriendshipModel.js';
import { grantDonatorBackground, purchaseBackground } from '../../models/ProfileBackgroundModel.js';
import { query, getRow } from '../../utils/database.js';

// Command data is now exported from premium.js
// This file only contains the execute function for the shop subcommand

async function addFriendDuplicate(userId, friendId) {
  try {

    const randomLevel = Math.floor(Math.random() * 35) + 1;
    

    const calculateExpForLevel = (level) => {
      let totalExp = 0;
      let expForLevel = 100;
      
      for (let i = 1; i < level; i++) {
        totalExp += expForLevel;
        expForLevel += 50;
      }
      

      const randomExpInLevel = Math.floor(Math.random() * expForLevel);
      return totalExp + randomExpInLevel;
    };
    
    const randomExp = calculateExpForLevel(randomLevel);
    

    await query(
      'INSERT INTO friendship (user_id, friend_id, is_favorite, friendship_level, experience, created_at, updated_at) VALUES (?, ?, 0, ?, ?, datetime("now"), datetime("now"))',
      [userId, friendId, randomLevel, randomExp]
    );
    

    const encounterResult = await getRow(
      'SELECT COUNT(*) as count FROM friendship WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    return {
      success: true,
      newLevel: randomLevel,
      encounterCount: encounterResult.count
    };
  } catch (error) {
    console.error('Error adding friend duplicate:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

const BUNDLE_PRICE = 750;
const BUNDLE_PRICES = {
  flawless: 750,
  scitwi: 750,
  sunset_satan: 750,
  nightmare_star: 750,
  petunia_petals: 750,
  bat_pony_pack: 750,
  elements_of_insanity: 1250
};

const ELEMENTS_OF_INSANITY_END_DATE = new Date('2025-10-26T23:59:59Z');

function isElementsOfInsanityActive() {
  return new Date() < ELEMENTS_OF_INSANITY_END_DATE;
}

function getBundlePrice(bundleType) {
  return BUNDLE_PRICES[bundleType] || BUNDLE_PRICE;
}

function createShopContainer(userDiamonds, username) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent('**Welcome to Minuette Shop!**');
  container.addTextDisplayComponents(titleText);
  
  const userInfoText = new TextDisplayBuilder()
    .setContent(`${username}, **Your <a:diamond:1423629073984524298> Diamonds:** ${userDiamonds}`);
  container.addTextDisplayComponents(userInfoText);
  
  const separator1 = new SeparatorBuilder();
  container.addSeparatorComponents(separator1);
  
  const aboutTitle = new TextDisplayBuilder()
    .setContent('**About Premium Bundles:**');
  container.addTextDisplayComponents(aboutTitle);
  
  const aboutText = new TextDisplayBuilder()
    .setContent('Premium bundles contain unique ponies, skins, and profile themes that cannot be obtained through regular gameplay.');
  container.addTextDisplayComponents(aboutText);
  
  const separator2 = new SeparatorBuilder();
  container.addSeparatorComponents(separator2);
  

  const pricesTitle = new TextDisplayBuilder()
    .setContent('**Diamond Prices:**');
  container.addTextDisplayComponents(pricesTitle);
  
  const pricesText = new TextDisplayBuilder()
    .setContent('> 150 <a:diamond:1423629073984524298> - **$6.00 USD**\n> 500 <a:diamond:1423629073984524298> - **$20.00 USD**\n> 750 <a:diamond:1423629073984524298> - **$30.00 USD**');
  container.addTextDisplayComponents(pricesText);
  
  const magicCoinsTitle = new TextDisplayBuilder()
    .setContent('**Magic Coin Prices:**');
  container.addTextDisplayComponents(magicCoinsTitle);
  
  const magicCoinsText = new TextDisplayBuilder()
    .setContent('> 800 <:magic_coin:1431797469666217985> - **$25.00 USD**\n> 1700 <:magic_coin:1431797469666217985> - **$45.00 USD**');
  container.addTextDisplayComponents(magicCoinsText);
  
  const separator3 = new SeparatorBuilder();
  container.addSeparatorComponents(separator3);

  if (isElementsOfInsanityActive()) {
    const limitedTitle = new TextDisplayBuilder()
      .setContent('**🔥 Limited-Time Donation Shop Offer! 🔥**');
    container.addTextDisplayComponents(limitedTitle);
    
    const limitedDesc = new TextDisplayBuilder()
      .setContent('**7 Days Only!** (Ends <t:1761523199:F>)\nGrab these Elements of Insanity characters: RariFruit, Fluttershout, Applepills, Pinkis Cupcake, Rainbine, Brutalight Sparcake, and Derpigun! Add chaotic GMod flair to your collection before they vanish!');
    container.addTextDisplayComponents(limitedDesc);
    
    const limitedCountdown = new TextDisplayBuilder()
      .setContent(`-# **Time Remaining:** <t:1761523199:R>`);
    container.addTextDisplayComponents(limitedCountdown);
    
    const elementsButton = new ButtonBuilder()
      .setCustomId(`elements_of_insanity_button`)
      .setLabel('Elements of Insanity Pack')
      .setStyle(ButtonStyle.Danger);
    
    const elementsRow = new ActionRowBuilder().addComponents(elementsButton);
    container.addActionRowComponents(elementsRow);
    
    const limitedSeparator = new SeparatorBuilder();
    container.addSeparatorComponents(limitedSeparator);
  }
  
  const servicesTitle = new TextDisplayBuilder()
    .setContent('**Custom Services:**');
  container.addTextDisplayComponents(servicesTitle);
  
  const servicesText = new TextDisplayBuilder()
    .setContent('• **$25.00 USD** - Add your custom pony OC to the bot');
  container.addTextDisplayComponents(servicesText);
  
  const separator4 = new SeparatorBuilder();
  container.addSeparatorComponents(separator4);
  
  const contactText = new TextDisplayBuilder()
    .setContent('**Contact:** DM **phystashka** on Discord for buying diamonds');
  container.addTextDisplayComponents(contactText);
  
  return container;
}

function createBundlePreviewContainer(bundleType, userDiamonds, username) {
  const container = new ContainerBuilder();
  const bundlePrice = getBundlePrice(bundleType);
  
  switch (bundleType) {
    case 'flawless':
      const flawlessTitle = new TextDisplayBuilder()
        .setContent('**Flawless Bundle - Preview**');
      container.addTextDisplayComponents(flawlessTitle);
      
      const flawlessPrice = new TextDisplayBuilder()
        .setContent(`**Price:** ${bundlePrice} <a:diamond:1423629073984524298>`);
      container.addTextDisplayComponents(flawlessPrice);
      
      const flawlessSep = new SeparatorBuilder();
      container.addSeparatorComponents(flawlessSep);
      
      const flawlessContents = new TextDisplayBuilder()
        .setContent('**Bundle Contents:**\n> Flawless (Unique Pony)\n> Flawless Profile Theme');
      container.addTextDisplayComponents(flawlessContents);
      
      const flawlessDesc = new TextDisplayBuilder()
        .setContent('A perfect bundle for those who seek perfection. The Flawless pony is a unique pony with stunning appearance, and the matching profile theme will make your profile stand out with elegant style.');
      container.addTextDisplayComponents(flawlessDesc);
      
      const flawlessGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('https://i.imgur.com/xFYaCbZ.png')
        );
      container.addMediaGalleryComponents(flawlessGallery);
      break;
      
    case 'scitwi':
      const scitwilightTitle = new TextDisplayBuilder()
        .setContent('**SciTwilight Bundle - Preview**');
      container.addTextDisplayComponents(scitwilightTitle);
      
      const scitwilightPrice = new TextDisplayBuilder()
        .setContent(`**Price:** ${bundlePrice} <a:diamond:1423629073984524298>`);
      container.addTextDisplayComponents(scitwilightPrice);
      
      const scitwilightSep = new SeparatorBuilder();
      container.addSeparatorComponents(scitwilightSep);
      
      const scitwilightContents = new TextDisplayBuilder()
        .setContent('**Bundle Contents:**\n> SciTwilight (Unique Pony)\n> SciTwilight Profile Theme');
      container.addTextDisplayComponents(scitwilightContents);
      
      const scitwilightDesc = new TextDisplayBuilder()
        .setContent('A scientific bundle perfect for intellectual ponies! SciTwilight is a unique pony representing Twilight\'s darker, more sinister magical form. This mysterious variant brings a unique twist to the beloved character with her evil pony appearance and scientific prowess.');
      container.addTextDisplayComponents(scitwilightDesc);
      
      const scitwilightGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('https://i.imgur.com/UMBB41O.png')
        );
      container.addMediaGalleryComponents(scitwilightGallery);
      break;
      
    case 'nightmare_star':
      const nightmareTitle = new TextDisplayBuilder()
        .setContent('**Nightmare Star Bundle - Preview**');
      container.addTextDisplayComponents(nightmareTitle);
      
      const nightmarePrice = new TextDisplayBuilder()
        .setContent(`**Price:** ${bundlePrice} <a:diamond:1423629073984524298>`);
      container.addTextDisplayComponents(nightmarePrice);
      
      const nightmareSep = new SeparatorBuilder();
      container.addSeparatorComponents(nightmareSep);
      
      const nightmareContents = new TextDisplayBuilder()
        .setContent('**Bundle Contents:**\n> Nightmare Star (Unique Pony)');
      container.addTextDisplayComponents(nightmareContents);
      
      const nightmareDesc = new TextDisplayBuilder()
        .setContent('An ancient and terrifying bundle featuring the legendary Nightmare Star! This unique pony represents Princess Celestia\'s darkest corruption, predating even Nightmare Moon. Witness the solar nightmare that once threatened to plunge Equestria into eternal darkness.');
      container.addTextDisplayComponents(nightmareDesc);
      
      const nightmareGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('https://i.imgur.com/cHq8q0o.png')
        );
      container.addMediaGalleryComponents(nightmareGallery);
      break;
      
    case 'sunset_satan':
      const sunsetTitle = new TextDisplayBuilder()
        .setContent('**Sunset Satan Bundle - Preview**');
      container.addTextDisplayComponents(sunsetTitle);
      
      const sunsetPrice = new TextDisplayBuilder()
        .setContent(`**Price:** ${bundlePrice} <a:diamond:1423629073984524298>`);
      container.addTextDisplayComponents(sunsetPrice);
      
      const sunsetSep = new SeparatorBuilder();
      container.addSeparatorComponents(sunsetSep);
      
      const sunsetContents = new TextDisplayBuilder()
        .setContent('**Bundle Contents:**\n> Sunset Satan (Unique Pony)\n> Sunset Satan Profile Theme');
      container.addTextDisplayComponents(sunsetContents);
      
      const sunsetDesc = new TextDisplayBuilder()
        .setContent('A dark bundle featuring the demonic Sunset Shimmer! This unique pony embodies pure evil with stunning dark magic abilities and matching sinister profile theme.');
      container.addTextDisplayComponents(sunsetDesc);
      
      const sunsetGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('https://i.imgur.com/Si60XcH.png')
        );
      container.addMediaGalleryComponents(sunsetGallery);
      break;
      
    case 'petunia_petals':
      const petuniaTitle = new TextDisplayBuilder()
        .setContent('**Petunia Petals Bundle - Preview**');
      container.addTextDisplayComponents(petuniaTitle);
      
      const petuniaPrice = new TextDisplayBuilder()
        .setContent(`**Price:** ${bundlePrice} <a:diamond:1423629073984524298>`);
      container.addTextDisplayComponents(petuniaPrice);
      
      const petuniaSep = new SeparatorBuilder();
      container.addSeparatorComponents(petuniaSep);
      
      const petuniaContents = new TextDisplayBuilder()
        .setContent('**Bundle Contents:**\n> Petunia Petals (Unique Pony)');
      container.addTextDisplayComponents(petuniaContents);
      
      const petuniaDesc = new TextDisplayBuilder()
        .setContent('A beautiful floral bundle featuring the enchanting Petunia Petals! This unique earth pony embodies the essence of spring with her stunning flower-adorned appearance and gentle nature.');
      container.addTextDisplayComponents(petuniaDesc);
      
      const petuniaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('https://i.imgur.com/Q2galTg.png')
        );
      container.addMediaGalleryComponents(petuniaGallery);
      break;
      
    case 'bat_pony_pack':
      const batTitle = new TextDisplayBuilder()
        .setContent('**Bat Pony Pack - Preview**');
      container.addTextDisplayComponents(batTitle);
      
      const batPrice = new TextDisplayBuilder()
        .setContent(`**Price:** ${bundlePrice} <a:diamond:1423629073984524298>`);
      container.addTextDisplayComponents(batPrice);
      
      const batSep = new SeparatorBuilder();
      container.addSeparatorComponents(batSep);
      
      const batContents = new TextDisplayBuilder()
        .setContent('**Bundle Contents:**\n> Echo (Unique Bat Pony)\n> Lucky Roll (Unique Bat Pony)\n> Speck (Unique Bat Pony)\n> Night Watch (Unique Bat Pony)');
      container.addTextDisplayComponents(batContents);
      
      const batDesc = new TextDisplayBuilder()
        .setContent('A complete collection of the most beloved fan-created bat ponies! These nocturnal beauties come from the deepest corners of the fandom, each with their own unique personality and mysterious charm. Perfect for collectors who love the darker side of Equestria!');
      container.addTextDisplayComponents(batDesc);
      
      const batGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('https://i.imgur.com/2oZafqU.png')
        );
      container.addMediaGalleryComponents(batGallery);
      break;
  }
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const footerText = new TextDisplayBuilder()
    .setContent(`${username} • Your diamonds: ${userDiamonds} | Bundle cost: ${bundlePrice}`);
  container.addTextDisplayComponents(footerText);
  
  return container;
}

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const userDiamonds = await getDiamonds(userId);

    const container = createShopContainer(userDiamonds, interaction.user.toString());
    
    const selectOptions = [
      {
        label: 'Flawless Bundle - 750',
        description: 'Flawless pony and profile theme',
        value: 'flawless'
      },
      {
        label: 'SciTwilight Bundle - 750',
        description: 'SciTwilight pony and profile theme',
        value: 'scitwi'
      },
      {
        label: 'Nightmare Star Bundle - 750',
        description: 'Ancient solar nightmare pony',
        value: 'nightmare_star'
      },
      {
        label: 'Sunset Satan Bundle - 750',
        description: 'Demonic Sunset Shimmer and theme',
        value: 'sunset_satan'
      },
      {
        label: 'Petunia Petals Bundle - 750',
        description: 'Floral earth pony',
        value: 'petunia_petals'
      },
      {
        label: 'Bat Pony Pack - 750',
        description: 'Four bat ponies collection',
        value: 'bat_pony_pack'
      }
    ];
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`bundle_preview_${userId}`)
      .setPlaceholder('Select a bundle to preview')
      .addOptions(selectOptions);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    container.addActionRowComponents(row);
    
    return interaction.reply({ 
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
    
  } catch (error) {
    console.error('Error in donate_shop command:', error);
    
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('❌ **Error**\n\nAn error occurred while loading the shop. Please try again later.');
    errorContainer.addTextDisplayComponents(errorText);
    
    return interaction.reply({ 
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }
}

async function handleElementsOfInsanityButton(interaction) {
  try {
    const userId = interaction.user.id;
    const userDiamonds = await getDiamonds(userId);
    
    if (!isElementsOfInsanityActive()) {
      return interaction.reply({
        content: 'This limited offer has expired!',
        ephemeral: true
      });
    }

    const container = new ContainerBuilder();
    
    const title = new TextDisplayBuilder()
      .setContent('**🔥 Elements of Insanity Pack - Limited Offer!**\n7 unique chaotic GMod characters in one special bundle!');
    container.addTextDisplayComponents(title);
    
    const elementsPrice = new TextDisplayBuilder()
      .setContent(`**Price:** 1250 <a:diamond:1423629073984524298>\n**Your Balance:** ${userDiamonds} <a:diamond:1423629073984524298>`);
    container.addTextDisplayComponents(elementsPrice);
    
    const elementsCountdown = new TextDisplayBuilder()
      .setContent(`-# **Ends:** <t:1761523199:F> (<t:1761523199:R>)`);
    container.addTextDisplayComponents(elementsCountdown);
    
    const elementsSep = new SeparatorBuilder();
    container.addSeparatorComponents(elementsSep);
    
    const elementsContents = new TextDisplayBuilder()
      .setContent('**Bundle Contents:**\n> RariFruit\n> Fluttershout\n> Applepills\n> Pinkis Cupcake\n> Rainbine\n> Brutalight Sparcake\n> Derpigun\nAnd get free 7 new __exlclusive__ **cards**!');
    container.addTextDisplayComponents(elementsContents);
    
    const gallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL('https://i.imgur.com/4mEMhqy.png')
      );
    container.addMediaGalleryComponents(gallery);

    const purchaseButton = new ButtonBuilder()
      .setCustomId(`purchase_elements_of_insanity_${userId}`)
      .setLabel('Purchase for 1250')
      .setStyle(userDiamonds >= 1250 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(userDiamonds < 1250);
    
    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_shop_${userId}`)
      .setLabel('Back to Shop')
      .setEmoji('<:previous:1422550660401860738>')
      .setStyle(ButtonStyle.Secondary);
    
    const buttonRow = new ActionRowBuilder().addComponents(backButton, purchaseButton);
    container.addActionRowComponents(buttonRow);
    
    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
    
  } catch (error) {
    console.error('Error in handleElementsOfInsanityButton:', error);
    await interaction.followUp({ content: 'An error occurred while loading the preview.', ephemeral: true });
  }
}

async function handleBundlePreview(interaction) {
  try {
    const [, , originalUserId] = interaction.customId.split('_');
    
    if (interaction.user.id !== originalUserId) {
      return interaction.reply({
        content: 'Only the command user can view bundle previews!',
        ephemeral: true
      });
    }
    
    const bundleType = interaction.values[0];
    const userId = interaction.user.id;
    const userDiamonds = await getDiamonds(userId);
    
    const container = createBundlePreviewContainer(bundleType, userDiamonds, interaction.user.toString());
    
    const bundlePrice = getBundlePrice(bundleType);
    
    const selectOptions = [
      {
        label: 'Flawless Bundle - 750',
        description: 'Flawless pony and profile theme',
        value: 'flawless'
      },
      {
        label: 'SciTwilight Bundle - 750',
        description: 'SciTwilight pony and profile theme',
        value: 'scitwi'
      },
      {
        label: 'Nightmare Star Bundle - 750',
        description: 'Ancient solar nightmare pony',
        value: 'nightmare_star'
      },
      {
        label: 'Sunset Satan Bundle - 750',
        description: 'Demonic Sunset Shimmer and theme',
        value: 'sunset_satan'
      },
      {
        label: 'Petunia Petals Bundle - 750',
        description: 'Floral earth pony',
        value: 'petunia_petals'
      },
      {
        label: 'Bat Pony Pack - 750',
        description: 'Four bat ponies collection',
        value: 'bat_pony_pack'
      }
    ];
    
    if (isElementsOfInsanityActive()) {
      selectOptions.unshift({
        label: '🔥 Elements of Insanity Pack - 1250 (LIMITED!)',
        description: '7 chaotic GMod characters - ENDS SOON!',
        value: 'elements_of_insanity'
      });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`bundle_preview_${userId}`)
      .setPlaceholder('Select a bundle to preview')
      .addOptions(selectOptions);
    
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    container.addActionRowComponents(row1);
    
    if (userDiamonds >= bundlePrice) {
      const purchaseButton = new ButtonBuilder()
        .setCustomId(`bundle_purchase_${bundleType}_${userId}`)
        .setLabel(`Buy for ${bundlePrice}`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('<a:diamond:1423629073984524298>');
      
      const row2 = new ActionRowBuilder().addComponents(purchaseButton);
      container.addActionRowComponents(row2);
    }
    
    return interaction.update({ 
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
    
  } catch (error) {
    console.error('Error handling bundle preview:', error);
    
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('❌ **Preview Error**\n\nAn error occurred while loading the bundle preview.');
    errorContainer.addTextDisplayComponents(errorText);
    
    return interaction.update({ 
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }
}

function createPurchaseSuccessContainer(title, rewardText, username, iconColor = 0x00FF00) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`**${title}**`);
  container.addTextDisplayComponents(titleText);
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const userText = new TextDisplayBuilder()
    .setContent(username);
  container.addTextDisplayComponents(userText);
  
  const rewardDisplay = new TextDisplayBuilder()
    .setContent(rewardText);
  container.addTextDisplayComponents(rewardDisplay);
  
  return container;
}

function createPurchaseErrorContainer(title, description, username) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`**❌ ${title}**`);
  container.addTextDisplayComponents(titleText);
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const userText = new TextDisplayBuilder()
    .setContent(username);
  container.addTextDisplayComponents(userText);
  
  const descText = new TextDisplayBuilder()
    .setContent(description);
  container.addTextDisplayComponents(descText);
  
  return container;
}

function createConfirmationContainer(title, description, username, alreadyHasItems) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`**✅ ${title}**`);
  container.addTextDisplayComponents(titleText);
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const userText = new TextDisplayBuilder()
    .setContent(username);
  container.addTextDisplayComponents(userText);
  
  const hasItemsText = new TextDisplayBuilder()
    .setContent(`You already have: ${alreadyHasItems.join(', ')}\n\nYou can still purchase this bundle to get another copy of the pony and increase friendship level.`);
  container.addTextDisplayComponents(hasItemsText);
  
  return container;
}

async function checkUserAlreadyHasBundle(userId, bundleType) {
  const alreadyHas = [];
  
  try {
    switch (bundleType) {
      case 'flawless':

        const hasFlawlessTheme = await getRow(
          'SELECT id FROM profile_backgrounds WHERE user_id = ? AND background_id = ?',
          [userId, 'flawless_farm1']
        );
        if (hasFlawlessTheme) alreadyHas.push('Flawless theme');
        break;
        

        break;
        
      case 'scitwi':

        const hasSciTwilightTheme = await getRow(
          'SELECT id FROM profile_backgrounds WHERE user_id = ? AND background_id = ?',
          [userId, 'halloween_farm1']
        );
        if (hasSciTwilightTheme) alreadyHas.push('SciTwilight theme');
        break;
        
      case 'nightmare_star':

        break;
        
      case 'sunset_satan':

        const hasSunsetSatanTheme = await getRow(
          'SELECT id FROM profile_backgrounds WHERE user_id = ? AND background_id = ?',
          [userId, 'sunset_farm1']
        );
        if (hasSunsetSatanTheme) alreadyHas.push('Sunset Satan theme');
        break;
    }
  } catch (error) {
    console.error('Error checking user bundle ownership:', error);
  }
  
  return alreadyHas;
}

async function handleBundlePurchase(interaction) {
  try {
    const customId = interaction.customId;
    let bundleType, originalUserId;
    

    if (customId.includes('_confirm_')) {

      const parts = customId.split('_confirm_');
      const afterConfirm = parts[1].split('_');
      bundleType = afterConfirm[0];
      originalUserId = afterConfirm[1];
      

      if (afterConfirm.length > 2) {
        bundleType = afterConfirm.slice(0, -1).join('_');
        originalUserId = afterConfirm[afterConfirm.length - 1];
      }
    } else {

      const parts = customId.split('_');
      if (parts.length === 4) {

        bundleType = parts[2];
        originalUserId = parts[3];
      } else {

        bundleType = parts.slice(2, -1).join('_');
        originalUserId = parts[parts.length - 1];
      }
    }
    
    if (interaction.user.id !== originalUserId) {
      return interaction.reply({
        content: 'Only the command user can purchase bundles!',
        ephemeral: true
      });
    }
    
    const userId = interaction.user.id;
    const userDiamonds = await getDiamonds(userId);
    

    const bundlePrice = getBundlePrice(bundleType);
    
    if (userDiamonds < bundlePrice) {
      const container = createPurchaseErrorContainer(
        'Insufficient Diamonds',
        `You need ${bundlePrice} <a:diamond:1423629073984524298> diamonds to purchase this bundle.\n\nYou have: ${userDiamonds} <a:diamond:1423629073984524298>`,
        interaction.user.toString()
      );
      
      return interaction.update({ 
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    await interaction.deferUpdate();
    

    if (!customId.includes('_confirm_')) {
      const alreadyHasItems = await checkUserAlreadyHasBundle(userId, bundleType);
      if (alreadyHasItems.length > 0) {
        const container = createConfirmationContainer(
          'Theme Already Owned',
          '',
          interaction.user.toString(),
          alreadyHasItems
        );
        
        const confirmButton = new ButtonBuilder()
          .setCustomId(`bundle_purchase_confirm_${bundleType}_${userId}`)
          .setLabel('Purchase Anyway')
          .setStyle(ButtonStyle.Success);
          
        const row = new ActionRowBuilder().addComponents(confirmButton);
        container.addActionRowComponents(row);
        
        return interaction.editReply({ 
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
    
    const success = await removeDiamonds(userId, bundlePrice);
    if (!success) {
      const container = createPurchaseErrorContainer(
        'Purchase Failed',
        'Failed to process payment. Please try again.',
        interaction.user.toString()
      );
      
      return interaction.editReply({ 
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
    

    switch (bundleType) {
      case 'flawless':
        await handleFlawlessBundle(interaction, userId);
        break;
      case 'scitwi':
        await handleSciTwilightBundle(interaction, userId);
        break;
      case 'nightmare_star':
        await handleNightmareStarBundle(interaction, userId);
        break;
      case 'sunset_satan':
        await handleSunsetSatanBundle(interaction, userId);
        break;
      case 'petunia_petals':
        await handlePetuniaPetalsBundle(interaction, userId);
        break;
      case 'bat_pony_pack':
        await handleBatPonyPackBundle(interaction, userId);
        break;
      case 'elements_of_insanity':
        await handleElementsOfInsanityBundle(interaction, userId);
        break;
      default:
        throw new Error(`Unknown bundle type: ${bundleType}`);
    }
    
  } catch (error) {
    console.error('Error handling bundle purchase:', error);
    
    const container = createPurchaseErrorContainer(
      'Purchase Error',
      'An error occurred while processing your purchase.',
      interaction.user.toString()
    );
    
    return interaction.editReply({ 
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

async function handleFlawlessBundle(interaction, userId) {
  let rewardText = '**Flawless Bundle** unlocked!\n\n';
  let compensationBits = 0;
  let compensationHarmony = 0;
  

  const flawlessPony = await getRow('SELECT id FROM pony_friends WHERE name = ?', ['Flawless']);
  if (flawlessPony) {
    const friendResult = await addFriendDuplicate(userId, flawlessPony.id);
    if (friendResult.success) {
      rewardText += `**Flawless** has been added to your collection! (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})\n`;
    } else {
      compensationBits += 1000;
      compensationHarmony += 200;
      rewardText += '**Compensation:** Failed to add Flawless\n';
    }
  } else {
    compensationBits += 1000;
    compensationHarmony += 200;
    rewardText += '**Compensation:** Flawless pony not found\n';
  }
  

  const hasTheme = await getRow(
    'SELECT id FROM profile_backgrounds WHERE user_id = ? AND background_id = ?',
    [userId, 'flawless_farm1']
  );
  
  if (!hasTheme) {
    try {
      await purchaseBackground(userId, 'flawless_farm1');
      rewardText += '**Flawless Profile Theme** has been unlocked!\n';
    } catch (error) {
      console.error('Error granting flawless theme:', error);
      compensationBits += 500;
      compensationHarmony += 100;
      rewardText += '**Compensation:** Flawless theme unavailable\n';
    }
  } else {
    rewardText += '**Flawless Profile Theme** - you already have this theme\n';
  }
  

  if (compensationBits > 0) {
    await addBits(userId, compensationBits);
    await addHarmony(userId, compensationHarmony);
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(userId, 'earn_bits', compensationBits);
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    rewardText += `\n<:bits:1411354539935666197> **${compensationBits}** and <:harmony:1416514347789844541> **${compensationHarmony}** compensation added!`;
  }
  
  const container = createPurchaseSuccessContainer(
    'Flawless Bundle - Purchase Complete!',
    rewardText,
    interaction.user.toString(),
    0xFFD700
  );
  
  await interaction.editReply({ 
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}



async function handleSciTwilightBundle(interaction, userId) {
  let rewardText = '**SciTwilight Bundle** unlocked!\n\n';
  let compensationBits = 0;
  let compensationHarmony = 0;
  

  const scitwilightPony = await getRow('SELECT id FROM pony_friends WHERE name = ?', ['SciTwilight']);
  if (scitwilightPony) {
    const friendResult = await addFriendDuplicate(userId, scitwilightPony.id);
    if (friendResult.success) {
      rewardText += `**SciTwilight** has been added to your collection! (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})\n`;
    } else {
      compensationBits += 500;
      compensationHarmony += 100;
      rewardText += '**Compensation:** Failed to add SciTwilight\n';
    }
  } else {
    compensationBits += 500;
    compensationHarmony += 100;
    rewardText += '**Compensation:** SciTwilight pony not found\n';
  }
  

  const hasTheme = await getRow(
    'SELECT id FROM profile_backgrounds WHERE user_id = ? AND background_id = ?',
    [userId, 'halloween_farm1']
  );
  
  if (!hasTheme) {
    try {
      await purchaseBackground(userId, 'halloween_farm1');
      rewardText += '**SciTwilight Profile Theme** has been unlocked!\n';
    } catch (error) {
      console.error('Error granting SciTwilight theme:', error);
      compensationBits += 300;
      compensationHarmony += 75;
      rewardText += '**Compensation:** SciTwilight theme unavailable\n';
    }
  } else {
    rewardText += '**SciTwilight Profile Theme** - you already have this theme\n';
  }
  

  if (compensationBits > 0) {
    await addBits(userId, compensationBits);
    await addHarmony(userId, compensationHarmony);
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(userId, 'earn_bits', compensationBits);
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    rewardText += `\n<:bits:1411354539935666197> **${compensationBits}** and <:harmony:1416514347789844541> **${compensationHarmony}** compensation added!`;
  }
  
  const container = createPurchaseSuccessContainer(
    'SciTwilight Bundle - Purchase Complete!',
    rewardText,
    interaction.user.toString(),
    0x9B59B6
  );
  
  await interaction.editReply({ 
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleNightmareStarBundle(interaction, userId) {
  let rewardText = '**Nightmare Star Bundle** unlocked!\n\n';
  let compensationBits = 0;
  let compensationHarmony = 0;
  

  const nightmareStarPony = await getRow('SELECT id FROM pony_friends WHERE name = ?', ['Nightmare Star']);
  if (nightmareStarPony) {
    const friendResult = await addFriendDuplicate(userId, nightmareStarPony.id);
    if (friendResult.success) {
      rewardText += `**Nightmare Star** has been added to your collection! (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})\n`;
    } else {
      compensationBits += 1500;
      compensationHarmony += 300;
      rewardText += '**Compensation:** Failed to add Nightmare Star\n';
    }
  } else {
    compensationBits += 1500;
    compensationHarmony += 300;
    rewardText += '**Compensation:** Nightmare Star pony not found\n';
  }
  

  if (compensationBits > 0) {
    await addBits(userId, compensationBits);
    await addHarmony(userId, compensationHarmony);
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(userId, 'earn_bits', compensationBits);
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    rewardText += `\n<:bits:1411354539935666197> **${compensationBits}** and <:harmony:1416514347789844541> **${compensationHarmony}** compensation added!`;
  }
  
  const container = createPurchaseSuccessContainer(
    'Nightmare Star Bundle - Purchase Complete!',
    rewardText,
    interaction.user.toString(),
    0xFF4500
  );
  
  await interaction.editReply({ 
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleSunsetSatanBundle(interaction, userId) {
  let rewardText = '**Sunset Satan Bundle** unlocked!\n\n';
  let compensationBits = 0;
  let compensationHarmony = 0;
  

  const sunsetSatanPony = await getRow('SELECT id FROM pony_friends WHERE name = ?', ['Sunset Satan']);
  if (sunsetSatanPony) {
    const friendResult = await addFriendDuplicate(userId, sunsetSatanPony.id);
    if (friendResult.success) {
      rewardText += `**Sunset Satan** has been added to your collection! (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})\n`;
    } else {
      compensationBits += 2000;
      compensationHarmony += 400;
      rewardText += '**Compensation:** Failed to add Sunset Satan\n';
    }
  } else {
    compensationBits += 2000;
    compensationHarmony += 400;
    rewardText += '**Compensation:** Sunset Satan pony not found\n';
  }
  

  const hasTheme = await getRow(
    'SELECT id FROM profile_backgrounds WHERE user_id = ? AND background_id = ?',
    [userId, 'sunset_farm1']
  );
  
  if (!hasTheme) {
    try {
      await purchaseBackground(userId, 'sunset_farm1');
      rewardText += '**Sunset Satan Profile Theme** has been unlocked!\n';
    } catch (error) {
      console.error('Error granting Sunset Satan theme:', error);
      compensationBits += 500;
      compensationHarmony += 100;
      rewardText += '**Compensation:** Sunset Satan theme unavailable\n';
    }
  } else {
    rewardText += '**Sunset Satan Profile Theme** - you already have this theme\n';
  }
  

  if (compensationBits > 0) {
    await addBits(userId, compensationBits);
    await addHarmony(userId, compensationHarmony);
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(userId, 'earn_bits', compensationBits);
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    rewardText += `\n<:bits:1411354539935666197> **${compensationBits}** and <:harmony:1416514347789844541> **${compensationHarmony}** compensation added!`;
  }
  
  const container = createPurchaseSuccessContainer(
    'Sunset Satan Bundle - Purchase Complete!',
    rewardText,
    interaction.user.toString(),
    0x8B0000
  );
  
  await interaction.editReply({ 
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handlePetuniaPetalsBundle(interaction, userId) {
  let rewardText = '**Petunia Petals Bundle** unlocked!\n\n';
  let compensationBits = 0;
  let compensationHarmony = 0;
  

  const petuniaPony = await getRow('SELECT id FROM pony_friends WHERE name = ?', ['Petunia Petals']);
  if (petuniaPony) {
    const friendResult = await addFriendDuplicate(userId, petuniaPony.id);
    if (friendResult.success) {
      rewardText += `**Petunia Petals** has been added to your collection! (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})\n`;
    } else {
      compensationBits += 1500;
      compensationHarmony += 300;
      rewardText += '**Compensation:** Failed to add Petunia Petals\n';
    }
  } else {
    compensationBits += 1500;
    compensationHarmony += 300;
    rewardText += '**Compensation:** Petunia Petals pony not found\n';
  }
  

  if (compensationBits > 0) {
    await addBits(userId, compensationBits);
    await addHarmony(userId, compensationHarmony);
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(userId, 'earn_bits', compensationBits);
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    rewardText += `\n<:bits:1411354539935666197> **${compensationBits}** and <:harmony:1416514347789844541> **${compensationHarmony}** compensation added!`;
  }
  
  const container = createPurchaseSuccessContainer(
    'Petunia Petals Bundle - Purchase Complete!',
    rewardText,
    interaction.user.toString(),
    0xFF69B4
  );
  
  await interaction.editReply({ 
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleBatPonyPackBundle(interaction, userStats) {
  const userId = interaction.user.id;
  let rewardText = '**🦇 Bat Pony Pack Bundle** unlocked!\n\n';
  let compensationBits = 0;
  let compensationHarmony = 0;
  

  const batPonies = [
    { name: 'Echo', rarity: 4 },
    { name: 'Lucky Roll', rarity: 4 },
    { name: 'Speck', rarity: 3 },
    { name: 'Night Watch', rarity: 3 }
  ];
  
  try {
    for (const pony of batPonies) {

      const ponyRecord = await getRow('SELECT id FROM pony_friends WHERE name = ?', [pony.name]);
      
      if (ponyRecord) {
        const friendResult = await addFriendDuplicate(userId, ponyRecord.id);
        if (friendResult.success) {
          rewardText += `🦇 **${pony.name}** has been added to your collection! (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})\n`;
        } else {
          const compensationAmount = pony.rarity === 4 ? 800 : 600;
          compensationBits += compensationAmount;
          compensationHarmony += pony.rarity === 4 ? 200 : 150;
          rewardText += `**Compensation:** Failed to add ${pony.name}\n`;
        }
      } else {
        const compensationAmount = pony.rarity === 4 ? 800 : 600;
        compensationBits += compensationAmount;
        compensationHarmony += pony.rarity === 4 ? 200 : 150;
        rewardText += `**Compensation:** ${pony.name} pony not found\n`;
      }
    }

    if (compensationBits > 0) {
      await addBits(userId, compensationBits);
      await addHarmony(userId, compensationHarmony);
      

      try {
        const { addQuestProgress } = await import('../../utils/questUtils.js');
        await addQuestProgress(userId, 'earn_bits', compensationBits);
      } catch (questError) {
        console.debug('Quest progress error:', questError.message);
      }
      
      rewardText += `\n<:bits:1411354539935666197> **${compensationBits}** and <:harmony:1294006014678474752> **${compensationHarmony}** compensation added!`;
    }
    
  } catch (error) {
    console.error('Error in handleBatPonyPackBundle:', error);
    throw error;
  }
  
  const container = createPurchaseSuccessContainer(
    'Bat Pony Pack - Purchase Complete!',
    rewardText,
    interaction.user.toString(),
    0x4B0082
  );
  
  await interaction.editReply({ 
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleElementsOfInsanityBundle(interaction, userId) {
  const bundleCost = BUNDLE_PRICES.elements_of_insanity;
  
  try {
    const userDiamonds = await getDiamonds(userId);
    if (userDiamonds < bundleCost) {
      return interaction.followUp({ 
        content: `Not enough diamonds! You need ${bundleCost}, but you have ${userDiamonds}.`, 
        ephemeral: true 
      });
    }

    await removeDiamonds(userId, bundleCost);

    const ponies = [
      'RariFruit',
      'Fluttershout', 
      'Applepills',
      'Pinkis Cupcake',
      'Rainbine',
      'Brutalight Sparcake',
      'Derpigun'
    ];

    let addedPonies = [];
    
    for (const ponyName of ponies) {
      try {

        const ponyRecord = await getRow('SELECT id FROM pony_friends WHERE name = ?', [ponyName]);
        if (ponyRecord) {
          const friendResult = await addFriendDuplicate(userId, ponyRecord.id);
          if (friendResult.success) {
            addedPonies.push(`${ponyName} (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})`);
          } else {
            addedPonies.push(`${ponyName} (Failed to add - compensation given)`);
          }
        } else {
          addedPonies.push(`${ponyName} (Pony not found in database)`);
        }
      } catch (error) {
        console.log(`Error adding pony ${ponyName} for user ${userId}:`, error);
        addedPonies.push(`${ponyName} (Error occurred)`);
      }
    }

    const remainingDiamonds = await getDiamonds(userId);
    const successContainer = new ContainerBuilder();
    
    const successText = new TextDisplayBuilder()
      .setContent(`**Elements of Insanity Bundle Purchased!**\n\nCongratulations! Pony addition results:\n\n${addedPonies.map(name => `• ${name}`).join('\n')}\n\nDiamonds spent: ${bundleCost}\nRemaining diamonds: ${remainingDiamonds}`);
    successContainer.addTextDisplayComponents(successText);

    await interaction.editReply({ 
      content: '', 
      flags: MessageFlags.IsComponentsV2,
      attachments: [],
      components: [successContainer]
    });

  } catch (error) {
    console.error('Error purchasing Elements of Insanity bundle:', error);
    await interaction.followUp({ content: 'An error occurred while purchasing the bundle.', ephemeral: true });
  }
}

async function handleElementsOfInsanityPurchase(interaction) {
  try {
    await interaction.deferUpdate();
    
    const [, , , , userId] = interaction.customId.split('_');
    
    if (interaction.user.id !== userId) {
      return interaction.followUp({
        content: 'Only the command user can make purchases!',
        ephemeral: true
      });
    }

    if (!isElementsOfInsanityActive()) {
      return interaction.followUp({
        content: 'This limited offer has expired!',
        ephemeral: true
      });
    }

    await handleElementsOfInsanityBundle(interaction, userId);
    
  } catch (error) {
    console.error('Error in handleElementsOfInsanityPurchase:', error);
    await interaction.followUp({ content: 'An error occurred while processing your purchase.', ephemeral: true });
  }
}

async function handleBackToShop(interaction) {
  try {
    const [, , , userId] = interaction.customId.split('_');
    
    if (interaction.user.id !== userId) {
      return interaction.followUp({
        content: 'Only the command user can navigate!',
        ephemeral: true
      });
    }

    const userDiamonds = await getDiamonds(userId);
    const container = createShopContainer(userDiamonds, interaction.user.toString());
    
    const selectOptions = [
      {
        label: 'Flawless Bundle - 750',
        description: 'Flawless pony and profile theme',
        value: 'flawless'
      },
      {
        label: 'SciTwilight Bundle - 750',
        description: 'SciTwilight pony and profile theme',
        value: 'scitwi'
      },
      {
        label: 'Nightmare Star Bundle - 750',
        description: 'Ancient solar nightmare pony',
        value: 'nightmare_star'
      },
      {
        label: 'Sunset Satan Bundle - 750',
        description: 'Demonic Sunset Shimmer and theme',
        value: 'sunset_satan'
      },
      {
        label: 'Petunia Petals Bundle - 750',
        description: 'Floral earth pony',
        value: 'petunia_petals'
      },
      {
        label: 'Bat Pony Pack - 750',
        description: 'Four bat ponies collection',
        value: 'bat_pony_pack'
      }
    ];
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`bundle_preview_${userId}`)
      .setPlaceholder('Select a bundle to preview')
      .addOptions(selectOptions);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    container.addActionRowComponents(row);

    await interaction.update({ 
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
    
  } catch (error) {
    console.error('Error in handleBackToShop:', error);
    await interaction.reply({ content: 'An error occurred while returning to shop.', ephemeral: true });
  }
}

export { handleBundlePreview, handleBundlePurchase, handleElementsOfInsanityButton, handleElementsOfInsanityPurchase, handleBackToShop };

export const guildOnly = false;

import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getDiamonds, removeDiamonds, addDiamonds } from '../../models/ResourceModel.js';
import { addBits } from '../../utils/pony/index.js';
import { addHarmony, getHarmony } from '../../models/HarmonyModel.js';
import { addFriend } from '../../models/FriendshipModel.js';
import { grantDonatorBackground, purchaseBackground } from '../../models/ProfileBackgroundModel.js';
import { query, getRow } from '../../utils/database.js';
import { addExperience } from '../../utils/friendshipExperience.js';


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

export const data = new SlashCommandBuilder()
  .setName('donate_shop')
  .setDescription('Premium bundles shop - view exclusive content available for diamonds')
  .setDescriptionLocalizations({
    'ru': 'Донат-магазин - просмотр эксклюзивного контента доступного за алмазы'
  })
  .setDMPermission(false);

const BUNDLE_PRICE = 1500;
const BUNDLE_PRICES = {
  flawless: 1500,
  sadako: 1500,
  scitwi: 1500,
  sunset_satan: 3000,
  nightmare_star: 2000,
  petunia_petals: 3000,
  bat_pony_pack: 3000
};


function getBundlePrice(bundleType) {
  return BUNDLE_PRICES[bundleType] || BUNDLE_PRICE;
}

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const userDiamonds = await getDiamonds(userId);

    const embed = createEmbed({
      title: 'Premium Bundles Shop',
      description: `${interaction.user}, **Your <a:diamond:1423629073984524298>:** ${userDiamonds}\n\n**About Premium Bundles:**\nPremium bundles contain exclusive ponies, skins, and profile themes that cannot be obtained through regular gameplay.\n\n**<a:diamond:1423629073984524298> Prices:**\n• 500 <a:diamond:1423629073984524298> - **$15.00 USD**\n• 1,000 <a:diamond:1423629073984524298> - **$20.00 USD**\n• 1,500 <a:diamond:1423629073984524298> - **$25.00 USD**\n• 3,000 <a:diamond:1423629073984524298> - **$30.00 USD**\n• 5,000 <a:diamond:1423629073984524298> - **$50.00 USD**\nFor two any purchased bundles, you will automatically receive the Donater status with special features that can be found in /help\n\nDm **marepony** in discord for buying diamonds.`,
      user: interaction.user
    });
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`bundle_preview_${userId}`)
      .setPlaceholder('Select a bundle to preview')
      .addOptions([
        {
          label: 'Flawless Bundle - 1,500',
          description: 'Exclusive Flawless pony and profile theme',
          value: 'flawless'
        },
        {
          label: 'Sadako Bundle - 1,500', 
          description: 'Exclusive Sadako pony',
          value: 'sadako'
        },
        {
          label: 'SciTwilight Bundle - 1,500',
          description: 'Exclusive SciTwilight pony and profile theme',
          value: 'scitwi'
        },
        {
          label: 'Nightmare Star Bundle - 2,000',
          description: 'Exclusive ancient solar nightmare pony',
          value: 'nightmare_star'
        },
        {
          label: 'Sunset Satan Bundle - 3,000',
          description: 'Exclusive demonic Sunset Shimmer and theme',
          value: 'sunset_satan'
        },
        {
          label: 'Petunia Petals Bundle - 3,000',
          description: 'Exclusive floral earth pony',
          value: 'petunia_petals'
        },
        {
          label: 'Bat Pony Pack - 3,000',
          description: 'Four exclusive bat ponies collection',
          value: 'bat_pony_pack'
        }
      ]);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    return interaction.reply({ 
      embeds: [embed], 
      components: [row] 
    });
    
  } catch (error) {
    console.error('Error in donate_shop command:', error);
    
    const embed = createEmbed({
      title: 'Premium Bundles Shop',
      description: 'An error occurred while loading the shop.',
      color: 0xFF0000,
      user: interaction.user
    });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
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
    
    let embed;
    
    switch (bundleType) {
      case 'flawless':
        embed = createEmbed({
          title: 'Flawless Bundle - Preview',
          description: `**Price:** ${getBundlePrice('flawless')} <a:diamond:1423629073984524298>\n\n**Contents:**\n• Flawless (Unique Pony)\n• Flawless Profile Theme\n\nA perfect bundle for those who seek perfection. The Flawless pony is an exclusive unique pony with stunning appearance, and the matching profile theme will make your profile stand out with elegant style.`,
          image: 'https://i.imgur.com/xFYaCbZ.png',
          color: 0xFFD700,
          user: interaction.user
        });
        break;
        
      case 'sadako':
        embed = createEmbed({
          title: 'Sadako Bundle - Preview',
          description: `**Price:** ${getBundlePrice('sadako')} <a:diamond:1423629073984524298>\n\n**Contents:**\n• Sadako (Unique Pony)\n\nA mysterious and haunting bundle featuring the exclusive Sadako pony. This unique pony brings an aura of mystery and supernatural charm to your collection.`,
          image: 'https://i.imgur.com/x9XdCZm.png',
          color: 0x800080,
          user: interaction.user
        });
        break;
        
      case 'scitwi':
        embed = createEmbed({
          title: 'SciTwilight Bundle - Preview',
          description: `**Price:** ${getBundlePrice('scitwi')} <a:diamond:1423629073984524298>\n\n**Contents:**\n• SciTwilight (Unique Pony)\n• SciTwilight Profile Theme\n\nA scientific bundle perfect for intellectual ponies! SciTwilight is an exclusive unique pony representing Twilight's darker, more sinister magical form. This mysterious variant brings a unique twist to the beloved character with her evil pony appearance and scientific prowess.`,
          image: 'https://i.imgur.com/UMBB41O.png',
          color: 0x9B59B6,
          user: interaction.user
        });
        break;
        
      case 'nightmare_star':
        embed = createEmbed({
          title: 'Nightmare Star Bundle - Preview',
          description: `**Price:** ${getBundlePrice('nightmare_star')} <a:diamond:1423629073984524298>\n\n**Contents:**\n• Nightmare Star (Unique Pony)\n\nAn ancient and terrifying bundle featuring the legendary Nightmare Star! This exclusive unique pony represents Princess Celestia's darkest corruption, predating even Nightmare Moon. Witness the solar nightmare that once threatened to plunge Equestria into eternal darkness.`,
          image: 'https://i.imgur.com/cHq8q0o.png',
          color: 0xFF4500,
          user: interaction.user
        });
        break;
        
      case 'sunset_satan':
        embed = createEmbed({
          title: 'Sunset Satan Bundle - Preview',
          description: `**Price:** ${getBundlePrice('sunset_satan')} <a:diamond:1423629073984524298>\n\n**Contents:**\n• Sunset Satan (Unique Pony)\n• Sunset Satan Profile Theme`,
          image: 'https://i.imgur.com/Si60XcH.png',
          color: 0x8B0000,
          user: interaction.user
        });
        break;
        
      case 'petunia_petals':
        embed = createEmbed({
          title: 'Petunia Petals Bundle - Preview',
          description: `**Price:** ${getBundlePrice('petunia_petals')} <a:diamond:1423629073984524298>\n\n**Contents:**\n• Petunia Petals (Unique Pony)\n\nA beautiful floral bundle featuring the enchanting Petunia Petals! This exclusive earth pony embodies the essence of spring with her stunning flower-adorned appearance and gentle nature.`,
          image: 'https://i.imgur.com/Q2galTg.png',
          color: 0xFF69B4,
          user: interaction.user
        });
        break;
        
      case 'bat_pony_pack':
        embed = createEmbed({
          title: 'Bat Pony Pack - Preview',
          description: `**Price:** ${getBundlePrice('bat_pony_pack')} <a:diamond:1423629073984524298>\n\n**Contents:**\n• Echo (Unique Bat Pony)\n• Lucky Roll (Unique Bat Pony)\n• Speck (Unique Bat Pony)\n• Night Watch (Unique Bat Pony)\n\nA complete collection of the most beloved fan-created bat ponies! These nocturnal beauties come from the deepest corners of the fandom, each with their own unique personality and mysterious charm. Perfect for collectors who love the darker side of Equestria!`,
          image: 'https://i.imgur.com/2oZafqU.png',
          color: 0x2C1810,
          user: interaction.user
        });
        break;
        
      default:
        throw new Error(`Unknown bundle type: ${bundleType}`);
    }
    

    const bundlePrice = getBundlePrice(bundleType);
    

    embed.setFooter({ text: `Your diamonds: ${userDiamonds} | Bundle cost: ${bundlePrice}` });
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`bundle_preview_${userId}`)
      .setPlaceholder('Select a bundle to preview')
      .addOptions([
        {
          label: 'Flawless Bundle - 1,500',
          description: 'Exclusive Flawless pony and profile theme',
          value: 'flawless'
        },
        {
          label: 'Sadako Bundle - 1,500', 
          description: 'Exclusive Sadako pony',
          value: 'sadako'
        },
        {
          label: 'SciTwilight Bundle - 1,500',
          description: 'Exclusive SciTwilight pony and profile theme',
          value: 'scitwi'
        },
        {
          label: 'Nightmare Star Bundle - 2,000',
          description: 'Exclusive ancient solar nightmare pony',
          value: 'nightmare_star'
        },
        {
          label: 'Sunset Satan Bundle - 3,000',
          description: 'Exclusive demonic Sunset Shimmer and theme',
          value: 'sunset_satan'
        },
        {
          label: 'Petunia Petals Bundle - 3,000',
          description: 'Exclusive floral earth pony',
          value: 'petunia_petals'
        },
        {
          label: 'Bat Pony Pack - 3,000',
          description: 'Four exclusive bat ponies collection',
          value: 'bat_pony_pack'
        }
      ]);
    
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    

    const components = [row1];
    if (userDiamonds >= bundlePrice) {
      const purchaseButton = new ButtonBuilder()
        .setCustomId(`bundle_purchase_${bundleType}_${userId}`)
        .setLabel(`Buy for ${bundlePrice}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('<a:diamond:1423629073984524298>');
      
      const row2 = new ActionRowBuilder().addComponents(purchaseButton);
      components.push(row2);
    }
    
    return interaction.update({ 
      embeds: [embed], 
      components: components 
    });
    
  } catch (error) {
    console.error('Error handling bundle preview:', error);
    
    const errorEmbed = createEmbed({
      title: 'Preview Error',
      description: 'An error occurred while loading the bundle preview.',
      color: 0xFF0000,
      user: interaction.user
    });
    
    return interaction.update({ 
      embeds: [errorEmbed], 
      components: [] 
    });
  }
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
        
      case 'sadako':

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
      const embed = createEmbed({
        title: '<a:diamond:1423629073984524298> Insufficient Diamonds',
        description: `You need ${bundlePrice} <a:diamond:1423629073984524298> diamonds to purchase this bundle.\n\nYou have: ${userDiamonds} <a:diamond:1423629073984524298>`,
        color: 0xFF0000,
        user: interaction.user
      });
      
      return interaction.update({ 
        embeds: [embed], 
        components: [] 
      });
    }

    await interaction.deferUpdate();
    

    if (!customId.includes('_confirm_')) {
      const alreadyHasItems = await checkUserAlreadyHasBundle(userId, bundleType);
      if (alreadyHasItems.length > 0) {
        const embed = createEmbed({
          title: '✅ Theme Already Owned',
          description: `You already have: ${alreadyHasItems.join(', ')}\n\nYou can still purchase this bundle to get another copy of the pony and increase friendship level.`,
          color: 0xFFA500,
          user: interaction.user
        });
        

        const confirmButton = new ButtonBuilder()
          .setCustomId(`bundle_purchase_confirm_${bundleType}_${userId}`)
          .setLabel('Purchase Anyway')
          .setStyle(ButtonStyle.Success);
          
        const row = new ActionRowBuilder().addComponents(confirmButton);
        
        return interaction.editReply({ 
          embeds: [embed], 
          components: [row] 
        });
      }
    }
    

    const success = await removeDiamonds(userId, bundlePrice);
    if (!success) {
      const embed = createEmbed({
        title: 'Purchase Failed',
        description: 'Failed to process payment. Please try again.',
        color: 0xFF0000,
        user: interaction.user
      });
      
      return interaction.editReply({ 
        embeds: [embed], 
        components: [] 
      });
    }
    

    switch (bundleType) {
      case 'flawless':
        await handleFlawlessBundle(interaction, userId);
        break;
      case 'sadako':
        await handleSadakoBundle(interaction, userId);
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
      default:
        throw new Error(`Unknown bundle type: ${bundleType}`);
    }
    
  } catch (error) {
    console.error('Error handling bundle purchase:', error);
    
    const errorEmbed = createEmbed({
      title: 'Purchase Error',
      description: 'An error occurred while processing your purchase.',
      color: 0xFF0000,
      user: interaction.user
    });
    
    return interaction.editReply({ 
      embeds: [errorEmbed], 
      components: [] 
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
    rewardText += '✅ **Flawless Profile Theme** - you already have this theme\n';
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
  
  const successEmbed = createEmbed({
    title: 'Flawless Bundle - Purchase Complete!',
    description: `${interaction.user}\n\n${rewardText}`,
    color: 0xFFD700,
    user: interaction.user
  });
  
  await interaction.editReply({ 
    embeds: [successEmbed], 
    components: [] 
  });
}

async function handleSadakoBundle(interaction, userId) {
  let rewardText = '**Sadako Bundle** unlocked!\n\n';
  let compensationBits = 0;
  let compensationHarmony = 0;
  

  const sadakoPony = await getRow('SELECT id FROM pony_friends WHERE name = ?', ['Sadako']);
  if (sadakoPony) {
    const friendResult = await addFriendDuplicate(userId, sadakoPony.id);
    if (friendResult.success) {
      rewardText += `**Sadako** has been added to your collection! (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})\n`;
    } else {
      compensationBits += 1000;
      compensationHarmony += 200;
      rewardText += '**Compensation:** Failed to add Sadako\n';
    }
  } else {
    compensationBits += 1000;
    compensationHarmony += 200;
    rewardText += '**Compensation:** Sadako pony not found\n';
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
  
  const successEmbed = createEmbed({
    title: 'Sadako Bundle - Purchase Complete!',
    description: `${interaction.user}\n\n${rewardText}`,
    color: 0xFF6B35,
    user: interaction.user
  });
  
  await interaction.editReply({ 
    embeds: [successEmbed], 
    components: [] 
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
    rewardText += '✅ **SciTwilight Profile Theme** - you already have this theme\n';
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
  
  const successEmbed = createEmbed({
    title: 'SciTwilight Bundle - Purchase Complete!',
    description: `${interaction.user}\n\n${rewardText}`,
    color: 0x9B59B6,
    user: interaction.user
  });
  
  await interaction.editReply({ 
    embeds: [successEmbed], 
    components: [] 
  });
}

async function handleNightmareStarBundle(interaction, userId) {
  let rewardText = '☀️🌙 **Nightmare Star Bundle** unlocked!\n\n';
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
  
  const successEmbed = createEmbed({
    title: '☀️🌙 Nightmare Star Bundle - Purchase Complete!',
    description: `${interaction.user}\n\n${rewardText}`,
    color: 0xFF4500,
    user: interaction.user
  });
  
  await interaction.editReply({ 
    embeds: [successEmbed], 
    components: [] 
  });
}

async function handleSunsetSatanBundle(interaction, userId) {
  let rewardText = '😈 **Sunset Satan Bundle** unlocked!\n\n';
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
    rewardText += '✅ **Sunset Satan Profile Theme** - you already have this theme\n';
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
  
  const successEmbed = createEmbed({
    title: '😈 Sunset Satan Bundle - Purchase Complete!',
    description: `${interaction.user}\n\n${rewardText}`,
    color: 0x8B0000,
    user: interaction.user
  });
  
  await interaction.editReply({ 
    embeds: [successEmbed], 
    components: [] 
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
  
  const successEmbed = createEmbed({
    title: '🌸 Petunia Petals Bundle - Purchase Complete!',
    description: `${interaction.user}\n\n${rewardText}`,
    color: 0xFF69B4,
    user: interaction.user
  });
  
  await interaction.editReply({ 
    embeds: [successEmbed], 
    components: [] 
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
  
  const successEmbed = createEmbed({
    title: '🦇 Bat Pony Pack - Purchase Complete!',
    description: `${interaction.user}\n\n${rewardText}`,
    color: 0x4B0082,
    user: interaction.user
  });
  
  await interaction.editReply({ 
    embeds: [successEmbed], 
    components: [] 
  });
}


export { handleBundlePreview, handleBundlePurchase };

export const guildOnly = false;
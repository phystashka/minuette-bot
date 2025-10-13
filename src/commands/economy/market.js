import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { query } from '../../utils/database.js';
import { getResourcesByUserId, updateResources } from '../../models/ResourceModel.js';
import { addBits, getPony } from '../../utils/pony/index.js';
import { addHarmony } from '../../models/HarmonyModel.js';


const MARKET_PONIES = [
  'Twilight Sparkle', 'Rainbow Dash', 'Pinkie Pie', 'Fluttershy', 'Rarity', 'Applejack',
  'Derpy Hooves', 'DJ Pon-3', 'Octavia Melody', 'Lyra Heartstrings', 'Bon Bon',
  'Big Macintosh', 'Granny Smith', 'Apple Bloom', 'Sweetie Belle', 'Scootaloo',
  'Trixie', 'Starlight Glimmer', 'Sunset Shimmer', 'Zecora', 'Spitfire', 'Soarin',
  'Cheerilee', 'Bulk Biceps', 'Carrot Top', 'Roseluck', 'Colgate', 'Berry Punch',
  'Cloudchaser', 'Flitter', 'Thunderlane', 'Lightning Dust', 'Moondancer',
  'Minuette', 'Lemon Hearts', 'Twinkleshine', 'Doctor Whooves', 'Button Mash',
  'Coco Pommel', 'Tree Hugger', 'Suri Polomare', 'Maud Pie', 'Marble Pie', 'Limestone Pie',
  'Aloe', 'Lotus Blossom', 'Cherry Jubilee', 'Filthy Rich', 'Spoiled Rich', 'Diamond Tiara',
  'Silver Spoon', 'Snips', 'Snails', 'Pipsqueak', 'Featherweight', 'Sunny Rays',
  'Noteworthy', 'Amethyst Star', 'Golden Harvest', 'Berryshine'
];



const DEAL_TYPES = {
  SELL: 'sell',
  BUY: 'buy'
};


const RESOURCES = ['wood', 'stone', 'tools', 'plans'];


function getResourceEmoji(resourceType) {
  switch (resourceType) {
    case 'wood': return '<:wooden:1426514988134301787>';
    case 'stone': return '<:stones:1426514985865056326>';
    case 'tools': return '<:tool:1426514983159599135>';
    case 'plans': return '<:cartography:1418286057585250438>';
    case 'key': return '<a:goldkey:1426332679103709314>';
    case 'cases': return '<:case:1417301084291993712>';
    default: return '❓';
  }
}


function getResourceFieldName(resourceType) {
  switch (resourceType) {
    case 'plans': return 'expansion_plans';
    case 'key': return 'keys';
    case 'cases': return 'cases';
    default: return resourceType;
  }
}


const MARKET_REFRESH_TIME = 3 * 60 * 60 * 1000;


export const initMarketTables = async () => {

  await query(`
    CREATE TABLE IF NOT EXISTS user_market_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      pony_name TEXT NOT NULL,
      deal_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_amount INTEGER NOT NULL,
      bits_price INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_refresh DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);


  await query(`
    CREATE TABLE IF NOT EXISTS user_market_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      offer_id INTEGER NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (offer_id) REFERENCES user_market_offers (id)
    )
  `);
};


const generateMarketOffers = async (userId) => {
  try {

    await query(`
      DELETE FROM user_market_purchases 
      WHERE offer_id IN (
        SELECT id FROM user_market_offers WHERE user_id = ?
      )
    `, [userId]);
    

    await query('DELETE FROM user_market_purchases WHERE user_id = ?', [userId]);
    

    await query('DELETE FROM user_market_offers WHERE user_id = ?', [userId]);


    const offers = [];
    const usedPonies = new Set();


    const offerCount = 5;

    for (let i = 0; i < offerCount; i++) {

      let ponyName;
      do {
        ponyName = MARKET_PONIES[Math.floor(Math.random() * MARKET_PONIES.length)];
      } while (usedPonies.has(ponyName) && usedPonies.size < MARKET_PONIES.length);
      
      usedPonies.add(ponyName);


      const dealType = Math.random() < 0.5 ? DEAL_TYPES.SELL : DEAL_TYPES.BUY;
      
      let resourceType, resourceAmount, bitsPrice;


      const specialChance = Math.random() * 100;
      
      if (specialChance <= 3) {

        resourceType = 'key';
        resourceAmount = 1;
        bitsPrice = Math.floor(Math.random() * 2501) + 500;
      } else if (specialChance <= 13) {

        resourceType = 'cases';
        resourceAmount = Math.floor(Math.random() * 5) + 3;
        bitsPrice = Math.floor(Math.random() * 2501) + 500;
      } else {

        resourceType = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
        
        if (resourceType === 'plans') {

          resourceAmount = Math.floor(Math.random() * 6) + 5;
        } else {

          resourceAmount = Math.floor(Math.random() * 151) + 50;
        }
        
        bitsPrice = Math.floor(Math.random() * 2501) + 500;
      }

      offers.push([userId, ponyName, dealType, resourceType, resourceAmount, bitsPrice]);
    }


    for (const offer of offers) {
      await query(
        'INSERT INTO user_market_offers (user_id, pony_name, deal_type, resource_type, resource_amount, bits_price, last_refresh) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        offer
      );
    }

    console.log(`Generated ${offers.length} new market offers for user ${userId}`);
  } catch (error) {
    console.error('Error generating market offers:', error);
  }
};


const checkAndRefreshMarket = async (userId) => {
  try {

    const userOffers = await query('SELECT * FROM user_market_offers WHERE user_id = ? ORDER BY last_refresh DESC LIMIT 1', [userId]);
    
    if (userOffers.length === 0) {

      await generateMarketOffers(userId);
      return true;
    }

    const lastRefresh = new Date(userOffers[0].last_refresh);
    const now = new Date();
    

    if (now - lastRefresh >= MARKET_REFRESH_TIME) {
      await generateMarketOffers(userId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking market refresh:', error);
    return false;
  }
};


const getMarketOffers = async (userId) => {
  try {
    return await query('SELECT * FROM user_market_offers WHERE user_id = ? ORDER BY pony_name', [userId]);
  } catch (error) {
    console.error('Error getting market offers:', error);
    return [];
  }
};


const getUserPurchases = async (userId) => {
  try {

    const userOffers = await query('SELECT * FROM user_market_offers WHERE user_id = ? ORDER BY last_refresh DESC LIMIT 1', [userId]);
    
    if (userOffers.length === 0) return [];

    const lastRefresh = userOffers[0].last_refresh;
    
    return await query(
      'SELECT * FROM user_market_purchases WHERE user_id = ? AND purchased_at >= ?',
      [userId, lastRefresh]
    );
  } catch (error) {
    console.error('Error getting user purchases:', error);
    return [];
  }
};


const createMarketEmbed = async (userId) => {
  let offers = await getMarketOffers(userId);
  let userPurchases = await getUserPurchases(userId);
  let purchasedOfferIds = new Set(userPurchases.map(p => p.offer_id));
  

  const userOffers = await query('SELECT * FROM user_market_offers WHERE user_id = ? ORDER BY last_refresh DESC LIMIT 1', [userId]);
  const lastRefresh = new Date(userOffers[0]?.last_refresh || Date.now());
  const nextRefresh = new Date(lastRefresh.getTime() + MARKET_REFRESH_TIME);
  let timeUntilRefresh = nextRefresh - Date.now();
  

  if (timeUntilRefresh <= 0) {
    await generateMarketOffers(userId);

    offers = await getMarketOffers(userId);
    userPurchases = await getUserPurchases(userId);
    purchasedOfferIds = new Set(userPurchases.map(p => p.offer_id));

    const newUserOffers = await query('SELECT * FROM user_market_offers WHERE user_id = ? ORDER BY last_refresh DESC LIMIT 1', [userId]);
    const newLastRefresh = new Date(newUserOffers[0]?.last_refresh || Date.now());
    const newNextRefresh = new Date(newLastRefresh.getTime() + MARKET_REFRESH_TIME);
    timeUntilRefresh = newNextRefresh - Date.now();
  }
  
  const hours = Math.floor(Math.max(0, timeUntilRefresh) / (1000 * 60 * 60));
  const minutes = Math.floor((Math.max(0, timeUntilRefresh) % (1000 * 60 * 60)) / (1000 * 60));
  
  let description = ``;
  description += `🔄 **Next refresh:** ${hours}h ${minutes}m\n`;
  description += `🛒 **Your purchases:** ${userPurchases.length}/3 this period\n\n`;

  if (offers.length === 0) {
    description += `*No offers available. Market will refresh soon!*`;
  } else {

    const limitedOffers = offers.slice(0, 5);
    limitedOffers.forEach((offer) => {
      const emoji = offer.deal_type === 'sell' ? '💰' : '🛍️';
      const action = offer.deal_type === 'sell' ? 'selling' : 'buying';
      const resourceEmoji = getResourceEmoji(offer.resource_type);
      const isPurchased = purchasedOfferIds.has(offer.id);
      const status = isPurchased ? ' ✅' : '';
      
      description += `${emoji} **${offer.pony_name}** is ${action}${status}\n`;
      description += `${resourceEmoji} ${offer.resource_amount} ${offer.resource_type} for <:bits:1411354539935666197> ${offer.bits_price} bits\n\n`;
    });
  }

  return createEmbed({
    title: '🏪 Ponyville Market',
    description: description,
    color: 0x9B59B6,
  });
};


const createMarketButtons = async (userId) => {
  const offers = await getMarketOffers(userId);
  const userPurchases = await getUserPurchases(userId);
  const purchasedOfferIds = new Set(userPurchases.map(p => p.offer_id));


  if (offers.length === 0) {
    return [];
  }

  const rows = [];
  const buyButtons = [];
  

  const limitedOffers = offers.slice(0, 5);
  
  limitedOffers.forEach((offer) => {
    const isPurchased = purchasedOfferIds.has(offer.id);
    const canPurchase = userPurchases.length < 3 && !isPurchased;
    
    const button = new ButtonBuilder()
      .setCustomId(`market_buy_${offer.id}`)
      .setLabel(`${offer.pony_name}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canPurchase);
    
    if (isPurchased) {
      button.setEmoji('✅');
    } else if (offer.deal_type === 'sell') {
      button.setEmoji('💰');
    } else {
      button.setEmoji('🛍️');
    }
    
    buyButtons.push(button);
  });


  if (buyButtons.length > 0) {
    const row = new ActionRowBuilder();
    row.addComponents(buyButtons);
    rows.push(row);
  }

  return rows;
};


const processPurchase = async (interaction, userId, offerId) => {
  try {

    const offers = await query('SELECT * FROM user_market_offers WHERE id = ? AND user_id = ?', [offerId, userId]);
    if (offers.length === 0) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Error',
          description: 'This offer is no longer available.',
          color: 0xe74c3c,
          user: interaction.user
        })],
        components: []
      });
    }

    const offer = offers[0];
    

    const userPurchases = await getUserPurchases(userId);
    if (userPurchases.length >= 3) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: '🛒 Purchase Limit Reached',
          description: 'You can only make 3 purchases per market period. Wait for the next refresh!',
          color: 0xe74c3c,
          user: interaction.user
        })],
        components: []
      });
    }


    const existingPurchase = await query(
      'SELECT * FROM user_market_purchases WHERE user_id = ? AND offer_id = ?',
      [userId, offerId]
    );
    
    if (existingPurchase.length > 0) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: '🛒 Already Purchased',
          description: 'You have already purchased this offer!',
          color: 0xe74c3c,
          user: interaction.user
        })],
        components: []
      });
    }


    const userPony = await getPony(userId);
    const userResources = await getResourcesByUserId(userId) || { 
      wood: 0, stone: 0, tools: 0, expansion_plans: 0, keys: 0, cases: 0 
    };

    let success = false;
    let resultMessage = '';

    const resourceFieldName = getResourceFieldName(offer.resource_type);
    
    if (offer.deal_type === 'sell') {

      if (userPony.bits >= offer.bits_price) {

        await addBits(userId, -offer.bits_price);
        
        const newResources = { ...userResources };
        newResources[resourceFieldName] += offer.resource_amount;
        
        await updateResources(userId, newResources);
        

        await addHarmony(userId, 75);
        
        success = true;
        resultMessage = `Successfully purchased **${offer.resource_amount} ${offer.resource_type}** from **${offer.pony_name}** for **${offer.bits_price} bits**! (+75 <:harmony:1416514347789844541>)`;
      } else {
        resultMessage = `Not enough bits! You need **${offer.bits_price}** bits but only have **${userPony.bits}** bits.`;
      }
    } else {

      if (userResources[resourceFieldName] >= offer.resource_amount) {

        const newResources = { ...userResources };
        newResources[resourceFieldName] -= offer.resource_amount;
        
        await updateResources(userId, newResources);
        await addBits(userId, offer.bits_price);
        

        await addHarmony(userId, 75);
        
        success = true;
        resultMessage = `Successfully sold **${offer.resource_amount} ${offer.resource_type}** to **${offer.pony_name}** for **${offer.bits_price} bits**! (+75 <:harmony:1416514347789844541>)`;
      } else {
        const resourceEmoji = getResourceEmoji(offer.resource_type);
        resultMessage = `Not enough ${offer.resource_type}! You need **${offer.resource_amount}** ${resourceEmoji} but only have **${userResources[resourceFieldName]}**.`;
      }
    }

    if (success) {

      await query(
        'INSERT INTO user_market_purchases (user_id, offer_id) VALUES (?, ?)',
        [userId, offerId]
      );

      const successReply = {
        embeds: [createEmbed({
          title: '✅ Transaction Successful',
          description: resultMessage,
          color: 0x00ff00,
          user: interaction.user
        })]
      };

      const marketButtons = await createMarketButtons(userId);
      if (marketButtons.length > 0) {
        successReply.components = marketButtons;
      }

      return interaction.editReply(successReply);
    } else {
      return interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Transaction Failed',
          description: resultMessage,
          color: 0xe74c3c,
          user: interaction.user
        })],
        components: []
      });
    }
  } catch (error) {
    console.error('Error processing purchase:', error);
    return interaction.editReply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while processing your purchase.',
        color: 0xe74c3c,
        user: interaction.user
      })],
      components: []
    });
  }
};

export const data = new SlashCommandBuilder()
  .setName('market')
  .setDescription('Visit the Ponyville Market to trade resources with other ponies');

export async function execute(interaction) {

  const ponyCheck = await requirePony(interaction);
  if (ponyCheck !== true) {
    return;
  }

  try {
    await interaction.deferReply();

    const userId = interaction.user.id;


    await initMarketTables();


    const wasRefreshed = await checkAndRefreshMarket(userId);
    const embed = await createMarketEmbed(userId);
    const components = await createMarketButtons(userId);

    let refreshMessage = '';
    if (wasRefreshed) {
      refreshMessage = '\n\n🔄 *Market has been refreshed with new offers!*';
    }

    const replyOptions = {
      embeds: [embed]
    };


    if (components.length > 0) {
      replyOptions.components = components;
    }

    const response = await interaction.editReply(replyOptions);


    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id && i.message.id === response.id,
      time: 300000
    });

    collector.on('collect', async (buttonInteraction) => {
      try {
        await buttonInteraction.deferUpdate();

        if (buttonInteraction.customId.startsWith('market_buy_')) {
          const offerId = parseInt(buttonInteraction.customId.split('_')[2]);
          await processPurchase(buttonInteraction, userId, offerId);
        }
      } catch (error) {
        console.error('Error handling market button interaction:', error);
      }
    });

    collector.on('end', () => {

      interaction.editReply({ components: [] }).catch(console.error);
    });

  } catch (error) {
    console.error('Error in market command:', error);
    
    const errorEmbed = createEmbed({
      title: '❌ Error',
      description: 'An error occurred while loading the market.',
      color: 0xe74c3c,
      user: interaction.user
    });

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}

export const category = 'economy';
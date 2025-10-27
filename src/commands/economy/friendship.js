import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import fs from 'fs';
import { createEmbed } from '../../utils/components.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { 
  getUserFriends, 
  getFriendshipCount, 
  getTotalPonyFriendsCount,
  toggleFavorite,
  getFavoritesCount,
  getUserFriendsByRarityCount,
  getTotalPonyFriendsByRarityCount,
  getAllPoniesForCollection,
  getAllFamilyGroups
} from '../../models/FriendshipModel.js';
import { getRaceEmoji } from '../../utils/pony/ponyUtils.js';
import { getPony } from '../../utils/pony/index.js';
import { t } from '../../utils/localization.js';
import { getImageInfo } from '../../utils/imageResolver.js';
import { hasAvailableSkins, getEquippedSkin } from '../../models/SkinModel.js';

function getImageUrl(imagePath) {
  const imageInfo = getImageInfo(imagePath);
  if (imageInfo && imageInfo.type === 'url') {
    return imageInfo.url; 
  }
  return null;
}

function getImageAttachment(imagePath) {
  const imageInfo = getImageInfo(imagePath);
  if (imageInfo && imageInfo.type === 'attachment') {
    return {
      path: imageInfo.attachmentPath,
      filename: imageInfo.filename
    };
  }
  return null;
}
import { sequelize } from '../../utils/database.js';
import { getCutieMarkFromPonyObject, getCutieMarkForCollection } from '../../utils/cutiemarksManager.js';

const PAGE_SIZE = 8;


const userCollectors = new Map();


function getRaceEmojiWithEvent(race, rarity, ponyName = '') {
  const raceEmoji = getRaceEmoji(race);
  if (rarity === 'EVENT') {

    const oldEventPonies = ['Sweetie Angel', 'Rarity Angel', 'Cozy Demon', 'Rarity Demon'];
    if (oldEventPonies.includes(ponyName)) {
      return `${raceEmoji}😈`;
    }

    return `${raceEmoji}🎃`;
  }
  return raceEmoji;
}


const getTotalPonyCount = async (friendId) => {
  try {

    if (!friendId) {
      return '0';
    }
    
    const result = await sequelize.query(
      'SELECT COUNT(*) as total FROM friendship WHERE friend_id = ?',
      {
        replacements: [friendId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    const count = result[0]?.total || 0;
    return count.toString();
  } catch (error) {
    console.error('Error getting total pony count:', error);
    return '0';
  }
};


function formatRegionName(background) {
  if (!background || background === 'null') return 'Unknown Region';
  
  return background
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}


function formatFamilyName(family_group) {
  if (!family_group || family_group === 'null' || family_group === null) return 'No Family';
  
  return family_group
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}


function stopCurrentCollector(userId = null) {
  if (userId) {

    const collector = userCollectors.get(userId);
    if (collector) {
      try {
        collector.stop('navigation');
      } catch (error) {

      }
      userCollectors.delete(userId);
    }
  } else {

    userCollectors.forEach((collector, id) => {
      try {
        collector.stop('navigation');
      } catch (error) {

      }
    });
    userCollectors.clear();
  }
}


function createFriendshipCollector(response, userId, handlers) {
  stopCurrentCollector(userId);
  
  const collector = response.createMessageComponentCollector({ 
    time: 180000
  });
  
  userCollectors.set(userId, collector);
  
  collector.on('collect', async i => {
    if (i.user.id !== userId) {
      return i.reply({ 
        content: 'This interaction is not for you!', 
        ephemeral: true 
      });
    }
    
    const customId = i.customId;
    

    if (handlers.modalHandlers) {
      for (const [pattern, handler] of handlers.modalHandlers) {
        if (customId.startsWith(pattern)) {
          await handler(i, customId);
          return;
        }
      }
    }
    

    if (!i.replied && !i.deferred) {
      try {
        await i.deferUpdate();
      } catch (error) {

        if (error.code === 40060 || error.code === 10062) {

          return;
        }
        console.error('Error deferring update:', error);
        return;
      }
    }
    

    if (handlers.buttonHandlers) {
      for (const [pattern, handler] of handlers.buttonHandlers) {
        if (customId.startsWith(pattern)) {
          stopCurrentCollector(userId);
          await handler(i, customId);
          return;
        }
      }
    }
  });
  
  collector.on('end', async (collected, reason) => {
    if (reason !== 'navigation') {
      try {
        await response.edit({
          components: []
        }).catch(err => {
          console.error('Failed to update message after collector end:', err);
        });
      } catch (err) {
        console.error('Failed to update message after collector end:', err);
      }
    }
    userCollectors.delete(userId);
  });
  
  return collector;
}


const RARITY_EMOJIS = {
  BASIC: '<:B1:1410754066811981894><:A1:1410754103918858261><:S1:1410754129235673148><:I1:1410754153206251540><:C1:1410754186471145533>',
  RARE: '<:R1:1410892381171089448><:A1:1410892395721261108><:R2:1410892414603890819><:E1:1410892426159198309>',
  EPIC: '<:E2:1410893187949662219><:P2:1410893200511471656><:I2:1410893211886424125><:C2:1410893223794049135>',
  MYTHIC: '<:M2:1410894084544921752><:Y1:1410894082913472532><:T1:1410894075787477072><:H11:1410894074109755402><:I3:1410894072406868070><:C3:1410894070976479282>',
  LEGEND: '<:L4:1410895642615611453><:E4:1410895641042747434><:G4:1410895638991999057><:E5:1410895637523861504><:N4:1410895635405606933><:D4:1410895645040054374>',
  CUSTOM: '<:C5:1410900991703781539><:U5:1410900989774659695><:S5:1410900998964252712><:T5:1410900997366087750><:O5:1410900995600552046><:M5:1410900993910112266>',
  SECRET: '<:S6:1410901772180131840><:E6:1410901770695081984><:C6:1410901769067692114><:R6:1410901767629307995><:E61:1410901765854990396><:T6:1410901764164816898>',
  EVENT: '<:E2:1417857423829500004><:V1:1417857422420217897><:E1:1417857420029595691><:N1:1417857418804854834><:T1:1417857417391378432>',
  UNIQUE: '<:U2:1418945904546938910><:N2:1418945902470631484><:I1:1418945900570480690><:Q1:1418945898679107614><:U2:1418945904546938910><:E3:1418945906115346452>',
  EXCLUSIVE: '<:E1:1425524316858224822><:X2:1425524310570696815><:C3:1425524308997963857><:L4:1425524306833834185><:U5:1425524304845475840><:S6:1425524303470002319><:I7:1425524323002876015><:V8:1425524320985153586><:E9:1425524318732812461>',
  ADMIN: '<:a_:1430153532287488071><:d_:1430153530018238575><:m_:1430153528143380500><:I_:1430153535961694278><:N1:1430153534212407376>'
};


const RARITY_COLORS = {
  BASIC: 0xCCCCCC,
  RARE: 0x3498DB,
  EPIC: 0x9B59B6,
  MYTHIC: 0xF1C40F,
  LEGEND: 0xE74C3C,
  CUSTOM: 0x2ECC71,
  SECRET: 0x34495E,
  EVENT: 0xFF6B35,
  UNIQUE: 0xFFD700,
  EXCLUSIVE: 0xFF69B4,
  ADMIN: 0x800080
};


function getPonyTypeEmoji(ponyType) {
  const typeEmojis = {
    'earth': '🌱',
    'unicorn': '🦄',
    'pegasus': '🕊️',
    'alicorn': '👑',
    'zebra': '🦓',
    'changeling': '🐛',
    'hippogriff': '🦅',
    'crystal': '💎',
    'batpony': '🦇',
    'bat_pony': '🦇',
    'seapony': '🌊',
    'dragon': '🐉',
    'yak': '🐃',
    'griffon': '🦅',
    'skeleton_pony': '💀',
    'skeleton': '💀'
  };
  
  return typeEmojis[ponyType] || '❓';
}


function getPonyTypeEmojiWithEvent(ponyType, rarity, ponyName = '') {
  const baseEmoji = getPonyTypeEmoji(ponyType);
  if (rarity === 'EVENT') {

    const oldEventPonies = ['Sweetie Angel', 'Rarity Angel', 'Cozy Demon', 'Rarity Demon'];
    if (oldEventPonies.includes(ponyName)) {
      return `${baseEmoji}😈`;
    }

    return `${baseEmoji}🎃`;
  }
  return baseEmoji;
}

export const data = new SlashCommandBuilder()
  .setName('friendship')
  .setDescription('View your pony friends collection with visual grid')
  .setDescriptionLocalizations({
    'ru': 'Посмотреть коллекцию пони-друзей в виде сетки'
  })
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName('filter')
      .setDescription('Filter ponies by rarity or ownership')
      .setDescriptionLocalizations({
        'ru': 'Фильтр пони по редкости или владению'
      })
      .setRequired(false)
      .addChoices(
        { name: 'All Ponies', value: 'all' },
        { name: 'Owned Only', value: 'owned' },
        { name: 'Missing Only', value: 'missing' },
        { name: 'Basic Rarity', value: 'BASIC' },
        { name: 'Rare Rarity', value: 'RARE' },
        { name: 'Epic Rarity', value: 'EPIC' },
        { name: 'Mythic Rarity', value: 'MYTHIC' },
        { name: 'Legend Rarity', value: 'LEGEND' },
        { name: 'Custom Rarity', value: 'CUSTOM' },
        { name: 'Secret Rarity', value: 'SECRET' },
        { name: 'Event Rarity', value: 'EVENT' },
        { name: 'Unique Rarity', value: 'UNIQUE' }
      ));

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    stopCurrentCollector(userId);
    
    const filter = interaction.options.getString('filter') || 'all';
    
    const friendsCount = await getFriendshipCount(userId);
    const totalPonyCount = await getTotalPonyFriendsCount();
    

    const userPony = await getPony(userId);
    

    await showGridPage(interaction, userId, 1, filter, 'all', 'all');
    
  } catch (error) {
    console.error('Error in friendship command:', error);
    
    return interaction.reply({
      embeds: [
        createEmbed({
          title: '❌ Error',
          description: `An error occurred while retrieving your friends collection: ${error.message}`
        })
      ],
      ephemeral: true
    });
  }
}

async function showGridPage(interaction, userId, page, filter = 'all', familyFilter = 'all') {
  try {
    stopCurrentCollector(userId);
    

    const isOwnCollection = userId === interaction.user.id;
    

    let allPonies = await getAllPoniesForCollection(userId, filter === 'all' || filter === 'owned' || filter === 'missing' || filter === 'favorites' || filter === 'with-outfits' ? 'all' : filter, familyFilter);
    

    const rarityOrder = ['EXCLUSIVE', 'UNIQUE', 'SECRET', 'CUSTOM', 'LEGEND', 'MYTHIC', 'EPIC', 'RARE', 'BASIC', 'EVENT'];
    
    allPonies.sort((a, b) => {

      if (a.is_owned !== b.is_owned) {
        return b.is_owned - a.is_owned;
      }
      

      const aRarityIndex = rarityOrder.indexOf(a.rarity);
      const bRarityIndex = rarityOrder.indexOf(b.rarity);
      if (aRarityIndex !== bRarityIndex) {
        return aRarityIndex - bRarityIndex;
      }
      

      return a.name.localeCompare(b.name);
    });
    

    if (filter === 'owned') {
      allPonies = allPonies.filter(pony => pony.is_owned === 1);
    } else if (filter === 'missing') {
      allPonies = allPonies.filter(pony => pony.is_owned === 0);
    } else if (filter === 'favorites') {
      allPonies = allPonies.filter(pony => pony.is_favorite === 1 && pony.is_owned === 1);
    } else if (filter === 'with-outfits') {
      allPonies = allPonies.filter(pony => pony.is_owned === 1 && hasAvailableSkins(pony.name));
    }
    
    const totalPonies = allPonies.length;
    const maxPages = Math.ceil(totalPonies / PAGE_SIZE) || 1;
    

    if (page < 1) page = 1;
    if (page > maxPages) page = maxPages;
    

    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, totalPonies);
    const currentPagePonies = allPonies.slice(startIdx, endIdx);
    

    const column1 = [];
    const column2 = [];
    
    for (let i = 0; i < currentPagePonies.length; i++) {
      const pony = currentPagePonies[i];
      const ownedIcon = pony.is_owned ? '✅' : '❌';
      const favoriteIcon = pony.is_favorite ? '❤️' : '';
      

      const cutieMark = getCutieMarkForCollection(pony.name);
      const displayEmoji = cutieMark ? `${cutieMark} ` : '';
      

      let clothingIcon = '';
      if (isOwnCollection && pony.is_owned && hasAvailableSkins(pony.name)) {
        const equippedSkin = await getEquippedSkin(userId, pony.name);
        if (equippedSkin) {
          clothingIcon = '<:clothes:1417925457021505760>';
        }
      }
      
      let ponyLine = `${ownedIcon}${favoriteIcon}${clothingIcon}${displayEmoji}${RARITY_EMOJIS[pony.rarity] || RARITY_EMOJIS['BASIC'] || ''} ${pony.name}`;

      

      if (column1.length < 4) {
        column1.push(ponyLine);
      } else {
        column2.push(ponyLine);
      }
    }
    

    const ownedCount = allPonies.filter(p => p.is_owned === 1).length;
    const missingCount = allPonies.filter(p => p.is_owned === 0).length;
    const totalPonyCount = await getTotalPonyFriendsCount();
    
    let title = await t('friendship.grid_title', interaction.guild?.id);
    if (filter !== 'all') {
      const filterKeys = {
        'owned': 'friendship.owned_ponies',
        'missing': 'friendship.missing_ponies',
        'BASIC': 'friendship.basic_ponies',
        'RARE': 'friendship.rare_ponies',
        'EPIC': 'friendship.epic_ponies',
        'MYTHIC': 'friendship.mythic_ponies',
        'LEGEND': 'friendship.legend_ponies',
        'CUSTOM': 'friendship.custom_ponies',
        'SECRET': 'friendship.secret_ponies',
        'EVENT': 'friendship.event_ponies',
        'UNIQUE': 'friendship.unique_ponies'
      };
      const filterName = await t(filterKeys[filter] || 'unknown', interaction.guild?.id);
      const gridText = await t('friendship.grid', interaction.guild?.id);
      title = `${filterName} ${gridText}`;
    }
    
    if (maxPages > 1) {
      title += ` (${page}/${maxPages})`;
    }
    
    const collectionText = await t('friendship.collection', interaction.guild?.id);
    const poniesOwnedText = await t('friendship.ponies_owned', interaction.guild?.id);
    let description = `**${collectionText}:** ${ownedCount}/${totalPonyCount} ${poniesOwnedText}\n`;
    
    const filterText = await t('friendship.filter_label', interaction.guild?.id);
    if (filter === 'all') {
      const allPoniesText = await t('friendship.all_ponies_filter', interaction.guild?.id);
      const shownText = await t('friendship.shown', interaction.guild?.id);
      description += `**${filterText}:** ${allPoniesText} (${totalPonies} ${shownText})\n`;
    } else if (filter === 'owned') {
      const ownedOnlyText = await t('friendship.owned_only', interaction.guild?.id);
      const poniesText = await t('friendship.ponies', interaction.guild?.id);
      description += `**${filterText}:** ${ownedOnlyText} (${ownedCount} ${poniesText})\n`;
    } else if (filter === 'missing') {
      const missingOnlyText = await t('friendship.missing_only', interaction.guild?.id);
      const poniesText = await t('friendship.ponies', interaction.guild?.id);
      description += `**${filterText}:** ${missingOnlyText} (${missingCount} ${poniesText})\n`;
    } else if (filter === 'favorites') {
      const favoritesText = 'Favorite Ponies Only';
      const poniesText = await t('friendship.ponies', interaction.guild?.id);
      description += `**${filterText}:** ${favoritesText} (${totalPonies} ${poniesText})\n`;
    } else if (filter === 'with-outfits') {
      const outfitsText = 'Ponies with Outfits';
      const poniesText = await t('friendship.ponies', interaction.guild?.id);
      description += `**${filterText}:** ${outfitsText} (${totalPonies} ${poniesText})\n`;
    } else {
      const rarityText = await t('friendship.rarity', interaction.guild?.id);
      const poniesText = await t('friendship.ponies', interaction.guild?.id);
      description += `**${filterText}:** ${filter} ${rarityText} (${totalPonies} ${poniesText})\n`;
    }
    
    const embed = createEmbed({
      title: title,
      description: description,
      fields: []
    });
    

    embed.setImage(null);
    

    if (column1.length > 0) {
      embed.addFields({
        name: await t('friendship.column1', interaction.guild?.id),
        value: column1.join('\n') || '‎',
        inline: true
      });
    }
    
    if (column2.length > 0) {
      embed.addFields({
        name: await t('friendship.column2', interaction.guild?.id), 
        value: column2.join('\n') || '‎',
        inline: true
      });
    }
    

    const components = [];
    

    if (maxPages > 1) {
      const navigationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`friendship_grid_prev_${page}_${filter}_${familyFilter}_${userId}`)
          .setLabel(await t('friendship.previous', interaction.guild?.id))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId(`friendship_grid_next_${page}_${filter}_${familyFilter}_${userId}`)
          .setLabel(await t('friendship.next', interaction.guild?.id))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === maxPages),
        new ButtonBuilder()
          .setCustomId(`friendship_detailed_view_0_false_${filter.replace('-', '|')}_${userId}`)
          .setLabel(await t('friendship.detailed_view', interaction.guild?.id))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(totalPonies === 0),
        new ButtonBuilder()
          .setCustomId(`friendship_search_${filter.replace('-', '|')}_${userId}`)
          .setLabel(await t('friendship.search', interaction.guild?.id))
          .setStyle(ButtonStyle.Primary)
      );
      components.push(navigationRow);
    } else {

      const detailRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`friendship_detailed_view_0_false_${filter.replace('-', '|')}_${userId}`)
          .setLabel(await t('friendship.detailed_view', interaction.guild?.id))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(totalPonies === 0),
        new ButtonBuilder()
          .setCustomId(`friendship_search_${filter.replace('-', '|')}_${userId}`)
          .setLabel(await t('friendship.search', interaction.guild?.id))
          .setStyle(ButtonStyle.Primary)
      );
      components.push(detailRow);
    }
    

    const filterRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`friendship_grid_filter_${page}_${familyFilter}_${userId}`)
        .setPlaceholder(await t('friendship.filter', interaction.guild?.id) + '...')
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('friendship.all_ponies', interaction.guild?.id))
            .setValue('all')
            .setDefault(filter === 'all'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('friendship.owned_ponies', interaction.guild?.id))
            .setValue('owned')
            .setDefault(filter === 'owned'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('friendship.missing_ponies', interaction.guild?.id))
            .setValue('missing')
            .setDefault(filter === 'missing'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.BASIC', interaction.guild?.id))
            .setValue('BASIC')
            .setDefault(filter === 'BASIC'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.RARE', interaction.guild?.id))
            .setValue('RARE')
            .setDefault(filter === 'RARE'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.EPIC', interaction.guild?.id))
            .setValue('EPIC')
            .setDefault(filter === 'EPIC'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.MYTHIC', interaction.guild?.id))
            .setValue('MYTHIC')
            .setDefault(filter === 'MYTHIC'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.LEGEND', interaction.guild?.id))
            .setValue('LEGEND')
            .setDefault(filter === 'LEGEND'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.CUSTOM', interaction.guild?.id))
            .setValue('CUSTOM')
            .setDefault(filter === 'CUSTOM'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.SECRET', interaction.guild?.id))
            .setValue('SECRET')
            .setDefault(filter === 'SECRET'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.EVENT', interaction.guild?.id))
            .setValue('EVENT')
            .setDefault(filter === 'EVENT'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.UNIQUE', interaction.guild?.id))
            .setValue('UNIQUE')
            .setDefault(filter === 'UNIQUE'),
          new StringSelectMenuOptionBuilder()
            .setLabel(await t('rarity.EXCLUSIVE', interaction.guild?.id))
            .setValue('EXCLUSIVE')
            .setDefault(filter === 'EXCLUSIVE'),
          new StringSelectMenuOptionBuilder()
            .setLabel('❤️ Favorites Only')
            .setValue('favorites')
            .setDefault(filter === 'favorites'),
          new StringSelectMenuOptionBuilder()
            .setLabel('👕 With Outfits')
            .setValue('with-outfits')
            .setDefault(filter === 'with-outfits')
        ])
    );
    components.push(filterRow);
    

    const allFamilies = await getAllFamilyGroups();
    if (allFamilies.length > 0) {
      const familyRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`friendship_family_filter_${page}_${filter}_${userId}`)
          .setPlaceholder('Filter by Family...')
          .addOptions([
            new StringSelectMenuOptionBuilder()
              .setLabel('All Families')
              .setValue('all')
              .setDefault(familyFilter === 'all'),
            new StringSelectMenuOptionBuilder()
              .setLabel('No Family')
              .setValue('no_family')
              .setDefault(familyFilter === 'no_family'),
            ...allFamilies.slice(0, 23).map(family =>
              new StringSelectMenuOptionBuilder()
                .setLabel(formatFamilyName(family))
                .setValue(family)
                .setDefault(familyFilter === family)
            )
          ])
      );
      components.push(familyRow);
    }
    
    const messageOptions = {
      embeds: [embed],
      components,
      files: []
    };
    
    let response;
    if (interaction.replied || interaction.deferred) {
      response = await interaction.editReply(messageOptions);
    } else {
      await interaction.reply(messageOptions);
      response = await interaction.fetchReply();
    }
    

    const collector = response.createMessageComponentCollector({ 
      time: 300000
    });
    
    userCollectors.set(userId, collector);
    
    collector.on('collect', async i => {
      if (i.user.id !== userId) {
        return i.reply({ 
          content: await t('friendship.interaction_not_for_you', interaction.guild?.id), 
          ephemeral: true 
        });
      }
      
      const customId = i.customId;
      

      if (customId.startsWith('friendship_search_') && 
          !customId.startsWith('friendship_search_prev_') && 
          !customId.startsWith('friendship_search_next_') &&
          !customId.startsWith('friendship_search_select_')) {
        const parts = customId.split('_');
        const currentFilter = parts[2].replace('|', '-');
        const targetUserId = parts[3];
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        const searchTitle = await t('friendship.search_title', interaction.guild?.id);
        const searchPrompt = await t('friendship.search_prompt', interaction.guild?.id);
        
        const modal = new ModalBuilder()
          .setCustomId(`friendship_search_modal_${currentFilter.replace('-', '|')}_${targetUserId}`)
          .setTitle(searchTitle);
        
        const searchInput = new TextInputBuilder()
          .setCustomId('search_query')
          .setLabel(searchPrompt.replace(':', ''))
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(searchPrompt)
          .setRequired(true)
          .setMaxLength(50);
        
        const actionRow = new ActionRowBuilder().addComponents(searchInput);
        modal.addComponents(actionRow);
        
        await i.showModal(modal);
        return;
      }
      

      if (!customId.includes('modal') && !i.replied && !i.deferred) {
        try {
          await i.deferUpdate();
        } catch (error) {

          if (error.code === 40060 || error.code === 10062) {

            return;
          }
          console.error('Error deferring update:', error);
          return;
        }
      }
      
      if (customId.startsWith('friendship_grid_prev_')) {
        const parts = customId.split('_');
        const currentPage = parseInt(parts[3], 10);
        const currentFilter = parts[4];

        const allParts = parts.slice(5);
        const targetUserId = allParts[allParts.length - 1];
        const currentFamilyFilter = allParts.slice(0, -1).join('_') || 'all';
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        stopCurrentCollector(userId);
        await showGridPage(i, userId, currentPage - 1, currentFilter, currentFamilyFilter);
      } 
      else if (customId.startsWith('friendship_grid_next_')) {
        const parts = customId.split('_');
        const currentPage = parseInt(parts[3], 10);
        const currentFilter = parts[4];
        const allParts = parts.slice(5);
        const targetUserId = allParts[allParts.length - 1];
        const currentFamilyFilter = allParts.slice(0, -1).join('_') || 'all';
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        stopCurrentCollector();
        await showGridPage(i, userId, currentPage + 1, currentFilter, currentFamilyFilter);
      }
      else if (customId.startsWith('friendship_grid_filter_')) {
        const parts = customId.split('_');
        const currentPage = parseInt(parts[3], 10);
        const allParts = parts.slice(4);
        const targetUserId = allParts[allParts.length - 1];
        const currentFamilyFilter = allParts.slice(0, -1).join('_') || 'all';
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        const newFilter = i.values[0];
        stopCurrentCollector();
        await showGridPage(i, userId, 1, newFilter, currentFamilyFilter); 
      }
      else if (customId.startsWith('friendship_family_filter_')) {
        const parts = customId.split('_');
        const currentPage = parseInt(parts[3], 10);
        const currentFilter = parts[4];
        const targetUserId = parts[5];
        
        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        const newFamilyFilter = i.values[0];
        stopCurrentCollector();
        await showGridPage(i, userId, 1, currentFilter, newFamilyFilter); 
      }
      else if (customId.startsWith('friendship_detailed_view_')) {
        const parts = customId.split('_');
        const index = parseInt(parts[3], 10);
        const onlyFavs = parts[4] === 'true';
        const filterType = parts[5].replace('|', '-');
        const viewingUserId = parts[6];
        collector.stop('navigation');

        const viewingUser = await interaction.client.users.fetch(viewingUserId);
        await showDetailedView(i, viewingUserId, index, onlyFavs, filterType, viewingUser);
      }
    });
    
    collector.on('end', async (collected, reason) => {
      if (reason !== 'navigation') {
        try {
          await response.edit({
            components: []
          }).catch(err => {
            console.error('Failed to update message after collector end:', err);
          });
        } catch (err) {
          console.error('Failed to update message after collector end:', err);
        }
      }
    });
    
  } catch (error) {
    console.error('Error showing grid page:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          createEmbed({
            title: '❌ Error',
            description: `An error occurred while loading the pony grid: ${error.message}`,
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    } else {
      try {
        await interaction.editReply({
          embeds: [
            createEmbed({
              title: '❌ Error',
              description: `An error occurred while loading the pony grid: ${error.message}`,
              user: interaction.user
            })
          ],
          components: []
        });
      } catch (editError) {
        console.error('Failed to edit reply with error message:', editError);
      }
    }
  }
}

async function showFriendsListPage(interaction, userId, page, onlyFavorites = false, rarityFilter = 'all', targetUser = null) {
  try {

    if (!targetUser) {
      targetUser = interaction.user;
    }
    
    const isOwnCollection = targetUser.id === interaction.user.id;
    

    const userPony = await getPony(userId);
    
    const allFriends = await getUserFriends(userId, onlyFavorites, rarityFilter);
    
    const friendsCount = allFriends.length;
    const totalPonyCount = await getTotalPonyFriendsCount();
    const favoritesCount = await getFavoritesCount(userId);
    

    const userRarityCounts = await getUserFriendsByRarityCount(userId);
    const totalRarityCounts = await getTotalPonyFriendsByRarityCount();
    

    const rarityStats = {
      BASIC: { user: 0, total: 0 },
      RARE: { user: 0, total: 0 },
      EPIC: { user: 0, total: 0 },
      MYTHIC: { user: 0, total: 0 },
      LEGEND: { user: 0, total: 0 },
      CUSTOM: { user: 0, total: 0 },
      SECRET: { user: 0, total: 0 },
      EVENT: { user: 0, total: 0 }
    };
    

    userRarityCounts.forEach(({ rarity, count }) => {
      if (rarityStats[rarity]) {
        rarityStats[rarity].user = count;
      }
    });
    

    totalRarityCounts.forEach(({ rarity, count }) => {
      if (rarityStats[rarity]) {
        rarityStats[rarity].total = count;
      }
    });
    
    if (onlyFavorites && friendsCount === 0) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            createEmbed({
              title: 'Favorite Ponies',
              description: `${isOwnCollection ? 'You don\'t' : `${targetUser.username} doesn't`} have any favorite ponies yet!\n\n${isOwnCollection ? '> Add ponies to favorites using the `/fav_add` command.' : ''}`,
              color: 0xF8BBD0
            })
          ],
          ephemeral: !isOwnCollection
        });
      } else {
        return showGridPage(interaction, userId, 1, rarityFilter, 'all');
      }
    }
    
    let maxPages = Math.ceil(friendsCount / PAGE_SIZE);
    if (maxPages === 0) maxPages = 1;
    

    if (page < 1) page = 1;
    if (page > maxPages) page = maxPages;
    

    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, friendsCount);
    

    const currentPageFriends = allFriends.slice(startIdx, endIdx);
    

    let friendsList = '';
    
    for (const friend of currentPageFriends) {
      if (friend.name && friend.rarity) {

        const cutieMark = getCutieMarkFromPonyObject(friend);
        const displayEmoji = cutieMark ? `${cutieMark} ` : '';
        friendsList += `${RARITY_EMOJIS[friend.rarity] || RARITY_EMOJIS['BASIC'] || ''} ${displayEmoji}${friend.name}${friend.is_unique ? ' ⭐' : ''}\n`;
      } else {

      }
    }
    

    let descriptionText = '';
    
    if (onlyFavorites) {
      descriptionText = `> **Favorites:** ${friendsCount} ponies\n\n`;
    } else {
      if (rarityFilter === 'all') {
        descriptionText = `> **Collection:** ${friendsCount}/${totalPonyCount} ponies`;

        if (favoritesCount > 0) {
          descriptionText += ` • **Favorites:** ${favoritesCount}`;
        }
        descriptionText += `\n\n`;
        } else {
        const totalForRarity = rarityStats[rarityFilter] ? rarityStats[rarityFilter].total : 0;
        descriptionText = `> **${rarityFilter} Collection:** ${friendsCount}/${totalForRarity} ponies\n\n`;
      }
    }
    

    if (friendsList.length > 0) {
      descriptionText += friendsList;
    }
    

    const embed = createEmbed({
      title: `${isOwnCollection ? 'Your' : `${targetUser.username}'s`} Friendship Collection${maxPages > 1 ? ` (${page}/${maxPages})` : ''}`,
      description: descriptionText,
      user: interaction.user
    });
    

    const navigationRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`friendship_list_prev_${page}_${onlyFavorites}_${rarityFilter}_${targetUser.id}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1 || friendsCount === 0),
      new ButtonBuilder()
        .setCustomId(`friendship_list_next_${page}_${onlyFavorites}_${rarityFilter}_${targetUser.id}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === maxPages || friendsCount === 0),
      new ButtonBuilder()
        .setCustomId(`friendship_list_toggle_favorites_${page}_${!onlyFavorites}_${rarityFilter}_${targetUser.id}`)
        .setLabel(onlyFavorites ? 'Show All' : 'Favorites')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(favoritesCount === 0 && !onlyFavorites),
      new ButtonBuilder()
        .setCustomId(`friendship_detailed_view_0_${onlyFavorites}_${rarityFilter}_${targetUser.id}`)
        .setLabel(await t('friendship.detailed_view', interaction.guild?.id))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(friendsCount === 0)
    );

    const components = [navigationRow];
    
    const messageOptions = {
      embeds: [embed],
      components
    };
    
    let response;
    if (interaction.replied || interaction.deferred) {
      response = await interaction.editReply(messageOptions);
    } else {
      await interaction.reply(messageOptions);
      response = await interaction.fetchReply();
    }
    
    if (components.length > 0) {
      const collector = response.createMessageComponentCollector({ 
        time: 180000
      });
      
      userCollectors.set(userId, collector);
      
      collector.on('collect', async i => {
        if (i.user.id !== userId) {
          return i.reply({ 
            content: 'This interaction is not for you!', 
            ephemeral: true 
          });
        }
        
        try {
          if (!i.replied && !i.deferred) {
            await i.deferUpdate();
          }
        } catch (error) {

          if (error.code === 40060 || error.code === 10062) {

            return;
          }
          console.error('Error deferring update:', error);
          return;
        }
        
        const customId = i.customId;
        
        if (customId.startsWith('friendship_list_prev_')) {
          const parts = customId.split('_');
          const onlyFavs = parts[parts.length - 3] === 'true';
          const filter = parts[parts.length - 2];
          const targetUserId = parts[parts.length - 1];
          

          if (i.user.id !== targetUserId) {
            await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
            return;
          }
          
          stopCurrentCollector();
          await showFriendsListPage(i, userId, page - 1, onlyFavs, filter, targetUser);
        } 
        else if (customId.startsWith('friendship_list_next_')) {
          const parts = customId.split('_');
          const onlyFavs = parts[parts.length - 3] === 'true';
          const filter = parts[parts.length - 2];
          const targetUserId = parts[parts.length - 1];
          

          if (i.user.id !== targetUserId) {
            await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
            return;
          }
          
          stopCurrentCollector();
          await showFriendsListPage(i, userId, page + 1, onlyFavs, filter, targetUser);
        }
        else if (customId.startsWith('friendship_list_toggle_favorites_')) {
          const parts = customId.split('_');
          const onlyFavs = parts[parts.length - 3] === 'true';
          const filter = parts[parts.length - 2];
          const targetUserId = parts[parts.length - 1];
          

          if (i.user.id !== targetUserId) {
            await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
            return;
          }
          
          stopCurrentCollector();
          await showFriendsListPage(i, userId, 1, onlyFavs, filter, targetUser);
        }
        else if (customId.startsWith('friendship_list_toggle_rarity_')) {
          const parts = customId.split('_');
          const onlyFavs = parts[parts.length - 2] === 'true';
          const filter = parts[parts.length - 1];
          stopCurrentCollector();
          await showFriendsListPage(i, userId, 1, onlyFavs, filter, targetUser);
        }
        else if (customId.startsWith('friendship_detailed_view_')) {
          const parts = customId.split('_');
          const index = parseInt(parts[3], 10);
          const onlyFavs = parts[4] === 'true';
          const filter = parts[5];
          const viewingUserId = parts[6];
          stopCurrentCollector();

          const viewingUser = await interaction.client.users.fetch(viewingUserId);
          await showDetailedView(i, viewingUserId, index, onlyFavs, filter, viewingUser);
        }
      });
      
      collector.on('end', async (collected, reason) => {
        if (reason !== 'navigation') {
          userCollectors.delete(userId);
          try {
            await response.edit({
              components: []
            }).catch(err => {
              console.error('Failed to update message after collector end:', err);
            });
          } catch (err) {
            console.error('Failed to update message after collector end:', err);
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error showing friends list page:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          createEmbed({
            title: '❌ Error',
            description: `An error occurred while loading the friends list: ${error.message}`,
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    } else {
      try {
        await interaction.editReply({
          embeds: [
            createEmbed({
              title: '❌ Error',
              description: `An error occurred while loading the friends list: ${error.message}`,
              user: interaction.user
            })
          ],
          components: []
        });
      } catch (editError) {
        console.error('Failed to edit reply with error message:', editError);
      }
    }
  }
}

async function showDetailedView(interaction, userId, friendIndex = 0, onlyFavorites = false, filter = 'all', targetUser = null) {
  try {
    stopCurrentCollector(userId);
    

    if (!targetUser) {
      targetUser = interaction.user;
    }
    
    const isOwnCollection = targetUser.id === interaction.user.id;
    

    let friends;
    if (filter === 'all' || filter === 'owned' || filter === 'missing' || filter === 'favorites' || filter === 'with-outfits') {

      let allPonies = await getAllPoniesForCollection(userId, 'all');
      

      if (filter === 'owned') {
        allPonies = allPonies.filter(pony => pony.is_owned === 1);
      } else if (filter === 'missing') {
        allPonies = allPonies.filter(pony => pony.is_owned === 0);
      } else if (filter === 'favorites') {
        allPonies = allPonies.filter(pony => pony.is_favorite === 1 && pony.is_owned === 1);
      } else if (filter === 'with-outfits') {
        allPonies = allPonies.filter(pony => pony.is_owned === 1 && hasAvailableSkins(pony.name));
      }
      

      const rarityOrder = ['EXCLUSIVE', 'UNIQUE', 'SECRET', 'CUSTOM', 'LEGEND', 'MYTHIC', 'EPIC', 'RARE', 'BASIC', 'EVENT'];
      
      allPonies.sort((a, b) => {

        if (a.is_owned !== b.is_owned) {
          return b.is_owned - a.is_owned;
        }
        

        const aRarityIndex = rarityOrder.indexOf(a.rarity);
        const bRarityIndex = rarityOrder.indexOf(b.rarity);
        if (aRarityIndex !== bRarityIndex) {
          return aRarityIndex - bRarityIndex;
        }
        

        return a.name.localeCompare(b.name);
      });
      
      friends = allPonies;
    } else {

      let allPonies = await getAllPoniesForCollection(userId, filter);
      

      const rarityOrder = ['EXCLUSIVE', 'UNIQUE', 'SECRET', 'CUSTOM', 'LEGEND', 'MYTHIC', 'EPIC', 'RARE', 'BASIC', 'EVENT'];
      
      allPonies.sort((a, b) => {

        if (a.is_owned !== b.is_owned) {
          return b.is_owned - a.is_owned;
        }
        

        const aRarityIndex = rarityOrder.indexOf(a.rarity);
        const bRarityIndex = rarityOrder.indexOf(b.rarity);
        if (aRarityIndex !== bRarityIndex) {
          return aRarityIndex - bRarityIndex;
        }
        

        return a.name.localeCompare(b.name);
      });
      
      friends = allPonies;
    }
    
    if (friends.length === 0) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            createEmbed({
              title: onlyFavorites ? '💔 No favorite ponies' : '🦄 No pony friends',
              description: onlyFavorites 
                ? 'You don\'t have any favorite ponies yet! Add ponies to favorites using the `/fav_add` command.'
                : 'You don\'t have any pony friends yet! Use the `/venture` command to meet ponies and make friends with them.',
              color: 0xF8BBD0
            })
          ],
          ephemeral: true
        });
      } else {
        return showGridPage(interaction, userId, 1, filter, 'all');
      }
    }
    
    friendIndex = (friendIndex + friends.length) % friends.length;
    
    const friend = friends[friendIndex];
    


    const cutieMark = friend.friendship_level !== undefined 
      ? getCutieMarkFromPonyObject(friend) 
      : getCutieMarkForCollection(friend.name);
    const emoji = cutieMark || '';
    

    const rarityColors = {
      BASIC: 0xCCCCCC,
      RARE: 0x3498DB,
      EPIC: 0x9B59B6,
      MYTHIC: 0xF1C40F,
      LEGEND: 0xE74C3C,
      CUSTOM: 0x2ECC71,
      SECRET: 0x34495E,
      EVENT: 0xFF6B35
    };
    
    const ownedIcon = friend.is_owned ? '✅' : '❌';
    

    let displayImage = null;
    let displayTitle = `${ownedIcon}${friend.is_favorite ? '❤️ ' : ''}${emoji} ${friend.name}${friend.is_unique ? ' ⭐' : ''}`;
    let files = [];
    
    const attachment = getImageAttachment(friend.image);
    if (attachment) {
      const safeFilename = attachment.filename;
      displayImage = `attachment://${safeFilename}`;
      const { AttachmentBuilder } = await import('discord.js');
      files.push(new AttachmentBuilder(attachment.path, { name: safeFilename }));
    } else {
      displayImage = getImageUrl(friend.image);
    }
    
    if (friend.is_owned && hasAvailableSkins(friend.name)) {
      const equippedSkin = await getEquippedSkin(userId, friend.name);
      if (equippedSkin) {
        const { getSkinImagePath, formatSkinTitle } = await import('../../models/SkinModel.js');
        const skinPath = getSkinImagePath(friend.name, equippedSkin.id);
        
        if (skinPath && fs.existsSync(skinPath)) {
          const safeFilename = equippedSkin.filename;
          displayImage = `attachment://${safeFilename}`;
          displayTitle = `${ownedIcon}${friend.is_favorite ? '❤️ ' : ''}<:clothes:1417925457021505760>${emoji} ${formatSkinTitle(friend.name, equippedSkin.id)}${friend.is_unique ? ' ⭐' : ''}`;
          const { AttachmentBuilder } = await import('discord.js');
          files = [new AttachmentBuilder(skinPath, { name: safeFilename })];
        }
      }
    }
    
    const detailedEmbed = createEmbed({
      title: displayTitle,
      description: friend.description,
      image: displayImage,
      fields: [
        { name: 'Pony type', value: getPonyTypeInEnglish(friend.pony_type) || 'Unknown', inline: true },
        { name: 'Rarity', value: RARITY_EMOJIS[friend.rarity] || RARITY_EMOJIS['BASIC'] || 'Unknown', inline: true },
        { name: 'Region', value: formatRegionName(friend.background) || 'Unknown', inline: true },
        { name: 'Total Ponies', value: (await getTotalPonyCount(friend.friend_id || friend.id))?.toString() || '0', inline: true },
        { name: 'Family', value: formatFamilyName(friend.family_group) || 'None', inline: true }
      ],
      footer: { text: `Pony ${friendIndex + 1} of ${friends.length}` },
      user: interaction.user
    });
    
    const components = [];
    
    const navigationRow = new ActionRowBuilder();
    
    if (friends.length > 1) {
      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`friendship_detailed_prev_${friendIndex}_${onlyFavorites}_${filter}_${targetUser.id}`)
          .setLabel(await t('friendship.previous', interaction.guild?.id))
          .setStyle(ButtonStyle.Secondary)
      );
      
      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`friendship_detailed_next_${friendIndex}_${onlyFavorites}_${filter}_${targetUser.id}`)
          .setLabel(await t('friendship.next', interaction.guild?.id))
          .setStyle(ButtonStyle.Secondary)
      );
    }
    













    

    navigationRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`friendship_back_to_grid_1_${filter}_${targetUser.id}`)
        .setLabel(await t('friendship.back_to_grid', interaction.guild?.id))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`friendship_search_detailed_${filter.replace('-', '|')}_${targetUser.id}`)
        .setLabel(await t('friendship.search', interaction.guild?.id))
        .setStyle(ButtonStyle.Primary)
    );
    

    components.push(navigationRow);
    

    if (isOwnCollection && friend.is_owned && hasAvailableSkins(friend.name)) {
      const clothingRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`friendship_clothing_${friendIndex}_${friend.id}_${friend.name}_${onlyFavorites}_${filter}_${targetUser.id}`)
            .setLabel('Clothing')
            .setStyle(ButtonStyle.Secondary)
        );
      components.push(clothingRow);
    }
    
    if (friends.length > 5) {
      const selectRow = new ActionRowBuilder();
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`friendship_select_pony_${onlyFavorites}_${filter}_${targetUser.id}`)
        .setPlaceholder('Quick jump to pony...')
        .setMaxValues(1)
        .setMinValues(1);
      
      const maxOptions = Math.min(friends.length, 25);
      for (let i = 0; i < maxOptions; i++) {
        const currFriend = friends[i];
        const favoriteIcon = currFriend.is_favorite ? '❤️ ' : '';
        

        let clothingInfo = '';
        if (isOwnCollection && currFriend.is_owned && hasAvailableSkins(currFriend.name)) {
          const equippedSkin = await getEquippedSkin(userId, currFriend.name);
          if (equippedSkin) {
            clothingInfo = ' | Outfit equipped';
          }
        }
        
        selectMenu.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${currFriend.name}`)
            .setDescription(`${currFriend.rarity} rarity${clothingInfo}`)
            .setValue(`${i}`)
            .setEmoji(currFriend.is_favorite ? '❤️' : (currFriend.rarity === 'EVENT' ? (
              ['Sweetie Angel', 'Rarity Angel', 'Cozy Demon', 'Rarity Demon'].includes(currFriend.name) ? '😈' : '🎃'
            ) : (

              currFriend.friendship_level !== undefined 
                ? (getCutieMarkFromPonyObject(currFriend) || '🐎')
                : (getCutieMarkForCollection(currFriend.name) || '🐎')
            )))
            .setDefault(i === friendIndex)
        );
      }
      
      selectRow.addComponents(selectMenu);
      components.push(selectRow);
    }
    
    const messageOptions = {
      embeds: [detailedEmbed],
      components,
      files: files
    };
    
    let response;
    if (interaction.replied || interaction.deferred) {
      response = await interaction.editReply(messageOptions);
    } else {
      await interaction.reply(messageOptions);
      response = await interaction.fetchReply();
    }
    
    const collector = response.createMessageComponentCollector({ 
      time: 180000
    });
    
    userCollectors.set(userId, collector);
    
    collector.on('collect', async i => {
      if (i.user.id !== userId) {
        return i.reply({ 
          content: 'This interaction is not for you!', 
          ephemeral: true 
        });
      }
      
      const customId = i.customId;

      

      if (customId.startsWith('friendship_search_detailed_')) {
        if (customId.startsWith('friendship_search_detailed_')) {
          const parts = customId.split('_');
          const currentFilter = parts[3].replace('|', '-');
          const targetUserId = parts[4];
          

          if (i.user.id !== targetUserId) {
            await i.reply({ content: 'You can only search in your own friendship collection.', ephemeral: true });
            return;
          }
          
          const searchTitle = await t('friendship.search_title', interaction.guild?.id);
          const searchPrompt = await t('friendship.search_prompt', interaction.guild?.id);
          
          const modal = new ModalBuilder()
            .setCustomId(`friendship_search_detailed_modal_${currentFilter.replace('-', '|')}_${targetUserId}`)
            .setTitle(searchTitle);
          
          const searchInput = new TextInputBuilder()
            .setCustomId('search_query')
            .setLabel(searchPrompt.replace(':', ''))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(searchPrompt)
            .setRequired(true)
            .setMaxLength(50);
          
          const actionRow = new ActionRowBuilder().addComponents(searchInput);
          modal.addComponents(actionRow);
          
          await i.showModal(modal);
          return;
        }
      }
      

      if (customId.startsWith('clothing_buy_')) {
        const parts = customId.split('_');
        const paymentType = parts[2];
        const friendIndexFromId = parseInt(parts[3]);
        const ponyIdFromId = parts[4];
        

        const originalPonyName = `${parts[5]} ${parts[6]}`;
        

        const skinIdToBuy = `${parts[7]}_${parts[8]}`;
        const skinIndex = parseInt(parts[9]);
        const onlyFavorites = parts[10] === 'true';
        const filter = parts[11];
        



        
        const { purchaseSkin } = await import('../../models/SkinModel.js');
        const { addBits, getPony } = await import('../../utils/pony/index.js');
        const { getHarmony, removeHarmony } = await import('../../models/HarmonyModel.js');
        

        const userPony = await getPony(userId);
        if (!userPony) {
          return i.reply({
            content: 'You need to create a pony profile first! Use `/equestria` command.',
            ephemeral: true
          });
        }
        

        const userHarmony = await getHarmony(userId);
        

        

        const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
        const currentAvailableSkinsForPony = AVAILABLE_SKINS[originalPonyName] || [];

        
        const skin = currentAvailableSkinsForPony.find(s => s.id === skinIdToBuy);

        
        if (!skin) {

          return i.reply({
            content: `Skin not found! ID: ${skinIdToBuy}`,
            ephemeral: true
          });
        }
        

        if (skin.hidden) {

          return i.reply({
            content: `This skin is not available for purchase!`,
            ephemeral: true
          });
        }
        
        const price = paymentType === 'harmony' ? skin.price_harmony : skin.price_bits;
        const currency = paymentType === 'harmony' ? 'harmony' : 'bits';
        

        const currentAmount = paymentType === 'harmony' ? 
          userHarmony || 0 : 
          userPony.bits || 0;
        

        
        if (currentAmount < price) {
          return i.reply({
            content: `Not enough ${currency}! You have ${currentAmount}, but need ${price}.`,
            ephemeral: true
          });
        }
        

        const purchaseResult = await purchaseSkin(userId, originalPonyName, skinIdToBuy, paymentType);
        
        if (purchaseResult.success) {

          if (paymentType === 'harmony') {
            await removeHarmony(userId, price, `Purchased ${skin.name} skin for ${originalPonyName}`);
          } else {
            await addBits(userId, -price);
          }
          
          await i.reply({
            content: `Successfully purchased ${skin.name} outfit for ${price} ${currency}!`,
            ephemeral: true
          });
          

          stopCurrentCollector();
          await showClothingInterface(interaction, userId, friendIndexFromId, ponyIdFromId, originalPonyName, onlyFavorites, filter, skinIndex);
        } else {
          await i.reply({
            content: 'Failed to purchase skin. Please try again.',
            ephemeral: true
          });
        }
        return;
      }
      

      if (!i.replied && !i.deferred) {
        try {
          await i.deferUpdate();
        } catch (error) {
          console.error('Error deferring update:', error);
          return;
        }
      }
      
      if (customId.startsWith('friendship_detailed_prev_')) {
        const parts = customId.split('_');
        const currIndex = parseInt(parts[3], 10);
        const onlyFavs = parts[4] === 'true';
        const filter = parts[5];
        const targetUserId = parts[6];
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        const newIndex = (currIndex - 1 + friends.length) % friends.length;
        stopCurrentCollector();
        await showDetailedView(i, userId, newIndex, onlyFavs, filter);
      } 
      else if (customId.startsWith('friendship_detailed_next_')) {
        const parts = customId.split('_');
        const currIndex = parseInt(parts[3], 10);
        const onlyFavs = parts[4] === 'true';
        const filter = parts[5];
        const targetUserId = parts[6];
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        const newIndex = (currIndex + 1) % friends.length;
        stopCurrentCollector();
        await showDetailedView(i, userId, newIndex, onlyFavs, filter);
      }











































      else if (customId.startsWith('clothing_prev_')) {

        try {
          const parts = customId.split('_');
          const friendIndex = parseInt(parts[2]);
          const ponyId = parts[3];
          const ponyName = `${parts[4]} ${parts[5]}`;
          const skinIndex = parseInt(parts[6]);
          const onlyFavorites = parts[7] === 'true';
          const filter = parts[8];
          

          
          const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
          const { query } = await import('../../utils/database.js');
          

          const userSkinsForFiltering = await query(
            'SELECT skin_id FROM user_skins WHERE user_id = ? AND pony_name = ?',
            [userId, ponyName]
          );
          

          const allAvailableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
          const availableSkinsForPony = allAvailableSkinsForPony.filter(skin => {
            return !skin.hidden || userSkinsForFiltering.some(us => us.skin_id === skin.id);
          });
          
          const allSkins = [{ id: 'default' }, ...availableSkinsForPony];
          
          const newSkinIndex = (skinIndex - 1 + allSkins.length) % allSkins.length;

          
          await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, newSkinIndex);

        } catch (error) {
          console.error('[ERROR] clothing_prev_ failed:', error);
          try {
            await i.followUp({
              content: 'An error occurred while navigating clothing. Please try again.',
              ephemeral: true
            });
          } catch (followUpError) {
            console.error('[ERROR] Failed to send followUp:', followUpError);
          }
        }
      }
      else if (customId.startsWith('clothing_next_')) {

        const parts = customId.split('_');
        const friendIndex = parseInt(parts[2]);
        const ponyId = parts[3];
        const ponyName = `${parts[4]} ${parts[5]}`;
        const skinIndex = parseInt(parts[6]);
        const onlyFavorites = parts[7] === 'true';
        const filter = parts[8];
        
        const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
        const { query } = await import('../../utils/database.js');
        

        const userSkinsForFiltering = await query(
          'SELECT skin_id FROM user_skins WHERE user_id = ? AND pony_name = ?',
          [userId, ponyName]
        );
        

        const allAvailableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
        const availableSkinsForPony = allAvailableSkinsForPony.filter(skin => {
          return !skin.hidden || userSkinsForFiltering.some(us => us.skin_id === skin.id);
        });
        
        const allSkins = [{ id: 'default' }, ...availableSkinsForPony];
        
        const newSkinIndex = (skinIndex + 1) % allSkins.length;
        await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, newSkinIndex);
      }
      else if (customId.startsWith('clothing_apply_')) {
        const parts = customId.split('_');
        const friendIndex = parseInt(parts[2]);
        const ponyId = parts[3];
        

        const originalPonyName = `${parts[4]} ${parts[5]}`;
        

        const skinIdToApply = `${parts[6]}_${parts[7]}`;
        const skinIndex = parseInt(parts[8]);
        const onlyFavorites = parts[9] === 'true';
        const filter = parts[10];
        
        const { equipSkin } = await import('../../models/SkinModel.js');
        const result = await equipSkin(userId, originalPonyName, skinIdToApply);
        
        if (result.success) {
          await showClothingInterface(i, userId, friendIndex, ponyId, originalPonyName, onlyFavorites, filter, skinIndex);
        }
      }
      else if (customId.startsWith('clothing_back_')) {

        try {
          const parts = customId.split('_');
          const friendIndex = parseInt(parts[2]);
          const onlyFavorites = parts[3] === 'true';
          const filter = parts[4];
          

          
          stopCurrentCollector();
          await showDetailedView(i, userId, friendIndex, onlyFavorites, filter);

        } catch (error) {
          console.error('[ERROR] clothing_back_ failed:', error);
          try {
            await i.followUp({
              content: 'An error occurred while returning to details. Please try again.',
              ephemeral: true
            });
          } catch (followUpError) {
            console.error('[ERROR] Failed to send followUp:', followUpError);
          }
        }
      }
      else if (customId.startsWith('friendship_clothing_')) {
        const parts = customId.split('_');
        const currIndex = parseInt(parts[2], 10);
        const ponyId = parseInt(parts[3], 10);
        const ponyName = parts[4];
        const onlyFavs = parts[5] === 'true';
        const filter = parts[6];
        const targetUserId = parts[7];
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only manage your own pony collection.', ephemeral: true });
          return;
        }
        
        stopCurrentCollector();
        await showClothingInterface(i, userId, currIndex, ponyId, ponyName, onlyFavs, filter);
      }
      else if (customId.startsWith('friendship_back_to_grid_')) {
        const parts = customId.split('_');
        const page = parseInt(parts[4], 10);
        const filter = parts[5];
        const targetUserId = parts[6];
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        stopCurrentCollector();
        await showGridPage(i, userId, page, filter, 'all');
      }
      else if (customId.startsWith('friendship_back_to_list_')) {
        const parts = customId.split('_');
        const page = parseInt(parts[4], 10);
        const onlyFavs = parts[5] === 'true';
        const filter = parts[6];
        stopCurrentCollector();
        await showGridPage(i, userId, page, filter, 'all');
      }
      else if (customId.startsWith('friendship_select_pony_')) {
        const parts = customId.split('_');
        const onlyFavs = parts[3] === 'true';
        const filter = parts[4];
        const targetUserId = parts[5];
        

        if (i.user.id !== targetUserId) {

          if (i.deferred || i.replied) {
            await i.followUp({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          } else {
            await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          }
          return;
        }
        
        const selectedIndex = parseInt(i.values[0], 10);
        stopCurrentCollector(userId);
        await showDetailedView(i, userId, selectedIndex, onlyFavs, filter);
      }
    });
    
    collector.on('end', async (collected, reason) => {
      if (reason !== 'navigation') {
        userCollectors.delete(userId);
        try {
          await response.edit({
            components: []
          }).catch(err => {
            console.error('Failed to update message after collector end:', err);
          });
        } catch (err) {
          console.error('Failed to update message after collector end:', err);
        }
      }
    });
    
  } catch (error) {
    console.error('Error showing detailed view:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          embeds: [
            createEmbed({
              title: '❌ Error',
              description: `An error occurred while loading detailed information: ${error.message}`,
              color: 0xED4245
            })
          ],
          ephemeral: true
        });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    } else {
      try {
        await interaction.editReply({
          embeds: [
            createEmbed({
              title: '❌ Error',
              description: `An error occurred while loading detailed information: ${error.message}`,
              user: interaction.user
            })
          ],
          components: []
        });
      } catch (editError) {
        console.error('Failed to edit reply with error message:', editError);
      }
    }
  }
} 

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getPonyTypeInEnglish(ponyType) {
  const typeMap = {
    'earth': 'Earth Pony',
    'unicorn': 'Unicorn',
    'pegasus': 'Pegasus',
    'alicorn': 'Alicorn',
    'zebra': 'Zebra',
    'changeling': 'Changeling',
    'hippogriff': 'Hippogriff',
    'crystal': 'Crystal Pony',
    'batpony': 'Bat Pony',
    'bat_pony': 'Bat Pony',
    'seapony': 'Sea Pony',
    'dragon': 'Dragon',
    'yak': 'Yak',
    'griffon': 'Griffon',
    'skeleton_pony': 'Skeleton Pony',
    'skeleton': 'Skeleton Pony'
  };
  
  return typeMap[ponyType] || ponyType;
}


async function searchPony(interaction, userId, query, filter, isDetailed = false, page = 1) {
  try {
    stopCurrentCollector();
    

    const isOwnCollection = userId === interaction.user.id;
    

    let allPonies = await getAllPoniesForCollection(userId, filter === 'all' || filter === 'owned' || filter === 'missing' || filter === 'favorites' || filter === 'with-outfits' ? 'all' : filter);
    

    if (filter === 'owned') {
      allPonies = allPonies.filter(pony => pony.is_owned === 1);
    } else if (filter === 'missing') {
      allPonies = allPonies.filter(pony => pony.is_owned === 0);
    } else if (filter === 'favorites') {
      allPonies = allPonies.filter(pony => pony.is_favorite === 1 && pony.is_owned === 1);
    } else if (filter === 'with-outfits') {
      allPonies = allPonies.filter(pony => pony.is_owned === 1 && hasAvailableSkins(pony.name));
    }
    

    const rarityOrder = ['EXCLUSIVE', 'UNIQUE', 'SECRET', 'CUSTOM', 'LEGEND', 'MYTHIC', 'EPIC', 'RARE', 'BASIC', 'EVENT'];
    
    allPonies.sort((a, b) => {
      if (a.is_owned !== b.is_owned) {
        return b.is_owned - a.is_owned;
      }
      
      const aRarityIndex = rarityOrder.indexOf(a.rarity);
      const bRarityIndex = rarityOrder.indexOf(b.rarity);
      if (aRarityIndex !== bRarityIndex) {
        return aRarityIndex - bRarityIndex;
      }
      
      return a.name.localeCompare(b.name);
    });
    

    const searchQuery = query.toLowerCase().trim();
    const foundPonies = allPonies.filter(pony => {
      const ponyName = pony.name.toLowerCase();
      

      if (ponyName.startsWith(searchQuery)) {
        return true;
      }
      

      if (ponyName.includes(searchQuery)) {
        return true;
      }
      

      if (ponyName.includes('blood 🩸')) {
        const simpleName = ponyName.replace(' blood 🩸', '');
        if (simpleName.startsWith(searchQuery) || simpleName.includes(searchQuery)) {
          return true;
        }
      }
      
      return false;
    });
    
    if (foundPonies.length === 0) {
      const embed = createEmbed({
        title: '🔍 Search Results',
        description: `No ponies found matching "${query}". Try a different search term.`,
        color: 0xF39C12
      });
      
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`friendship_back_to_grid_1_${filter}_${userId}`)
          .setLabel('Back to grid')
          .setStyle(ButtonStyle.Secondary)
      );
      
      const messageOptions = {
        embeds: [embed],
        components: [backRow]
      };
      
      const response = await interaction.editReply(messageOptions);
      

      const backCollector = response.createMessageComponentCollector({ 
        time: 180000,
        filter: i => i.customId.startsWith('friendship_back_to_grid_')
      });
      
      backCollector.on('collect', async i => {
        if (i.user.id !== userId) {
          return i.reply({ 
            content: 'This interaction is not for you!', 
            ephemeral: true 
          });
        }
        
        await i.deferUpdate();
        
        const parts = i.customId.split('_');
        const page = parseInt(parts[parts.length - 2], 10);
        const filterType = parts[parts.length - 1];
        
        backCollector.stop();
        await showGridPage(i, userId, page, filterType, 'all');
      });
      
      return;
    }
    

    if (foundPonies.length === 1) {
      const foundIndex = allPonies.findIndex(pony => pony.id === foundPonies[0].id);
      return await showDetailedView(interaction, userId, foundIndex, false, filter);
    }
    

    const PONIES_PER_PAGE = 15;
    const totalPages = Math.ceil(foundPonies.length / PONIES_PER_PAGE);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    
    const startIndex = (currentPage - 1) * PONIES_PER_PAGE;
    const endIndex = Math.min(startIndex + PONIES_PER_PAGE, foundPonies.length);
    const pageItems = foundPonies.slice(startIndex, endIndex);
    

    let description = `Found ${foundPonies.length} ponies matching "${query}":\n\n`;
    
    for (let i = 0; i < pageItems.length; i++) {
      const pony = pageItems[i];
      const ownedIcon = pony.is_owned ? '✅' : '❌';
      const favoriteIcon = pony.is_favorite ? '❤️' : '';
      

      const cutieMark = getCutieMarkForCollection(pony.name);
      const displayEmoji = cutieMark ? `${cutieMark} ` : '';
      

      let clothingIcon = '';
      if (isOwnCollection && pony.is_owned && hasAvailableSkins(pony.name)) {
        const equippedSkin = await getEquippedSkin(userId, pony.name);
        if (equippedSkin) {
          clothingIcon = '<:clothes:1417925457021505760>';
        }
      }
      
      description += `${ownedIcon}${favoriteIcon}${clothingIcon}${displayEmoji}${RARITY_EMOJIS[pony.rarity] || RARITY_EMOJIS['BASIC'] || ''} ${pony.name}`;

      description += '\n';
    }
    
    if (totalPages > 1) {
      description += `\nPage ${currentPage}/${totalPages}`;
    }
    
    const embed = createEmbed({
      title: '🔍 Search Results',
      description: description,
      color: 0x3498DB
    });
    

    const components = [];
    

    if (foundPonies.length <= 25 && totalPages === 1) {
      const selectRow = new ActionRowBuilder();
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`friendship_search_select_${filter.replace('-', '|')}_${userId}`)
        .setPlaceholder('Select a pony to view details...')
        .setMaxValues(1)
        .setMinValues(1);
      
      for (let i = 0; i < foundPonies.length; i++) {
        const pony = foundPonies[i];
        

        const globalIndex = allPonies.findIndex(p => p.id === pony.id);
        
        selectMenu.addOptions({
          label: pony.name,
          description: `${pony.rarity} rarity`,
          value: `${globalIndex}`,
          emoji: pony.is_favorite ? '❤️' : undefined
        });
      }
      
      selectRow.addComponents(selectMenu);
      components.push(selectRow);
    }
    

    if (totalPages > 1) {
      const navRow = new ActionRowBuilder();
      

      if (currentPage > 1) {
        navRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`friendship_search_prev_${filter.replace('-', '|')}_${currentPage - 1}_${encodeURIComponent(query)}_${isDetailed}_${userId}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
        );
      }
      

      if (currentPage < totalPages) {
        navRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`friendship_search_next_${filter.replace('-', '|')}_${currentPage + 1}_${encodeURIComponent(query)}_${isDetailed}_${userId}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
        );
      }
      
      if (navRow.components.length > 0) {
        components.push(navRow);
      }
    }
    

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(isDetailed ? `friendship_back_to_grid_1_${filter}_${userId}` : `friendship_grid_back_1_${filter}_${userId}`)
        .setLabel(isDetailed ? 'Back to grid' : 'Back')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(backRow);
    
    const messageOptions = {
      embeds: [embed],
      components
    };
    
    const response = await interaction.editReply(messageOptions);
    

    const collector = response.createMessageComponentCollector({ 
      time: 180000
    });
    

    userCollectors.set(userId, collector);
    
    collector.on('collect', async i => {

      if (i.replied || i.deferred) {

        return;
      }
      
      if (i.user.id !== userId) {
        return i.reply({ 
          content: 'This interaction is not for you!', 
          ephemeral: true 
        });
      }
      

      if (!i.replied && !i.deferred) {
        try {
          await i.deferUpdate();
        } catch (error) {
          console.error('Error deferring update:', error);

          if (!i.replied) {
            try {
              await i.reply({ content: 'Processing...', ephemeral: true });
            } catch (replyError) {
              console.error('Error with reply fallback:', replyError);
              return;
            }
          }
          return;
        }
      }
      
      const customId = i.customId;
      

      if (customId.startsWith('friendship_search_prev_') || customId.startsWith('friendship_search_next_')) {
        const parts = customId.split('_');
        const newFilter = parts[3].replace('|', '-');
        const newPage = parseInt(parts[4], 10);
        const encodedQuery = parts[5];
        const newIsDetailed = parts[6] === 'true';
        const targetUserId = parts[7];
        

        if (i.user.id !== targetUserId) {
          await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          return;
        }
        
        const decodedQuery = decodeURIComponent(encodedQuery);
        
        collector.stop('navigation');
        await searchPony(i, userId, decodedQuery, newFilter, newIsDetailed, newPage);
      }
      else if (customId.startsWith('friendship_search_select_')) {
        const parts = customId.split('_');
        const filterType = parts[3].replace('|', '-');
        const targetUserId = parts[4];
        

        if (i.user.id !== targetUserId) {

          if (i.deferred || i.replied) {
            await i.followUp({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          } else {
            await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          }
          return;
        }
        
        const selectedIndex = parseInt(i.values[0], 10);
        collector.stop('navigation');
        const targetUser = await interaction.client.users.fetch(userId);
        await showDetailedView(i, userId, selectedIndex, false, filterType, targetUser);
      }
      else if (customId.startsWith('friendship_back_to_grid_') || customId.startsWith('friendship_grid_back_')) {
        const parts = customId.split('_');
        const page = parseInt(parts[parts.length - 3], 10);
        const filterType = parts[parts.length - 2];
        const targetUserId = parts[parts.length - 1];
        

        if (i.user.id !== targetUserId) {

          if (i.deferred || i.replied) {
            await i.followUp({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          } else {
            await i.reply({ content: 'You can only interact with your own friendship interface.', ephemeral: true });
          }
          return;
        }
        
        collector.stop('navigation');
        await showGridPage(i, userId, page, filterType, 'all');
      }
    });
    
    collector.on('end', async (collected, reason) => {
      if (reason !== 'navigation') {
        try {
          await response.edit({
            components: []
          }).catch(err => {
            console.error('Failed to update message after collector end:', err);
          });
        } catch (err) {
          console.error('Failed to update message after collector end:', err);
        }
      }
    });
    
  } catch (error) {
    console.error('Error in searchPony:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          createEmbed({
            title: '❌ Error',
            description: `An error occurred while searching: ${error.message}`
          })
        ],
        ephemeral: true
      });
    }
  }
}


export { searchPony, showGridPage, showClothingInterface }; 

export const category = 'economy';


async function showClothingInterface(interaction, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex = 0) {
  try {

    
    const { getUserSkins, getEquippedSkin, formatSkinTitle, getSkinImagePath, AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
    const { query } = await import('../../utils/database.js');
    
    stopCurrentCollector();
    

    const ponyNameForId = ponyName.replace(/\s+/g, '_');
    

    const allAvailableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
    const userSkinsRaw = await query(
      'SELECT skin_id, equipped FROM user_skins WHERE user_id = ? AND pony_name = ?',
      [userId, ponyName]
    );
    

    const availableSkinsForPony = allAvailableSkinsForPony.filter(skin => {
      return !skin.hidden || userSkinsRaw.some(us => us.skin_id === skin.id);
    });
    


    

    const allSkins = [
      {
        id: 'default',
        name: 'Default',
        filename: null,
        price_bits: 0,
        price_harmony: 0,
        description: 'Default appearance without any clothing',
        owned: true,
        equipped: false
      }
    ];
    

    for (const availableSkin of availableSkinsForPony) {
      const isOwned = userSkinsRaw.some(userSkin => userSkin.skin_id === availableSkin.id);
      allSkins.push({
        ...availableSkin,
        owned: isOwned,
        equipped: false
      });
    }
    

    const equippedSkin = await getEquippedSkin(userId, ponyName);
    allSkins.forEach(skin => {
      skin.equipped = equippedSkin ? (skin.id === equippedSkin.id) : (skin.id === 'default');
    });
    
    if (allSkins.length === 0) {
      return showDetailedView(interaction, userId, friendIndex, onlyFavorites, filter);
    }
    

    if (isNaN(skinIndex) || skinIndex < 0) {
      skinIndex = 0;
    }
    skinIndex = skinIndex % allSkins.length;
    const currentSkin = allSkins[skinIndex];
    
    if (!currentSkin) {
      console.error('[ERROR] currentSkin is undefined:', { skinIndex, allSkinsLength: allSkins.length, allSkins });
      return showDetailedView(interaction, userId, friendIndex, onlyFavorites, filter);
    }
    

    let ponyImage;
    if (currentSkin.id === 'default') {

      const { getPonyFriendByName } = await import('../../models/FriendshipModel.js');
      const ponyData = await getPonyFriendByName(ponyName);
      ponyImage = getImageUrl(ponyData?.image);
    } else {

      const skinPath = getSkinImagePath(ponyName, currentSkin.id);
      ponyImage = skinPath ? `attachment://${currentSkin.filename}` : null;
    }
    

    const skinTitle = formatSkinTitle(ponyName, currentSkin.id);
    const clothingEmbed = createEmbed({
      title: `<:clothes:1417925457021505760> ${skinTitle}`,
      description: currentSkin.description,
      image: ponyImage,
      fields: [
        { 
          name: 'Status', 
          value: currentSkin.equipped ? '✅ Currently Equipped' : 
                 currentSkin.owned ? '👕 Owned' : '🛒 Not Owned', 
          inline: true 
        },
        { 
          name: 'Price', 
          value: currentSkin.id === 'default' ? 'Free' :
                 currentSkin.owned ? 'Already Owned' :
                 currentSkin.price_pumpkins ? `🎃 ${currentSkin.price_pumpkins} pumpkins` :
                 `${currentSkin.price_bits} bits or ${currentSkin.price_harmony} harmony`, 
          inline: true 
        }
      ],
      footer: { text: `Outfit ${skinIndex + 1} of ${allSkins.length}` },
      user: interaction.user
    });
    

    const components = [];
    const navigationRow = new ActionRowBuilder();
    

    if (allSkins.length > 1) {
      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`clothing_prev_${friendIndex}_${ponyId}_${ponyNameForId}_${skinIndex}_${onlyFavorites}_${filter}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
      );
      
      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`clothing_next_${friendIndex}_${ponyId}_${ponyNameForId}_${skinIndex}_${onlyFavorites}_${filter}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
      );
    }
    

    if (currentSkin.owned) {
      if (!currentSkin.equipped) {
        navigationRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`clothing_apply_${friendIndex}_${ponyId}_${ponyNameForId}_${currentSkin.id}_${skinIndex}_${onlyFavorites}_${filter}`)
            .setLabel('Apply')
            .setStyle(ButtonStyle.Primary)
        );
      }
    } else {

      const purchaseRow = new ActionRowBuilder();
      

      if (currentSkin.price_pumpkins) {
        purchaseRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`clothing_buy_pumpkins_${friendIndex}_${ponyId}_${ponyNameForId}_${currentSkin.id}_${skinIndex}_${onlyFavorites}_${filter}`)
            .setLabel(`🎃 Buy for ${currentSkin.price_pumpkins} pumpkins`)
            .setStyle(ButtonStyle.Secondary)
        );
      } else {

        purchaseRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`clothing_buy_bits_${friendIndex}_${ponyId}_${ponyNameForId}_${currentSkin.id}_${skinIndex}_${onlyFavorites}_${filter}`)
            .setLabel(`Buy for ${currentSkin.price_bits} bits`)
            .setStyle(ButtonStyle.Success)
        );
        
        purchaseRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`clothing_buy_harmony_${friendIndex}_${ponyId}_${ponyNameForId}_${currentSkin.id}_${skinIndex}_${onlyFavorites}_${filter}`)
            .setLabel(`Buy for ${currentSkin.price_harmony} harmony`)
            .setStyle(ButtonStyle.Success)
        );
      }
      
      components.push(purchaseRow);
    }
    

    navigationRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`clothing_back_${friendIndex}_${onlyFavorites}_${filter}`)
        .setLabel('Back to Details')
        .setStyle(ButtonStyle.Secondary)
    );
    
    components.push(navigationRow);
    
    const messageOptions = {
      embeds: [clothingEmbed],
      components,
      files: [] 
    };

    if (currentSkin.id !== 'default' && currentSkin.filename) {
      const skinPath = getSkinImagePath(ponyName, currentSkin.id);
      if (skinPath && fs.existsSync(skinPath)) {
        messageOptions.files = [skinPath];
      }
    }
    
    let response;
    if (interaction.replied || interaction.deferred) {
      response = await interaction.editReply(messageOptions);
    } else {
      await interaction.reply(messageOptions);
      response = await interaction.fetchReply();
    }

    createFriendshipCollector(response, userId, {
      buttonHandlers: [
        ['clothing_prev_', async (i, customId) => {

          try {
            const parts = customId.split('_');
            const friendIndex = parseInt(parts[2]);
            const ponyId = parts[3];
            const skinIndex = parseInt(parts[parts.length - 3]); 
            const onlyFavorites = parts[parts.length - 2] === 'true';
            const filter = parts[parts.length - 1];
            const ponyName = parts.slice(4, parts.length - 3).join(' '); 
            
            const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
            const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
            const allSkins = [{ id: 'default' }, ...availableSkinsForPony];
            
            const newSkinIndex = (skinIndex - 1 + allSkins.length) % allSkins.length;
            await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, newSkinIndex);
          } catch (error) {
            console.error('[ERROR] clothing_prev_ failed:', error);
            await i.followUp({
              content: 'An error occurred while navigating clothing. Please try again.',
              ephemeral: true
            }).catch(() => {});
          }
        }],
        ['clothing_next_', async (i, customId) => {

          try {
            const parts = customId.split('_');
            const friendIndex = parseInt(parts[2]);
            const ponyId = parts[3];
            const skinIndex = parseInt(parts[parts.length - 3]); 
            const onlyFavorites = parts[parts.length - 2] === 'true';
            const filter = parts[parts.length - 1];
            const ponyName = parts.slice(4, parts.length - 3).join(' '); 
            
            const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
            const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
            const allSkins = [{ id: 'default' }, ...availableSkinsForPony];
            
            const newSkinIndex = (skinIndex + 1) % allSkins.length;
            await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, newSkinIndex);
          } catch (error) {
            console.error('[ERROR] clothing_next_ failed:', error);
            await i.followUp({
              content: 'An error occurred while navigating clothing. Please try again.',
              ephemeral: true
            }).catch(() => {});
          }
        }],
        ['clothing_apply_', async (i, customId) => {

          try {
            const parts = customId.split('_');

            
        
            const friendIndex = parseInt(parts[2]);
            const ponyId = parts[3];
            const filter = parts[parts.length - 1];
            const onlyFavorites = parts[parts.length - 2] === 'true';
            const skinIndex = parseInt(parts[parts.length - 3]);

            const middleParts = parts.slice(4, parts.length - 3);

            
            let ponyName = '';
            let skinId = '';

            for (let i = 1; i < middleParts.length; i++) {
              const testPonyName = middleParts.slice(0, i).join(' ');
              const testSkinId = middleParts.slice(i).join('_');
              


              const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
              const availableSkinsForPony = AVAILABLE_SKINS[testPonyName] || [];
              const foundSkin = availableSkinsForPony.find(s => s.id === testSkinId);
              
              if (foundSkin) {
                ponyName = testPonyName;
                skinId = testSkinId;

                break;
              }
            }
            

            
            const { equipSkin } = await import('../../models/SkinModel.js');
            const result = await equipSkin(userId, ponyName, skinId);
            
            if (result.success) {
              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
            } else {
              await i.followUp({
                content: 'Failed to apply outfit. Please try again.',
                ephemeral: true
              }).catch(() => {});
            }
          } catch (error) {
            console.error('[ERROR] clothing_apply_ failed:', error);
            await i.followUp({
              content: 'An error occurred while applying outfit. Please try again.',
              ephemeral: true
            }).catch(() => {});
          }
        }],
        ['clothing_buy_bits_', async (i, customId) => {

          try {
            const parts = customId.split('_');

            
        
            const friendIndex = parseInt(parts[3]); 
            const ponyId = parts[4]; 
            const filter = parts[parts.length - 1]; 
            const onlyFavorites = parts[parts.length - 2] === 'true'; 
            const skinIndex = parseInt(parts[parts.length - 3]); 

            
            let ponyName = '';
            let skinId = '';

            const middleParts = parts.slice(5, parts.length - 3);


            for (let i = 1; i < middleParts.length; i++) {
              const testPonyName = middleParts.slice(0, i).join(' ');
              const testSkinId = middleParts.slice(i).join('_');
              

              
              const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
              const availableSkinsForPony = AVAILABLE_SKINS[testPonyName] || [];
              const foundSkin = availableSkinsForPony.find(s => s.id === testSkinId);
              
              if (foundSkin) {
                ponyName = testPonyName;
                skinId = testSkinId;

                break;
              }
            }
            

            
            const { purchaseSkin, AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
            const { getPonyByUserId, removeBits } = await import('../../models/PonyModel.js');
            
            const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
            const skin = availableSkinsForPony.find(s => s.id === skinId);
            

            
            if (!skin) {
              await i.followUp({
                content: `Skin not found. PonyName: "${ponyName}", SkinId: "${skinId}"`,
                ephemeral: true
              }).catch(() => {});
              return;
            }
            
            const userPony = await getPonyByUserId(userId);
            if (!userPony || userPony.bits < skin.price_bits) {
              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              await i.followUp({
                content: `Not enough bits! You have ${userPony?.bits || 0} bits, but need ${skin.price_bits} bits.`,
                ephemeral: true
              }).catch(() => {});
              return;
            }
            
            const paymentSuccess = await removeBits(userId, skin.price_bits);
            if (!paymentSuccess) {
              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              await i.followUp({
                content: 'Failed to process payment. Please try again.',
                ephemeral: true
              }).catch(() => {});
              return;
            }

            const result = await purchaseSkin(userId, ponyName, skinId, 'bits');
            
            if (result.success) {
              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              await i.followUp({
                content: `✅ Successfully purchased **${skin.name}** for **${skin.price_bits} bits**!`,
                ephemeral: true
              }).catch(() => {});
            } else {
              const { addBits } = await import('../../models/PonyModel.js');
              await addBits(userId, skin.price_bits);
            
              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              await i.followUp({
                content: 'Failed to purchase skin. Your bits have been refunded.',
                ephemeral: true
              }).catch(() => {});
            }
          } catch (error) {
            console.error('[ERROR] clothing_buy_bits_ failed:', error);
            await i.followUp({
              content: 'An error occurred while purchasing the outfit. Please try again.',
              ephemeral: true
            }).catch(() => {});
          }
        }],
        ['clothing_buy_harmony_', async (i, customId) => {

          try {
            const parts = customId.split('_');

          
            const friendIndex = parseInt(parts[3]); 
            const ponyId = parts[4];
            const filter = parts[parts.length - 1]; 
            const onlyFavorites = parts[parts.length - 2] === 'true'; 
            const skinIndex = parseInt(parts[parts.length - 3]); 
            
            const middleParts = parts.slice(5, parts.length - 3);

            
            let ponyName = '';
            let skinId = '';

            for (let i = 1; i < middleParts.length; i++) {
              const testPonyName = middleParts.slice(0, i).join(' ');
              const testSkinId = middleParts.slice(i).join('_');
              


              const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
              const availableSkinsForPony = AVAILABLE_SKINS[testPonyName] || [];
              const foundSkin = availableSkinsForPony.find(s => s.id === testSkinId);
              
              if (foundSkin) {
                ponyName = testPonyName;
                skinId = testSkinId;

                break;
              }
            }
            


            const { purchaseSkin, AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
            const { getHarmony, removeHarmony, addHarmony } = await import('../../models/HarmonyModel.js');
            
            const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
            const skin = availableSkinsForPony.find(s => s.id === skinId);
            

            
            if (!skin) {
              await i.followUp({
                content: `Skin not found. PonyName: "${ponyName}", SkinId: "${skinId}"`,
                ephemeral: true
              }).catch(() => {});
              return;
            }

            const userHarmony = await getHarmony(userId);
            if (userHarmony < skin.price_harmony) {
              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              await i.followUp({
                content: `Not enough harmony! You have ${userHarmony} harmony, but need ${skin.price_harmony} harmony.`,
                ephemeral: true
              }).catch(() => {});
              return;
            }
            
            const newHarmony = await removeHarmony(userId, skin.price_harmony, `Purchase ${skin.name} for ${ponyName}`);
            

            const result = await purchaseSkin(userId, ponyName, skinId, 'harmony');
            
            if (result.success) {
              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              await i.followUp({
                content: `✅ Successfully purchased **${skin.name}** for **${skin.price_harmony} harmony**!`,
                ephemeral: true
              }).catch(() => {});
            } else {
              await addHarmony(userId, skin.price_harmony, `Refund for failed ${skin.name} purchase`);
              
              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              await i.followUp({
                content: 'Failed to purchase skin. Your harmony has been refunded.',
                ephemeral: true
              }).catch(() => {});
            }
          } catch (error) {
            console.error('[ERROR] clothing_buy_harmony_ failed:', error);
            await i.followUp({
              content: 'An error occurred while purchasing the outfit.. :(',
              ephemeral: true
            }).catch(() => {});
          }
        }],
        ['clothing_buy_pumpkins_', async (i, customId) => {

          try {
            const userId = i.user.id;
            const parts = customId.split('_');

            
            const friendIndex = parseInt(parts[3]); 
            const ponyId = parts[4]; 
            const filter = parts[parts.length - 1]; 
            const onlyFavorites = parts[parts.length - 2] === 'true'; 
            const skinIndex = parseInt(parts[parts.length - 3]); 

            let ponyName = '';
            let skinId = '';

            const middleParts = parts.slice(5, parts.length - 3);


            for (let i = 1; i < middleParts.length; i++) {
              const testPonyName = middleParts.slice(0, i).join(' ');
              const testSkinId = middleParts.slice(i).join('_');
              

              
              const { AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
              const availableSkinsForPony = AVAILABLE_SKINS[testPonyName] || [];
              const foundSkin = availableSkinsForPony.find(s => s.id === testSkinId);
              
              if (foundSkin) {
                ponyName = testPonyName;
                skinId = testSkinId;

                break;
              }
            }
            


            const { purchaseSkin, AVAILABLE_SKINS } = await import('../../models/SkinModel.js');
            const { getResourceAmount } = await import('../../models/ResourceModel.js');
            
            const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
            const skin = availableSkinsForPony.find(s => s.id === skinId);
            

            
            if (!skin) {
              await i.followUp({
                content: `Skin not found. PonyName: "${ponyName}", SkinId: "${skinId}"`,
                ephemeral: true
              }).catch(() => {});

              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              return;
            }

            const userPumpkins = await getResourceAmount(userId, 'pumpkins');
            const requiredPumpkins = skin.price_pumpkins || 100;
            

            
            if (userPumpkins < requiredPumpkins) {

              await i.followUp({
                content: `🎃 Not enough pumpkins! You have ${userPumpkins} pumpkins, but need ${requiredPumpkins} pumpkins.`,
                ephemeral: true
              }).catch(console.error);

              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
              return;
            }


            const result = await purchaseSkin(userId, ponyName, skinId, 'pumpkins');

            
            if (result.success) {
              await i.followUp({
                content: `🎃 Successfully purchased **${skin.name}** for **${requiredPumpkins} pumpkins**!`,
                ephemeral: true
              }).catch(console.error);

              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
            } else {

              let errorMessage = 'Failed to purchase skin. Please try again.';
              
              if (result.reason === 'insufficient_pumpkins') {
                errorMessage = `🎃 Not enough pumpkins! You have ${result.available} pumpkins, but need ${result.required} pumpkins.`;
              } else if (result.reason === 'already_owned') {
                errorMessage = 'You already own this skin!';
              }
              
              await i.followUp({
                content: errorMessage,
                ephemeral: true
              }).catch(console.error);

              await showClothingInterface(i, userId, friendIndex, ponyId, ponyName, onlyFavorites, filter, skinIndex);
            }
          } catch (error) {
            console.error('[ERROR] clothing_buy_pumpkins_ failed:', error);
            await i.followUp({
              content: 'An error occurred while purchasing the outfit.. :(',
              ephemeral: true
            }).catch(() => {});
          }
        }],
        ['clothing_back_', async (i, customId) => {

          try {
            const parts = customId.split('_');
            const friendIndex = parseInt(parts[2]);
            const onlyFavorites = parts[3] === 'true';
            const filter = parts[4];
            
            await showDetailedView(i, userId, friendIndex, onlyFavorites, filter);
          } catch (error) {
            console.error('[ERROR] clothing_back_ failed:', error);
            await i.followUp({
              content: 'An error occurred while returning to details.. :(',
              ephemeral: true
            }).catch(() => {});
          }
        }]
      ]
    });

  } catch (error) {
    console.error('Error showing clothing interface:', error);
    await showDetailedView(interaction, userId, friendIndex, onlyFavorites, filter);
  }
}

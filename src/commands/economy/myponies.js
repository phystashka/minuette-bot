import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ComponentType,
  EmbedBuilder
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { getUserFriends } from '../../models/FriendshipModel.js';
import { getRaceEmoji } from '../../utils/pony/ponyUtils.js';
import { getPony } from '../../utils/pony/index.js';
import { isDonator } from '../../models/DonatorModel.js';
import { getCutieMarkFromPonyObject } from '../../utils/cutiemarksManager.js';
import { getPonySlotLimit } from './rebirth.js';

const PAGE_SIZE = 15;


const userCollectors = new Map();


const userPonyData = new Map();


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
  EXCLUSIVE: '<:E1:1425524316858224822><:X2:1425524310570696815><:C3:1425524308997963857><:L4:1425524306833834185><:U5:1425524304845475840><:S6:1425524303470002319><:I7:1425524323002876015><:V8:1425524320985153586><:E9:1425524318732812461>'
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
  EXCLUSIVE: 0xFF69B4
};


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


function stopCurrentCollector(userId) {
  const collector = userCollectors.get(userId);
  if (collector && !collector.ended) {
    collector.stop('new_command');
    userCollectors.delete(userId);
  }
}


export function getPonyById(userId, ponyId) {
  const userData = userPonyData.get(userId);
  if (!userData) {
    return null;
  }
  

  const oneHour = 60 * 60 * 1000;
  if (Date.now() - userData.timestamp > oneHour) {
    userPonyData.delete(userId);
    return null;
  }
  

  const pony = userData.allPonies.find(p => p.uniqueId === ponyId);
  if (!pony) {
    return null;
  }
  
  return {
    pony: pony,
    id: ponyId,
    baseId: pony.baseId,
    duplicateIndex: 1,
    totalDuplicates: 1
  };
}



export function getPonyByBaseId(userId, baseId) {
  return getPonyById(userId, baseId);
}


export function getUserPonyCount(userId) {
  const userData = userPonyData.get(userId);
  if (!userData) {
    return 0;
  }
  

  const oneHour = 60 * 60 * 1000;
  if (Date.now() - userData.timestamp > oneHour) {
    userPonyData.delete(userId);
    return 0;
  }
  
  return userData.allPonies.length;
}


function cleanupUserData() {
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();
  
  for (const [userId, data] of userPonyData.entries()) {
    if (now - data.timestamp > oneHour) {
      userPonyData.delete(userId);
    }
  }
}


setInterval(cleanupUserData, 30 * 60 * 1000);

export const data = new SlashCommandBuilder()
  .setName('myponies')
  .setDescription('View all your ponies individually (including duplicates)')
  .setDescriptionLocalizations({
    'ru': 'Посмотреть всех своих пони по отдельности (включая дубликаты)'
  })
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName('filter')
      .setDescription('Filter ponies by rarity')
      .setDescriptionLocalizations({
        'ru': 'Фильтр пони по редкости'
      })
      .setRequired(false)
      .addChoices(
        { name: 'All Rarities', value: 'all' },
        { name: 'Basic Rarity', value: 'BASIC' },
        { name: 'Rare Rarity', value: 'RARE' },
        { name: 'Epic Rarity', value: 'EPIC' },
        { name: 'Mythic Rarity', value: 'MYTHIC' },
        { name: 'Legend Rarity', value: 'LEGEND' },
        { name: 'Custom Rarity', value: 'CUSTOM' },
        { name: 'Secret Rarity', value: 'SECRET' },
        { name: 'Event Rarity', value: 'EVENT' },
        { name: 'Unique Rarity', value: 'UNIQUE' }
      ))
  .addStringOption(option =>
    option.setName('search')
      .setDescription('Search ponies by name or friendship ID')
      .setDescriptionLocalizations({
        'ru': 'Поиск пони по имени или ID дружбы'
      })
      .setRequired(false))
  .addStringOption(option =>
    option.setName('sort')
      .setDescription('Sort ponies by ID or friendship level')
      .setDescriptionLocalizations({
        'ru': 'Сортировка пони по ID или уровню дружбы'
      })
      .setRequired(false)
      .addChoices(
        { name: 'By ID (Default)', value: 'id' },
        { name: 'By Friendship Level', value: 'level' }
      ))
  .addBooleanOption(option =>
    option.setName('favorites_only')
      .setDescription('Show only favorite ponies (Donators only)')
      .setDescriptionLocalizations({
        'ru': 'Показать только избранных пони (только для донатеров)'
      })
      .setRequired(false));

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    stopCurrentCollector(userId);
    
    const filter = interaction.options.getString('filter') || 'all';
    const searchQuery = interaction.options.getString('search') || '';
    const sortBy = interaction.options.getString('sort') || 'id';
    const favoritesOnly = interaction.options.getBoolean('favorites_only') || false;
    

    if (favoritesOnly) {
      const userIsDonator = await isDonator(userId);
      if (!userIsDonator) {
        return interaction.reply({
          embeds: [createEmbed({
            title: 'Donators Only! 🎁',
            description: 'The favorites filter is only available for donators!\n\nTo become a donator, use `/donate` and purchase at least two collections.',
            color: 0x03168f
          })],
          ephemeral: true
        });
      }
    }
    

    const userPony = await getPony(userId);
    if (!userPony) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: '❌ No Pony Found',
            description: 'You need to have a pony first! Use `/adopt` to get your first pony.',
            color: 0xFF0000
          })
        ],
        ephemeral: true
      });
    }
    
    await showPonyListPage(interaction, userId, 1, filter, searchQuery, sortBy, favoritesOnly);
    
  } catch (error) {
    console.error('Error in myponies command:', error);
    
    return interaction.reply({
      embeds: [
        createEmbed({
          title: '❌ Error',
          description: 'An error occurred while fetching your ponies.',
          color: 0xFF0000
        })
      ],
      ephemeral: true
    });
  }
}


async function showPonyListPage(interaction, userId, page, rarityFilter, searchQuery = '', sortBy = 'id', favoritesOnly = false) {
  try {

    let friends = await getUserFriends(userId, favoritesOnly);
    

    if (rarityFilter !== 'all') {
      friends = friends.filter(friend => friend.rarity === rarityFilter);
    }
    

    const allPonies = [];
    friends.forEach(friend => {


      allPonies.push({
        ...friend,
        uniqueId: friend.id,
        baseId: friend.id,
        duplicateIndex: 1,
        totalDuplicates: 1
      });
    });
    

    let filteredPonies = allPonies;
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      

      if (/^\d+$/.test(query)) {
        const searchId = parseInt(query);
        filteredPonies = allPonies.filter(pony => pony.uniqueId === searchId);
      } else {

        filteredPonies = allPonies.filter(pony => 
          pony.name.toLowerCase().includes(query)
        );
      }
    }
    


    

    if (sortBy === 'level') {

      filteredPonies.sort((a, b) => {

        const profileA = a.is_profile_pony || 0;
        const profileB = b.is_profile_pony || 0;
        if (profileB !== profileA) {
          return profileB - profileA;
        }
        
        const levelA = a.friendship_level || 1;
        const levelB = b.friendship_level || 1;
        console.log(`[SORT DEBUG] Comparing ${a.name} (lvl ${levelA}) vs ${b.name} (lvl ${levelB})`);
        if (levelB !== levelA) {
          return levelB - levelA;
        }
        return a.uniqueId - b.uniqueId;
      });
    } else {

      filteredPonies.sort((a, b) => {

        const profileA = a.is_profile_pony || 0;
        const profileB = b.is_profile_pony || 0;
        if (profileB !== profileA) {
          return profileB - profileA;
        }
        
        return a.uniqueId - b.uniqueId;
      });
    }
    

    userPonyData.set(userId, {
      allPonies: filteredPonies,
      filter: rarityFilter,
      searchQuery: searchQuery,
      sortBy: sortBy,
      favoritesOnly: favoritesOnly,
      timestamp: Date.now()
    });
    
    const totalPonies = filteredPonies.length;
    const totalPages = Math.ceil(totalPonies / PAGE_SIZE) || 1;
    const currentPage = Math.min(Math.max(1, page), totalPages);
    

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const currentPonies = filteredPonies.slice(startIndex, endIndex);
    

    let description = '';
    if (totalPonies === 0) {
      if (searchQuery.trim()) {
        description = `No ponies found matching "${searchQuery}".`;
      } else {
        description = rarityFilter === 'all' 
          ? 'You don\'t have any ponies yet! Use `/venture` to get your first pony.'
          : `You don't have any ${rarityFilter} rarity ponies.`;
      }
    } else {
      const ponyLines = currentPonies.map((pony, index) => {
        const rarityEmoji = RARITY_EMOJIS[pony.rarity] || '';
        const heartIcon = pony.is_favorite === 1 ? '❤️ ' : '';
        const pinIcon = pony.is_profile_pony === 1 ? '📌 ' : '';
        const uniqueId = pony.uniqueId;
        const friendshipLevel = pony.friendship_level || 1;
        

        if (pony.is_profile_pony === 1) {
          console.log(`[DEBUG] Profile pony found: ${pony.name} (ID: ${uniqueId}, is_profile_pony: ${pony.is_profile_pony}, is_favorite: ${pony.is_favorite})`);
        }
        

        const cutieMark = getCutieMarkFromPonyObject(pony);
        const cutieMarkDisplay = cutieMark ? `${cutieMark} ` : '';
        
        return `\`${uniqueId}\` ${pinIcon}${heartIcon}${rarityEmoji} ${cutieMarkDisplay}**${pony.name}**　•　Friend LvL ${friendshipLevel}`;
      });
      description = ponyLines.join('\n');
    }
    

    const embedColor = rarityFilter !== 'all' ? RARITY_COLORS[rarityFilter] || 0x7289DA : 0x7289DA;
    

    const slotLimit = await getPonySlotLimit(userId);
    

    let title = '';
    if (searchQuery.trim()) {
      title = `Search Results: "${searchQuery}" - ${totalPonies} ponies found`;
    } else if (rarityFilter === 'all') {
      title = `My Ponies - ${totalPonies}/${slotLimit} slots used`;
    } else {
      title = `My ${rarityFilter} Ponies - ${totalPonies} ponies (${totalPonies}/${slotLimit} total)`;
    }
    

    const embed = createEmbed({
      title: title,
      description: description,
      color: embedColor,
      user: interaction.user
    });
    

    let footerText = `Total: ${totalPonies} ponies • Use unique ID for interactions`;
    if (favoritesOnly) {
      footerText = `Favorites: ${totalPonies} ponies • Use unique ID for interactions`;
    }
    if (totalPages > 1) {
      footerText = `Page ${currentPage}/${totalPages} • ${footerText}`;
    }
    if (searchQuery.trim()) {
      footerText = `Search: "${searchQuery}" • ${footerText}`;
    }
    
    embed.setFooter({ text: footerText });
    

    const components = [];
    
    if (totalPages > 1) {
      const navigationRow = new ActionRowBuilder();
      

      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`myponies_first_${rarityFilter}`)
          .setLabel('First')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 1)
      );
      

      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`myponies_prev_${currentPage - 1}_${rarityFilter}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 1)
      );
      

      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`myponies_next_${currentPage + 1}_${rarityFilter}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages)
      );
      

      navigationRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`myponies_last_${totalPages}_${rarityFilter}`)
          .setLabel('Last')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === totalPages)
      );
      
      components.push(navigationRow);
    }
    

    const filterRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`myponies_filter_all`)
          .setLabel('All')
          .setStyle(rarityFilter === 'all' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_filter_BASIC`)
          .setLabel('Basic')
          .setStyle(rarityFilter === 'BASIC' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_filter_RARE`)
          .setLabel('Rare')
          .setStyle(rarityFilter === 'RARE' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_filter_EPIC`)
          .setLabel('Epic')
          .setStyle(rarityFilter === 'EPIC' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_filter_MYTHIC`)
          .setLabel('Mythic')
          .setStyle(rarityFilter === 'MYTHIC' ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
    
    const filterRow2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`myponies_filter_LEGEND`)
          .setLabel('Legend')
          .setStyle(rarityFilter === 'LEGEND' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_filter_CUSTOM`)
          .setLabel('Custom')
          .setStyle(rarityFilter === 'CUSTOM' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_filter_SECRET`)
          .setLabel('Secret')
          .setStyle(rarityFilter === 'SECRET' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_filter_EVENT`)
          .setLabel('Event')
          .setStyle(rarityFilter === 'EVENT' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_filter_UNIQUE`)
          .setLabel('Unique')
          .setStyle(rarityFilter === 'UNIQUE' ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
    

    const userIsDonator = await isDonator(userId);
    

    const allUserFriends = await getUserFriends(userId, false);
    const hasFavorites = allUserFriends.some(pony => pony.is_favorite === 1);
    

    const sortRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`myponies_sort_id`)
          .setLabel('Sort by ID')
          .setStyle(sortBy === 'id' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_sort_level`)
          .setLabel('Sort by Level')
          .setStyle(sortBy === 'level' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`myponies_favorites_${favoritesOnly ? 'off' : 'on'}`)
          .setLabel(favoritesOnly ? 'Show All' : 'Favorites Only')
          .setStyle(favoritesOnly ? ButtonStyle.Danger : ButtonStyle.Secondary)
          .setEmoji('❤️')
          .setDisabled(!userIsDonator || !hasFavorites)
      );

    components.push(filterRow, filterRow2, sortRow);
    

    if (interaction.deferred || interaction.replied) {
      const message = await interaction.editReply({
        embeds: [embed],
        components: components
      });
      

      createButtonCollector(message, userId, currentPage, rarityFilter);
    } else {
      const message = await interaction.reply({
        embeds: [embed],
        components: components
      });
      

      createButtonCollector(message, userId, currentPage, rarityFilter);
    }
    
  } catch (error) {
    console.error('Error in showPonyListPage:', error);
    const errorMessage = {
      embeds: [
        createEmbed({
          title: '❌ Error',
          description: 'An error occurred while loading ponies.',
          color: 0xFF0000
        })
      ],
      components: []
    };
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}


function createButtonCollector(message, userId, currentPage, rarityFilter) {


  
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 600000
  });
  

  const oldCollector = userCollectors.get(userId);
  if (oldCollector && !oldCollector.ended) {
    oldCollector.stop('replaced');
  }
  
  userCollectors.set(userId, collector);
  
  collector.on('collect', async (buttonInteraction) => {

    if (buttonInteraction.user.id !== userId) {
      return buttonInteraction.reply({
        content: 'This is not your ponies list!',
        ephemeral: true
      });
    }
    
    await buttonInteraction.deferUpdate();
    
    const customId = buttonInteraction.customId;
    

    const userData = userPonyData.get(userId);
    const currentSearchQuery = userData?.searchQuery || '';
    
    if (customId.startsWith('myponies_filter_')) {
      const newFilter = customId.replace('myponies_filter_', '');
      const currentSortBy = userData?.sortBy || 'id';
      const currentFavoritesOnly = userData?.favoritesOnly || false;
      await showPonyListPage(buttonInteraction, userId, 1, newFilter, currentSearchQuery, currentSortBy, currentFavoritesOnly);
    } else if (customId.startsWith('myponies_sort_')) {
      const newSortBy = customId.replace('myponies_sort_', '');
      const currentFilter = userData?.filter || 'all';
      const currentFavoritesOnly = userData?.favoritesOnly || false;
      await showPonyListPage(buttonInteraction, userId, 1, currentFilter, currentSearchQuery, newSortBy, currentFavoritesOnly);
    } else if (customId.startsWith('myponies_favorites_')) {
      const favAction = customId.replace('myponies_favorites_', '');
      const newFavoritesOnly = favAction === 'on';
      const currentFilter = userData?.filter || 'all';
      const currentSortBy = userData?.sortBy || 'id';
      

      const userIsDonator = await isDonator(userId);
      

      const allUserFriends = await getUserFriends(userId, false);
      const hasFavorites = allUserFriends.some(pony => pony.is_favorite === 1);
      
      if (!userIsDonator && newFavoritesOnly) {
        return buttonInteraction.followUp({
          embeds: [createEmbed({
            title: 'Donators Only! 🎁',
            description: 'The favorites filter is only available for donators!\n\nTo become a donator, use `/donate` and purchase at least two collections.',
            color: 0x03168f
          })],
          ephemeral: true
        });
      }
      
      if (!hasFavorites && newFavoritesOnly) {
        return buttonInteraction.followUp({
          embeds: [createEmbed({
            title: 'No Favorites! ❤️',
            description: 'You don\'t have any favorite ponies yet!\n\nTo add favorites, use `/favorite` command with a pony ID.',
            color: 0x03168f
          })],
          ephemeral: true
        });
      }
      
      await showPonyListPage(buttonInteraction, userId, 1, currentFilter, currentSearchQuery, currentSortBy, newFavoritesOnly);
    } else if (customId.startsWith('myponies_')) {
      const parts = customId.split('_');
      const action = parts[1];
      
      let newPage = currentPage;
      
      if (action === 'first') {
        newPage = 1;
      } else if (action === 'last') {
        newPage = parseInt(parts[2]);
      } else if (action === 'prev' || action === 'next') {
        newPage = parseInt(parts[2]);
      }
      
      const filter = parts[parts.length - 1];
      const currentSortBy = userData?.sortBy || 'id';
      const currentFavoritesOnly = userData?.favoritesOnly || false;
      await showPonyListPage(buttonInteraction, userId, newPage, filter, currentSearchQuery, currentSortBy, currentFavoritesOnly);
    }
  });
  
  collector.on('end', (collected, reason) => {

    if (userCollectors.get(userId) === collector) {
      userCollectors.delete(userId);
    }
    

    if (reason === 'time') {
      try {
        if (message.components && message.components.length > 0) {
          const disabledComponents = message.components.map(row => {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach(component => {
              if (component.data && component.data.type === 2) {
                component.setDisabled(true);
              }
            });
            return newRow;
          });
          
          message.edit({ 
            components: disabledComponents 
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Error disabling components:', error);
      }
    }
  });
}

export const guildOnly = false;

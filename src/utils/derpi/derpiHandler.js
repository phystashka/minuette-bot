import { createEmbed, createButton, createActionRow } from '../components.js';
import { errors, checks } from '../validators.js';
import fetch from 'node-fetch';

export const FILTERS = {
  DEFAULT: 100073,
  EVERYTHING: 56027,
  "EXPLICIT_ONLY": 56027,
  DARK: 37430,
  LEGACY_DEFAULT: 37431,
  MAXIMUM_SPOILERS: 37432,
  LEGACY_DEFAULT_DARK: 37433,
};

export const handleDerpiPagination = async (interaction) => {
  try {
    const { customId, user } = interaction;
    const originalUserId = interaction.message.interaction.user.id;
    
    if (!checks.isOriginalUser(user.id, originalUserId)) {
      return await interaction.reply({
        embeds: [
          createEmbed({
            title: "Oops!",
            description: await errors.NOT_ORIGINAL_USER(interaction.guildId),
            color: 0xED4245
          })
        ],
        ephemeral: true
      });
    }
    
    await interaction.deferUpdate();
    
    const parts = customId.split('_');
    if (parts.length < 5) {
      throw new Error('Invalid customId format');
    }
    
    const direction = parts[1];
    const currentImageId = parts[2];
    const encodedQuery = parts[3];
    const filterId = parts[4];
    const newIndex = parseInt(parts[5] || '0', 10);
    
    const query = decodeURIComponent(encodedQuery);
    
    let filterOption = 'DEFAULT';
    for (const [key, value] of Object.entries(FILTERS)) {
      if (value.toString() === filterId) {
        filterOption = key;
        break;
      }
    }
    
    let cachedImages = [];
    if (interaction.message.embeds && interaction.message.embeds[0]) {
      const footer = interaction.message.embeds[0].footer;
      if (footer && footer.text) {
        const match = footer.text.match(/Image (\d+) of (\d+)/);
        if (match && match[2]) {
          const totalImages = parseInt(match[2], 10);
          if (totalImages > 1) {
            cachedImages = interaction.message._cachedImages || [];
          }
        }
      }
    }
    
    if (!cachedImages || cachedImages.length === 0) {
      const randomPage = Math.floor(Math.random() * 10) + 1;
      cachedImages = await fetchImages(query, 10, filterOption, randomPage);
      
      if (!cachedImages || cachedImages.length === 0) {
        return await interaction.editReply({
          embeds: [
            createEmbed({
              title: "No more images found",
              description: "I couldn't find any more images matching your search criteria.",
              color: 0xFEE75C
            })
          ],
          components: []
        });
      }
    }
    
    let indexToShow = 0;
    if (direction === 'next') {
      indexToShow = Math.min(newIndex + 1, cachedImages.length - 1);
    } else if (direction === 'prev') {
      indexToShow = Math.max(newIndex - 1, 0);
    } else {
      indexToShow = newIndex;
    }
    
    await displayImage(interaction, cachedImages, indexToShow, query, filterOption);
    
    interaction.message._cachedImages = cachedImages;
    
  } catch (error) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: "Oopsie!",
          description: `I had trouble fetching more images from Derpibooru. Maybe try again later?\n\nError: ${error.message}`,
          color: 0xED4245
        })
      ],
      components: []
    });
  }
};

export async function displayImage(interaction, images, index = 0, query, filterOption) {
  if (!images || images.length === 0 || index < 0 || index >= images.length) {
    return await interaction.editReply({
      embeds: [
        createEmbed({
          title: "Error",
          description: "Could not find images for your query.",
          color: 0xED4245
        })
      ],
      components: []
    });
  }
  
  const image = images[index];
  
  if (!image || !image.tags) {
    return await interaction.editReply({
      embeds: [
        createEmbed({
          title: "Error",
          description: "Received invalid data from Derpibooru API.",
          color: 0xED4245
        })
      ],
      components: []
    });
  }
  
  const filterId = FILTERS[filterOption] || FILTERS.DEFAULT;
  
  const hasExplicitContent = image.tags.some(tag => 
    tag === 'explicit' || 
    tag === 'rating:explicit' || 
    tag === 'r34' || 
    tag === 'rule34'
  );
  
  const hasDarkContent = image.tags.some(tag => 
    tag === 'grimdark' || 
    tag === 'semi-grimdark' || 
    tag === 'grotesque' ||
    tag === 'gore' ||
    tag === 'blood'
  );
  
  const isNsfwChannel = checks.isNsfwChannel(interaction.channel);
  
  if ((hasExplicitContent || filterOption === 'EXPLICIT_ONLY') && !isNsfwChannel) {
    return await interaction.editReply({
      embeds: [
        createEmbed({
          title: "Oh my! *blushes*",
          description: await errors.NSFW_CHANNEL_REQUIRED,
          color: 0xED4245
        })
      ],
      components: []
    });
  }
  
  if ((hasDarkContent || filterOption === 'DARK') && !isNsfwChannel) {
    return await interaction.editReply({
      embeds: [
        createEmbed({
          title: "Oh my! *blushes*",
          description: await errors.NSFW_CHANNEL_REQUIRED,
          color: 0xED4245
        })
      ],
      components: []
    });
  }
  
  const embed = createImageEmbed(image, index, images.length);
  
  let shortQuery = query || '';
  if (shortQuery.length > 40) {
    shortQuery = shortQuery.substring(0, 40);
  }
  
  if (images.length <= 1) {
    try {
      const randomPage = Math.floor(Math.random() * 10) + 1;
      const moreImages = await fetchImages(query, 10, filterOption, randomPage);
      if (moreImages && moreImages.length > 0) {
        images = moreImages;
        index = moreImages.findIndex(img => img.id === image.id);
        if (index === -1) index = 0;
        
        embed.footer = { 
          text: `Image ${index + 1} of ${moreImages.length} | ID: ${image.id}` 
        };
      }
    } catch (error) {}
  }
  
  const prevButton = createButton({
    customId: `derpi_prev_${image.id}_${encodeURIComponent(shortQuery)}_${filterId}_${index}`,
    emoji: '<:previous:1422550660401860738>',
    style: 'Secondary',
    disabled: index <= 0
  });
  
  const nextButton = createButton({
    customId: `derpi_next_${image.id}_${encodeURIComponent(shortQuery)}_${filterId}_${index}`,
    emoji: '<:next:1422550658846031953>',
    style: 'Secondary',
    disabled: index >= images.length - 1
  });
  
  const sourceButton = createButton({
    label: 'View on Derpibooru',
    url: `https://derpibooru.org/images/${image.id}`,
    emoji: '🔍'
  });
  
  const row = createActionRow([prevButton, sourceButton, nextButton]);
  
  const message = await interaction.editReply({
    embeds: [embed],
    components: [row]
  });
  
  message._cachedImages = images;
  
  return message;
}

export function createImageEmbed(image, index = 0, totalImages = 1) {
  const artists = image.tags
    .filter(tag => tag.startsWith('artist:'))
    .map(tag => tag.replace('artist:', ''))
    .join(', ');
  
  const characterTags = image.tags
    .filter(tag => !tag.startsWith('artist:') && 
                  !tag.startsWith('safe') && 
                  !tag.startsWith('suggestive') && 
                  !tag.startsWith('explicit') && 
                  !tag.startsWith('questionable') && 
                  !tag.includes(':') &&
                  !tag.includes('edit') &&
                  !tag.includes('color') &&
                  !tag.includes('style'))
    .slice(0, 5)
    .join(', ');
  
  return createEmbed({
    title: artists ? `Art by ${artists}` : 'Pony Art',
    description: characterTags ? `Tags: ${characterTags}` : 'No specific tags',
    image: image.representations.full,
    fields: [
      { name: 'Score', value: `👍 ${image.score} (${image.upvotes} up, ${image.downvotes} down)`, inline: true },
      { name: 'Comments', value: `💬 ${image.comment_count}`, inline: true },
      { name: 'Uploaded', value: `📅 <t:${Math.floor(new Date(image.created_at).getTime() / 1000)}:R>`, inline: true }
    ],
    footer: { text: totalImages > 1 ? `Image ${index + 1} of ${totalImages} | ID: ${image.id}` : `Image ID: ${image.id}` },
    color: 0x7CC9F9
  });
}

export function processQuery(query, filterOption) {
  let processedQuery = query || '';
  
  processedQuery = processedQuery.trim();
  
  if (processedQuery === '') {
    switch (filterOption) {
      case 'EXPLICIT_ONLY':
        return 'explicit OR rating:explicit';
      case 'DARK':
        return 'grimdark || semi-grimdark || grotesque';
      case 'EVERYTHING':
        return '*';
      default:
        return 'safe';
    }
  }
  
  if (processedQuery.includes(',')) {
    processedQuery = processedQuery.split(',')
      .map(part => part.trim())
      .filter(part => part !== '')
      .join(' AND ');
  }
  
  if (filterOption === 'EXPLICIT_ONLY') {
    if (!processedQuery.toLowerCase().includes('explicit') && 
        !processedQuery.toLowerCase().includes('rating:explicit')) {
      
      processedQuery = `(${processedQuery}) AND (explicit OR rating:explicit)`;
    }
    
    if (!processedQuery.toLowerCase().includes('-safe')) {
      processedQuery = `(${processedQuery}) AND -safe`;
    }
    
    if (!processedQuery.toLowerCase().includes('-suggestive')) {
      processedQuery = `(${processedQuery}) AND -suggestive`;
    }
    
    if (!processedQuery.toLowerCase().includes('-questionable')) {
      processedQuery = `(${processedQuery}) AND -questionable`;
    }
  } else if (filterOption === 'DARK' && 
             !processedQuery.toLowerCase().includes('grimdark') && 
             !processedQuery.toLowerCase().includes('semi-grimdark') && 
             !processedQuery.toLowerCase().includes('grotesque')) {
    processedQuery = `(${processedQuery}) AND (grimdark || semi-grimdark || grotesque)`;
  } else if (filterOption === 'DEFAULT' && 
             !processedQuery.toLowerCase().includes('safe') && 
             !processedQuery.toLowerCase().includes('explicit') && 
             !processedQuery.toLowerCase().includes('questionable') && 
             !processedQuery.toLowerCase().includes('suggestive')) {
    processedQuery = `(${processedQuery}) AND safe`;
  }
  
  if (processedQuery.toLowerCase().includes('bronymaiu')) {
    processedQuery = processedQuery.replace(/bronymaiu/i, 'artist:bronymiau');
  }
  
  return processedQuery;
}

export async function fetchImages(query, amount = 1, filterOption = 'DEFAULT', page = 1) {
  try {
    const processedQuery = processQuery(query, filterOption);
    
    const url = new URL('https://derpibooru.org/api/v1/json/search/images');
    
    url.searchParams.append('q', processedQuery);
    url.searchParams.append('per_page', amount);
    url.searchParams.append('page', page);
    url.searchParams.append('sf', 'random');
    
    const filterId = FILTERS[filterOption] || FILTERS.DEFAULT;
    url.searchParams.append('filter_id', filterId);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Derpibooru API returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.images) {
      throw new Error('Invalid response from Derpibooru API');
    }
    
    if (data.images.length === 0 && query && query.includes(' AND ')) {
      const mainTag = query.split(' AND ')[0].trim();
      let fallbackQuery = mainTag;
      
      if (filterOption === 'EXPLICIT_ONLY') {
        fallbackQuery = `${mainTag} AND (explicit OR rating:explicit)`;
      }
      
      return fetchImages(fallbackQuery, amount, filterOption, page);
    }
    
    if (filterOption === 'EXPLICIT_ONLY' && data.images && data.images.length > 0) {
      const explicitImages = data.images.filter(image => 
        image.tags.includes('explicit') || 
        image.tags.includes('rating:explicit')
      );
      
      if (explicitImages.length === 0) {
        if (page < 5) {
          return fetchImages(query, amount, filterOption, page + 1);
        } else {
          return [];
        }
      }
      
      return explicitImages;
    }
    
    return data.images || [];
  } catch (error) {
    throw new Error(`Failed to fetch images: ${error.message}`);
  }
} 
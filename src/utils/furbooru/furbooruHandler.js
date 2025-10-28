import { createEmbed, createButton, createActionRow } from '../components.js';
import { errors, checks } from '../validators.js';
import fetch from 'node-fetch';

export const FILTERS = {
  DEFAULT: 2,
  EVERYTHING: 1,
  "EXPLICIT_ONLY": 1,
  DARK: 2,
  LEGACY_DEFAULT: 2,
  MAXIMUM_SPOILERS: 1,
  LEGACY_DEFAULT_DARK: 2,
};

export const handleFurbooruPagination = async (interaction) => {
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
    const filterName = parts[4];
    const newIndex = parseInt(parts[5] || '0', 10);
    
    const query = decodeURIComponent(encodedQuery);
    const filterOption = 'DEFAULT';
    
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
    console.error('Error in Furbooru pagination:', error);
    
    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          embeds: [
            createEmbed({
              title: "Error",
              description: "Something went wrong while browsing images.",
              color: 0xED4245
            })
          ],
          components: []
        });
      }
    } catch (secondaryError) {
      console.error('Secondary error in pagination:', secondaryError);
    }
  }
};

export const fetchImages = async (query, limit = 1, filterOption = 'DEFAULT', page = 1) => {
  try {
    const baseUrl = 'https://furbooru.org/api/v1/json/search/images';
    
    let searchQuery = query && query.trim() ? query.trim() : '*';
    
    if (searchQuery === '*') {
      searchQuery = 'safe';
    } else {
      searchQuery += ',safe';
    }
    
    let url = `${baseUrl}?per_page=${limit}&page=${page}&sf=random`;
    
    if (searchQuery && searchQuery !== '*') {
      const cleanQuery = searchQuery.replace(/,\s*/g, ',').trim();
      url += `&q=${encodeURIComponent(cleanQuery)}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Discord Bot (Minuette Bot)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.images || !Array.isArray(data.images)) {
      return [];
    }
    
    return data.images.filter(image => 
      image && 
      image.id && 
      image.representations && 
      (image.representations.large || image.representations.medium || image.representations.small)
    );
    
  } catch (error) {
    console.error('Error fetching Furbooru images:', error);
    return [];
  }
};

export const processQuery = (query) => {
  if (!query || query.trim() === '') {
    return '';
  }
  
  return query
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .join(', ');
};

export const createImageEmbed = (image, currentIndex = 0, totalImages = 1) => {
  if (!image) {
    throw new Error('Image data is required');
  }
  
  const imageUrl = image.representations.large || 
                   image.representations.medium || 
                   image.representations.small || 
                   image.view_url;
  
  let artists = '';
  let characterTags = '';
  
  if (image.tags && Array.isArray(image.tags)) {
    artists = image.tags
      .filter(tag => tag.startsWith('artist:'))
      .map(tag => tag.replace('artist:', ''))
      .join(', ');
    
    characterTags = image.tags
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
  }
  
  const embed = createEmbed({
    title: artists ? `Art by ${artists}` : 'Furry Art',
    description: characterTags ? `Tags: ${characterTags}` : 'No specific tags',
    image: imageUrl,
    fields: [
      { name: 'Score', value: `👍 ${image.score || 0} (${image.upvotes || 0} up, ${image.downvotes || 0} down)`, inline: true },
      { name: 'Comments', value: `💬 ${image.comment_count || 0}`, inline: true },
      { name: 'Uploaded', value: `📅 <t:${Math.floor(new Date(image.created_at).getTime() / 1000)}:R>`, inline: true }
    ],
    footer: { text: totalImages > 1 ? `Image ${currentIndex + 1} of ${totalImages} | ID: ${image.id}` : `Image ID: ${image.id}` },
    color: 0xF18D00
  });
  
  return embed;
};

export const displayImage = async (interaction, images, currentIndex, query, filterOption) => {
  try {
    if (!images || images.length === 0 || currentIndex < 0 || currentIndex >= images.length) {
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
    
    const image = images[currentIndex];
    
    if (!image) {
      return await interaction.editReply({
        embeds: [
          createEmbed({
            title: "Error",
            description: "Received invalid data from Furbooru API.",
            color: 0xED4245
          })
        ],
        components: []
      });
    }
    
    const filterId = 'DEFAULT';
    
    const embed = createImageEmbed(image, currentIndex, images.length);
    
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
          currentIndex = moreImages.findIndex(img => img.id === image.id);
          if (currentIndex === -1) currentIndex = 0;
          
          embed.footer = { 
            text: `Image ${currentIndex + 1} of ${moreImages.length} | ID: ${image.id}` 
          };
        }
      } catch (error) {}
    }
    
    const prevButton = createButton({
      customId: `furbooru_prev_${image.id}_${encodeURIComponent(shortQuery)}_${filterId}_${currentIndex}`,
      emoji: '<:previous:1422550660401860738>',
      style: 'Secondary',
      disabled: currentIndex <= 0
    });
    
    const nextButton = createButton({
      customId: `furbooru_next_${image.id}_${encodeURIComponent(shortQuery)}_${filterId}_${currentIndex}`,
      emoji: '<:next:1422550658846031953>',
      style: 'Secondary',
      disabled: currentIndex >= images.length - 1
    });
    
    const sourceButton = createButton({
      label: 'View on Furbooru',
      url: `https://furbooru.org/images/${image.id}`,
      emoji: '🔍'
    });
    
    const row = createActionRow([prevButton, sourceButton, nextButton]);
    
    const message = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
    
    message._cachedImages = images;
    
  } catch (error) {
    console.error('Error displaying Furbooru image:', error);
    
    const errorEmbed = createEmbed({
      title: "Oopsie!",
      description: `I had trouble displaying the image from Furbooru. Maybe try again later?\n\nError: ${error.message}`,
      color: 0xED4245
    });
    
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], components: [] });
    }
  }
};
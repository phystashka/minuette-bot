import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, createButton, createActionRow } from '../../utils/components.js';
import { errors, checks } from '../../utils/validators.js';
import { FILTERS, handleFurbooruPagination, displayImage, fetchImages, processQuery, createImageEmbed } from '../../utils/furbooru/furbooruHandler.js';

export async function execute(interaction) {
  await interaction.deferReply();
  
  try {
    const query = interaction.options.getString('query') || '';
    const amount = interaction.options.getInteger('amount') || 1;
    const minScore = interaction.options.getInteger('min_score') || 0;
    
    let searchQuery = query;
    
    if (minScore > 0) {
      if (searchQuery) {
        searchQuery += `,score.gte:${minScore}`;
      } else {
        searchQuery = `score.gte:${minScore}`;
      }
    }
    
    const randomPage = Math.floor(Math.random() * 10) + 1;
    
    const fetchAmount = amount === 1 ? 10 : amount;
    const images = await fetchImages(searchQuery, fetchAmount, 'DEFAULT', randomPage);
    
    if (!images || images.length === 0) {
      return interaction.editReply({ 
        embeds: [createEmbed({
          title: "No images found",
          description: `Could not find art for query: \`${query || 'random'}\`${minScore > 0 ? ` with minimum score ${minScore}` : ''}`,
          color: 0xFEE75C
        })] 
      });
    }
    
    if (amount === 1) {
      await displayImage(interaction, images, 0, searchQuery, 'DEFAULT');
    } else {
      await displayMultipleImages(interaction, images, amount, searchQuery, 'DEFAULT');
    }
    
  } catch (error) {
    return interaction.editReply({ 
      embeds: [createEmbed({
        title: "Error",
        description: `An error occurred while searching for art on Furbooru: ${error.message}`,
        color: 0xED4245
      })] 
    });
  }
}

async function displayMultipleImages(interaction, images, count, query, filterOption) {
  try {
    const firstImage = images[0];
    const firstEmbed = createImageEmbed(firstImage, 0, images.length);
    
    const firstSourceButton = createButton({
      label: 'View on Furbooru',
      url: `https://furbooru.org/images/${firstImage.id}`,
      emoji: '🔍'
    });
    
    const firstRow = createActionRow([firstSourceButton]);
    
    await interaction.editReply({
      embeds: [firstEmbed],
      components: [firstRow]
    });
    
    for (let i = 1; i < images.length && i < count; i++) {
      const embed = createImageEmbed(images[i], i, images.length);
      
      const sourceButton = createButton({
        label: 'View on Furbooru',
        url: `https://furbooru.org/images/${images[i].id}`,
        emoji: '🔍'
      });
      
      const row = createActionRow([sourceButton]);
      
      await interaction.followUp({
        embeds: [embed],
        components: [row]
      });
    }
  } catch (error) {
    await interaction.editReply({
      embeds: [
        createEmbed({
          title: "Error",
          description: `I had trouble displaying multiple images: ${error.message}`,
          color: 0xED4245
        })
      ]
    });
  }
}
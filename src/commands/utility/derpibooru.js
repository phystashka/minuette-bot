import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, createButton, createActionRow } from '../../utils/components.js';
import { errors, checks } from '../../utils/validators.js';
import { FILTERS, handleDerpiPagination, displayImage, fetchImages, processQuery, createImageEmbed } from '../../utils/derpi/derpiHandler.js';

export const data = new SlashCommandBuilder()
  .setName('derpibooru')
  .setDescription('Search for art on Derpibooru')
  .setDMPermission(true)
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2])
  .addStringOption(option =>
    option
      .setName('query')
      .setDescription('Tags for search (e.g., rainbow dash, fluttershy)')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('amount')
      .setDescription('Number of arts (from 1 to 10)')
      .setMinValue(1)
      .setMaxValue(10)
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('filter')
      .setDescription('Content filter')
      .setRequired(false)
      .addChoices(
        { name: 'Default', value: 'DEFAULT' },
        { name: 'Explicit Only (NSFW channel only)', value: 'EXPLICIT_ONLY' },
        { name: 'Dark', value: 'DARK' },
        { name: 'Everything', value: 'EVERYTHING' }
      )
  )
  .addBooleanOption(option =>
    option
      .setName('new_only')
      .setDescription('Show only images uploaded in the last 24 hours')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('min_score')
      .setDescription('Minimum score (likes) for images')
      .setRequired(false)
      .setMinValue(0)
  );

export async function execute(interaction) {
  await interaction.deferReply();
  
  try {
    const query = interaction.options.getString('query') || '';
    const amount = interaction.options.getInteger('amount') || 1;
    const filterOption = interaction.options.getString('filter') || 'DEFAULT';
    const newOnly = interaction.options.getBoolean('new_only') || false;
    const minScore = interaction.options.getInteger('min_score') || 0;
    
    if ((filterOption === 'EXPLICIT_ONLY' || filterOption === 'DARK' || filterOption === 'EVERYTHING') && !checks.isNsfwChannel(interaction.channel)) {
      return interaction.editReply({ 
        embeds: [
          createEmbed({
            title: "Oh my! *blushes*",
            description: await errors.NSFW_CHANNEL_REQUIRED,
            color: 0xED4245
          })
        ] 
      });
    }
    
    let searchQuery = query;
    
    if (newOnly) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const formattedDate = yesterday.toISOString().split('T')[0];
      searchQuery += `,created_at.gte:${formattedDate}`;
    }
    
    if (minScore > 0) {
      searchQuery += `,score.gte:${minScore}`;
    }
    
    const randomPage = Math.floor(Math.random() * 10) + 1;
    
    const images = await fetchImages(searchQuery, amount, filterOption, randomPage);
    
    if (!images || images.length === 0) {
      return interaction.editReply({ 
        embeds: [createEmbed({
          title: "No images found",
          description: `Could not find art for query: \`${query}\` with filter \`${filterOption}\``,
          color: 0xFEE75C
        })] 
      });
    }
    
    if (amount === 1) {
      await displayImage(interaction, images, 0, searchQuery, filterOption);
    } else {
      await displayMultipleImages(interaction, images, amount, searchQuery, filterOption);
    }
    
  } catch (error) {
    return interaction.editReply({ 
      embeds: [createEmbed({
                    title: "Error",
        description: `An error occurred while searching for art on Derpibooru: ${error.message}`,
        color: 0xED4245
      })] 
    });
  }
}

async function displayMultipleImages(interaction, images, count, query, filterOption) {
  try {
    const isNsfwChannel = checks.isNsfwChannel(interaction.channel);
    
    const filteredImages = images.filter(image => {
      if (!image || !image.tags) return false;
      
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
      
      if (!isNsfwChannel && (hasExplicitContent || hasDarkContent)) {
        return false;
      }
      
      return true;
    });
    
    if (filteredImages.length === 0) {
      return await interaction.editReply({
        embeds: [
          createEmbed({
            title: "No appropriate images found",
            description: "I couldn't find any images that are appropriate for this channel. Try in an NSFW channel or with a different query.",
            color: 0xFEE75C
          })
        ]
      });
    }
    
    const firstImage = filteredImages[0];
    const firstEmbed = createImageEmbed(firstImage, 0, filteredImages.length);
    
    const firstSourceButton = createButton({
      label: 'View on Derpibooru',
      url: `https://derpibooru.org/images/${firstImage.id}`,
      emoji: '🔍'
    });
    
    const firstRow = createActionRow([firstSourceButton]);
    
    await interaction.editReply({
      embeds: [firstEmbed],
      components: [firstRow]
    });
    
    for (let i = 1; i < filteredImages.length && i < count; i++) {
      const embed = createImageEmbed(filteredImages[i], i, filteredImages.length);
      
      const sourceButton = createButton({
        label: 'View on Derpibooru',
        url: `https://derpibooru.org/images/${filteredImages[i].id}`,
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
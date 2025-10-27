import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { createCanvas, loadImage } from 'canvas';

// Image filter utility - now used as a subcommand

export async function execute(interaction) {
  const imageAttachment = interaction.options.getAttachment('image');
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const filterType = interaction.options.getString('filter_type');
  const customText = interaction.options.getString('text');
  const customSubtitle = interaction.options.getString('subtitle');

  await interaction.deferReply();

  try {
    let imageUrl;
    

    if (imageAttachment) {

      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(imageAttachment.contentType)) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: 'Error',
            description: 'Please provide a valid image file (JPG, PNG, GIF, or WebP)!',
            color: 0x03168f
          })],
          ephemeral: true
        });
      }


      if (imageAttachment.size > 8 * 1024 * 1024) {
        return interaction.editReply({
          embeds: [createEmbed({
            title: 'Error',
            description: 'Image file is too large! Please use an image smaller than 8MB.',
            color: 0x03168f
          })],
          ephemeral: true
        });
      }
      
      imageUrl = imageAttachment.url;
    } else {

      imageUrl = targetUser.displayAvatarURL({ extension: 'png', size: 512 });
    }


    const sourceText = imageAttachment ? 'your uploaded image' : `${targetUser.username}'s avatar`;
    await interaction.editReply({
      embeds: [createEmbed({
        title: 'Processing...',
        description: `Applying **${filterType}** filter to ${sourceText}...`,
        color: 0x00ffff
      })]
    });

    let processedImage;

    try {
      let processedImage;
      let apiUrl;
      let apiEndpoint = 'https://some-random-api.com/canvas/';
      

      if (filterType === 'demotivator') {
        const title = customText || 'MOTIVATION';
        const subtitle = customSubtitle || 'Sometimes it takes a lot more time than you think';
        

        const response = await fetch(imageUrl);
        const imageBuffer = await response.arrayBuffer();
        const image = await loadImage(Buffer.from(imageBuffer));
        

        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');
        

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 800, 600);
        

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(50, 50, 700, 400);
        

        ctx.fillStyle = '#000000';
        ctx.fillRect(53, 53, 694, 394);
        

        const maxWidth = 680;
        const maxHeight = 360;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const x = (800 - scaledWidth) / 2;
        const y = 53 + (380 - scaledHeight) / 2;
        

        ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
        

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        

        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText(title.toUpperCase(), 400, 480);
        

        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        

        ctx.font = 'italic 16px Arial';
        ctx.fillStyle = '#CCCCCC';
        ctx.fillText(subtitle, 400, 530);
        
        processedImage = canvas.toBuffer('image/png');
      } else {

        switch (filterType) {
          case 'blur':
            apiUrl = `${apiEndpoint}blur?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'greyscale':
            apiUrl = `${apiEndpoint}greyscale?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'sepia':
            apiUrl = `${apiEndpoint}sepia?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'invert':
            apiUrl = `${apiEndpoint}invert?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'triggered':
            apiUrl = `${apiEndpoint}triggered?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'wasted':
            apiUrl = `${apiEndpoint}wasted?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'jail':
            apiUrl = `${apiEndpoint}jail?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'passed':
            apiUrl = `${apiEndpoint}passed?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'horny':
            apiUrl = `${apiEndpoint}horny?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'pixelate':
            apiUrl = `${apiEndpoint}pixelate?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'brightness':
            apiUrl = `${apiEndpoint}brightness?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'threshold':
            apiUrl = `${apiEndpoint}threshold?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'circle':
            apiUrl = `${apiEndpoint}circle?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'overlay':
            apiUrl = `${apiEndpoint}overlay?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          case 'heart':
            apiUrl = `${apiEndpoint}heart?avatar=${encodeURIComponent(imageUrl)}`;
            break;
          default:
            throw new Error('Unknown filter type');
        }


        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const processedImageBuffer = await response.arrayBuffer();
        processedImage = Buffer.from(processedImageBuffer);
      }


      const contentType = filterType === 'triggered' ? 'gif' : 'png';
      const fileExtension = contentType === 'gif' ? 'gif' : 'png';
      const attachment = new AttachmentBuilder(processedImage, { 
        name: `filtered_${filterType}_${Date.now()}.${fileExtension}` 
      });


      const resultText = imageAttachment 
        ? `Applied **${filterType}** filter to <@${interaction.user.id}>'s uploaded image!`
        : `Applied **${filterType}** filter to <@${targetUser.id}>'s avatar!`;
        
      await interaction.editReply({
        content: resultText,
        files: [attachment],
        embeds: []
      });

    } catch (filterError) {
      console.error('Filter processing error:', filterError);
      throw new Error('Failed to process image with selected filter');
    }

  } catch (error) {
    console.error('Error in filter command:', error);
    await interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while processing your image. Please try again with a different image or filter.',
        color: 0x03168f
      })],
      ephemeral: true
    });
  }
}
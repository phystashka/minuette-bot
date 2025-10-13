
import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { createEmbed } from '../../utils/components.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const data = new SlashCommandBuilder()
  .setName('ship')
  .setDescription('Ship two users and see their compatibility!')
  .addUserOption(option =>
    option
      .setName('user1')
      .setDescription('First user to ship')
      .setRequired(true)
  )
  .addUserOption(option =>
    option
      .setName('user2')
      .setDescription('Second user to ship')
      .setRequired(true)
  )
  .setDMPermission(true)
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2]);

export async function execute(interaction) {
  const user1 = interaction.options.getUser('user1');
  const user2 = interaction.options.getUser('user2');

  await interaction.deferReply();

  try {

    if (user1.id === user2.id) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'You cannot ship yourself with yourself!',
          color: 0x03168f
        })],
        ephemeral: true
      });
    }


    if (user1.bot || user2.bot) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: 'Error',
          description: 'Bots cannot participate in shipping!',
          color: 0x03168f
        })],
        ephemeral: true
      });
    }


    const compatibility = Math.floor(Math.random() * 101);


    await interaction.editReply({
      embeds: [createEmbed({
        title: '🧬 Analyzing DNA...',
        description: `Extracting genetic samples from <@${user1.id}> and <@${user2.id}>...`,
        color: 0x00ffff
      })]
    });

    await new Promise(resolve => setTimeout(resolve, 2000));


    await interaction.editReply({
      embeds: [createEmbed({
        title: '💞 Processing Compatibility...',
        description: `Running advanced algorithms to determine relationship potential...\n-# Progress: 67%`,
        color: 0xffff00
      })]
    });

    await new Promise(resolve => setTimeout(resolve, 2500));


    await interaction.editReply({
      embeds: [createEmbed({
        title: '💌 Finalizing Results...',
        description: `Generating compatibility report...\n-# Progress: 98%`,
        color: 0xff9900
      })]
    });

    await new Promise(resolve => setTimeout(resolve, 1500));


    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');


    const backgroundPath = path.join(__dirname, '../../public/ship/ship.png');
    let background;
    
    try {
      background = await loadImage(backgroundPath);
    } catch (error) {
      console.error('Error loading background image:', error);

      ctx.fillStyle = '#2C2F33';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      

      ctx.fillStyle = '#ff69b4';
      ctx.font = '60px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('💖', canvas.width / 2, canvas.height / 2 + 20);
    }

    if (background) {
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    }


    const avatar1Size = 250;
    const avatar2Size = 250;
    
    let avatar1, avatar2;
    
    try {
      avatar1 = await loadImage(user1.displayAvatarURL({ extension: 'png', size: 256 }));
    } catch (error) {
      console.error('Error loading user1 avatar:', error);

      ctx.fillStyle = '#7289da';
      ctx.fillRect(100, 125, avatar1Size, avatar1Size);
    }

    try {
      avatar2 = await loadImage(user2.displayAvatarURL({ extension: 'png', size: 256 }));
    } catch (error) {
      console.error('Error loading user2 avatar:', error);

      ctx.fillStyle = '#7289da';
      ctx.fillRect(550, 125, avatar2Size, avatar2Size);
    }


    if (avatar1) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(150, 200, avatar1Size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar1, 25, 75, avatar1Size, avatar1Size);
      ctx.restore();
    }


    if (avatar2) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(650, 200, avatar2Size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar2, 525, 75, avatar2Size, avatar2Size);
      ctx.restore();
    }


    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const percentText = `${compatibility}%`;
    const textX = canvas.width / 2;
    const textY = canvas.height / 2;
    

    ctx.fillText(percentText, textX, textY);


    ctx.font = 'bold 24px Arial';
    let compatibilityMessage = '';
    let messageColor = '#ffffff';
    
    if (compatibility >= 90) {
      compatibilityMessage = 'Perfect Match!';
      messageColor = '#ff69b4';
    } else if (compatibility >= 70) {
      compatibilityMessage = 'Great Chemistry!';
      messageColor = '#ff1493';
    } else if (compatibility >= 50) {
      compatibilityMessage = 'Good Potential!';
      messageColor = '#ffa500';
    } else if (compatibility >= 30) {
      compatibilityMessage = 'Might Work...';
      messageColor = '#ffff00';
    } else {
      compatibilityMessage = 'Better as Friends!';
      messageColor = '#87ceeb';
    }
    
    ctx.fillStyle = messageColor;
    ctx.fillText(compatibilityMessage, textX, textY + 60);


    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'ship.png' });

    await interaction.editReply({
      content: `💖 Shipped <@${user1.id}> & <@${user2.id}>!`,
      files: [attachment],
      embeds: []
    });

  } catch (error) {
    console.error('Error in ship command:', error);
    await interaction.editReply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while creating the image. Please try again later.',
        color: 0x03168f
      })],
      ephemeral: true
    });
  }
}
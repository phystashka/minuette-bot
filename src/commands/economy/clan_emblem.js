import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getClanByOwnerId, getClanByOwnerOrVice, updateClan } from '../../models/ClanModel.js';
import { getPony } from '../../utils/pony/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const MAX_FILE_SIZE = 256 * 1024;


const SUPPORTED_FORMATS = ['png', 'jpg', 'jpeg', 'gif'];


const downloadFile = (url, filePath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }
      
      let downloadedBytes = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > MAX_FILE_SIZE) {
          file.destroy();
          fs.unlinkSync(filePath);
          reject(new Error('File size exceeds 256 KB limit'));
          return;
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlinkSync(filePath);
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

export default {
  data: new SlashCommandBuilder()
    .setName('clan_emblem')
    .setDescription('Upload a custom emblem for your clan (max 256 KB)')
    .addAttachmentOption(option =>
      option.setName('emblem')
        .setDescription('Custom emblem image (PNG, JPG, GIF - max 256 KB)')
        .setRequired(true)
    )
    .setDMPermission(false),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const userId = interaction.user.id;
      

      const pony = await getPony(userId);
      if (!pony) {
        return await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ No Pony Profile',
            description: 'You need to create a pony profile first using `/equestria`.',
            color: 0xFF0000
          })]
        });
      }
      

      const clan = await getClanByOwnerOrVice(userId);
      if (!clan) {
        return await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ No Permission',
            description: 'You need to be a clan owner or vice leader to upload an emblem. Create your own clan using `/clan` or ask your clan leader to promote you.',
            color: 0xFF0000
          })]
        });
      }
      

      const attachment = interaction.options.getAttachment('emblem');
      

      if (attachment.size > MAX_FILE_SIZE) {
        return await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ File Too Large',
            description: `File size (${(attachment.size / 1024).toFixed(1)} KB) exceeds the 256 KB limit.`,
            color: 0xFF0000
          })]
        });
      }
      

      const fileExtension = attachment.name.toLowerCase().split('.').pop();
      if (!SUPPORTED_FORMATS.includes(fileExtension)) {
        return await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Unsupported Format',
            description: `Supported formats: ${SUPPORTED_FORMATS.join(', ').toUpperCase()}`,
            color: 0xFF0000
          })]
        });
      }
      

      const emblemDir = path.join(__dirname, '..', '..', 'public', 'clan_emblems');
      if (!fs.existsSync(emblemDir)) {
        try {
          fs.mkdirSync(emblemDir, { recursive: true });

        } catch (error) {
          console.error('❌ Failed to create clan_emblems directory:', error);
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Directory Error',
              description: 'Failed to create emblems directory. Please try again later.',
              color: 0xFF0000
            })]
          });
        }
      }
      

      const emblemFileName = `clan_${clan.id}_emblem.${fileExtension}`;
      const emblemPath = path.join(emblemDir, emblemFileName);
      
      try {



        await downloadFile(attachment.url, emblemPath);
        

        if (!fs.existsSync(emblemPath)) {
          throw new Error('File was not saved correctly');
        }
        
        const fileStats = fs.statSync(emblemPath);

        

        await updateClan(clan.id, { emblem_filename: emblemFileName });

        
        const roleText = clan.userRole === 'owner' ? 'Owner' : 'Vice Leader';
        await interaction.editReply({
          embeds: [createEmbed({
            title: '✅ Emblem Uploaded',
            description: `Your clan emblem has been successfully uploaded and will appear on your clan profile!\n\n🏰 Clan: **${clan.name}**\n👤 Uploaded by: **${roleText}**`,
            color: 0x00FF00
          })]
        });
        
      } catch (downloadError) {
        console.error('Error downloading emblem:', downloadError);
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Upload Failed',
            description: downloadError.message,
            color: 0xFF0000
          })]
        });
      }
      
    } catch (error) {
      console.error('Error handling clan emblem:', error);
      await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Error',
          description: 'Failed to process emblem. Please try again later.',
          color: 0xFF0000
        })]
      });
    }
  }
};

import { SlashCommandBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { setFont, getFontString } from '../../utils/fontUtils.js';
import { createEmbed } from '../../utils/components.js';
import { query, getRow } from '../../utils/database.js';
import { getPony, hasPony, addBits } from '../../utils/pony/index.js';
import { getMarriageByUser } from '../../models/MarriageModel.js';
import { getChildrenByParents, getAdoptionByChild } from '../../models/AdoptionModel.js';
import { getHarmony } from '../../models/HarmonyModel.js';
import { getUserFriends } from '../../models/FriendshipModel.js';
import { loadImageWithProxy } from '../../utils/backgroundRenderer.js';
import { getEquippedSkin } from '../../models/SkinModel.js';
import { getCachedPonyImage, removeTempPonyImage } from '../../utils/ponyImageCache.js';
import { getImageInfo } from '../../utils/imageResolver.js';
import { getUserFarm, getExpansionPlans, getHarvestTime, isHarvestReady, changeFarmProduction, spendExpansionPlans } from '../../models/FarmModel.js';
import { getUserRebirth } from './rebirth.js';
import { 
  getActiveBackground, 
  setActiveBackground, 
  hasBackground, 
  purchaseBackground, 
  BACKGROUNDS,
  getAllBackgrounds,
  getBackgroundInfo,
  ensureDefaultBackground
} from '../../models/ProfileBackgroundModel.js';

function createLoadingContainer() {
  const container = new ContainerBuilder();
  
  const loadingText = new TextDisplayBuilder()
    .setContent('<a:loading_line:1416130253428097135> **Loading profile...**');
  container.addTextDisplayComponents(loadingText);
  
  return container;
}

function createSuccessContainer(message) {
  const container = new ContainerBuilder();
  
  const successText = new TextDisplayBuilder()
    .setContent(message);
  container.addTextDisplayComponents(successText);
  
  return container;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGE_CACHE_EXPIRY = 2 * 60 * 1000;
const AVATAR_CACHE_EXPIRY = 30 * 60 * 1000; 
const TEMPLATE_CACHE_EXPIRY = 60 * 60 * 1000;


const VALID_PONY_RACES = [
  'Earth', 'Unicorn', 'Pegasus', 'Alicorn', 
  'Zebra', 'Changeling', 'Hippogriff', 'Crystal', 
  'Batpony', 'Seapony', 'Kirin', 'Yak', 
  'Dragon', 'Griffin', 'Lamia', 'Sphinx', 
  'Deer', 'Donkey', 'Mule', 'Pony',
  'Diamond Dog', 'Minotaur', 'Centaur', 'Draconequus',
  'Breezie', 'Shadow_pony'
];


const truncateNickname = (nickname) => {
  if (nickname.length > 9) {
    return nickname.substring(0, 9) + '...';
  }
  return nickname;
};



const AVATAR_X = 331;
const AVATAR_Y = 250;
const AVATAR_RADIUS = 120;
const AVATAR_BORDER_WIDTH = 0;


const NICKNAME_X = 335;
const NICKNAME_Y = 440;
const NICKNAME_SIZE = 80;


const PONY_NAME_X = 1400;
const PONY_NAME_Y = 730;
const PONY_NAME_SIZE = 45;


const PONY_AGE_X = 1400;
const PONY_AGE_Y = 800;
const PONY_AGE_SIZE = 53;


const PONY_RACE_X = 1400;
const PONY_RACE_Y = 880;
const PONY_RACE_SIZE = 64;




const FAVORITE_PONY_X = 650;
const FAVORITE_PONY_Y = 440;
const FAVORITE_PONY_SIZE = 550;


const HARMONY_X = 1135;
const HARMONY_Y = 295;
const HARMONY_SIZE = 65;


const BITS_X = 1135;
const BITS_Y = 165;
const BITS_SIZE = 65;


const FARM_LEVEL_X = 1280;
const FARM_LEVEL_Y = 200;
const FARM_LEVEL_SIZE = 200;


const REBIRTH_LEVEL_X = 530;
const REBIRTH_LEVEL_Y = 145;
const REBIRTH_LEVEL_SIZE = 70;


const REBIRTH_IMAGE_X = 430;
const REBIRTH_IMAGE_Y = 100;
const REBIRTH_IMAGE_SIZE = 80;


const PARTNER_AVATAR_X = 118;
const PARTNER_AVATAR_Y = 555;
const PARTNER_AVATAR_SIZE = 138;


const PARTNER_NAME_X = 290;
const PARTNER_NAME_Y = 585;
const PARTNER_NAME_SIZE = 42;


const MARRIAGE_TIME_X = 290;
const MARRIAGE_TIME_Y = 645;
const MARRIAGE_TIME_SIZE = 32;


const CHILD_AVATAR_X = 118;
const CHILD_AVATAR_Y = 769;
const CHILD_AVATAR_SIZE = 138;


const CHILD_NAME_X = 290;
const CHILD_NAME_Y = 790;
const CHILD_NAME_SIZE = 42;


const CHILD_ROLE_X = 290;
const CHILD_ROLE_Y = 850;
const CHILD_ROLE_SIZE = 32;



const FAMILY_MAIN_AVATAR_X = 285;
const FAMILY_MAIN_AVATAR_Y = 289;
const FAMILY_MAIN_AVATAR_SIZE = 255;


const FAMILY_MAIN_NAME_X = 280;
const FAMILY_MAIN_NAME_Y = 497;


const FAMILY_PARTNER_AVATAR_X = 1545;
const FAMILY_PARTNER_AVATAR_Y = 289;
const FAMILY_PARTNER_AVATAR_SIZE = 255;


const FAMILY_PARTNER_NAME_X = 1545;
const FAMILY_PARTNER_NAME_Y = 497;


const FAMILY_MARRIAGE_DATE_X = 912;
const FAMILY_MARRIAGE_DATE_Y = 100;


const FAMILY_CHILD_AVATAR_X = 709;
const FAMILY_CHILD_AVATAR_Y = 712;
const FAMILY_CHILD_AVATAR_SIZE = 140;


const FAMILY_CHILD_NAME_X = 960;
const FAMILY_CHILD_NAME_Y = 880;


const FAMILY_CHILD_ROLE_X = 880;
const FAMILY_CHILD_ROLE_Y = 940;


const FAMILY_NAME_SIZE = 65;
const FAMILY_DATE_SIZE = 40;
const FAMILY_ROLE_SIZE = 40;


const FAMILY_NAME_COLOR = '#FFFFFF';
const FAMILY_DATE_COLOR = '#CCCCCC';



function getFarmPart(farmLevel) {
  if (farmLevel >= 50) return 4;
  if (farmLevel >= 35) return 3; 
  if (farmLevel >= 15) return 2;
  return 1;
}

async function getBackgroundWithFarmPart(userId, baseBackgroundId) {
  const userFarm = await getUserFarm(userId);
  const farmLevel = userFarm ? userFarm.level : 0;
  const farmPart = getFarmPart(farmLevel);
  

  if (!baseBackgroundId.includes('_farm')) {
    return `${baseBackgroundId}_farm${farmPart}`;
  }
  

  return baseBackgroundId.replace(/_farm\d+$/, `_farm${farmPart}`);
}

if (!global.imageCache) {
  global.imageCache = new Map();
}
if (!global.avatarCache) {
  global.avatarCache = new Map();
}
if (!global.templateCache) {
  global.templateCache = new Map();
}

function createTemplateCacheKey(targetUser) {

  const data = {
    userId: targetUser.id,
    avatar: targetUser.displayAvatarURL({ extension: 'png', size: 512 })
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

async function createPonyCacheKey(targetUser, pony, marriageData, adoptionData, activeBackground = null, favoritePony = null) {


  const harmonyValue = await getHarmony(targetUser.id);
  

  const userFarm = await getUserFarm(targetUser.id);
  const farmLevel = userFarm ? userFarm.level : 0;
  

  const userRebirth = await getUserRebirth(targetUser.id);
  const rebirthLevel = userRebirth ? userRebirth.rebirth_level : 0;
  
  const data = {
    userId: targetUser.id,
    avatar: targetUser.displayAvatarURL({ extension: 'png', size: 512 }),
    ponyName: pony?.pony_name || pony?.name || null,
    ponyAge: pony?.pony_age || pony?.age || null,
    ponyRace: pony?.pony_race || pony?.race || null,
    bits: (pony?.bits || 0) + (pony?.bank_balance || 0),
    harmony: harmonyValue || 0,
    farmLevel: farmLevel,
    rebirthLevel: rebirthLevel,
    marriagePartner: marriageData?.partner?.user?.id || null,
    adoptionChild: adoptionData?.child?.user?.id || null,
    activeBackground: activeBackground || 'default_farm1',
    favoritePonyId: favoritePony?.friend_id || null
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}


async function getFavoritePony(userId) {
  try {
    const sql = `
      SELECT f.friend_id, f.friendship_level, f.experience, pf.name, pf.image
      FROM friendship f
      JOIN pony_friends pf ON f.friend_id = pf.id
      WHERE f.user_id = ? AND f.is_profile_pony = 1
      LIMIT 1
    `;
    
    const result = await getRow(sql, [userId]);
    if (result) {
      console.log('Found favorite pony:', result.name, 'Level:', result.friendship_level, 'Image URL:', result.image);


      const equippedSkin = await getEquippedSkin(userId, result.name);
      let finalImage = result.image;
      let imageType = 'url';
      
      if (equippedSkin) {

        const skinPath = path.join(__dirname, '../../public/skins', equippedSkin.filename);
        finalImage = skinPath;
        imageType = 'skin';
      } else {
        const imageInfo = getImageInfo(result.image);
        if (imageInfo && imageInfo.type === 'attachment') {
          finalImage = imageInfo.attachmentPath;
          imageType = 'local';
        }
      }
      
      return {
        friend_id: result.friend_id,
        friendship_level: result.friendship_level || 1,
        experience: result.experience || 0,
        pony_name: result.name,
        pony_image: finalImage,
        has_skin: !!equippedSkin,
        image_type: imageType
      };
    }
    

    return null;
  } catch (error) {
    console.error('Error getting favorite pony:', error);
    return null;
  }
}

async function loadImageWithCache(url, fallbackFunction = null) {
  try {
    if (global.avatarCache.has(url)) {
      const cached = global.avatarCache.get(url);
      if (Date.now() - cached.timestamp < AVATAR_CACHE_EXPIRY) {
        return cached.image;
      } else {
        global.avatarCache.delete(url);
      }
    }
 
    const image = await loadImage(url);
    
    global.avatarCache.set(url, {
      image: image,
      timestamp: Date.now()
    });
    
    return image;
  } catch (error) {
    console.error('Error loading image:', error);
    if (fallbackFunction) {
      return await fallbackFunction();
    }
    throw error;
  }
}

function cleanupImageCache() {
  const now = Date.now();
  

  for (const [key, data] of global.imageCache.entries()) {
    if (now - data.timestamp > IMAGE_CACHE_EXPIRY) {
      global.imageCache.delete(key);
    }
  }


  for (const [key, data] of global.avatarCache.entries()) {
    if (now - data.timestamp > AVATAR_CACHE_EXPIRY) {
      global.avatarCache.delete(key);
    }
  }
  

  for (const [key, data] of global.templateCache.entries()) {
    if (now - data.timestamp > TEMPLATE_CACHE_EXPIRY) {
      global.templateCache.delete(key);
    }
  }
}

if (global.imageCache) {
  global.imageCache.clear();
  console.log('Cleared old image cache with incorrect coordinates');
}


setInterval(cleanupImageCache, 5 * 60 * 1000);

async function createBaseTemplate(targetUser, backgroundId = null) {

  if (!backgroundId) {
    backgroundId = await getActiveBackground(targetUser.id);
  }
  

  backgroundId = await getBackgroundWithFarmPart(targetUser.id, backgroundId);
  
  return await createTemplateWithBackground(targetUser, backgroundId);
}


async function createPreviewTemplate(targetUser, backgroundId) {
  return await createTemplateWithBackground(targetUser, backgroundId);
}


async function createTemplateWithBackground(targetUser, backgroundId) {
  const backgroundInfo = getBackgroundInfo(backgroundId);
  const templateKey = `template_${targetUser.displayAvatarURL({ extension: 'png', size: 512 })}_${backgroundId}`;
  

  if (global.templateCache && global.templateCache.has(templateKey)) {
    const cached = global.templateCache.get(templateKey);
    if (Date.now() - cached.timestamp < TEMPLATE_CACHE_EXPIRY) {
      console.log(`Using cached template for ${targetUser.username} with background ${backgroundId}`);
      return cached.canvas;
    } else {
      global.templateCache.delete(templateKey);
    }
  }
  
  console.log(`Creating new template for ${targetUser.username} with background ${backgroundId}`);
  
  const canvas = createCanvas(1888, 1056);
  const ctx = canvas.getContext('2d');

  const templatePath = path.join(__dirname, '..', '..', 'public', 'profile', backgroundInfo.file);
  
  let template;
  try {
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template file not found: ${templatePath}, using default`);

      const defaultPath = path.join(__dirname, '..', '..', 'public', 'profile', 'default_farm1.png');
      if (!fs.existsSync(defaultPath)) {
        throw new Error(`Default template file not found: ${defaultPath}`);
      }
      template = await loadImage(defaultPath);
    } else {
      template = await loadImage(templatePath);
      console.log('Template loaded successfully');
    }
    
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);
    
    const avatarURL = targetUser.displayAvatarURL({ 
      extension: 'png', 
      size: 512
    });
    
    let avatarImage;
    try {
      avatarImage = await loadImageWithCache(avatarURL, createDefaultAvatar);
    } catch (error) {
      console.error('Error loading avatar:', error);
      avatarImage = await createDefaultAvatar();
    }
    
    await drawCircularAvatar(ctx, avatarImage, AVATAR_X, AVATAR_Y, AVATAR_RADIUS, AVATAR_BORDER_WIDTH);
    

    if (!global.templateCache) global.templateCache = new Map();
    global.templateCache.set(templateKey, {
      canvas: canvas,
      timestamp: Date.now()
    });
    
    return canvas;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View your pony profile')
  .setDescriptionLocalizations({
    'ru': 'Посмотреть профиль пони'
  })
  .setDMPermission(false)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('User to view profile of')
      .setDescriptionLocalizations({
        'ru': 'Пользователь, чей профиль просмотреть'
      })
      .setRequired(false)
  );

export async function execute(interaction) {
  try {

    await interaction.reply({
      components: [createLoadingContainer()],
      flags: MessageFlags.IsComponentsV2
    });

    const targetUser = interaction.options.getUser('user') || interaction.user;
    

    if (targetUser.bot) {
      const errorText = new TextDisplayBuilder()
        .setContent('**Profile Error**\n\nCannot view profile of a bot!');
        
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
      
      return interaction.editReply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    let ponyData = null;
    let pony = null;
    let favoritePony = null;
    let harmonyValue = 0;
    try {
      pony = await getPony(targetUser.id);
      harmonyValue = await getHarmony(targetUser.id);
      favoritePony = await getFavoritePony(targetUser.id);
      
      if (hasPony(pony)) {
        ponyData = {
          bits: (pony.bits || 0) + (pony.bank_balance || 0),
          bank_balance: pony.bank_balance || 0,
          harmony: harmonyValue || 0
        };
      }
    } catch (error) {
      console.error('Error fetching pony/harmony data:', error);
    }


    

    const formatNumber = (number) => {
      return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const formatMarriageTime = (diffMs) => {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      
      if (days > 0) {
        return `${days} d`;
      } else if (hours > 0) {
        return `${hours} h`;
      } else {
        return `${minutes} m`;
      }
    };

    const truncateNickname = (nickname) => {
      if (nickname.length > 9) {
        return nickname.substring(0, 9) + '...';
      }
      return nickname;
    };

    let marriageData = null;
    try {
      const marriage = await getMarriageByUser(targetUser.id);
      if (marriage) {
        let partner = null;
        let partnerName = 'Unknown User';
        let partnerAvatar = null;

        try {

          partner = await interaction.guild.members.fetch(marriage.partner_id);
          partnerName = partner.user.username;
          partnerAvatar = partner.user.displayAvatarURL({ extension: 'png', size: 128 });
        } catch (memberError) {

          try {
            const partnerUser = await interaction.client.users.fetch(marriage.partner_id);
            partnerName = partnerUser.username;
            partnerAvatar = partnerUser.displayAvatarURL({ extension: 'png', size: 128 });
          } catch (userError) {
            console.error('Error fetching partner user:', userError);
            partnerName = 'Unknown User';

            partnerAvatar = null;
          }
        }

        if (partnerName !== 'Unknown User' || partnerAvatar) {
          const marriedAt = new Date(marriage.married_at);
          const now = new Date();
          const diffMs = now - marriedAt;
          
          marriageData = {
            partner: partner,
            partnerName: partnerName,
            marriageTime: formatMarriageTime(diffMs),
            partnerAvatar: partnerAvatar
          };
        }
      }
    } catch (error) {
      console.error('Error fetching marriage data:', error);
    }

    let adoptionData = null;
    try {
      const marriage = await getMarriageByUser(targetUser.id);
      if (marriage) {
        const children = await getChildrenByParents(targetUser.id, marriage.partner_id);
        if (children && children.length > 0) {
          const firstChild = children[0];
          let child = null;
          let childName = 'Unknown User';
          let childAvatar = null;

          try {

            child = await interaction.guild.members.fetch(firstChild.child_id);
            childName = child.user.username;
            childAvatar = child.user.displayAvatarURL({ extension: 'png', size: 128 });
          } catch (memberError) {

            try {
              const childUser = await interaction.client.users.fetch(firstChild.child_id);
              childName = childUser.username;
              childAvatar = childUser.displayAvatarURL({ extension: 'png', size: 128 });
            } catch (userError) {
              console.error('Error fetching child user:', userError);
              childName = 'Unknown User';

              childAvatar = null;
            }
          }

          if (childName !== 'Unknown User' || childAvatar) {
            adoptionData = {
              child: child,
              childName: childName,
              childAvatar: childAvatar,
              role: firstChild.child_type 
            };
          }
        }
      }
    } catch (error) {
      console.error('Error fetching adoption data:', error);
    }

    console.log(`Generating profile image with current data for ${targetUser.username}`);
    

    const activeBackground = await getActiveBackground(targetUser.id);
    
    let buffer;
    let components = [];
    
    try {

      const ponyCacheKey = await createPonyCacheKey(targetUser, pony, marriageData, adoptionData, activeBackground, favoritePony);
      
      if (global.imageCache && global.imageCache.has(ponyCacheKey)) {
        const cached = global.imageCache.get(ponyCacheKey);
        if (Date.now() - cached.timestamp < IMAGE_CACHE_EXPIRY) {
          console.log(`Using cached profile for ${targetUser.username}`);
          buffer = cached.buffer;
          

          components = [];
          if (targetUser.id === interaction.user.id) {
            const hasFamily = !!(marriageData || adoptionData);
            
            const familyButton = new ButtonBuilder()
              .setCustomId(`family_${targetUser.id}`)
              .setLabel('Family')
              .setEmoji('<:heart:1431725328304308456>')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(!hasFamily);

            const backgroundButton = new ButtonBuilder()
              .setCustomId(`background_catalog_${targetUser.id}`)
              .setLabel('Background Catalog')
              .setEmoji('<:image:1431725330141544508>')
              .setStyle(ButtonStyle.Secondary);

            const editPonyButton = new ButtonBuilder()
              .setCustomId(`edit_pony_${targetUser.id}`)
              .setLabel('Edit Pony')
              .setEmoji('<:edit:1431725078923575306>')
              .setStyle(ButtonStyle.Primary);

            const changePonyButton = new ButtonBuilder()
              .setCustomId(`change_pony_${targetUser.id}`)
              .setLabel('Change Pony')
              .setEmoji('<:swap:1431725076587479211>')
              .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(familyButton, backgroundButton, editPonyButton, changePonyButton);
            components.push(row);
          }
          
          const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });
          return interaction.editReply({
            embeds: [],
            files: [attachment],
            components: components
          });
        } else {
          global.imageCache.delete(ponyCacheKey);
        }
      }
      
      console.log(`Generating new profile for ${targetUser.username}`);
      const imageGeneration = generateProfileImage(targetUser, pony, marriageData, adoptionData, favoritePony, ponyCacheKey, activeBackground, interaction.user.id);
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Image generation timeout')), 10000)
      );
      
      const result = await Promise.race([imageGeneration, timeout]);
      buffer = result.buffer;
      components = result.components;
    } catch (error) {
      console.error('Error generating profile image:', error);
      
      return interaction.editReply({
        embeds: [],
        content: `**${targetUser.username}'s Profile**\n` +
                `Pony: ${pony?.pony_name || pony?.name || 'No Pony'}\n` +
                `Age: ${pony?.pony_age || pony?.age || '-'}\n` +
                `Race: ${pony?.pony_race || pony?.race || '-'}\n` +
                `Bits: ${(pony?.bits || 0) + (pony?.bank_balance || 0)}`,
        components: []
      });
    }

async function generateProfileImage(targetUser, pony, marriageData, adoptionData, favoritePony, ponyCacheKey, backgroundId = null, commandInitiatorId = null) {

  let baseCanvas = await createBaseTemplate(targetUser, backgroundId);
  
  const canvas = createCanvas(1888, 1056);
  const ctx = canvas.getContext('2d');
  
  setFont(ctx, 48, backgroundId);
  
  ctx.drawImage(baseCanvas, 0, 0);

    setFont(ctx, NICKNAME_SIZE, backgroundId); 
    ctx.fillStyle = '#FFFFFF'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const displayName = truncateNickname(targetUser.username);
    ctx.fillText(displayName, NICKNAME_X, NICKNAME_Y);


    if (pony) {

      const ponyName = pony.pony_name || pony.name || 'No Name';
      setFont(ctx, PONY_NAME_SIZE, backgroundId);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(ponyName, PONY_NAME_X, PONY_NAME_Y);


      const ponyAge = pony.pony_age || pony.age ? `${pony.pony_age || pony.age}` : '-';
      setFont(ctx, PONY_AGE_SIZE, backgroundId);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(ponyAge, PONY_AGE_X, PONY_AGE_Y);


      const ponyRace = pony.pony_race || pony.race || '-';
      setFont(ctx, PONY_RACE_SIZE, backgroundId);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(ponyRace, PONY_RACE_X, PONY_RACE_Y);


    } else {

      setFont(ctx, PONY_NAME_SIZE, backgroundId);
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('No Pony', PONY_NAME_X, PONY_NAME_Y);

      setFont(ctx, PONY_AGE_SIZE, backgroundId);
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('-', PONY_AGE_X, PONY_AGE_Y);

      setFont(ctx, PONY_RACE_SIZE, backgroundId);
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('-', PONY_RACE_X, PONY_RACE_Y);

      setFont(ctx, PONY_LEVEL_SIZE, backgroundId);
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('-', PONY_LEVEL_X, PONY_LEVEL_Y);
    }


    if (favoritePony && favoritePony.pony_image) {
      let tempImagePath = null;
      try {
        console.log('Loading favorite pony image:', favoritePony.pony_image);

        let favoritePonyImage;
        

        if (favoritePony.image_type === 'skin') {
          console.log('Loading skin from local file:', favoritePony.pony_image);
          favoritePonyImage = await loadImage(favoritePony.pony_image);
        } else if (favoritePony.image_type === 'local') {
          console.log('Loading local pony image from ponies folder:', favoritePony.pony_image);
          favoritePonyImage = await loadImage(favoritePony.pony_image);
        } else {

          console.log('Downloading and caching pony image:', favoritePony.pony_image);
          tempImagePath = await getCachedPonyImage(favoritePony.pony_image, favoritePony.friend_id);
          
          if (tempImagePath) {
            console.log('Using cached pony image:', tempImagePath);
            favoritePonyImage = await loadImage(tempImagePath);
          } else {

            console.log('Cache failed, using proxy fallback:', favoritePony.pony_image);
            favoritePonyImage = await loadImageWithProxy(favoritePony.pony_image);
          }
        }
        

        ctx.save();
        

        const imageAspectRatio = favoritePonyImage.width / favoritePonyImage.height;
        let drawWidth = FAVORITE_PONY_SIZE;
        let drawHeight = FAVORITE_PONY_SIZE;
        let drawX = FAVORITE_PONY_X;
        let drawY = FAVORITE_PONY_Y;
        
        if (imageAspectRatio > 1) {

          drawHeight = FAVORITE_PONY_SIZE / imageAspectRatio;
          drawY = FAVORITE_PONY_Y + (FAVORITE_PONY_SIZE - drawHeight) / 2;
        } else {

          drawWidth = FAVORITE_PONY_SIZE * imageAspectRatio;
          drawX = FAVORITE_PONY_X + (FAVORITE_PONY_SIZE - drawWidth) / 2;
        }
        

        ctx.drawImage(
          favoritePonyImage, 
          drawX, 
          drawY, 
          drawWidth, 
          drawHeight
        );
        ctx.restore();
        

        if (tempImagePath) {

          setTimeout(() => {
            removeTempPonyImage(tempImagePath);
          }, 5000);
        }

      } catch (error) {
        console.error('Error loading favorite pony image:', error);
        console.error('Failed to load image URL:', favoritePony.pony_image);
        console.error('Pony name:', favoritePony.pony_name);
        console.error('Has skin:', favoritePony.has_skin);
        

        if (tempImagePath) {
          removeTempPonyImage(tempImagePath);
        }
        

      }
    } else {

    }

    if (ponyData) {
      const harmony = ponyData.harmony;
      const harmonyText = `${harmony}`;

      setFont(ctx, HARMONY_SIZE, backgroundId);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(harmonyText, HARMONY_X, HARMONY_Y);

      const bitsText = formatNumber(ponyData.bits);

      setFont(ctx, BITS_SIZE, backgroundId);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(bitsText, BITS_X, BITS_Y);


      const userFarm = await getUserFarm(targetUser.id);
      const farmLevel = userFarm ? userFarm.level : 0;
      const farmLevelText = `${farmLevel}`;

      setFont(ctx, FARM_LEVEL_SIZE, backgroundId);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(farmLevelText, FARM_LEVEL_X, FARM_LEVEL_Y);


      const userRebirth = await getUserRebirth(targetUser.id);
      const rebirthLevel = userRebirth ? userRebirth.rebirth_level : 0;
      

      try {
        const rebirthImagePath = path.join(__dirname, '../../public/rebirth/rebirth.png');
        const rebirthImage = await loadImage(rebirthImagePath);
        
        ctx.drawImage(
          rebirthImage, 
          REBIRTH_IMAGE_X, 
          REBIRTH_IMAGE_Y, 
          REBIRTH_IMAGE_SIZE, 
          REBIRTH_IMAGE_SIZE
        );
      } catch (error) {
        console.error('Error loading rebirth image:', error);
      }
      

      const rebirthLevelText = `${rebirthLevel}`;
      setFont(ctx, REBIRTH_LEVEL_SIZE, backgroundId);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(rebirthLevelText, REBIRTH_LEVEL_X, REBIRTH_LEVEL_Y);

    }


    if (marriageData) {
      try {
        let partnerAvatarImage;
        
        if (marriageData.partnerAvatar) {

          partnerAvatarImage = await loadImageWithCache(marriageData.partnerAvatar);
        } else {

          const noImagePath = path.resolve(process.cwd(), 'no_image.png');
          partnerAvatarImage = await loadImage(noImagePath);
        }
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(
          PARTNER_AVATAR_X + PARTNER_AVATAR_SIZE / 2, 
          PARTNER_AVATAR_Y + PARTNER_AVATAR_SIZE / 2, 
          PARTNER_AVATAR_SIZE / 2, 
          0, 
          Math.PI * 2
        );
        ctx.clip();
        
        ctx.drawImage(
          partnerAvatarImage, 
          PARTNER_AVATAR_X, 
          PARTNER_AVATAR_Y, 
          PARTNER_AVATAR_SIZE, 
          PARTNER_AVATAR_SIZE
        );
        ctx.restore();

        setFont(ctx, PARTNER_NAME_SIZE, backgroundId);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncateNickname(marriageData.partnerName), PARTNER_NAME_X, PARTNER_NAME_Y);

        setFont(ctx, MARRIAGE_TIME_SIZE, backgroundId);
        ctx.fillStyle = '#616161';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Together: ${marriageData.marriageTime}`, MARRIAGE_TIME_X, MARRIAGE_TIME_Y);
        
      } catch (error) {
        console.error('Error loading partner avatar:', error);

        try {
          const noImagePath = path.resolve(process.cwd(), 'no_image.png');
          const noImage = await loadImage(noImagePath);
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(
            PARTNER_AVATAR_X + PARTNER_AVATAR_SIZE / 2, 
            PARTNER_AVATAR_Y + PARTNER_AVATAR_SIZE / 2, 
            PARTNER_AVATAR_SIZE / 2, 
            0, 
            Math.PI * 2
          );
          ctx.clip();
          
          ctx.drawImage(
            noImage, 
            PARTNER_AVATAR_X, 
            PARTNER_AVATAR_Y, 
            PARTNER_AVATAR_SIZE, 
            PARTNER_AVATAR_SIZE
          );
          ctx.restore();
        } catch (fallbackError) {
          console.error('Error loading no_image fallback:', fallbackError);
        }
      }
    }



    if (adoptionData) {
      try {
        let childAvatarImage;
        
        if (adoptionData.childAvatar) {

          childAvatarImage = await loadImageWithCache(adoptionData.childAvatar);
        } else {

          const noImagePath = path.resolve(process.cwd(), 'no_image.png');
          childAvatarImage = await loadImage(noImagePath);
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(
          CHILD_AVATAR_X + CHILD_AVATAR_SIZE / 2, 
          CHILD_AVATAR_Y + CHILD_AVATAR_SIZE / 2, 
          CHILD_AVATAR_SIZE / 2, 
          0, 
          Math.PI * 2
        );
        ctx.clip();

        ctx.drawImage(
          childAvatarImage, 
          CHILD_AVATAR_X, 
          CHILD_AVATAR_Y, 
          CHILD_AVATAR_SIZE, 
          CHILD_AVATAR_SIZE
        );
        ctx.restore();

        setFont(ctx, CHILD_NAME_SIZE, backgroundId);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(truncateNickname(adoptionData.childName), CHILD_NAME_X, CHILD_NAME_Y);

        setFont(ctx, CHILD_ROLE_SIZE, backgroundId);
        ctx.fillStyle = '#616161';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const roleText = adoptionData.role === 'son' ? 'Son' : 'Daughter';
        ctx.fillText(roleText, CHILD_ROLE_X, CHILD_ROLE_Y);
        
      } catch (error) {
        console.error('Error loading child avatar:', error);

        try {
          const noImagePath = path.resolve(process.cwd(), 'no_image.png');
          const noImage = await loadImage(noImagePath);
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(
            CHILD_AVATAR_X + CHILD_AVATAR_SIZE / 2, 
            CHILD_AVATAR_Y + CHILD_AVATAR_SIZE / 2, 
            CHILD_AVATAR_SIZE / 2, 
            0, 
            Math.PI * 2
          );
          ctx.clip();
          
          ctx.drawImage(
            noImage, 
            CHILD_AVATAR_X, 
            CHILD_AVATAR_Y, 
            CHILD_AVATAR_SIZE, 
            CHILD_AVATAR_SIZE
          );
          ctx.restore();
        } catch (fallbackError) {
          console.error('Error loading no_image fallback for child:', fallbackError);
        }
      }
    }


      const buffer = canvas.toBuffer('image/png');
      
      const components = [];
      

      if (commandInitiatorId && targetUser.id === commandInitiatorId) {
        const hasFamily = !!(marriageData || adoptionData);
        
            const familyButton = new ButtonBuilder()
              .setCustomId(`family_${targetUser.id}`)
              .setLabel('Family')
              .setEmoji('<:heart:1431725328304308456>')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(!hasFamily);

            const backgroundButton = new ButtonBuilder()
              .setCustomId(`background_catalog_${targetUser.id}`)
              .setLabel('Background Catalog')
              .setEmoji('<:image:1431725330141544508>')
              .setStyle(ButtonStyle.Secondary);

            const editPonyButton = new ButtonBuilder()
              .setCustomId(`edit_pony_${targetUser.id}`)
              .setLabel('Edit Pony')
              .setEmoji('<:edit:1431725078923575306>')
              .setStyle(ButtonStyle.Primary);

            const changePonyButton = new ButtonBuilder()
              .setCustomId(`change_pony_${targetUser.id}`)
              .setLabel('Change Pony')
              .setEmoji('<:swap:1431725076587479211>')
              .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(familyButton, backgroundButton, editPonyButton, changePonyButton);
        components.push(row);
      }
      

      if (!global.imageCache) global.imageCache = new Map();
      global.imageCache.set(ponyCacheKey, {
        buffer: buffer,
        timestamp: Date.now()
      });
      
      return { buffer, components };
    }

    const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });

    const mediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL('attachment://profile.png')
      );

    const profileContainer = new ContainerBuilder()
      .addMediaGalleryComponents(mediaGallery);

    if (components && components.length > 0) {
      components.forEach(component => {
        profileContainer.addActionRowComponents(component);
      });
    }

    return interaction.editReply({
      components: [profileContainer],
      files: [attachment],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (error) {
    console.error('Error in profile command:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('**Profile Error**\n\nAn error occurred while generating your profile.');
      
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    return interaction.editReply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

async function drawCircularAvatar(ctx, image, x, y, radius, borderWidth = 4) {
  ctx.save();
  
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const size = radius * 2;
  ctx.drawImage(image, x - radius, y - radius, size, size);
  
  ctx.restore();
  

  if (borderWidth > 0) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = borderWidth;
    ctx.stroke();
  }
}

async function createDefaultAvatar() {
  const defaultCanvas = createCanvas(512, 512);
  const defaultCtx = defaultCanvas.getContext('2d');

  defaultCtx.fillStyle = '#5865F2';
  defaultCtx.fillRect(0, 0, 512, 512);

  defaultCtx.fillStyle = '#FFFFFF';
  defaultCtx.font = getFontString(256);
  defaultCtx.textAlign = 'center';
  defaultCtx.textBaseline = 'middle';
  defaultCtx.fillText('?', 256, 256);
  
  return defaultCanvas;
}


async function generatePreviewImage(targetUser, backgroundId) {
  try {
    console.log(`Generating preview for ${targetUser.username} with background ${backgroundId}`);
    

    let baseCanvas = await createPreviewTemplate(targetUser, backgroundId);
    
    const canvas = createCanvas(1888, 1056);
    const ctx = canvas.getContext('2d');
    
    setFont(ctx, 48, backgroundId);
    
    ctx.drawImage(baseCanvas, 0, 0);


    
    console.log(`Successfully generated preview for ${targetUser.username}`);
    return canvas;
  } catch (error) {
    console.error('Error generating preview image:', error);

    try {
      return await createPreviewTemplate(targetUser, backgroundId);
    } catch (fallbackError) {
      console.error('Error creating fallback template:', fallbackError);
      return null;
    }
  }
}

export async function handleBackgroundCatalog(interaction, skipDefer = false) {
  try {
    const { customId } = interaction;
    

    if (!skipDefer && !customId.startsWith('edit_pony_')) {
      await interaction.deferUpdate();
    }


    let userId, backgroundIndex = 0;
    
    if (customId.startsWith('family_')) {

      userId = customId.replace('family_', '');
      

      if (interaction.user.id !== userId) {
        return await interaction.reply({
          content: 'You can only interact with your own profile buttons.',
          ephemeral: true
        });
      }
      

      return await interaction.reply({
        content: 'Family feature is coming soon!',
        ephemeral: true
      });
      
    } else if (customId.startsWith('edit_pony_')) {

      userId = customId.replace('edit_pony_', '');
      

      if (interaction.user.id !== userId) {
        return await interaction.reply({
          content: 'You can only interact with your own profile buttons.',
          ephemeral: true
        });
      }
      

      const currentPony = await getPony(userId);
      

      const modal = new ModalBuilder()
        .setCustomId(`edit_pony_modal_${userId}`)
        .setTitle('Edit Pony');

      const nameInput = new TextInputBuilder()
        .setCustomId('pony_name')
        .setLabel('Pony Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter pony name (only Latin letters and spaces)')
        .setRequired(true)
        .setMaxLength(20)
        .setValue(currentPony?.pony_name || currentPony?.name || '');

      const ageInput = new TextInputBuilder()
        .setCustomId('pony_age')
        .setLabel('Pony Age')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter age (from 1 to 10000 years)')
        .setRequired(true)
        .setValue(String(currentPony?.pony_age || currentPony?.age || ''));

      const raceInput = new TextInputBuilder()
        .setCustomId('pony_race')
        .setLabel('Pony Race')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Earth, Unicorn, Pegasus, Alicorn, Kirin, Lamia etc.')
        .setRequired(true)
        .setValue(currentPony?.pony_race || currentPony?.race || '');

      const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
      const secondActionRow = new ActionRowBuilder().addComponents(ageInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(raceInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

      return await interaction.showModal(modal);
      
    } else if (customId.startsWith('change_pony_')) {

      userId = customId.replace('change_pony_', '');
      

      if (interaction.user.id !== userId) {
        return await interaction.reply({
          content: 'You can only interact with your own profile buttons.',
          ephemeral: true
        });
      }
      
      return await handleChangePony(interaction, userId);
      
    } else if (customId.startsWith('background_catalog_')) {
      userId = customId.replace('background_catalog_', '');
      

      if (interaction.user.id !== userId) {
        return await interaction.followUp({
          content: 'You can only interact with your own profile buttons.',
          ephemeral: true
        });
      }
      
    } else if (customId.startsWith('background_selector_')) {
      userId = customId.replace('background_selector_', '');
      

      if (interaction.user.id !== userId) {
        return await interaction.followUp({
          content: 'You can only interact with your own profile buttons.',
          ephemeral: true
        });
      }
      

      if (interaction.values && interaction.values[0]) {
        const selectedValue = interaction.values[0];
        const parts = selectedValue.split('_');
        backgroundIndex = parseInt(parts[parts.length - 1] || '0');
      }
      
    } else if (customId.startsWith('background_purchase_')) {
      const parts = customId.split('_');
      userId = parts[2];
      

      if (interaction.user.id !== userId) {
        return await interaction.followUp({
          content: 'You can only interact with your own profile buttons.',
          ephemeral: true
        });
      }
      

      const lastPart = parts[parts.length - 1];
      backgroundIndex = parseInt(lastPart || '0');

      const backgroundId = parts.slice(3, -1).join('_');
      

      return await handleBackgroundPurchase(interaction, userId, backgroundId, backgroundIndex);
    } else if (customId.startsWith('background_apply_')) {
      const parts = customId.split('_');
      userId = parts[2];
      

      if (interaction.user.id !== userId) {
        return await interaction.followUp({
          content: 'You can only interact with your own profile buttons.',
          ephemeral: true
        });
      }
      

      const backgroundId = parts.slice(3).join('_');
      

      return await handleBackgroundApply(interaction, userId, backgroundId);
    }

    const targetUser = await interaction.client.users.fetch(userId);
    

    await ensureDefaultBackground(targetUser.id);
    

    const allBackgrounds = getAllBackgrounds(false);
    const hiddenBackgrounds = getAllBackgrounds(true).filter(bg => bg.hidden);
    

    const ownedHiddenBackgrounds = [];
    for (const hiddenBg of hiddenBackgrounds) {
      const hasHiddenBg = await hasBackground(targetUser.id, hiddenBg.id);
      if (hasHiddenBg) {
        ownedHiddenBackgrounds.push(hiddenBg);
      }
    }
    

    const userBackgrounds = [...allBackgrounds, ...ownedHiddenBackgrounds];
    

    if (backgroundIndex >= userBackgrounds.length) {
      backgroundIndex = 0;
    }
    if (backgroundIndex < 0) {
      backgroundIndex = userBackgrounds.length - 1;
    }
    
    const currentBackground = userBackgrounds[backgroundIndex];
    
    console.log(`Background catalog: index=${backgroundIndex}, background=${currentBackground ? currentBackground.id : 'undefined'}, total=${userBackgrounds.length}`);
    
    if (!currentBackground) {
      return interaction.editReply({
        content: 'Background not found!',
        components: []
      });
    }


    const pony = await getPony(targetUser.id);
    



    const previewCanvas = await generatePreviewImage(targetUser, currentBackground.id);
    
    if (!previewCanvas) {
      return interaction.editReply({
        content: 'Error generating background preview. Please try again.',
        components: []
      });
    }
    
    let previewBuffer;
    try {
      previewBuffer = previewCanvas.toBuffer('image/png');
    } catch (bufferError) {
      console.error('Error converting canvas to buffer:', bufferError);
      return interaction.editReply({
        content: 'Error processing background preview. Please try again.',
        components: []
      });
    }
    
    const previewAttachment = new AttachmentBuilder(previewBuffer, { name: 'background-preview.png' });
    

    const hasBg = await hasBackground(targetUser.id, currentBackground.id);
    const userBits = (pony?.bits || 0) + (pony?.bank_balance || 0);
    const canAfford = userBits >= currentBackground.cost;



    const components = [];
    

    const selectOptions = [];
    for (let index = 0; index < userBackgrounds.length; index++) {
      const bg = userBackgrounds[index];
      const owned = await hasBackground(targetUser.id, bg.id);
      selectOptions.push({
        label: bg.name,
        description: owned ? 'Owned' : `${bg.cost} bits`,
        value: `background_select_${userId}_${index}`,
        emoji: owned ? '✅' : '💰',
        default: index === backgroundIndex
      });
    }

    const selectRow = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`background_selector_${userId}`)
          .setPlaceholder('Choose a background to preview')
          .addOptions(selectOptions)
      );


    const actionRow = new ActionRowBuilder();
    

    if (hasBg) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`background_apply_${userId}_${currentBackground.id}`)
          .setLabel('Apply')
          .setStyle(ButtonStyle.Success)
      );
    } else {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`background_purchase_${userId}_${currentBackground.id}_${backgroundIndex}`)
          .setLabel(`Buy for ${currentBackground.cost} bits`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canAfford)
      );
    }
    
    components.push(selectRow, actionRow);

    const statusText = hasBg 
      ? `> **Status:** Owned` 
      : `> **Cost:** ${currentBackground.cost} bits\n> **Your balance:** ${userBits} bits`;

    const catalogText = new TextDisplayBuilder()
      .setContent(`**🎨 Background Catalog**\n**Background:** ${currentBackground.name}\n${statusText}`);
    
    const mediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://background-preview.png`)
      );
    
    const catalogContainer = new ContainerBuilder()
      .addTextDisplayComponents(catalogText)
      .addMediaGalleryComponents(mediaGallery);

    await interaction.editReply({
      components: [catalogContainer, ...components],
      files: [previewAttachment],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (error) {
    console.error('Error in handleBackgroundCatalog:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('**❌ Error**\n\nAn error occurred while loading the background catalog.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.editReply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}


async function handleBackgroundPurchase(interaction, userId, backgroundId, backgroundIndex) {
  try {

    if (interaction.user.id !== userId) {
      return await interaction.followUp({
        content: 'You can only interact with your own profile buttons.',
        ephemeral: true
      });
    }
    

    
    const targetUser = await interaction.client.users.fetch(userId);
    const backgroundInfo = getBackgroundInfo(backgroundId);
    
    if (!backgroundInfo) {
      const notFoundContainer = new ContainerBuilder();
      const notFoundText = new TextDisplayBuilder()
        .setContent('**Background not found!**\n\nThe requested background could not be found.');
      notFoundContainer.addTextDisplayComponents(notFoundText);

      return interaction.editReply({
        components: [notFoundContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }


    const alreadyHas = await hasBackground(userId, backgroundId);
    if (alreadyHas) {
      const ownedContainer = new ContainerBuilder();
      const ownedText = new TextDisplayBuilder()
        .setContent('**You already own this background!**\n\nUse the "Apply" button to set it as your profile background.');
      ownedContainer.addTextDisplayComponents(ownedText);

      return interaction.editReply({
        components: [ownedContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }


    const pony = await getPony(userId);
    const totalUserBits = (pony?.bits || 0) + (pony?.bank_balance || 0);
    if (!pony || totalUserBits < backgroundInfo.cost) {
      const insufficientContainer = new ContainerBuilder();
      const insufficientText = new TextDisplayBuilder()
        .setContent(`**Insufficient funds!**\n\n**Required:** ${backgroundInfo.cost} bits\n**Your balance:** ${totalUserBits} bits`);
      insufficientContainer.addTextDisplayComponents(insufficientText);

      return interaction.editReply({
        components: [insufficientContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }


    const { removeBits, getPony: getPonyFresh } = await import('../../utils/pony/index.js');
    

    const ponyBefore = await getPonyFresh(userId);
    const balanceBefore = ponyBefore?.bits || 0;
    

    

    const bitRemovalResult = await removeBits(userId, backgroundInfo.cost);
    

    const ponyAfter = await getPonyFresh(userId);
    const balanceAfter = ponyAfter?.bits || 0;
    const actualDeducted = balanceBefore - balanceAfter;
    

    

    if (actualDeducted !== backgroundInfo.cost) {
      console.error(`[PURCHASE DEBUG] Bit deduction mismatch! Expected: ${backgroundInfo.cost}, Actual: ${actualDeducted}`);
      
      const failedContainer = new ContainerBuilder();
      const failedText = new TextDisplayBuilder()
        .setContent('**Transaction failed!**\n\nMake sure you withdraw your bits from the bank.');
      failedContainer.addTextDisplayComponents(failedText);

      return interaction.editReply({
        components: [failedContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    

    await purchaseBackground(userId, backgroundId);




    return handleBackgroundCatalog(interaction, true);
    
  } catch (error) {
    console.error('Error in handleBackgroundPurchase:', error);
    
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('**Error occurred**\n\nAn error occurred while purchasing the background.');
    errorContainer.addTextDisplayComponents(errorText);

    await interaction.editReply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}


async function handleBackgroundApply(interaction, userId, backgroundId) {
  try {

    if (interaction.user.id !== userId) {
      return await interaction.followUp({
        content: 'You can only interact with your own profile buttons.',
        ephemeral: true
      });
    }
    
    const backgroundInfo = getBackgroundInfo(backgroundId);
    
    if (!backgroundInfo) {
      return interaction.editReply({
        content: 'Background not found!',
        components: []
      });
    }


    await setActiveBackground(userId, backgroundId);


    console.log(`Clearing all caches for user ${userId} after background change`);
    

    let totalCleared = 0;
    
    if (global.imageCache) {
      const beforeSize = global.imageCache.size;
      const keysToDelete = [];
      for (const [key, value] of global.imageCache.entries()) {
        if (key.includes(`"userId":"${userId}"`) || key.includes(userId)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => global.imageCache.delete(key));
      totalCleared += keysToDelete.length;
      console.log(`Cleared ${keysToDelete.length} imageCache entries (${beforeSize} -> ${global.imageCache.size})`);
    }
    
    if (global.templateCache) {
      const beforeSize = global.templateCache.size;
      const keysToDelete = [];
      for (const [key, value] of global.templateCache.entries()) {
        if (key.includes(userId)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => global.templateCache.delete(key));
      totalCleared += keysToDelete.length;
      console.log(`Cleared ${keysToDelete.length} templateCache entries (${beforeSize} -> ${global.templateCache.size})`);
    }
    
    if (global.avatarCache) {
      const beforeSize = global.avatarCache.size;
      const keysToDelete = [];
      for (const [key, value] of global.avatarCache.entries()) {
        if (key.includes(userId)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => global.avatarCache.delete(key));
      totalCleared += keysToDelete.length;
      console.log(`Cleared ${keysToDelete.length} avatarCache entries (${beforeSize} -> ${global.avatarCache.size})`);
    }
    
    console.log(`Total cache entries cleared for user ${userId}: ${totalCleared}`);

    const targetUser = interaction.user;
    
    const loadingContainer = createLoadingContainer();
    await interaction.editReply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      const canvas = await createBaseTemplate(targetUser, backgroundId);
      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });
      
      const statusText = new TextDisplayBuilder()
        .setContent(`**Background Applied Successfully!**\n\n**"${backgroundInfo.name}"** is now active on your profile.`);

      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL('attachment://profile.png')
        );

      const separator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small);

      const profileButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`family_${targetUser.id}`)
            .setLabel('Family')
            .setEmoji('<:heart:1431725328304308456>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`backgrounds_${targetUser.id}`)
            .setLabel('Background Catalog')
            .setEmoji('<:image:1431725330141544508>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`edit_pony_${targetUser.id}`)
            .setLabel('Edit Pony')
            .setEmoji('<:edit:1431725078923575306>')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`change_pony_${targetUser.id}`)
            .setLabel('Change Pony')
            .setEmoji('<:swap:1431725076587479211>')
            .setStyle(ButtonStyle.Success)
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(statusText)
        .addSeparatorComponents(separator)
        .addMediaGalleryComponents(mediaGallery)
        .addActionRowComponents(profileButtons);

      await interaction.editReply({
        components: [container],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (profileError) {
      console.error('Error regenerating profile after background change:', profileError);
      
      await interaction.editReply({
        components: [createSuccessContainer(`**Background Applied Successfully!**\n\n**"${backgroundInfo.name}"** is now active on your profile.\n\nUse \`/profile\` to see your updated profile.`)],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
  } catch (error) {
    console.error('Error in handleBackgroundApply:', error);
    
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('**Error occurred**\n\nAn error occurred while applying the background.');
    errorContainer.addTextDisplayComponents(errorText);

    await interaction.editReply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}


async function generateFamilyProfile(targetUser, marriageData, adoptionData) {
  try {
    console.log(`Generating family profile for ${targetUser.username}`);
    

    const familyBgPath = path.join(__dirname, '..', '..', 'public', 'loveprofile', 'loveprofile.png');
    let familyBg;
    
    try {
      familyBg = await loadImage(familyBgPath);
    } catch (error) {
      console.error('Error loading family background:', error);

      const canvas = createCanvas(1824, 1040);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#7289da';
      ctx.fillRect(0, 0, 1824, 1040);
      familyBg = canvas;
    }
    
    const canvas = createCanvas(1824, 1040);
    const ctx = canvas.getContext('2d');
    

    ctx.drawImage(familyBg, 0, 0, canvas.width, canvas.height);
    

    let mainAvatarImage;
    try {
      const avatarURL = targetUser.displayAvatarURL({ format: 'png', size: 512 });
      mainAvatarImage = await loadImageWithCache(avatarURL, createDefaultAvatar);
    } catch (error) {
      console.error('Error loading main avatar:', error);
      mainAvatarImage = await createDefaultAvatar();
    }
    

    await drawCircularAvatar(ctx, mainAvatarImage, FAMILY_MAIN_AVATAR_X, FAMILY_MAIN_AVATAR_Y, FAMILY_MAIN_AVATAR_SIZE / 2, 0);
    

    setFont(ctx, FAMILY_NAME_SIZE, null, true);
    ctx.fillStyle = FAMILY_NAME_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncateNickname(targetUser.username), FAMILY_MAIN_NAME_X, FAMILY_MAIN_NAME_Y);
    
    let yOffset = 0;
    

    if (marriageData) {
      try {

        let partnerAvatarImage;
        if (marriageData.partnerAvatar) {
          partnerAvatarImage = await loadImageWithCache(marriageData.partnerAvatar, createDefaultAvatar);
        } else {
          partnerAvatarImage = await createDefaultAvatar();
        }
        

        const partnerY = FAMILY_PARTNER_AVATAR_Y + yOffset;
        await drawCircularAvatar(ctx, partnerAvatarImage, FAMILY_PARTNER_AVATAR_X, partnerY, FAMILY_PARTNER_AVATAR_SIZE / 2, 0);
        

        setFont(ctx, FAMILY_NAME_SIZE, null, true);
        ctx.fillStyle = FAMILY_NAME_COLOR;
        ctx.textAlign = 'center';
        ctx.fillText(truncateNickname(marriageData.partnerName || 'Unknown'), FAMILY_PARTNER_NAME_X, FAMILY_PARTNER_NAME_Y);
        

        setFont(ctx, FAMILY_DATE_SIZE, null, true);
        ctx.fillStyle = FAMILY_DATE_COLOR;
        ctx.fillText(`${marriageData.marriageTime}`, FAMILY_MARRIAGE_DATE_X, FAMILY_MARRIAGE_DATE_Y);
        
        yOffset += 200;
      } catch (error) {
        console.error('Error drawing marriage data:', error);
      }
    }
    

    if (adoptionData) {
      try {

        let childAvatarImage;
        if (adoptionData.childAvatar) {
          childAvatarImage = await loadImageWithCache(adoptionData.childAvatar, createDefaultAvatar);
        } else {
          childAvatarImage = await createDefaultAvatar();
        }
        

        const childY = FAMILY_CHILD_AVATAR_Y + yOffset;
        await drawCircularAvatar(ctx, childAvatarImage, FAMILY_CHILD_AVATAR_X, childY, FAMILY_CHILD_AVATAR_SIZE / 2, 0);
        

        setFont(ctx, FAMILY_NAME_SIZE, null, true);
        ctx.fillStyle = FAMILY_NAME_COLOR;
        ctx.textAlign = 'center';
        ctx.fillText(truncateNickname(adoptionData.childName || 'Unknown'), FAMILY_CHILD_NAME_X, FAMILY_CHILD_NAME_Y);
        

        setFont(ctx, FAMILY_ROLE_SIZE, null, true);
        ctx.fillStyle = FAMILY_DATE_COLOR;
        const roleText = adoptionData.role === 'son' ? 'Son' : 'Daughter';
        ctx.fillText(roleText, FAMILY_CHILD_ROLE_X, FAMILY_CHILD_ROLE_Y);
      } catch (error) {
        console.error('Error drawing adoption data:', error);
      }
    }
    
    console.log(`Successfully generated family profile for ${targetUser.username}`);
    return canvas;
  } catch (error) {
    console.error('Error in generateFamilyProfile:', error);
    throw error;
  }
}


export { generateFamilyProfile };


export async function handleEditPonyModal(interaction) {
  try {

    await interaction.deferReply({ ephemeral: true });
    
    const { customId } = interaction;
    

    if (!customId.startsWith('edit_pony_modal_')) {
      return;
    }
    
    const userId = customId.replace('edit_pony_modal_', '');
    

    if (interaction.user.id !== userId) {
      return await interaction.editReply({
        content: 'You can only edit your own pony.'
      });
    }
    

    const ponyName = interaction.fields.getTextInputValue('pony_name').trim();
    const ponyAge = interaction.fields.getTextInputValue('pony_age').trim();
    const ponyRace = interaction.fields.getTextInputValue('pony_race').trim();
    

    if (!ponyName) {
      return await interaction.editReply({
        content: 'Pony name cannot be empty!'
      });
    }
    
    if (ponyName.length > 20) {
      return await interaction.editReply({
        content: 'Pony name cannot be longer than 20 characters!'
      });
    }
    

    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(ponyName)) {
      return await interaction.editReply({
        content: 'Pony name can only contain Latin letters and spaces!'
      });
    }
    

    const age = parseInt(ponyAge);
    if (isNaN(age) || age < 1 || age > 10000) {
      return await interaction.editReply({
        content: 'Pony age must be a number between 1 and 10000 years!'
      });
    }
    

    const normalizedRace = ponyRace.charAt(0).toUpperCase() + ponyRace.slice(1).toLowerCase();
    if (!VALID_PONY_RACES.includes(normalizedRace)) {
      return await interaction.editReply({
        content: `Invalid pony race! Available races: ${VALID_PONY_RACES.join(', ')}`
      });
    }
    

    try {
      await query(
        'UPDATE ponies SET pony_name = ?, pony_age = ?, pony_race = ? WHERE user_id = ?',
        [ponyName, age, normalizedRace, userId]
      );
      

      if (global.imageCache) {
        const keysToDelete = [];
        for (const [key, value] of global.imageCache.entries()) {
          if (key.includes(userId)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => global.imageCache.delete(key));
      }
      
      await interaction.editReply({
        components: [createSuccessContainer(`**✅ Pony Data Updated**\n\nYour pony information has been successfully updated!\n\n**🏷️ Name**\n${ponyName}\n\n**🎂 Age**\n${age} years\n\n**🦄 Race**\n${normalizedRace}`)],
        flags: MessageFlags.IsComponentsV2
      });
      
    } catch (dbError) {
      console.error('Error updating pony data:', dbError);
      await interaction.editReply({
        content: 'An error occurred while updating pony data. Please try again.'
      });
    }
    
  } catch (error) {
    console.error('Error handling edit pony modal:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while processing the request.',
        ephemeral: true
      });
    } else if (interaction.deferred) {
      await interaction.editReply({
        content: 'An error occurred while processing the request.'
      });
    }
  }
}


async function handleFarmDetails(interaction, userId) {
  try {
    await interaction.deferUpdate();
    
    const userFarm = await getUserFarm(userId);
    const expansionPlans = await getExpansionPlans(userId);
    const harmonyValue = await getHarmony(userId);
    
    if (!userFarm) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: 'No Farm Found',
          description: 'You need to create a farm first!',
          color: 0x03168f,
          user: interaction.user
        })],
        components: []
      });
    }
    
    const harvestTime = getHarvestTime(userFarm.level);
    const hours = Math.floor(harvestTime / 60);
    const minutes = harvestTime % 60;
    const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    

    const productionInfo = {
      apple: { emoji: '🍎', name: 'Apple Production' },
      egg: { emoji: '🥚', name: 'Egg Production' },
      milk: { emoji: '🥛', name: 'Milk Production' }
    };
    
    const currentProduction = productionInfo[userFarm.production_type] || productionInfo.apple;
    

    let harvestStatus = 'No harvest in progress';
    if (userFarm.harvest_started_at) {
      const isReady = await isHarvestReady(userId);
      if (isReady) {
        harvestStatus = '🌾 Harvest is ready to collect!';
      } else {
        const startTime = new Date(userFarm.harvest_started_at);
        const currentTime = new Date();
        const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
        const remainingMinutes = Math.max(0, harvestTime - elapsedMinutes);
        const remainingHours = Math.floor(remainingMinutes / 60);
        const remainingMins = Math.floor(remainingMinutes % 60);
        harvestStatus = `⏰ Growing... ${remainingHours}h ${remainingMins}m remaining`;
      }
    }
    

    const embed = createEmbed({
      title: `${currentProduction.emoji} ${currentProduction.name}`,
      description: 'Manage your farm production and view statistics',
      fields: [
        {
          name: '🏠 Farm Level',
          value: `Level ${userFarm.level}`,
          inline: true
        },
        {
          name: '⏱️ Harvest Time',
          value: timeText,
          inline: true
        },
        {
          name: '<:cartography:1418286057585250438> Expansion Plans',
          value: `${expansionPlans.plans || 0}`,
          inline: true
        },
        {
          name: '<:harmony:1416514347789844541> Harmony',
          value: `${harmonyValue || 0}`,
          inline: true
        },
        {
          name: '🌱 Harvest Status',
          value: harvestStatus,
          inline: false
        }
      ],
      color: 0x03168f,
      user: interaction.user
    });
    

    const components = [];
    

    const productionOptions = [
      {
        label: 'Apple Production',
        description: 'Basic fruit production',
        value: 'apple',
        emoji: '🍎',
        default: userFarm.production_type === 'apple'
      }
    ];
    

    if (userFarm.level >= 15) {
      productionOptions.push({
        label: 'Egg Production',
        description: 'Requires Level 15, 50 Harmony, 20 Plans',
        value: 'egg',
        emoji: '🥚',
        default: userFarm.production_type === 'egg'
      });
    }
    

    if (userFarm.level >= 30) {
      productionOptions.push({
        label: 'Milk Production',
        description: 'Requires Level 30, 100 Harmony, 40 Plans',
        value: 'milk',
        emoji: '🥛',
        default: userFarm.production_type === 'milk'
      });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`change_production_${userId}`)
      .setPlaceholder('Change production type')
      .addOptions(productionOptions);
    
    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    components.push(selectRow);
    

    const backButton = new ButtonBuilder()
      .setCustomId(`back_to_profile_${userId}`)
      .setLabel('Back to Profile')
      .setStyle(ButtonStyle.Secondary);
    
    const buttonRow = new ActionRowBuilder().addComponents(backButton);
    components.push(buttonRow);
    
    await interaction.editReply({
      embeds: [embed],
      components: components
    });
    
  } catch (error) {
    console.error('Error in handleFarmDetails:', error);
    await interaction.editReply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while loading farm details.',
        color: 0x03168f,
        user: interaction.user
      })],
      components: []
    });
  }
}


export async function handleProductionChange(interaction, userId, newProduction) {
  try {
    await interaction.deferUpdate();
    
    const userFarm = await getUserFarm(userId);
    const expansionPlans = await getExpansionPlans(userId);
    const harmonyValue = await getHarmony(userId);
    
    if (!userFarm) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ No Farm Found',
          description: 'You need to create a farm first!',
          color: 0x03168f,
          user: interaction.user
        })],
        components: []
      });
    }
    

    if (userFarm.production_type === newProduction) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '⚠️ Already Active',
          description: `This production type is already active on your farm.`,
          color: 0x03168f,
          user: interaction.user
        })],
        components: []
      });
    }
    

    let requiredLevel = 1;
    let requiredHarmony = 0;
    let requiredPlans = 0;
    
    switch (newProduction) {
      case 'apple':

        break;
      case 'egg':
        requiredLevel = 15;
        requiredHarmony = 50;
        requiredPlans = 20;
        break;
      case 'milk':
        requiredLevel = 30;
        requiredHarmony = 100;
        requiredPlans = 40;
        break;
      default:
        return await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Invalid Production',
            description: 'Unknown production type selected.',
            color: 0x03168f,
            user: interaction.user
          })],
          components: []
        });
    }
    

    if (userFarm.level < requiredLevel) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Insufficient Farm Level',
          description: `You need Farm Level ${requiredLevel} for this production type.\nYour current level: ${userFarm.level}`,
          color: 0x03168f,
          user: interaction.user
        })],
        components: []
      });
    }
    
    if (harmonyValue < requiredHarmony) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Insufficient Harmony',
          description: `You need ${requiredHarmony} <:harmony:1416514347789844541> Harmony for this production type.\nYour current harmony: ${harmonyValue}`,
          color: 0x03168f,
          user: interaction.user
        })],
        components: []
      });
    }
    
    if (expansionPlans.plans < requiredPlans) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Insufficient Expansion Plans',
          description: `You need ${requiredPlans} <:cartography:1418286057585250438> Expansion Plans for this production type.\nYour current plans: ${expansionPlans.plans}`,
          color: 0x03168f,
          user: interaction.user
        })],
        components: []
      });
    }
    

    if (requiredHarmony > 0) {

      const { spendHarmony } = await import('../../models/HarmonyModel.js');
      await spendHarmony(userId, requiredHarmony);
    }
    
    if (requiredPlans > 0) {
      await spendExpansionPlans(userId, requiredPlans);
    }
    

    await changeFarmProduction(userId, newProduction);
    
    const productionNames = {
      apple: '🍎 Apple Production',
      egg: '🥚 Egg Production', 
      milk: '🥛 Milk Production'
    };
    
    await interaction.editReply({
      embeds: [createEmbed({
        title: '✅ Production Changed',
        description: `Successfully changed to ${productionNames[newProduction]}!`,
        fields: requiredHarmony > 0 || requiredPlans > 0 ? [
          {
            name: 'Resources Spent',
            value: `${requiredHarmony > 0 ? `${requiredHarmony} <:harmony:1416514347789844541> Harmony\n` : ''}${requiredPlans > 0 ? `${requiredPlans} <:cartography:1418286057585250438> Expansion Plans` : ''}`,
            inline: false
          }
        ] : [],
        color: 0x03168f,
        user: interaction.user
      })],
      components: []
    });
    
  } catch (error) {
    console.error('Error in handleProductionChange:', error);
    await interaction.editReply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while changing production type.',
        color: 0x03168f,
        user: interaction.user
      })],
      components: []
    });
  }
}


async function setFavoritePony(userId, friendId) {
  try {

    const resetResult = await query('UPDATE friendship SET is_favorite = 0 WHERE user_id = ?', [userId]);
    

    const setResult = await query('UPDATE friendship SET is_favorite = 1 WHERE user_id = ? AND friend_id = ?', [userId, friendId]);
    
    return true;
  } catch (error) {
    console.error('Error setting favorite pony:', error);
    return false;
  }
}


async function setProfilePony(userId, friendshipId) {
  try {

    const resetResult = await query('UPDATE friendship SET is_profile_pony = 0 WHERE user_id = ?', [userId]);
    

    const setResult = await query('UPDATE friendship SET is_profile_pony = 1 WHERE user_id = ? AND id = ?', [userId, friendshipId]);
    

    if (setResult.changes === 0) {
      console.error('No pony found with friendship ID:', friendshipId);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting profile pony:', error);
    return false;
  }
}


export async function handleChangePony(interaction, userId) {
  try {

    if (interaction.user.id !== userId) {
      return await interaction.reply({
        content: 'You can only interact with your own profile buttons.',
        ephemeral: true
      });
    }
    

    const modal = new ModalBuilder()
      .setCustomId(`change_pony_modal_${userId}`)
      .setTitle('Change Profile Pony');

    const ponyIdInput = new TextInputBuilder()
      .setCustomId('pony_id')
      .setLabel('Pony Unique ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter the unique ID of your pony (from /myponies)')
      .setRequired(true)
      .setMaxLength(10);

    const firstActionRow = new ActionRowBuilder().addComponents(ponyIdInput);
    modal.addComponents(firstActionRow);

    return await interaction.showModal(modal);
    
  } catch (error) {
    console.error('Error in handleChangePony:', error);
    await interaction.reply({
      embeds: [createEmbed({
        title: '❌ Error Occurred',
        description: 'An error occurred while opening the pony selection modal. Please try again.\n\nIf this issue persists, please contact support.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


export async function handleChangePonyModal(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.customId.replace('change_pony_modal_', '');
    const ponyIdInput = interaction.fields.getTextInputValue('pony_id').trim();
    

    if (interaction.user.id !== userId) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Access Denied',
          description: 'You can only change your own profile pony.',
          color: 0x03168f,
          user: interaction.user
        })]
      });
    }
    

    const friendshipId = parseInt(ponyIdInput);
    if (isNaN(friendshipId) || friendshipId <= 0) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Invalid ID',
          description: `"${ponyIdInput}" is not a valid friendship ID.\n\n💡 **Tip:** Use \`/myponies\` to see your ponies with their friendship IDs.`,
          color: 0x03168f,
          user: interaction.user
        })]
      });
    }
    

    const userFriends = await getUserFriends(userId);
    if (!userFriends || userFriends.length === 0) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ No Ponies Found',
          description: 'You don\'t have any ponies yet! Go encounter some ponies first.\n\nUse commands like `/venture` or wait for pony spawns to build your collection.',
          color: 0x03168f,
          user: interaction.user
        })]
      });
    }
    

    const foundPony = userFriends.find(friend => friend.id === friendshipId);
    
    if (!foundPony) {

      const sortedFriends = userFriends.sort((a, b) => a.id - b.id);
      const availablePonies = sortedFriends.slice(0, 5);
      const ponyList = availablePonies.map(f => `• ID: \`${f.id}\` - ${f.name}`).join('\n');
      
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Pony Not Found',
          description: `Pony with unique ID \`${friendshipId}\` was not found in your collection!\n\n**Some of your available ponies:**\n${ponyList}${availablePonies.length < userFriends.length ? '\n*...and more ponies*' : ''}\n\n💡 **Tip:** Use \`/myponies\` to see all your ponies with their unique IDs.`,
          color: 0x03168f,
          user: interaction.user
        })]
      });
    }
    

    const success = await setProfilePony(userId, foundPony.id);
    

    try {
      const { MessageCacheManager } = await import('../../utils/messageCacheManager.js');
      if (global.messageCacheManager) {
        global.messageCacheManager.invalidateActivePonyCache(userId);
        console.log(`[PROFILE CHANGE] Cache invalidated for user ${userId}`);
      }
    } catch (error) {
      console.debug('Cache invalidation error:', error);
    }
    
    if (!success) {
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Error Occurred',
          description: 'An error occurred while setting your favorite pony. Please try again.\n\nIf the problem persists, please contact support.',
          color: 0x03168f,
          user: interaction.user
        })]
      });
    }
    

    const equippedSkin = await getEquippedSkin(userId, foundPony.name);
    const skinInfo = equippedSkin ? ` with **${equippedSkin.name}** skin` : '';
    
    const successText = new TextDisplayBuilder()
      .setContent(`**Profile Pony Changed**\n\nSuccessfully set **${foundPony.name}** (ID: \`${friendshipId}\`)${skinInfo} as your profile pony!\n\n🎉 Your profile will now display this pony. Use the \`/profile\` command to see your updated profile.\n\n💡 **Tip:** You can change your profile pony anytime by clicking the "Change Pony" button on your profile.`);
    
    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(successText);
    
    await interaction.editReply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
  } catch (error) {
    console.error('Error in handleChangePonyModal:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent(`**Unexpected Error**\n\nAn unexpected error occurred while changing your profile pony. Please try again.\n\nIf this issue continues, please report it to the support team.`);
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.editReply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

export const guildOnly = false;

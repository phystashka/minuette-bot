import { SlashCommandBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { setFont, getFontString, initFonts } from '../../utils/fontUtils.js';
import { createEmbed } from '../../utils/components.js';
import { query, getRow } from '../../utils/database.js';
import { getPony, removeBits, addBits } from '../../utils/pony/index.js';
import { getClanByOwnerId, createClan, clanExists, getClanById, createClanRole, updateClanRole, updateClanRoleName, isUserInTargetGuild, getClanByName, getUserClan } from '../../models/ClanModel.js';
import { getClanMapProgress, addClanMapExperience } from '../../models/ClanMapModel.js';
import { loadImageWithProxy } from '../../utils/backgroundRenderer.js';
import { getResourcesByUserId, updateResources, getDiamonds, removeDiamonds, addResource } from '../../models/ResourceModel.js';
import { hasUserPremiumSeason, purchasePremiumSeason, isRewardClaimed, claimReward, getUserClaimedRewards, SEASON_REWARDS } from '../../models/ClanSeasonModel.js';
import { purchaseBackground, hasBackground, BACKGROUNDS, grantTrixieHalloweenBackground } from '../../models/ProfileBackgroundModel.js';
import { getUserRebirth } from '../economy/rebirth.js';

async function addFriendDuplicate(userId, friendId) {
  try {
    const randomLevel = Math.floor(Math.random() * 35) + 1;
    
    const calculateExpForLevel = (level) => {
      let totalExp = 0;
      let expForLevel = 100;
      
      for (let i = 1; i < level; i++) {
        totalExp += expForLevel;
        expForLevel += 50;
      }
      
      const randomExpInLevel = Math.floor(Math.random() * expForLevel);
      return totalExp + randomExpInLevel;
    };
    
    const randomExp = calculateExpForLevel(randomLevel);
    
    await query(
      'INSERT INTO friendship (user_id, friend_id, is_favorite, friendship_level, experience, created_at, updated_at) VALUES (?, ?, 0, ?, ?, datetime("now"), datetime("now"))',
      [userId, friendId, randomLevel, randomExp]
    );
    
    const encounterResult = await getRow(
      'SELECT COUNT(*) as count FROM friendship WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    return {
      success: true,
      newLevel: randomLevel,
      encounterCount: encounterResult.count
    };
  } catch (error) {
    console.error('Error adding friend duplicate:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const CLAN_CREATION_COST = 10000;
const TARGET_GUILD_ID = '1369338076178026596';
const OWNER_ID = '1372601851781972038';
const IMAGE_CACHE_EXPIRY = 2 * 60 * 1000;
const AVATAR_CACHE_EXPIRY = 30 * 60 * 1000;
const TEMPLATE_CACHE_EXPIRY = 60 * 60 * 1000;
const BUTTON_TIMEOUT = 60 * 1000;

const interactionTimeouts = new Map();



const CLAN_AVATAR_X = 760;
const CLAN_AVATAR_Y = 115;
const CLAN_AVATAR_RADIUS = 55;
const CLAN_AVATAR_BORDER_WIDTH = 4;
const CLAN_AVATAR_BORDER_COLOR = '#6876d1';


const CLAN_VICE_AVATAR_X = 1300;
const CLAN_VICE_AVATAR_Y = 115;
const CLAN_VICE_AVATAR_RADIUS = 55;
const CLAN_VICE_AVATAR_BORDER_WIDTH = 3;
const CLAN_VICE_AVATAR_BORDER_COLOR = '#9b59b6';


const CLAN_NAME_X = 1760;
const CLAN_NAME_Y = 290;
const CLAN_NAME_SIZE = 45;


const CLAN_LEADER_X = 880;
const CLAN_LEADER_Y = 180;
const CLAN_LEADER_SIZE = 35;


const CLAN_VICE_X = 1420;
const CLAN_VICE_Y = 180;
const CLAN_VICE_SIZE = 35;


const CLAN_MEMBERS_X = 1760;
const CLAN_MEMBERS_Y = 350;
const CLAN_MEMBERS_SIZE = 45;


const CLAN_LEVEL_X = 1715;
const CLAN_LEVEL_Y = 927;
const CLAN_LEVEL_SIZE = 50;


const CLAN_EMBLEM_X = 225;
const CLAN_EMBLEM_Y = 300;
const CLAN_EMBLEM_WIDTH = 300;
const CLAN_EMBLEM_HEIGHT = 300;


const TEXT_COLOR = '#FFFFFF';


const imageCache = new Map();
const avatarCache = new Map();
const templateCache = new Map();


const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + '...';
  }
  return text;
};


const loadClanTemplate = async (backgroundImage) => {
  const cacheKey = `template_${backgroundImage}`;
  const cached = templateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < TEMPLATE_CACHE_EXPIRY) {
    return cached.image;
  }
  
  try {
    const templatePath = path.join(__dirname, '..', '..', 'public', 'clanprofile', backgroundImage);
    
    if (!fs.existsSync(templatePath)) {
      console.warn(`Clan template not found: ${templatePath}, using blue.png`);
      const defaultPath = path.join(__dirname, '..', '..', 'public', 'clanprofile', 'blue.png');
      const image = await loadImage(defaultPath);
      templateCache.set(cacheKey, { image, timestamp: Date.now() });
      return image;
    }
    
    const image = await loadImage(templatePath);
    templateCache.set(cacheKey, { image, timestamp: Date.now() });
    return image;
  } catch (error) {
    console.error('Error loading clan template:', error);

    const defaultPath = path.join(__dirname, '..', '..', 'public', 'clanprofile', 'blue.png');
    const image = await loadImage(defaultPath);
    templateCache.set(cacheKey, { image, timestamp: Date.now() });
    return image;
  }
};


const loadAvatar = async (user) => {
  const cacheKey = `avatar_${user.id}_${user.avatar}`;
  const cached = avatarCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < AVATAR_CACHE_EXPIRY) {
    return cached.image;
  }
  
  try {
    const avatarURL = user.displayAvatarURL({ 
      extension: 'png', 
      size: 256,
      forceStatic: false 
    });
    
    const image = await loadImageWithProxy(avatarURL);
    avatarCache.set(cacheKey, { image, timestamp: Date.now() });
    return image;
  } catch (error) {
    console.error('Error loading avatar:', error);

    const defaultAvatarIndex = parseInt(user.id) % 6;
    const defaultAvatarURL = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    const image = await loadImageWithProxy(defaultAvatarURL);
    avatarCache.set(cacheKey, { image, timestamp: Date.now() });
    return image;
  }
};


const renderClanProfile = async (clan, ownerUser, interaction) => {
  const cacheKey = `clan_${clan.id}_${clan.updated_at}_${ownerUser.avatar}`;
  const cached = imageCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_EXPIRY) {
    return cached.buffer;
  }
  
  try {

    const canvas = createCanvas(1888, 1056);
    const ctx = canvas.getContext('2d');
    

    const templatePath = path.join(__dirname, '..', '..', 'public', 'clanprofile', clan.background_image);
    let template;
    
    if (!fs.existsSync(templatePath)) {
      console.warn(`Clan template not found: ${templatePath}, using blue.png`);
      const defaultPath = path.join(__dirname, '..', '..', 'public', 'clanprofile', 'blue.png');
      template = await loadImage(defaultPath);
    } else {
      template = await loadImage(templatePath);
    }
    

    ctx.drawImage(template, 0, 0, 1888, 1056);
    

    const avatarURL = ownerUser.displayAvatarURL({ 
      extension: 'png', 
      size: 256,
      forceStatic: false 
    });
    
    const avatar = await loadImageWithProxy(avatarURL);
    

    ctx.beginPath();
    ctx.arc(CLAN_AVATAR_X + CLAN_AVATAR_RADIUS, CLAN_AVATAR_Y + CLAN_AVATAR_RADIUS, CLAN_AVATAR_RADIUS + CLAN_AVATAR_BORDER_WIDTH, 0, Math.PI * 2);
    ctx.fillStyle = CLAN_AVATAR_BORDER_COLOR;
    ctx.fill();
    

    ctx.save();
    ctx.beginPath();
    ctx.arc(CLAN_AVATAR_X + CLAN_AVATAR_RADIUS, CLAN_AVATAR_Y + CLAN_AVATAR_RADIUS, CLAN_AVATAR_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, CLAN_AVATAR_X, CLAN_AVATAR_Y, CLAN_AVATAR_RADIUS * 2, CLAN_AVATAR_RADIUS * 2);
    ctx.restore();
    

    if (clan.vice_owner_id) {
      try {
        const viceUser = await interaction.client.users.fetch(clan.vice_owner_id);
        const viceAvatarURL = viceUser.displayAvatarURL({ 
          extension: 'png', 
          size: 256,
          forceStatic: false 
        });
        
        const viceAvatar = await loadImageWithProxy(viceAvatarURL);
        

        ctx.beginPath();
        ctx.arc(CLAN_VICE_AVATAR_X + CLAN_VICE_AVATAR_RADIUS, CLAN_VICE_AVATAR_Y + CLAN_VICE_AVATAR_RADIUS, CLAN_VICE_AVATAR_RADIUS + CLAN_VICE_AVATAR_BORDER_WIDTH, 0, Math.PI * 2);
        ctx.fillStyle = CLAN_VICE_AVATAR_BORDER_COLOR;
        ctx.fill();
        

        ctx.save();
        ctx.beginPath();
        ctx.arc(CLAN_VICE_AVATAR_X + CLAN_VICE_AVATAR_RADIUS, CLAN_VICE_AVATAR_Y + CLAN_VICE_AVATAR_RADIUS, CLAN_VICE_AVATAR_RADIUS, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(viceAvatar, CLAN_VICE_AVATAR_X, CLAN_VICE_AVATAR_Y, CLAN_VICE_AVATAR_RADIUS * 2, CLAN_VICE_AVATAR_RADIUS * 2);
        ctx.restore();
      } catch (viceError) {
        console.warn('Failed to load vice owner avatar:', viceError);
      }
    }
    

    setFont(ctx, CLAN_NAME_SIZE, clan.background_image);
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const clanName = truncateText(clan.name, 25);
    ctx.fillText(clanName, CLAN_NAME_X, CLAN_NAME_Y);
    

    setFont(ctx, CLAN_MEMBERS_SIZE, clan.background_image);
    ctx.textAlign = 'right';
    ctx.fillText(`${clan.member_count}`, CLAN_MEMBERS_X, CLAN_MEMBERS_Y);
    

    setFont(ctx, CLAN_LEVEL_SIZE, clan.background_image);
    ctx.textAlign = 'center';
    

    const ClanQuestModel = (await import('../../models/ClanQuestModel.js')).default;
    const clanLevel = ClanQuestModel.getClanLevel(clan.experience || 0);
    
    ctx.fillText(`${clanLevel}`, CLAN_LEVEL_X, CLAN_LEVEL_Y);
    

    setFont(ctx, CLAN_LEADER_SIZE, clan.background_image);
    ctx.textAlign = 'left';
    const leaderName = truncateText(ownerUser.displayName || ownerUser.username, 17);
    ctx.fillText(`${leaderName}`, CLAN_LEADER_X, CLAN_LEADER_Y);
    

    if (clan.vice_owner_id) {
      try {
        const viceUser = await interaction.client.users.fetch(clan.vice_owner_id);
        setFont(ctx, CLAN_VICE_SIZE, clan.background_image);
        ctx.textAlign = 'left';
        const viceName = truncateText(viceUser.displayName || viceUser.username, 17);
        ctx.fillText(`${viceName}`, CLAN_VICE_X, CLAN_VICE_Y);
      } catch (error) {
        console.warn('Failed to fetch vice owner:', error);
      }
    }
    

    if (clan.emblem_filename) {
      try {
        const emblemPath = path.join(__dirname, '..', '..', 'public', 'clan_emblems', clan.emblem_filename);
        

        if (fs.existsSync(emblemPath)) {
          const emblem = await loadImage(emblemPath);
          

          const maxSize = Math.min(CLAN_EMBLEM_WIDTH, CLAN_EMBLEM_HEIGHT);
          const imgRatio = emblem.width / emblem.height;
          
          let drawWidth, drawHeight;
          if (imgRatio > 1) {

            drawWidth = maxSize;
            drawHeight = maxSize / imgRatio;
          } else {

            drawHeight = maxSize;
            drawWidth = maxSize * imgRatio;
          }
          

          const drawX = CLAN_EMBLEM_X + (CLAN_EMBLEM_WIDTH - drawWidth) / 2;
          const drawY = CLAN_EMBLEM_Y + (CLAN_EMBLEM_HEIGHT - drawHeight) / 2;
          
          ctx.drawImage(emblem, drawX, drawY, drawWidth, drawHeight);

        } else {
          console.warn(`⚠️ Clan emblem file not found: ${emblemPath}`);

          const { updateClan } = await import('../../models/ClanModel.js');
          await updateClan(clan.id, { emblem_filename: null });

        }
      } catch (emblemError) {
        console.warn('Failed to load clan emblem:', emblemError);

        try {
          const { updateClan } = await import('../../models/ClanModel.js');
          await updateClan(clan.id, { emblem_filename: null });
        } catch (updateError) {
          console.error('Failed to clear emblem_filename:', updateError);
        }
      }
    }
    

    const buffer = canvas.toBuffer('image/png');
    

    imageCache.set(cacheKey, { buffer, timestamp: Date.now() });
    
    return buffer;
    
  } catch (error) {
    console.error('Error rendering clan profile:', error);
    throw error;
  }
};

export default {
  data: new SlashCommandBuilder()
    .setName('clan')
    .setDescription('Clan management and information')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View or create your clan')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Name of the clan to view')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('emblem')
        .setDescription('Upload a custom emblem for your clan (max 256 KB)')
        .addAttachmentOption(option =>
          option.setName('emblem')
            .setDescription('Custom emblem image (PNG, JPG, GIF - max 256 KB)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('invite')
        .setDescription('Invite a user to your clan')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to invite to the clan')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Kick a user from your clan')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to kick from the clan')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('vice')
        .setDescription('Promote a user to vice leader')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to promote to vice leader')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('viceremove')
        .setDescription('Remove vice leader status from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove vice leader status from')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'view':
          return await this.executeView(interaction);
          
        case 'emblem':
          const { execute: emblemExecute } = await import('./clan_emblem.js');
          return await emblemExecute(interaction);
          
        case 'invite':
          const { execute: inviteExecute } = await import('./clan_invite.js');
          return await inviteExecute(interaction);
          
        case 'kick':
          const { execute: kickExecute } = await import('./clan_kick.js');
          return await kickExecute(interaction);
          
        case 'vice':
          const { execute: viceExecute } = await import('./clan_vice.js');
          return await viceExecute(interaction);
          
        case 'viceremove':
          const { execute: viceremoveExecute } = await import('./clan_viceremove.js');
          return await viceremoveExecute(interaction);
          
        default:
          await interaction.reply({
            content: 'Unknown clan subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error(`Error executing clan subcommand ${subcommand}:`, error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while executing the clan command.',
          ephemeral: true
        });
      }
    }
  },

  async executeView(interaction) {
    try {
      await interaction.deferReply();
      
      const userId = interaction.user.id;
      const clanNameToView = interaction.options.getString('name');
      

      const pony = await getPony(userId);
      if (!pony) {
        const noPonyText = new TextDisplayBuilder()
          .setContent('**❌ No Pony Profile**\n-# You need to create a pony first with `/equestria` before you can create or view a clan!');
        
        const noPonyContainer = new ContainerBuilder()
          .addTextDisplayComponents(noPonyText);
        
        return await interaction.editReply({
          content: '',
          components: [noPonyContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
      

      if (clanNameToView) {
        return await handleViewClanByName(interaction, clanNameToView);
      }
      

      let userClan = null;
      let userRole = null;
      

      const ownedClan = await getClanByOwnerId(userId);
      if (ownedClan) {
        userClan = ownedClan;
        userRole = 'owner';
      } else {

        const { query } = await import('../../utils/database.js');
        const viceClanResult = await query('SELECT * FROM clans WHERE vice_owner_id = ?', [userId]);
        
        if (viceClanResult.length > 0) {
          userClan = viceClanResult[0];
          userRole = 'vice';
        } else {

          const memberResult = await query('SELECT * FROM clan_members WHERE user_id = ?', [userId]);
          if (memberResult.length > 0) {
            const clanId = memberResult[0].clan_id;
            userClan = await getClanById(clanId);
            userRole = 'member';
          }
        }
      }
      
      if (userClan) {

        try {

          const loadingText = new TextDisplayBuilder()
            .setContent('<a:loading_line:1416130253428097135> **Loading...**\n-# Loading clan profile, please wait...');
          
          const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(loadingText);
          
          await interaction.editReply({
            content: '',
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2
          });
          

          const ownerUser = await interaction.client.users.fetch(userClan.owner_id);
          const clanImage = await renderClanProfile(userClan, ownerUser, interaction);
          const attachment = new AttachmentBuilder(clanImage, { name: 'clan.png' });
          

          const { getClanMember } = await import('../../models/ClanModel.js');
          const memberInfo = await getClanMember(userClan.id, userId);
          const isOwner = userClan.owner_id === userId;
          const isVice = userClan.vice_owner_id === userId;
          const isMember = memberInfo && !isOwner && !isVice;
          

          const buttons = [];
          

          buttons.push(
            new ButtonBuilder()
              .setCustomId(`clan_members_${userClan.id}_${userId}`)
              .setLabel('Members')
              .setStyle(ButtonStyle.Primary)
          );
          

          buttons.push(
            new ButtonBuilder()
              .setCustomId(`clan_quests_${userClan.id}_${userId}`)
              .setLabel('Quests')
              .setStyle(ButtonStyle.Success)
          );
          

          buttons.push(
            new ButtonBuilder()
              .setCustomId(`clan_map_${userClan.id}_${userId}`)
              .setLabel('Clan Map')
              .setStyle(ButtonStyle.Primary)
          );
          

          if (userRole === 'owner' || userRole === 'vice') {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`clan_change_flag_${userId}`)
                .setLabel('Change Flag')
                .setStyle(ButtonStyle.Secondary)
            );
            

            buttons.push(
              new ButtonBuilder()
                .setCustomId(`clan_change_name_${userId}`)
                .setLabel('Change Name')
                .setStyle(ButtonStyle.Secondary)
            );
          }
          

          if (userRole === 'owner') {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`clan_delete_${userId}`)
                .setLabel('Delete Clan')
                .setStyle(ButtonStyle.Danger)
            );
          }
          

          if (userRole === 'member' || userRole === 'vice') {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`clan_leave_member_${userId}`)
                .setLabel('Leave Clan')
                .setStyle(ButtonStyle.Danger)
            );
          }
          

          const actionRows = [];
          for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder()
              .addComponents(buttons.slice(i, i + 5));
            actionRows.push(row);
          }
          
          const clanText = new TextDisplayBuilder()
            .setContent(`**${userClan.name}** - Clan Profile\n-# Your clan dashboard with all available options`);
          
          const separator = new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small);
          
          const mediaGallery = new MediaGalleryBuilder()
            .addItems(
              new MediaGalleryItemBuilder()
                .setURL(`attachment://clan.png`)
            );
          
          const container = new ContainerBuilder()
            .addTextDisplayComponents(clanText)
            .addSeparatorComponents(separator)
            .addMediaGalleryComponents(mediaGallery);
          
          actionRows.forEach(row => {
            container.addActionRowComponents(row);
          });
          
          await interaction.editReply({
            content: '',
            files: [attachment],
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
          
        } catch (error) {
          console.error('Error rendering clan profile:', error);
          
          const errorText = new TextDisplayBuilder()
            .setContent('**❌ Error**\n-# Failed to render clan profile. Please try again later.');
          
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorText);
          
          await interaction.editReply({
            content: '',
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        
      } else {
        const createClanText = new TextDisplayBuilder()
          .setContent(`**Create Your Clan**\n-# You don't have a clan yet! Creating a clan costs **${CLAN_CREATION_COST.toLocaleString()}** <:bits:1429131029628588153>.\n\n**Your current bits:** ${pony.bits.toLocaleString()} <:bits:1429131029628588153>`);
        
        const button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('clan_create')
              .setLabel(`Create Clan`)
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('<:bits:1429131029628588153>')
              .setDisabled(pony.bits < CLAN_CREATION_COST)
          );
        
        const createClanContainer = new ContainerBuilder()
          .addTextDisplayComponents(createClanText)
          .addActionRowComponents(button);
        
        await interaction.editReply({
          content: '',
          components: [createClanContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
      
    } catch (error) {
      console.error('Error in clan command:', error);
      
      const errorText = new TextDisplayBuilder()
        .setContent('**❌ Error**\n-# An error occurred while processing your clan command.');
      
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      } else {
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  },


  async handleButtonInteraction(interaction) {
    if (isInteractionExpired(interaction)) {
      const expiredText = new TextDisplayBuilder()
        .setContent('**⏰ Session Expired**\n-# This interface has been inactive for more than 1 minute. Please use `/clan` to get a fresh interface.');
      
      const expiredContainer = new ContainerBuilder()
        .addTextDisplayComponents(expiredText);
      
      return await interaction.reply({
        content: '',
        components: [expiredContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    console.log('🔍 Button interaction received:', interaction.customId);
    
    if (interaction.message && interaction.user) {
      resetInteractionTimeout(interaction.message.id, interaction.user.id);
    }


    if (interaction.customId.startsWith('view_clan_members_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parts[3];
        const page = parseInt(parts[4]) || 0;
        
        await interaction.deferUpdate();
        

        const { getClanById } = await import('../../models/ClanModel.js');
        const clan = await getClanById(clanId);
        
        if (!clan) {
          const notFoundText = new TextDisplayBuilder()
            .setContent('**❌ Clan Not Found**\n-# The clan was not found.');
          
          const notFoundContainer = new ContainerBuilder()
            .addTextDisplayComponents(notFoundText);
          
          return await interaction.editReply({
            content: '',
            components: [notFoundContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        

        const { getClanMembers } = await import('../../models/ClanModel.js');
        const members = await getClanMembers(clanId);
        const membersPerPage = 10;
        const totalPages = Math.max(1, Math.ceil(members.length / membersPerPage));
        
        const startIndex = page * membersPerPage;
        const endIndex = startIndex + membersPerPage;
        const pageMembers = members.slice(startIndex, endIndex);
        
        let membersList = '';
        
        for (const member of pageMembers) {
          try {
            const user = await interaction.client.users.fetch(member.user_id);
            const roleIcon = member.role === 'owner' ? '👑' : member.role === 'vice_owner' ? '⭐' : '👤';
            const roleText = member.role === 'owner' ? 'Owner' : member.role === 'vice_owner' ? 'Vice Owner' : 'Member';
            
            membersList += `${roleIcon} **${user.username}** (${roleText})\n`;
          } catch (error) {
            console.error(`Failed to fetch user ${member.user_id}:`, error);
            const roleIcon = member.role === 'owner' ? '👑' : member.role === 'vice_owner' ? '⭐' : '👤';
            const roleText = member.role === 'owner' ? 'Owner' : member.role === 'vice_owner' ? 'Vice Owner' : 'Member';
            
            membersList += `${roleIcon} **Unknown User** (${roleText})\n`;
          }
        }
        
        if (!membersList) {
          membersList = 'No members found.';
        }
        
        const membersText = new TextDisplayBuilder()
          .setContent(`**👥 ${clan.name} Members**\n-# Page ${page + 1}/${totalPages} • Total members: ${members.length}\n\n${membersList}`);
        
        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);
        
        const membersContainer = new ContainerBuilder()
          .addTextDisplayComponents(membersText)
          .addSeparatorComponents(separator);
        
        const components = [];
        const actionRow = new ActionRowBuilder();
        

        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`clan_back_view_${clanId}`)
            .setLabel('🔙 Back')
            .setStyle(ButtonStyle.Secondary)
        );
        

        if (totalPages > 1) {
          if (page > 0) {
            actionRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`view_clan_members_${clanId}_${page - 1}`)
                .setLabel('⬅️ Previous')
                .setStyle(ButtonStyle.Primary)
            );
          }
          
          if (page < totalPages - 1) {
            actionRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`view_clan_members_${clanId}_${page + 1}`)
                .setLabel('➡️ Next')
                .setStyle(ButtonStyle.Primary)
            );
          }
        }
        
        membersContainer.addActionRowComponents(actionRow);
        
        await interaction.editReply({
          content: '',
          components: [membersContainer],
          flags: MessageFlags.IsComponentsV2
        });
        
      } catch (error) {
        console.error('Error viewing clan members:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**❌ Error**\n-# Failed to load clan members.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }


    if (interaction.customId.startsWith('clan_back_view_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parts[3];
        
        await interaction.deferUpdate();
        

        const { getClanById } = await import('../../models/ClanModel.js');
        const clan = await getClanById(clanId);
        
        if (!clan) {
          const notFoundText = new TextDisplayBuilder()
            .setContent('**❌ Clan Not Found**\n-# The clan was not found.');
          
          const notFoundContainer = new ContainerBuilder()
            .addTextDisplayComponents(notFoundText);
          
          return await interaction.editReply({
            content: '',
            components: [notFoundContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        

        const [owner, viceOwner] = await Promise.all([
          interaction.client.users.fetch(clan.owner_id).catch(() => null),
          clan.vice_owner_id ? interaction.client.users.fetch(clan.vice_owner_id).catch(() => null) : null
        ]);


        const clanImageBuffer = await renderClanProfile(clan, owner, interaction);
        

        const membersButton = new ButtonBuilder()
          .setCustomId(`view_clan_members_${clan.id}`)
          .setLabel('👥 Members')
          .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(membersButton);


        await interaction.editReply({
          files: [new AttachmentBuilder(clanImageBuffer, { name: 'clan.png' })],
          components: [actionRow]
        });
        
      } catch (error) {
        console.error('Error going back to clan view:', error);
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to load clan information.',
            color: 0xFF0000
          })]
        });
      }
    }



    

    if (interaction.customId === 'clan_create') {

      try {

        const modal = new ModalBuilder()
          .setCustomId('clan_create_modal')
          .setTitle('Create Your Clan');

        const nameInput = new TextInputBuilder()
          .setCustomId('clan_name')
          .setLabel('Clan Name')
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(25)
          .setPlaceholder(`${interaction.user.username}'s Clan`)
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        modal.addComponents(firstActionRow);


        await interaction.showModal(modal);
        
      } catch (error) {
        console.error('Error showing clan creation modal:', error);
        await interaction.reply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to show clan creation form.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      }
    }
    

    else if (interaction.customId.startsWith('clan_quests_') && !interaction.customId.startsWith('clan_quests_refresh_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parseInt(parts[2]);
        const originalUserId = parts[3];
        const page = parseInt(parts[4]) || 0;
        
        const currentUserId = interaction.user.id;
        
        if (currentUserId !== originalUserId) {
          const accessDeniedText = new TextDisplayBuilder()
            .setContent('**❌ Access Denied**\n-# You can only use your own clan interface. Use `/clan` to view your clan.');
          
          const accessDeniedContainer = new ContainerBuilder()
            .addTextDisplayComponents(accessDeniedText);
          
          return await interaction.reply({
            content: '',
            components: [accessDeniedContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }

        const loadingText = new TextDisplayBuilder()
          .setContent('<a:loading_line:1416130253428097135> **Loading...**\n-# Loading clan quests, please wait...');
        
        const loadingContainer = new ContainerBuilder()
          .addTextDisplayComponents(loadingText);
        
        await interaction.update({
          content: '',
          components: [loadingContainer],
          flags: MessageFlags.IsComponentsV2,
          files: []
        });
        

        const ClanQuestModel = (await import('../../models/ClanQuestModel.js')).default;
        

        const clan = await getClanById(clanId);
        if (!clan) {
          const errorText = new TextDisplayBuilder()
            .setContent('**❌ Error**\n-# Clan not found.');
          
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorText);
          
          return await interaction.editReply({
            content: '',
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        

        let userQuests = await ClanQuestModel.getUserActiveQuests(currentUserId, clanId);
        

        if (userQuests.length === 0) {
          await ClanQuestModel.generateQuestsForUser(currentUserId, clanId);
          userQuests = await ClanQuestModel.getUserActiveQuests(currentUserId, clanId);
        }
        

        const clanLevel = ClanQuestModel.getClanLevel(clan.experience || 0);
        const nextLevelExp = ClanQuestModel.getRequiredExpForNextLevel(clan.experience || 0);
        
        const mapProgress = await getClanMapProgress(clanId);
        const mapCurrentLevel = mapProgress?.level || 1;
        const mapCurrentExp = mapProgress?.experience || 0;
        const mapExpToNextLevel = 10000;
        const mapExpInCurrentLevel = mapCurrentExp % mapExpToNextLevel;
        const mapExpToNext = mapCurrentLevel < 13 ? mapExpToNextLevel - mapExpInCurrentLevel : 0;
        

        let questsDescription = '';
        if (userQuests.length === 0) {
          questsDescription = 'No active quests available.';
        } else {
          userQuests.forEach((quest, index) => {
            const progress = Math.min(quest.current_progress, quest.target_value);
            const percentage = Math.round((progress / quest.target_value) * 100);
            const filledBars = Math.floor(percentage / 10);
            let progressBar = '';
            for (let i = 0; i < 10; i++) {
              const isFilled = i < filledBars;
              if (i === 0) {
                progressBar += isFilled ? '<:f1:1432768549461426259>' : '<:p1:1432768556688347287>';
              } else if (i === 9) {
                progressBar += isFilled ? '<:f3:1432770883851915265>' : '<:p3:1432770532272771183>';
              } else {
                progressBar += isFilled ? '<:f2:1432768548022780035>' : '<:p2:1432768554154852542>';
              }
            }
            
            questsDescription += `**${index + 1}. ${quest.name}**\n`;
            questsDescription += `${quest.description}\n`;
            questsDescription += `Progress: ${progress}/${quest.target_value} (${percentage}%)\n`;
            questsDescription += `${progressBar}\n`;
            questsDescription += `Reward: ${quest.experience_reward} Clan EXP + Map EXP\n\n`;
          });
        }
        

        const levelInfo = nextLevelExp 
          ? `Level ${clanLevel} (${clan.experience || 0}/${nextLevelExp} EXP)`
          : `Level ${clanLevel} (MAX)`;
        
        const mapLevelInfo = mapCurrentLevel < 13
          ? `Level ${mapCurrentLevel}/13 (${mapExpInCurrentLevel}/10000 EXP) - ${mapExpToNext} EXP to next`
          : `Level 13/13 (MAX)`;
        
        const questsText = new TextDisplayBuilder()
          .setContent(`**🎯 ${clan.name} - Quests**\n-# **Clan Level:** ${levelInfo}\n**Clan Map:** ${mapLevelInfo}\n**Total EXP:** ${clan.experience || 0}\n\n${questsDescription}`);
        
        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);
        
        const questsContainer = new ContainerBuilder()
          .addTextDisplayComponents(questsText)
          .addSeparatorComponents(separator);
        

        const buttons = [];
        
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_quests_refresh_${clanId}_${originalUserId}`)
            .setEmoji('<:refresh:1431676633764466771>')
            .setStyle(ButtonStyle.Secondary)
        );

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_back_${clanId}_${originalUserId}`)
            .setLabel('Back to Clan')
            .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRow = new ActionRowBuilder().addComponents(buttons);
        questsContainer.addActionRowComponents(actionRow);
        
        await interaction.editReply({
          content: '',
          components: [questsContainer],
          flags: MessageFlags.IsComponentsV2,
          files: []
        });
        
      } catch (error) {
        console.error('Error showing clan quests:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**❌ Error**\n-# Failed to load clan quests.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
    
    else if (interaction.customId.startsWith('clan_quests_refresh_')) {
      try {
        console.log('🔄 Refresh button clicked:', interaction.customId);
        
        const parts = interaction.customId.split('_');
        console.log('🔍 CustomId parts:', parts);
        
        const clanId = parseInt(parts[3]);
        const originalUserId = parts[4];
        
        console.log('📊 Parsed data:', { clanId, originalUserId });
        
        const currentUserId = interaction.user.id;
        
        console.log('👤 User check:', { currentUserId, originalUserId, match: currentUserId === originalUserId });
        
        if (currentUserId !== originalUserId) {
          console.log('❌ Access denied for user:', currentUserId);
          
          const accessDeniedText = new TextDisplayBuilder()
            .setContent('**❌ Access Denied**\n-# You can only use your own clan interface. Use `/clan` to view your clan.');
          
          const accessDeniedContainer = new ContainerBuilder()
            .addTextDisplayComponents(accessDeniedText);
          
          return await interaction.reply({
            content: '',
            components: [accessDeniedContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        
        console.log('✅ Access granted, proceeding with refresh');
        
        const loadingText = new TextDisplayBuilder()
          .setContent('<a:loading_line:1416130253428097135> **Refreshing...**\n-# Updating quest information...');
        
        const loadingContainer = new ContainerBuilder()
          .addTextDisplayComponents(loadingText);
        
        await interaction.update({
          content: '',
          components: [loadingContainer],
          flags: MessageFlags.IsComponentsV2,
          files: []
        });
        
        const ClanQuestModel = (await import('../../models/ClanQuestModel.js')).default;
        
        const clan = await getClanById(clanId);
        if (!clan) {
          const errorText = new TextDisplayBuilder()
            .setContent('**❌ Error**\n-# Clan not found.');
          
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorText);
          
          return await interaction.editReply({
            content: '',
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        
        let userQuests = await ClanQuestModel.getUserActiveQuests(currentUserId, clanId);
        
        if (userQuests.length === 0) {
          await ClanQuestModel.generateQuestsForUser(currentUserId, clanId);
          userQuests = await ClanQuestModel.getUserActiveQuests(currentUserId, clanId);
        }
        
        const clanLevel = ClanQuestModel.getClanLevel(clan.experience || 0);
        const nextLevelExp = ClanQuestModel.getRequiredExpForNextLevel(clan.experience || 0);
        
        const mapProgress = await getClanMapProgress(clanId);
        const mapCurrentLevel = mapProgress?.level || 1;
        const mapCurrentExp = mapProgress?.experience || 0;
        const mapExpToNextLevel = 10000;
        const mapExpInCurrentLevel = mapCurrentExp % mapExpToNextLevel;
        const mapExpToNext = mapCurrentLevel < 13 ? mapExpToNextLevel - mapExpInCurrentLevel : 0;
        
        let questsDescription = '';
        if (userQuests.length === 0) {
          questsDescription = 'No active quests available.';
        } else {
          userQuests.forEach((quest, index) => {
            const progress = Math.min(quest.current_progress, quest.target_value);
            const percentage = Math.round((progress / quest.target_value) * 100);
            const filledBars = Math.floor(percentage / 10);
            let progressBar = '';
            for (let i = 0; i < 10; i++) {
              const isFilled = i < filledBars;
              if (i === 0) {
                progressBar += isFilled ? '<:f1:1432768549461426259>' : '<:p1:1432768556688347287>';
              } else if (i === 9) {
                progressBar += isFilled ? '<:f3:1432770883851915265>' : '<:p3:1432770532272771183>';
              } else {
                progressBar += isFilled ? '<:f2:1432768548022780035>' : '<:p2:1432768554154852542>';
              }
            }
            
            questsDescription += `**${index + 1}. ${quest.name}**\n`;
            questsDescription += `${quest.description}\n`;
            questsDescription += `Progress: ${progress}/${quest.target_value} (${percentage}%)\n`;
            questsDescription += `${progressBar}\n`;
            questsDescription += `Reward: ${quest.experience_reward} Clan EXP + Map EXP\n\n`;
          });
        }
        
        const levelInfo = nextLevelExp 
          ? `Level ${clanLevel} (${clan.experience || 0}/${nextLevelExp} EXP)`
          : `Level ${clanLevel} (MAX)`;
        
        const mapLevelInfo = mapCurrentLevel < 13
          ? `Level ${mapCurrentLevel}/13 (${mapExpInCurrentLevel}/10000 EXP) - ${mapExpToNext} EXP to next`
          : `Level 13/13 (MAX)`;
        
        const questsText = new TextDisplayBuilder()
          .setContent(`**${clan.name} - Quests**\n-# **Clan Level:** ${levelInfo}\n**Clan Map:** ${mapLevelInfo}\n**Total EXP:** ${clan.experience || 0}\n\n${questsDescription}`);
        
        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);
        
        const questsContainer = new ContainerBuilder()
          .addTextDisplayComponents(questsText)
          .addSeparatorComponents(separator);
        
        const buttons = [];
        
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_quests_refresh_${clanId}_${originalUserId}`)
            .setEmoji('<:refresh:1431676633764466771>')
            .setStyle(ButtonStyle.Secondary)
        );

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_back_${clanId}_${originalUserId}`)
            .setLabel('Back to Clan')
            .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRow = new ActionRowBuilder().addComponents(buttons);
        questsContainer.addActionRowComponents(actionRow);
        
        await interaction.editReply({
          content: '',
          components: [questsContainer],
          flags: MessageFlags.IsComponentsV2,
          files: []
        });
        
      } catch (error) {
        console.error('Error refreshing clan quests:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**❌ Error**\n-# Failed to refresh quests. Please try again.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        await interaction.reply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }
    }

    else if (interaction.customId.startsWith('clan_map_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parseInt(parts[2]);
        const originalUserId = parts[3];
        
        const currentUserId = interaction.user.id;
        
        if (currentUserId !== originalUserId) {
          const accessDeniedText = new TextDisplayBuilder()
            .setContent('**❌ Access Denied**\n-# You can only use your own clan interface. Use `/clan` to view your clan.');
          
          const accessDeniedContainer = new ContainerBuilder()
            .addTextDisplayComponents(accessDeniedText);
          
          return await interaction.reply({
            content: '',
            components: [accessDeniedContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        

        const loadingText = new TextDisplayBuilder()
          .setContent('<a:loading_line:1416130253428097135> **Loading...**\n-# Loading clan map, please wait...');
        
        const loadingContainer = new ContainerBuilder()
          .addTextDisplayComponents(loadingText);
        
        await interaction.update({
          content: '',
          components: [loadingContainer],
          flags: MessageFlags.IsComponentsV2,
          files: []
        });
        

        const ClanMapModel = (await import('../../models/ClanMapModel.js')).default;
        

        const clan = await getClanById(clanId);
        if (!clan) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Error',
              description: 'Clan not found.',
              color: 0xFF0000
            })],
            components: []
          });
        }
        

        const mapProgress = await getClanMapProgress(clanId);
        const currentLevel = mapProgress?.level || 1;
        const currentExp = mapProgress?.experience || 0;
        const expInCurrentLevel = currentExp % 10000;
        const expToNext = currentLevel < 13 ? 10000 - expInCurrentLevel : 0;

        const { default: ClanMapRenderer } = await import('../../utils/clanMapRenderer.js');
        const mapRenderer = new ClanMapRenderer();
        const mapImageBuffer = await mapRenderer.renderClanMap(clan.name, currentLevel, 0);

        const mapAttachment = new AttachmentBuilder(mapImageBuffer, { 
          name: `clan_map_${clanId}.png` 
        });

        const mapLevelInfo = currentLevel < 13
          ? `**Current Level:** ${currentLevel}/13\n**Experience:** ${expInCurrentLevel}/10000 EXP\n**To Next Level:** ${expToNext} EXP needed`
          : `**Current Level:** ${currentLevel}/13 (MAX)`
        
        const mapText = new TextDisplayBuilder()
          .setContent(`**🗺️ ${clan.name} - Clan Map**\n-# Your clan's current position on the map!\n\n${mapLevelInfo}\n\nComplete clan quests to advance further on the map!`);
        
        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);
        
        const mapMediaGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL(`attachment://clan_map_${clanId}.png`)
          );
        
        const mapContainer = new ContainerBuilder()
          .addTextDisplayComponents(mapText)
          .addSeparatorComponents(separator)
          .addMediaGalleryComponents(mapMediaGallery);
        

        const buttons = [];
        
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_season_rewards_${clanId}_${currentUserId}`)
            .setLabel('Season Rewards')
            .setStyle(ButtonStyle.Success)
        );
        
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_back_${clanId}_${currentUserId}`)
            .setLabel('Back to Clan')
            .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRow = new ActionRowBuilder().addComponents(buttons);
        mapContainer.addActionRowComponents(actionRow);
        
        await interaction.editReply({
          content: '',
          components: [mapContainer],
          flags: MessageFlags.IsComponentsV2,
          files: [mapAttachment]
        });
        
      } catch (error) {
        console.error('Error showing clan map:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**Error**\n-# Failed to load clan map.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
    
    else if (interaction.customId.startsWith('clan_season_rewards_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parseInt(parts[3]);
        const originalUserId = parts[4];
        const currentUserId = interaction.user.id;
        
        if (currentUserId !== originalUserId) {
          const accessDeniedText = new TextDisplayBuilder()
            .setContent('**Access Denied**\n-# You can only use your own clan interface. Use `/clan` to view your clan.');
          
          const accessDeniedContainer = new ContainerBuilder()
            .addTextDisplayComponents(accessDeniedText);
          
          return await interaction.reply({
            content: '',
            components: [accessDeniedContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        
        const loadingText = new TextDisplayBuilder()
          .setContent('<a:loading_line:1416130253428097135> **Loading...**\n-# Loading season rewards, please wait...');
        
        const loadingContainer = new ContainerBuilder()
          .addTextDisplayComponents(loadingText);
        
        await interaction.update({
          content: '',
          components: [loadingContainer],
          flags: MessageFlags.IsComponentsV2,
          files: []
        });
        
        const rewardsImagePath = path.join(__dirname, '../../clanmap/rewrdmap.png');
        const rewardsImageBuffer = fs.readFileSync(rewardsImagePath);
        
        const rewardsAttachment = new AttachmentBuilder(rewardsImageBuffer, { 
          name: `season_rewards_${clanId}.png` 
        });
        
        const mapProgress = await getClanMapProgress(clanId);
        const currentLevel = mapProgress?.level || 1;
        const hasPremium = await hasUserPremiumSeason(currentUserId, clanId);
        const userDiamonds = await getDiamonds(currentUserId);
        
        let rewardsDescription = `**🏆 Season Rewards - Clan Map Progression**\n-# Complete all 13 levels to earn amazing rewards!\n\n`;
        rewardsDescription += `**Current Progress:** Level ${currentLevel}/13\n`;
        rewardsDescription += `**Premium Status:** ${hasPremium ? '✅ Owned' : '❌ Not purchased'}\n`;
        rewardsDescription += `**Your Gems:** ${userDiamonds || 0} <a:diamond:1423629073984524298>\n\n`;
        rewardsDescription += `**Two Reward Tracks:**\n`;
        rewardsDescription += `🟡 **Free Track** - Available to everyone\n`;
        rewardsDescription += `🔴 **Premium Track** - Requires 1500 <a:diamond:1423629073984524298> gems\n\n`;
        rewardsDescription += `*Note: Levels unlock globally through clan quest completion, but premium rewards must be purchased individually.*`;
        
        const rewardsText = new TextDisplayBuilder()
          .setContent(rewardsDescription);
        
        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);
        
        const rewardsMediaGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL(`attachment://season_rewards_${clanId}.png`)
          );
        
        const rewardsContainer = new ContainerBuilder()
          .addTextDisplayComponents(rewardsText)
          .addSeparatorComponents(separator)
          .addMediaGalleryComponents(rewardsMediaGallery);
        
        const buttons = [];
        
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_buy_premium_${clanId}_${currentUserId}`)
            .setLabel('Buy Premium Rewards')
            .setStyle(ButtonStyle.Primary)
        );
        
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_claim_rewards_${clanId}_${currentUserId}`)
            .setLabel('Claim Rewards')
            .setStyle(ButtonStyle.Success)
        );
        
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_map_${clanId}_${currentUserId}`)
            .setLabel('Back to Map')
            .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRow = new ActionRowBuilder().addComponents(buttons);
        rewardsContainer.addActionRowComponents(actionRow);
        
        await interaction.editReply({
          content: '',
          components: [rewardsContainer],
          flags: MessageFlags.IsComponentsV2,
          files: [rewardsAttachment]
        });
        
      } catch (error) {
        console.error('Error showing season rewards:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**Error**\n-# Failed to load season rewards.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
    
    else if (interaction.customId.startsWith('clan_buy_premium_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parseInt(parts[3]);
        const originalUserId = parts[4];
        const currentUserId = interaction.user.id;
        
        if (currentUserId !== originalUserId) {
          const accessDeniedText = new TextDisplayBuilder()
            .setContent('**Access Denied**\n-# You can only use your own clan interface. Use `/clan` to view your clan.');
          
          const accessDeniedContainer = new ContainerBuilder()
            .addTextDisplayComponents(accessDeniedText);
          
          return await interaction.reply({
            content: '',
            components: [accessDeniedContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        
        if (await hasUserPremiumSeason(currentUserId, clanId)) {
          const alreadyHasText = new TextDisplayBuilder()
            .setContent('**Premium Already Owned**\n-# You already have premium rewards for this season!');
          
          const alreadyHasContainer = new ContainerBuilder()
            .addTextDisplayComponents(alreadyHasText);
          
          return await interaction.reply({
            content: '',
            components: [alreadyHasContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        
        const userDiamonds = await getDiamonds(currentUserId);
        if (!userDiamonds || userDiamonds < 1500) {
          const notEnoughText = new TextDisplayBuilder()
            .setContent('**Not Enough Gems**\n-# You need 1500 <a:diamond:1423629073984524298> gems to buy premium rewards!\n\nYour gems: ' + (userDiamonds || 0) + ' <a:diamond:1423629073984524298>');
          
          const notEnoughContainer = new ContainerBuilder()
            .addTextDisplayComponents(notEnoughText);
          
          return await interaction.reply({
            content: '',
            components: [notEnoughContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        
        await removeDiamonds(currentUserId, 1500);
        await purchasePremiumSeason(currentUserId, clanId);
        
        const successText = new TextDisplayBuilder()
          .setContent('**Premium Rewards Purchased!**\n-# You can now claim premium rewards from the red track!\n\n<a:diamond:1423629073984524298> **-1500 gems**\n\nUse "Claim Rewards" to collect your premium rewards!');
        
        const successContainer = new ContainerBuilder()
          .addTextDisplayComponents(successText);
        
        await interaction.reply({
          content: '',
          components: [successContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
        
      } catch (error) {
        console.error('Error buying premium rewards:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**Error**\n-# Failed to purchase premium rewards.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        await interaction.reply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }
    }
    
    else if (interaction.customId.startsWith('clan_claim_rewards_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parseInt(parts[3]);
        const originalUserId = parts[4];
        const currentUserId = interaction.user.id;
        
        if (currentUserId !== originalUserId) {
          const accessDeniedText = new TextDisplayBuilder()
            .setContent('**Access Denied**\n-# You can only use your own clan interface. Use `/clan` to view your clan.');
          
          const accessDeniedContainer = new ContainerBuilder()
            .addTextDisplayComponents(accessDeniedText);
          
          return await interaction.reply({
            content: '',
            components: [accessDeniedContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const userRebirth = await getUserRebirth(currentUserId);
        const rebirthLevel = userRebirth ? userRebirth.rebirth_level : 0;
        
        if (rebirthLevel < 3) {
          const rebirthText = new TextDisplayBuilder()
            .setContent(`❌ **Access Denied - Rebirth Level Required**\n\n` +
                       `To claim clan season rewards, you need **Rebirth Level 3** or higher.\n` +
                       `This prevents alternate accounts from farming rewards.\n\n` +
                       `**Your current rebirth level:** ${rebirthLevel}\n` +
                       `**Required:** 3+\n\n` +
                       `Please progress your account and reach rebirth level 3 first!`);
          
          const rebirthContainer = new ContainerBuilder()
            .addTextDisplayComponents(rebirthText);
          
          return await interaction.editReply({
            content: '',
            components: [rebirthContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        
        const mapProgress = await getClanMapProgress(clanId);
        const currentLevel = mapProgress?.level || 1;
        const hasPremium = await hasUserPremiumSeason(currentUserId, clanId);
        
        const claimedRewards = await getUserClaimedRewards(currentUserId, clanId);
        const claimedFree = new Set(claimedRewards.filter(r => r.reward_type === 'free').map(r => r.level));
        const claimedPremium = new Set(claimedRewards.filter(r => r.reward_type === 'premium').map(r => r.level));
        
        let rewardsGiven = [];
        let totalBits = 0, totalKeys = 0, totalSparks = 0, totalGems = 0;
        
        for (let level = 1; level <= currentLevel; level++) {
          const reward = SEASON_REWARDS[level];
          if (reward?.free && !claimedFree.has(level)) {
            await claimReward(currentUserId, clanId, level, 'free');
            const freeReward = reward.free;
            
            if (freeReward.type === 'bits') {
              await addBits(currentUserId, freeReward.amount);
              rewardsGiven.push(`Level ${level} (Free): ${freeReward.amount} <:bits:1411354539935666197> bits`);
              totalBits += freeReward.amount;
            } else if (freeReward.type === 'keys') {
              await addResource(currentUserId, 'keys', freeReward.amount);
              rewardsGiven.push(`Level ${level} (Free): ${freeReward.amount} 🗝️ keys`);
              totalKeys += freeReward.amount;
            } else if (freeReward.type === 'sparks') {
              await addResource(currentUserId, 'sparks', freeReward.amount);
              rewardsGiven.push(`Level ${level} (Free): ${freeReward.amount} <:Sparkl:1431337628900528138> sparks`);
              totalSparks += freeReward.amount;
            } else if (freeReward.type === 'gems') {
              await addResource(currentUserId, 'diamonds', freeReward.amount);
              rewardsGiven.push(`Level ${level} (Free): ${freeReward.amount} <a:diamond:1423629073984524298> gems`);
              totalGems += freeReward.amount;
            } else if (freeReward.type === 'pony') {
              const ponyRecord = await getRow('SELECT id FROM pony_friends WHERE name = ?', [freeReward.name]);
              if (ponyRecord) {
                const friendResult = await addFriendDuplicate(currentUserId, ponyRecord.id);
                if (friendResult.success) {
                  rewardsGiven.push(`Level ${level} (Free): 🦄 **${freeReward.name}** (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})`);
                } else {
                  rewardsGiven.push(`Level ${level} (Free): Failed to add ${freeReward.name}`);
                }
              } else {
                rewardsGiven.push(`Level ${level} (Free): ${freeReward.name} not found`);
              }
            } else if (freeReward.type === 'background') {
              try {
                await purchaseBackground(currentUserId, freeReward.backgroundId);
                
                for (let farmLevel = 1; farmLevel <= 4; farmLevel++) {
                  const farmBackgroundId = freeReward.backgroundId.replace('_farm1', `_farm${farmLevel}`);
                  await purchaseBackground(currentUserId, farmBackgroundId);
                }
                
                rewardsGiven.push(`Level ${level} (Free): 🖼️ **${freeReward.name}** background (with farm variations)`);
              } catch (error) {
                console.error('Error granting background reward:', error);
                rewardsGiven.push(`Level ${level} (Free): Failed to add ${freeReward.name} background`);
              }
            }
          }
        }
        
        if (hasPremium) {
          for (let level = 1; level <= currentLevel; level++) {
            const reward = SEASON_REWARDS[level];
            if (reward?.premium && !claimedPremium.has(level)) {
              await claimReward(currentUserId, clanId, level, 'premium');
              const premiumReward = reward.premium;
              
              if (premiumReward.type === 'bits') {
                await addBits(currentUserId, premiumReward.amount);
                rewardsGiven.push(`Level ${level} (Premium): ${premiumReward.amount} <:bits:1411354539935666197> bits`);
                totalBits += premiumReward.amount;
              } else if (premiumReward.type === 'keys') {
                await addResource(currentUserId, 'keys', premiumReward.amount);
                rewardsGiven.push(`Level ${level} (Premium): ${premiumReward.amount} 🗝️ keys`);
                totalKeys += premiumReward.amount;
              } else if (premiumReward.type === 'sparks') {
                await addResource(currentUserId, 'sparks', premiumReward.amount);
                rewardsGiven.push(`Level ${level} (Premium): ${premiumReward.amount} <:Sparkl:1431337628900528138> sparks`);
                totalSparks += premiumReward.amount;
              } else if (premiumReward.type === 'gems') {
                await addResource(currentUserId, 'diamonds', premiumReward.amount);
                rewardsGiven.push(`Level ${level} (Premium): ${premiumReward.amount} <a:diamond:1423629073984524298> gems`);
                totalGems += premiumReward.amount;
              } else if (premiumReward.type === 'pony') {
                const ponyRecord = await getRow('SELECT id FROM pony_friends WHERE name = ?', [premiumReward.name]);
                if (ponyRecord) {
                  const friendResult = await addFriendDuplicate(currentUserId, ponyRecord.id);
                  if (friendResult.success) {
                    rewardsGiven.push(`Level ${level} (Premium): 🦄 **${premiumReward.name}** (Copy #${friendResult.encounterCount}, Level ${friendResult.newLevel})`);
                  } else {
                    rewardsGiven.push(`Level ${level} (Premium): Failed to add ${premiumReward.name}`);
                  }
                } else {
                  rewardsGiven.push(`Level ${level} (Premium): ${premiumReward.name} not found`);
                }
              } else if (premiumReward.type === 'background') {
                try {
                  await purchaseBackground(currentUserId, premiumReward.backgroundId);
                  
                  for (let farmLevel = 1; farmLevel <= 4; farmLevel++) {
                    const farmBackgroundId = premiumReward.backgroundId.replace('_farm1', `_farm${farmLevel}`);
                    await purchaseBackground(currentUserId, farmBackgroundId);
                  }
                  
                  rewardsGiven.push(`Level ${level} (Premium): 🖼️ **${premiumReward.name}** background (with farm variations)`);
                } catch (error) {
                  console.error('Error granting background reward:', error);
                  rewardsGiven.push(`Level ${level} (Premium): Failed to add ${premiumReward.name} background`);
                }
              }
            }
          }
        }
        
        if (rewardsGiven.length === 0) {
          const noRewardsText = new TextDisplayBuilder()
            .setContent('**ℹ️ No Rewards Available**\n-# You have already claimed all available rewards for your current level!\n\nCurrent level: ' + currentLevel + '/13');
          
          const noRewardsContainer = new ContainerBuilder()
            .addTextDisplayComponents(noRewardsText);
          
          return await interaction.editReply({
            content: '',
            components: [noRewardsContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        
        let claimText = '**🎁 Rewards Claimed!**\n-# You have successfully claimed the following rewards:\n\n';
        rewardsGiven.forEach(reward => {
          claimText += `• ${reward}\n`;
        });
        
        if (totalBits > 0 || totalKeys > 0 || totalSparks > 0 || totalGems > 0) {
          claimText += '\n**Total received:**\n';
          if (totalBits > 0) claimText += `• ${totalBits} <:bits:1411354539935666197> bits\n`;
          if (totalKeys > 0) claimText += `• ${totalKeys} 🗝️ keys\n`;
          if (totalSparks > 0) claimText += `• ${totalSparks} <:Sparkl:1431337628900528138> sparks\n`;
          if (totalGems > 0) claimText += `• ${totalGems} <a:diamond:1423629073984524298> gems\n`;
        }
        
        const claimSuccessText = new TextDisplayBuilder()
          .setContent(claimText);
        
        const claimSuccessContainer = new ContainerBuilder()
          .addTextDisplayComponents(claimSuccessText);
        
        await interaction.editReply({
          content: '',
          components: [claimSuccessContainer],
          flags: MessageFlags.IsComponentsV2
        });
        
      } catch (error) {
        console.error('Error claiming rewards:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**Error**\n-# Failed to claim rewards.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
    

    if (interaction.customId.startsWith('clan_members_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parts[2];
        const buttonUserId = parts[3];
        const page = parseInt(parts[4]) || 0;
        

        if (interaction.user.id !== buttonUserId) {
          return await interaction.reply({
            embeds: [createEmbed({
              title: 'Access Denied',
              description: 'You can only use your own clan interface. Use `/clan` to view your clan.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        
        await interaction.deferUpdate();
        

        const clan = await getClanById(clanId);
        if (!clan) {
          const errorContainer = new ContainerBuilder();
          const errorText = new TextDisplayBuilder()
            .setContent('**Error**\n\nClan not found.');
          errorContainer.addTextDisplayComponents(errorText);
          
          return await interaction.editReply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        

        const { query } = await import('../../utils/database.js');
        let members = await query('SELECT * FROM clan_members WHERE clan_id = ? ORDER BY joined_at ASC', [clanId]);
        

        members = members.filter(member => 
          member.user_id !== clan.owner_id && 
          member.user_id !== clan.vice_owner_id
        );
        

        let ownerUser = null;
        try {
          ownerUser = await interaction.client.users.fetch(clan.owner_id);
        } catch (error) {
          console.error('Error fetching owner:', error);
        }
        

        let viceUser = null;
        if (clan.vice_owner_id) {
          try {
            viceUser = await interaction.client.users.fetch(clan.vice_owner_id);
          } catch (error) {
            console.error('Error fetching vice:', error);
          }
        }
        

        const membersPerPage = 12;
        const totalPages = Math.ceil(members.length / membersPerPage);
        const startIndex = page * membersPerPage;
        const endIndex = Math.min(startIndex + membersPerPage, members.length);
        const currentPageMembers = members.slice(startIndex, endIndex);
        

        let membersList = '';
        if (ownerUser) {
          membersList += `👑 **${ownerUser.username}** (Owner)\n`;
        }
        if (viceUser) {
          membersList += `⭐ **${viceUser.username}** (Vice Leader)\n`;
        }
        
        for (const member of currentPageMembers) {
          try {
            const memberUser = await interaction.client.users.fetch(member.user_id);
            const joinedDate = new Date(member.joined_at);
            const joinedTimestamp = Math.floor(joinedDate.getTime() / 1000);
            membersList += `👤 **${memberUser.username}** - <t:${joinedTimestamp}:R>\n`;
          } catch (error) {
            membersList += `👤 Unknown User (${member.user_id}) - <t:${Math.floor(Date.now() / 1000)}:R>\n`;
          }
        }
        
        if (membersList === '') {
          membersList = 'No members found.';
        }
        

        const container = new ContainerBuilder();
        
        const titleText = new TextDisplayBuilder()
          .setContent(`**📋 ${clan.name} - Members**`);
        container.addTextDisplayComponents(titleText);
        
        const memberText = new TextDisplayBuilder()
          .setContent(membersList);
        container.addTextDisplayComponents(memberText);
        
        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);
        container.addSeparatorComponents(separator);
        
        const statsText = new TextDisplayBuilder()
          .setContent(`**Total Members:** ${1 + (clan.vice_owner_id ? 1 : 0) + members.length}\n**Page:** ${page + 1}/${Math.max(totalPages, 1)}`);
        container.addTextDisplayComponents(statsText);
        

        const buttons = [];
        

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_back_${clanId}_${buttonUserId}`)
            .setLabel('Back to Clan')
            .setStyle(ButtonStyle.Secondary)
        );
        

        if (totalPages > 1) {
          if (page > 0) {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`clan_members_${clanId}_${buttonUserId}_${page - 1}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
            );
          }
          
          if (page < totalPages - 1) {
            buttons.push(
              new ButtonBuilder()
                .setCustomId(`clan_members_${clanId}_${buttonUserId}_${page + 1}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
            );
          }
        }
        
        const actionRow = new ActionRowBuilder().addComponents(buttons);
        
        await interaction.editReply({
          components: [container, actionRow],
          flags: MessageFlags.IsComponentsV2
        });
        
      } catch (error) {
        console.error('Error showing clan members:', error);
        
        const errorContainer = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('**Error**\n\nFailed to load clan members.');
        errorContainer.addTextDisplayComponents(errorText);
        
        await interaction.editReply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
    

    if (interaction.customId.startsWith('clan_back_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parseInt(parts[2]);
        const originalUserId = parts[3];
        
        const currentUserId = interaction.user.id;
        
        if (currentUserId !== originalUserId) {
          const accessDeniedText = new TextDisplayBuilder()
            .setContent('**Access Denied**\n-# You can only use your own clan interface. Use `/clan` to view your clan.');
          
          const accessDeniedContainer = new ContainerBuilder()
            .addTextDisplayComponents(accessDeniedText);
          
          return await interaction.reply({
            content: '',
            components: [accessDeniedContainer],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
        
        await interaction.deferUpdate();
        

        const clan = await getClanById(clanId);
        if (!clan) {
          const errorText = new TextDisplayBuilder()
            .setContent('**Error**\n-# Clan not found.');
          
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorText);
          
          return await interaction.editReply({
            content: '',
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
        

        const ownerUser = await interaction.client.users.fetch(clan.owner_id);
        

        const clanImage = await renderClanProfile(clan, ownerUser, interaction);
        const attachment = new AttachmentBuilder(clanImage, { name: 'clan.png' });
        

        const userId = interaction.user.id;
        let userRole = null;
        
        if (clan.owner_id === userId) {
          userRole = 'owner';
        } else if (clan.vice_owner_id === userId) {
          userRole = 'vice';
        } else {
          const { query } = await import('../../utils/database.js');
          const memberResult = await query('SELECT * FROM clan_members WHERE clan_id = ? AND user_id = ?', [clanId, userId]);
          if (memberResult.length > 0) {
            userRole = 'member';
          }
        }
        

        const buttons = [];
        

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_members_${clanId}_${userId}`)
            .setLabel('Members')
            .setStyle(ButtonStyle.Primary)
        );
        

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_quests_${clanId}_${userId}`)
            .setLabel('Quests')
            .setStyle(ButtonStyle.Success)
          );
        

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_map_${clanId}_${userId}`)
            .setLabel('Clan Map')
            .setStyle(ButtonStyle.Primary)
        );

        if (userRole === 'owner' || userRole === 'vice') {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`clan_change_flag_${userId}`)
              .setLabel('Change Flag')
              .setStyle(ButtonStyle.Secondary)
          );
          

          buttons.push(
            new ButtonBuilder()
              .setCustomId(`clan_change_name_${userId}`)
              .setLabel('Change Name')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        

        if (userRole === 'owner') {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`clan_delete_${userId}`)
              .setLabel('Delete Clan')
              .setStyle(ButtonStyle.Danger)
          );
        }
        

        if (userRole === 'member' || userRole === 'vice') {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`clan_leave_member_${userId}`)
              .setLabel('Leave Clan')
              .setStyle(ButtonStyle.Danger)
          );
        }
        

        const actionRows = [];
        for (let i = 0; i < buttons.length; i += 5) {
          const row = new ActionRowBuilder()
            .addComponents(buttons.slice(i, i + 5));
          actionRows.push(row);
        }
        
        const clanText = new TextDisplayBuilder()
          .setContent(`**${clan.name}** - Clan Profile\n-# Your clan dashboard with all available options`);
        
        const separator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);
        
        const mediaGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL(`attachment://clan.png`)
          );
        
        const container = new ContainerBuilder()
          .addTextDisplayComponents(clanText)
          .addSeparatorComponents(separator)
          .addMediaGalleryComponents(mediaGallery);
        
        actionRows.forEach(row => {
          container.addActionRowComponents(row);
        });
        
        await interaction.editReply({
          content: '',
          files: [attachment],
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        
      } catch (error) {
        console.error('Error returning to clan profile:', error);
        
        const errorText = new TextDisplayBuilder()
          .setContent('**Error**\n-# Failed to return to clan profile.');
        
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);
        
        await interaction.editReply({
          content: '',
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
    
    if (interaction.customId.startsWith('clan_change_flag_')) {
      const userId = interaction.customId.split('_')[3];
      
      if (interaction.user.id !== userId) {
        return await interaction.reply({
          embeds: [createEmbed({
            title: '❌ Access Denied',
            description: 'Only clan owners and vice leaders can change the clan flag.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      }
      

      const flagOptions = [
        { label: 'Blue Flag', value: 'blue.png', emoji: '🔵' },
        { label: 'Cyan Flag', value: 'cyan.png', emoji: '🩵' },
        { label: 'Green Flag', value: 'green.png', emoji: '🟢' },
        { label: 'Pink Flag', value: 'pink.png', emoji: '🩷' },
        { label: 'Purple Flag', value: 'purple.png', emoji: '🟣' },
        { label: 'Yellow Flag', value: 'yellow.png', emoji: '🟡' }
      ];
      
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`clan_flag_select_${userId}`)
        .setPlaceholder('Choose a new flag for your clan')
        .addOptions(
          flagOptions.map(flag => 
            new StringSelectMenuOptionBuilder()
              .setLabel(flag.label)
              .setValue(flag.value)
              .setEmoji(flag.emoji)
          )
        );
      
      const row = new ActionRowBuilder().addComponents(selectMenu);
      
      await interaction.reply({
        embeds: [createEmbed({
          title: '🏴 Change Clan Flag',
          description: 'Select a new flag design for your clan:',
          color: 0x3498DB
        })],
        components: [row],
        ephemeral: true
      });
    }
    

    if (interaction.customId.startsWith('clan_change_name_')) {
      const userId = interaction.customId.split('_')[3];
      
      if (interaction.user.id !== userId) {
        return await interaction.reply({
          embeds: [createEmbed({
            title: '❌ Access Denied',
            description: 'Only clan owners and vice leaders can change the clan name.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      }
      
      try {

        let clan = null;
        

        clan = await getClanByOwnerId(userId);
        
        if (!clan) {

          const { query } = await import('../../utils/database.js');
          const viceClanResult = await query('SELECT * FROM clans WHERE vice_owner_id = ?', [userId]);
          
          if (viceClanResult.length > 0) {
            clan = viceClanResult[0];
          }
        }
        
        if (!clan) {
          return await interaction.reply({
            embeds: [createEmbed({
              title: '❌ Error',
              description: 'Clan not found.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        

        const modal = new ModalBuilder()
          .setCustomId(`clan_name_modal_${userId}`)
          .setTitle('Change Clan Name');

        const nameInput = new TextInputBuilder()
          .setCustomId('clan_new_name')
          .setLabel('New Clan Name')
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(25)
          .setPlaceholder('Enter new clan name...')
          .setValue(clan.name)
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
        
      } catch (error) {
        console.error('Error showing clan name change modal:', error);
        await interaction.reply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to show name change form.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      }
    }
    

    if (interaction.customId.startsWith('clan_delete_confirm_')) {

      
      try {

        const clan = await getClanByOwnerId(interaction.user.id);
        
        if (!clan) {

          return await interaction.update({
            embeds: [createEmbed({
              title: '❌ No Clan',
              description: 'You don\'t have a clan to delete.',
              color: 0xFF0000
            })],
            components: []
          });
        }
        

        

        const { deleteClan } = await import('../../models/ClanModel.js');
        const { query } = await import('../../utils/database.js');
        

        

        await query('DELETE FROM clan_members WHERE clan_id = ?', [clan.id]);
        

        await query('DELETE FROM clan_invites WHERE clan_id = ?', [clan.id]);
        

        await query('DELETE FROM clan_user_quests WHERE clan_id = ?', [clan.id]);
        

        await deleteClan(clan.id);
        

        if (clan.emblem_filename) {
          try {
            const emblemPath = path.join(__dirname, '..', '..', 'public', 'clan_emblems', clan.emblem_filename);
            if (fs.existsSync(emblemPath)) {
              fs.unlinkSync(emblemPath);
            }
          } catch (fileError) {
            console.warn('Failed to delete emblem file:', fileError);
          }
        }
        

        
        await interaction.update({
          embeds: [createEmbed({
            title: '✅ Clan Deleted',
            description: `Clan **${clan.name}** has been successfully deleted.`,
            color: 0x00FF00
          })],
          components: []
        });
        
      } catch (error) {
        console.error('Error deleting clan:', error);
        await interaction.update({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'An error occurred while deleting the clan.',
            color: 0xFF0000
          })],
          components: []
        });
      }
      return;
    }
    

    if (interaction.customId.startsWith('clan_delete_cancel_')) {

      
      await interaction.update({
        embeds: [createEmbed({
          title: '❌ Deletion Cancelled',
          description: 'Clan deletion has been cancelled.',
          color: 0x95A5A6
        })],
        components: []
      });
      return;
    }
    

    if (interaction.customId.startsWith('clan_delete_')) {

      

      const clan = await getClanByOwnerId(interaction.user.id);
      
      if (!clan) {

        return await interaction.reply({
          embeds: [createEmbed({
            title: '❌ No Clan',
            description: 'You don\'t have a clan to delete.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      }
      

      

      const confirmButton = new ButtonBuilder()
        .setCustomId(`clan_delete_confirm_${interaction.user.id}`)
        .setLabel('Confirm Delete')
        .setStyle(ButtonStyle.Danger)
        
      const cancelButton = new ButtonBuilder()
        .setCustomId(`clan_delete_cancel_${interaction.user.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
        
      const confirmRow = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);
      
      await interaction.reply({
        embeds: [createEmbed({
          title: '⚠️ Delete Clan Confirmation',
          description: `Are you sure you want to delete clan **${clan.name}**?\n**This action cannot be undone!**`,
          color: 0xFF6B6B
        })],
        components: [confirmRow],
        ephemeral: true
      });
      return;
    }
    

    if (interaction.customId.startsWith('clan_leave_member_')) {
      const userId = interaction.customId.split('_')[3];
      

      if (interaction.user.id !== userId) {
        return await interaction.reply({
          embeds: [createEmbed({
            title: '❌ Access Denied',
            description: 'You can only use your own clan interface. Use `/clan` to view your clan.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      }
      

      

      const { query } = await import('../../utils/database.js');
      

      const viceClanResult = await query('SELECT * FROM clans WHERE vice_owner_id = ?', [userId]);
      let clan = null;
      let isVice = false;
      
      if (viceClanResult.length > 0) {
        clan = viceClanResult[0];
        isVice = true;

      } else {

        const memberResult = await query('SELECT * FROM clan_members WHERE user_id = ?', [userId]);

        if (memberResult.length > 0) {
          const clanId = memberResult[0].clan_id;
          clan = await getClanById(clanId);

        }
      }
      
      if (!clan) {

        return await interaction.reply({
          embeds: [createEmbed({
            title: '❌ Not a Member',
            description: 'You are not a member of any clan.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      }
      

      const confirmButton = new ButtonBuilder()
        .setCustomId(`clan_leave_confirm_member_${userId}`)
        .setLabel('Confirm Leave')
        .setStyle(ButtonStyle.Danger);
        
      const cancelButton = new ButtonBuilder()
        .setCustomId(`clan_leave_cancel_member_${userId}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
        
      const confirmRow = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);
      

      await interaction.reply({
        embeds: [createEmbed({
          title: '🚪 Leave Clan Confirmation',
          description: `Are you sure you want to leave clan **${clan.name}**?\n\nYou will need to be invited again to rejoin.`,
          color: 0xFF6B6B
        })],
        components: [confirmRow],
        flags: 64
      });

    }
    

    if (interaction.customId.startsWith('clan_leave_confirm_member_')) {
      const userId = interaction.customId.split('_')[4];
      

      if (interaction.user.id !== userId) {
        return await interaction.update({
          embeds: [createEmbed({
            title: '❌ Access Denied',
            description: 'You can only use your own clan interface.',
            color: 0xFF0000
          })],
          components: []
        });
      }
      
      try {
        const { query } = await import('../../utils/database.js');
        const memberResult = await query('SELECT * FROM clan_members WHERE user_id = ?', [userId]);
        
        if (memberResult.length === 0) {
          return await interaction.update({
            embeds: [createEmbed({
              title: '❌ Not a Member',
              description: 'You are not a member of any clan.',
              color: 0xFF0000
            })],
            components: []
          });
        }
        
        const clanId = memberResult[0].clan_id;
        const clan = await getClanById(clanId);
        

        await query('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?', [clanId, userId]);
        

        if (clan && clan.vice_owner_id === userId) {
          const { updateClanVice } = await import('../../models/ClanModel.js');
          await updateClanVice(clan.owner_id, null);
        }
        

        if (clan) {
          const { updateMemberCount } = await import('../../models/ClanModel.js');
          await updateMemberCount(clanId, clan.member_count - 1);
        }
        
        await interaction.update({
          embeds: [createEmbed({
            title: '✅ Left Clan',
            description: `You have successfully left clan **${clan ? clan.name : 'Unknown'}**.`,
            color: 0x00FF00
          })],
          components: []
        });
        
      } catch (error) {
        console.error('Error leaving clan:', error);
        await interaction.update({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'An error occurred while leaving the clan.',
            color: 0xFF0000
          })],
          components: []
        });
      }
    }
    

    if (interaction.customId.startsWith('clan_leave_cancel_member_')) {
      const userId = interaction.customId.split('_')[4];
      

      if (interaction.user.id !== userId) {
        return await interaction.update({
          embeds: [createEmbed({
            title: '❌ Access Denied',
            description: 'You can only use your own clan interface.',
            color: 0xFF0000
          })],
          components: []
        });
      }
      
      await interaction.update({
        embeds: [createEmbed({
          title: '❌ Leave Cancelled',
          description: 'You have cancelled leaving the clan.',
          color: 0x95A5A6
        })],
        components: []
      });
    }
  },


  async handleModalSubmit(interaction) {

    if (interaction.customId.startsWith('clan_name_modal_')) {
      try {
        await interaction.deferReply({ ephemeral: true });
        
        const userId = interaction.customId.split('_')[3];
        const newClanName = interaction.fields.getTextInputValue('clan_new_name').trim();
        

        if (interaction.user.id !== userId) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Access Denied',
              description: 'You can only change your own clan name.',
              color: 0xFF0000
            })]
          });
        }
        

        let clan = null;
        

        clan = await getClanByOwnerId(userId);
        
        if (!clan) {

          const { query } = await import('../../utils/database.js');
          const viceClanResult = await query('SELECT * FROM clans WHERE vice_owner_id = ?', [userId]);
          
          if (viceClanResult.length > 0) {
            clan = viceClanResult[0];
          }
        }
        
        if (!clan) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Error',
              description: 'Clan not found.',
              color: 0xFF0000
            })]
          });
        }
        

        const { updateClan } = await import('../../models/ClanModel.js');
        await updateClan(clan.id, { name: newClanName });
        

        

        imageCache.clear();
        
        await interaction.editReply({
          embeds: [createEmbed({
            title: '✅ Name Changed',
            description: `Clan name successfully changed to **${newClanName}**!`,
            color: 0x00FF00
          })]
        });
        
      } catch (error) {
        console.error('Error changing clan name:', error);
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to change clan name. Please try again later.',
            color: 0xFF0000
          })]
        });
      }
    }
    
    if (interaction.customId === 'clan_create_modal') {
      try {
        await interaction.deferReply();
        
        const userId = interaction.user.id;
        const clanName = interaction.fields.getTextInputValue('clan_name').trim();
        

        //       description: `You must be a member of our Discord server to create a clan!\n\n🔗 **Join here:** https://discord.gg/ponies\n\n**Server ID:** \`${TARGET_GUILD_ID}\``,
        
        

        const pony = await getPony(userId);
        if (!pony) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ No Pony Profile',
              description: 'You need to create a pony first with `/equestria`!',
              color: 0xFF0000
            })]
          });
        }
        
        if (pony.bits < CLAN_CREATION_COST) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Insufficient Bits',
              description: `You need **${CLAN_CREATION_COST.toLocaleString()}** <:bits:1429131029628588153> bits to create a clan.\nYou have: **${pony.bits.toLocaleString()}** <:bits:1429131029628588153> bits.`,
              color: 0xFF0000
            })]
          });
        }
        

        const existingClan = await getClanByOwnerId(userId);
        if (existingClan) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Clan Already Exists',
              description: 'You already have a clan!',
              color: 0xFF0000
            })]
          });
        }
        

        
        

        const newClan = await createClan({
          name: clanName,
          owner_id: userId,
          background_image: 'blue.png',
          clan_role_id: null,
          guild_id: null
        });
        

        

        await removeBits(userId, CLAN_CREATION_COST);
        

        const clanImage = await renderClanProfile(newClan, interaction.user, interaction);
        const attachment = new AttachmentBuilder(clanImage, { name: 'clan.png' });
        
        await interaction.editReply({
          files: [attachment]
        });
        
      } catch (error) {
        console.error('Error creating clan:', error);
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to create clan. Please try again later.',
            color: 0xFF0000
          })]
        });
      }
    }
  },


  async handleSelectMenu(interaction) {
    if (interaction.customId.startsWith('clan_flag_select_')) {
      try {
        await interaction.deferUpdate();
        
        const userId = interaction.customId.split('_')[3];
        const selectedFlag = interaction.values[0];
        
        if (interaction.user.id !== userId) {
          return await interaction.followUp({
            embeds: [createEmbed({
              title: '❌ Access Denied',
              description: 'Only clan owners and vice leaders can change the clan flag.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        

        let clan = null;
        

        clan = await getClanByOwnerId(userId);
        
        if (!clan) {

          const { query } = await import('../../utils/database.js');
          const viceClanResult = await query('SELECT * FROM clans WHERE vice_owner_id = ?', [userId]);
          
          if (viceClanResult.length > 0) {
            clan = viceClanResult[0];
          } else {

            const memberResult = await query('SELECT * FROM clan_members WHERE user_id = ?', [userId]);
            if (memberResult.length > 0) {
              const clanId = memberResult[0].clan_id;
              clan = await getClanById(clanId);
            }
          }
        }
        
        if (!clan) {
          return await interaction.followUp({
            embeds: [createEmbed({
              title: '❌ Error',
              description: 'Clan not found.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        

        const { updateClan } = await import('../../models/ClanModel.js');
        await updateClan(clan.id, { background_image: selectedFlag });
        

        imageCache.clear();
        
        await interaction.editReply({
          embeds: [createEmbed({
            title: '✅ Flag Changed',
            description: `Clan flag successfully changed to ${selectedFlag.replace('.png', '')}!`,
            color: 0x00FF00
          })],
          components: []
        });
        
      } catch (error) {
        console.error('Error changing clan flag:', error);
        await interaction.followUp({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to change clan flag. Please try again later.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      }
    }
  }
};

async function handleViewClanByName(interaction, clanName) {
  try {

    const clan = await getClanByName(clanName);
    
    if (!clan) {
      const notFoundText = new TextDisplayBuilder()
        .setContent(`**❌ Clan Not Found**\n-# Clan with name "**${clanName}**" was not found.`);
      
      const notFoundContainer = new ContainerBuilder()
        .addTextDisplayComponents(notFoundText);
      
      return await interaction.editReply({
        content: '',
        components: [notFoundContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }


    const [owner, viceOwner] = await Promise.all([
      interaction.client.users.fetch(clan.owner_id).catch(() => null),
      clan.vice_owner_id ? interaction.client.users.fetch(clan.vice_owner_id).catch(() => null) : null
    ]);


    const clanImageBuffer = await renderClanProfile(clan, owner, interaction);
    

    const membersButton = new ButtonBuilder()
      .setCustomId(`view_clan_members_${clan.id}`)
      .setLabel('Members')
      .setStyle(ButtonStyle.Secondary);

    const actionRow = new ActionRowBuilder().addComponents(membersButton);

    const viewClanText = new TextDisplayBuilder()
      .setContent(`**${clan.name}** - Clan Profile\n-# Viewing public clan information`);
    
    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);
    
    const viewClanMediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://clan.png`)
      );
    
    const viewClanContainer = new ContainerBuilder()
      .addTextDisplayComponents(viewClanText)
      .addSeparatorComponents(separator)
      .addMediaGalleryComponents(viewClanMediaGallery)
      .addActionRowComponents(actionRow);

    await interaction.editReply({
      content: '',
      files: [new AttachmentBuilder(clanImageBuffer, { name: 'clan.png' })],
      components: [viewClanContainer],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (error) {
    console.error('Error viewing clan by name:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('**❌ Error**\n-# Failed to load clan information. Please try again later.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.editReply({
      content: '',
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}

export async function handleResetSeasonCommand(message) {
  if (message.author.id !== OWNER_ID) {
    return;
  }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS clan_season_premium (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        clan_id INTEGER NOT NULL,
        season_id TEXT NOT NULL DEFAULT 'season1',
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, clan_id, season_id)
      )
    `);
    
    await query(`
      CREATE TABLE IF NOT EXISTS clan_season_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        clan_id INTEGER NOT NULL,
        season_id TEXT NOT NULL DEFAULT 'season1',
        level INTEGER NOT NULL,
        reward_type TEXT NOT NULL CHECK(reward_type IN ('free', 'premium')),
        claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, clan_id, season_id, level, reward_type)
      )
    `);
    
    await query('DELETE FROM clan_season_premium');
    await query('DELETE FROM clan_season_rewards');
    
    await query('UPDATE clan_map_progress SET level = 1, experience = 0 WHERE clan_id IN (SELECT id FROM clans)');
    
    await message.reply('✅ **Season Reset Complete**\n-# All clan season rewards, premium purchases, and map levels have been reset.');
  } catch (error) {
    console.error('Error resetting season:', error);
    await message.reply('❌ **Error resetting season.** Check console for details.');
  }
}

export async function handleSetLevelCommand(message, args) {
  if (message.author.id !== OWNER_ID) {
    return;
  }

  try {
    if (!args[0]) {
      await message.reply('❌ **Usage:** `.set level <1-13>`\n-# Please provide a level number between 1 and 13.');
      return;
    }

    const level = parseInt(args[0]);
    if (isNaN(level) || level < 1 || level > 13) {
      await message.reply('❌ **Invalid Level**\n-# Level must be a number between 1 and 13.');
      return;
    }

    const clans = await query('SELECT id, name FROM clans');
    
    if (clans.length === 0) {
      await message.reply('❌ **No Clans Found**\n-# There are no clans to update.');
      return;
    }

    for (const clan of clans) {
      await query(`
        INSERT OR IGNORE INTO clan_map_progress (clan_id, level, experience, total_experience) 
        VALUES (?, 1, 0, 0)
      `, [clan.id]);
      
      await query('UPDATE clan_map_progress SET level = ?, experience = 0 WHERE clan_id = ?', [level, clan.id]);
    }

    await message.reply(`✅ **Level Set Successfully**\n-# All ${clans.length} clan(s) have been set to level **${level}**.\n\n**Updated Clans:**\n${clans.map(c => `• ${c.name}`).join('\n')}`);
  } catch (error) {
    console.error('Error setting clan level:', error);
    await message.reply('❌ **Error setting level.** Check console for details.');
  }
}

function setInteractionTimeout(messageId, userId) {
  const key = `${messageId}_${userId}`;
  const now = Date.now();
  
  if (interactionTimeouts.has(key)) {
    const existing = interactionTimeouts.get(key);
    clearTimeout(existing.timeoutId);
  }
  
  const timeoutId = setTimeout(async () => {
    try {
      interactionTimeouts.delete(key);
    } catch (error) {
      console.error('Error in interaction timeout:', error);
    }
  }, BUTTON_TIMEOUT);
  
  interactionTimeouts.set(key, { timeoutId, createdAt: now });
}

function clearInteractionTimeout(messageId, userId) {
  const key = `${messageId}_${userId}`;
  if (interactionTimeouts.has(key)) {
    const existing = interactionTimeouts.get(key);
    clearTimeout(existing.timeoutId);
    interactionTimeouts.delete(key);
  }
}

function resetInteractionTimeout(messageId, userId) {
  clearInteractionTimeout(messageId, userId);
  setInteractionTimeout(messageId, userId);
}

function isInteractionExpired(interaction) {
  if (!interaction.message || !interaction.user) return false;
  
  const key = `${interaction.message.id}_${interaction.user.id}`;
  
  if (!interactionTimeouts.has(key)) {
    return false;
  }
  
  const record = interactionTimeouts.get(key);
  const elapsed = Date.now() - record.createdAt;
  
  return elapsed > BUTTON_TIMEOUT;
}

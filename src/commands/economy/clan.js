import { SlashCommandBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { setFont, getFontString, initFonts } from '../../utils/fontUtils.js';
import { createEmbed } from '../../utils/components.js';
import { getPony, removeBits } from '../../utils/pony/index.js';
import { getClanByOwnerId, createClan, clanExists, getClanById, createClanRole, updateClanRole, updateClanRoleName, isUserInTargetGuild, getClanByName } from '../../models/ClanModel.js';
import { loadImageWithProxy } from '../../utils/backgroundRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const CLAN_CREATION_COST = 10000;
const TARGET_GUILD_ID = '1369338076178026596';
const IMAGE_CACHE_EXPIRY = 2 * 60 * 1000;
const AVATAR_CACHE_EXPIRY = 30 * 60 * 1000;
const TEMPLATE_CACHE_EXPIRY = 60 * 60 * 1000;



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
    .setDescription('View or create your clan')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the clan to view')
        .setRequired(false)
    ),

  async execute(interaction) {

    
    try {
      await interaction.deferReply();
      
      const userId = interaction.user.id;
      const clanNameToView = interaction.options.getString('name');
      

      const pony = await getPony(userId);
      if (!pony) {
        return await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ No Pony Profile',
            description: 'You need to create a pony first with `/equestria` before you can create or view a clan!',
            color: 0xFF0000
          })]
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

          await interaction.editReply({
            embeds: [createEmbed({
              title: '<a:loading_line:1416130253428097135> Loading...',
              description: 'Loading clan profile, please wait...',
              color: 0x3498DB
            })]
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
          
          await interaction.editReply({
            files: [attachment],
            components: actionRows,
            embeds: []
          });        } catch (error) {
          console.error('Error rendering clan profile:', error);
          await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Error',
              description: 'Failed to render clan profile. Please try again later.',
              color: 0xFF0000
            })]
          });
        }
        
      } else {

        const embed = createEmbed({
          title: 'Create Your Clan',
          description: `You don't have a clan yet! Creating a clan costs **${CLAN_CREATION_COST.toLocaleString()}** <:bits:1429131029628588153>.\n\n**Your current bits:** ${pony.bits.toLocaleString()} <:bits:1429131029628588153>`,
          color: 0x3498DB
        });
        
        const button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('clan_create')
              .setLabel(`Create Clan`)
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('<:bits:1429131029628588153>')
              .setDisabled(pony.bits < CLAN_CREATION_COST)
          );
        
        await interaction.editReply({
          embeds: [embed],
          components: [button]
        });
      }
      
    } catch (error) {
      console.error('Error in clan command:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'An error occurred while processing your clan command.',
            color: 0xFF0000
          })],
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'An error occurred while processing your clan command.',
            color: 0xFF0000
          })]
        });
      }
    }
  },


  async handleButtonInteraction(interaction) {


    if (interaction.customId.startsWith('view_clan_members_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parts[3];
        const page = parseInt(parts[4]) || 0;
        
        await interaction.deferUpdate();
        

        const { getClanById } = await import('../../models/ClanModel.js');
        const clan = await getClanById(clanId);
        
        if (!clan) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Clan Not Found',
              description: 'The clan was not found.',
              color: 0xFF0000
            })]
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
        
        const membersEmbed = createEmbed({
          title: `👥 ${clan.name} Members`,
          description: membersList,
          color: 0x3498db,
          footer: { text: `Page ${page + 1}/${totalPages} • Total members: ${members.length}` }
        });
        
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
        
        components.push(actionRow);
        
        await interaction.editReply({
          embeds: [membersEmbed],
          components
        });
        
      } catch (error) {
        console.error('Error viewing clan members:', error);
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to load clan members.',
            color: 0xFF0000
          })]
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
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Clan Not Found',
              description: 'The clan was not found.',
              color: 0xFF0000
            })]
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
    

    else if (interaction.customId.startsWith('clan_quests_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parts[2];
        const buttonUserId = parts[3];
        const page = parseInt(parts[4]) || 0;
        

        if (interaction.user.id !== buttonUserId) {
          return await interaction.reply({
            embeds: [createEmbed({
              title: '❌ Access Denied',
              description: 'You can only use your own clan interface. Use `/clan` to view your clan.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        

        await interaction.update({
          embeds: [createEmbed({
            title: '<a:loading_line:1416130253428097135> Loading...',
            description: 'Loading clan quests, please wait...',
            color: 0x3498DB
          })],
          components: [],
          files: []
        });
        

        const ClanQuestModel = (await import('../../models/ClanQuestModel.js')).default;
        

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
        

        let userQuests = await ClanQuestModel.getUserActiveQuests(buttonUserId, clanId);
        

        if (userQuests.length === 0) {
          await ClanQuestModel.generateQuestsForUser(buttonUserId, clanId);
          userQuests = await ClanQuestModel.getUserActiveQuests(buttonUserId, clanId);
        }
        

        const clanLevel = ClanQuestModel.getClanLevel(clan.experience || 0);
        const nextLevelExp = ClanQuestModel.getRequiredExpForNextLevel(clan.experience || 0);
        

        let questsDescription = '';
        if (userQuests.length === 0) {
          questsDescription = 'No active quests available.';
        } else {
          userQuests.forEach((quest, index) => {
            const progress = Math.min(quest.current_progress, quest.target_value);
            const percentage = Math.round((progress / quest.target_value) * 100);
            const filledBars = Math.floor(percentage / 10);
            const progressBar = '🟩'.repeat(filledBars) + '⬛'.repeat(10 - filledBars);
            
            questsDescription += `**${index + 1}. ${quest.name}**\n`;
            questsDescription += `${quest.description}\n`;
            questsDescription += `Progress: ${progress}/${quest.target_value} (${percentage}%)\n`;
            questsDescription += `${progressBar}\n`;
            questsDescription += `Reward: ${quest.experience_reward} EXP\n\n`;
          });
        }
        

        const levelInfo = nextLevelExp 
          ? `Level ${clanLevel} (${clan.experience || 0}/${nextLevelExp} EXP)`
          : `Level ${clanLevel} (MAX)`;
        

        const embed = createEmbed({
          title: `🎯 ${clan.name} - Quests`,
          description: questsDescription,
          color: 0x00FF00,
          fields: [
            {
              name: 'Clan Level',
              value: levelInfo,
              inline: true
            },
            {
              name: 'Total EXP',
              value: `${clan.experience || 0}`,
              inline: true
            }
          ]
        });
        

        const buttons = [];
        

        buttons.push(
          new ButtonBuilder()
            .setCustomId(`clan_back_${clanId}_${buttonUserId}`)
            .setLabel('Back to Clan')
            .setStyle(ButtonStyle.Secondary)
        );
        
        const actionRow = new ActionRowBuilder().addComponents(buttons);
        
        await interaction.editReply({
          embeds: [embed],
          components: [actionRow],
          files: []
        });
        
      } catch (error) {
        console.error('Error showing clan quests:', error);
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to load clan quests.',
            color: 0xFF0000
          })],
          components: []
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
              title: '❌ Access Denied',
              description: 'You can only use your own clan interface. Use `/clan` to view your clan.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        
        await interaction.deferUpdate();
        

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
        

        const embed = createEmbed({
          title: `📋 ${clan.name} - Members`,
          description: membersList,
          color: 0x3498DB,
          fields: [
            {
              name: 'Total Members',
              value: `${1 + (clan.vice_owner_id ? 1 : 0) + members.length}`,
              inline: true
            },
            {
              name: 'Page',
              value: `${page + 1}/${Math.max(totalPages, 1)}`,
              inline: true
            }
          ]
        });
        

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
          embeds: [embed],
          components: [actionRow],
          files: []
        });
        
      } catch (error) {
        console.error('Error showing clan members:', error);
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to load clan members.',
            color: 0xFF0000
          })],
          components: []
        });
      }
    }
    

    if (interaction.customId.startsWith('clan_back_')) {
      try {
        const parts = interaction.customId.split('_');
        const clanId = parts[2];
        const buttonUserId = parts[3];
        

        if (interaction.user.id !== buttonUserId) {
          return await interaction.reply({
            embeds: [createEmbed({
              title: '❌ Access Denied',
              description: 'You can only use your own clan interface. Use `/clan` to view your clan.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        
        await interaction.deferUpdate();
        

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
        
        await interaction.editReply({
          files: [attachment],
          components: actionRows,
          embeds: []
        });
        
      } catch (error) {
        console.error('Error returning to clan profile:', error);
        await interaction.editReply({
          embeds: [createEmbed({
            title: '❌ Error',
            description: 'Failed to return to clan profile.',
            color: 0xFF0000
          })],
          components: []
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
        

        if (clan.role_id) {
          try {

            const guild = interaction.client.guilds.cache.get('1369338076178026596');
            if (guild) {
              const role = guild.roles.cache.get(clan.role_id);
              if (role) {
                await role.delete('Clan deleted');

              }
            }
          } catch (roleError) {
            console.warn('Failed to delete Discord role:', roleError);
          }
        }
        

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
        

        if (clan.clan_role_id && clan.guild_id) {
          try {
            const guild = interaction.client.guilds.cache.get(clan.guild_id);
            if (guild) {
              await updateClanRoleName(guild, clan.clan_role_id, newClanName);
            }
          } catch (roleError) {
            console.error('Error updating clan role name:', roleError);

          }
        }
        

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
        

        const isInTargetGuild = await isUserInTargetGuild(interaction.client, userId, TARGET_GUILD_ID);
        if (!isInTargetGuild) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Server Access Required',
              description: `You must be a member of our Discord server to create a clan!\n\n🔗 **Join here:** https://discord.gg/ponies\n\n**Server ID:** \`${TARGET_GUILD_ID}\``,
              color: 0xFF0000
            })]
          });
        }
        

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
        

        const guild = interaction.client.guilds.cache.get(TARGET_GUILD_ID);
        if (!guild) {
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Server Error',
              description: 'Target server not found. Please try again later.',
              color: 0xFF0000
            })]
          });
        }
        

        let clanRole;
        try {
          clanRole = await createClanRole(guild, clanName);
        } catch (roleError) {
          console.error('Error creating clan role:', roleError);
          return await interaction.editReply({
            embeds: [createEmbed({
              title: '❌ Role Creation Failed',
              description: 'Failed to create clan role. Please try again later.',
              color: 0xFF0000
            })]
          });
        }
        

        const newClan = await createClan({
          name: clanName,
          owner_id: userId,
          background_image: 'blue.png',
          clan_role_id: clanRole.id,
          guild_id: TARGET_GUILD_ID
        });
        

        try {
          const member = guild.members.cache.get(userId);
          if (member) {
            await member.roles.add(clanRole);
          }
        } catch (roleError) {
          console.error('Error adding role to clan owner:', roleError);
        }
        

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
      return await interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Clan Not Found',
          description: `Clan with name "**${clanName}**" was not found.`,
          color: 0xFF0000
        })]
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


    await interaction.editReply({
      files: [new AttachmentBuilder(clanImageBuffer, { name: 'clan.png' })],
      components: [actionRow]
    });

  } catch (error) {
    console.error('Error viewing clan by name:', error);
    await interaction.editReply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'Failed to load clan information. Please try again later.',
        color: 0xFF0000
      })]
    });
  }
}

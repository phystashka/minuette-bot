import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  AttachmentBuilder
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { createVenturePonyImage } from '../../utils/backgroundRenderer.js';
import { 
  getPony,
  addBits
} from '../../utils/pony/index.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { addCases, addResource } from '../../models/ResourceModel.js';
import { addFriend, getUserFriends, getPonyFriendsByRarity, getLowerRarityPonyFriends, PONY_DATA } from '../../models/FriendshipModel.js';
import { enableNotification, disableNotification, isNotificationEnabled } from '../../models/NotificationModel.js';
import { query, getRow } from '../../utils/database.js';
import { getImageInfo } from '../../utils/imageResolver.js';
import { t } from '../../utils/localization.js';

function getImageUrl(imagePath) {
  return null;
}

function getImageAttachment(imagePath) {
  const imageInfo = getImageInfo(imagePath);
  if (imageInfo && imageInfo.type === 'attachment') {
    return {
      path: imageInfo.attachmentPath,
      filename: imageInfo.filename
    };
  }
  return null;
}
import { hasActivePotion } from '../../models/ResourceModel.js';
import { getUserRebirth, getPonyDuplicateMultiplier, canGetNewPony } from './rebirth.js';
import { checkBingoUpdate, createBingoUpdateEmbed } from '../../utils/bingoManager.js';


const RARITY_EMOJIS = {
  BASIC: '<:B1:1410754066811981894><:A1:1410754103918858261><:S1:1410754129235673148><:I1:1410754153206251540><:C1:1410754186471145533>',
  RARE: '<:R1:1410892381171089448><:A1:1410892395721261108><:R2:1410892414603890819><:E1:1410892426159198309>',
  EPIC: '<:E2:1410893187949662219><:P2:1410893200511471656><:I2:1410893211886424125><:C2:1410893223794049135>',
  MYTHIC: '<:M2:1410894084544921752><:Y1:1410894082913472532><:T1:1410894075787477072><:H11:1410894074109755402><:I3:1410894072406868070><:C3:1410894070976479282>',
  LEGEND: '<:L4:1410895642615611453><:E4:1410895641042747434><:G4:1410895638991999057><:E5:1410895637523861504><:N4:1410895635405606933><:D4:1410895645040054374>',
  CUSTOM: '<:C5:1410900991703781539><:U5:1410900989774659695><:S5:1410900998964252712><:T5:1410900997366087750><:O5:1410900995600552046><:M5:1410900993910112266>',
  SECRET: '<:S6:1410901772180131840><:E6:1410901770695081984><:C6:1410901769067692114><:R6:1410901767629307995><:E61:1410901765854990396><:T6:1410901764164816898>',
  EVENT: '<:E2:1417857423829500004><:V1:1417857422420217897><:E1:1417857420029595691><:N1:1417857418804854834><:T1:1417857417391378432>',
  UNIQUE: '<:U2:1418945904546938910><:N2:1418945902470631484><:I1:1418945900570480690><:Q1:1418945898679107614><:U2:1418945904546938910><:E3:1418945906115346452>',
  EXCLUSIVE: '<:E1:1425524316858224822><:X2:1425524310570696815><:C3:1425524308997963857><:L4:1425524306833834185><:U5:1425524304845475840><:S6:1425524303470002319><:I7:1425524323002876015><:V8:1425524320985153586><:E9:1425524318732812461>',
  ADMIN: '<:a_:1430153532287488071><:d_:1430153530018238575><:m_:1430153528143380500><:I_:1430153535961694278><:N1:1430153534212407376>'
};


const RARITY_COLORS = {
  BASIC: 0xCCCCCC,
  RARE: 0x3498DB,
  EPIC: 0x9B59B6,
  MYTHIC: 0xF1C40F,
  LEGEND: 0xE74C3C,
  CUSTOM: 0x2ECC71,
  SECRET: 0x34495E,
  EVENT: 0xFF6B35,
  UNIQUE: 0x9932CC,
  EXCLUSIVE: 0xFF69B4,
  ADMIN: 0x800080
};


const BACKGROUND_EMOJIS = {
  airship: 'Airship',
  appleloosa: 'Appleloosa',
  bridlewood: 'Bridlewood',
  canterlot: 'Canterlot',
  changeling_hive: 'Changeling Hive',
  chaosville: 'Chaosville',
  cloudsdale: 'Cloudsdale',
  crystal_empire: 'Crystal Empire',
  crystal_prep: 'Crystal Prep',
  dragon_lands: 'Dragon Lands',
  equestria: 'Equestria',
  equestria_girls: 'Equestria Girls',
  everfree_forest: 'Everfree Forest',
  griffonstone: 'Griffonstone',
  halloween_event: 'Halloween Event',
  jungle: 'Jungle',
  kirin_village: 'Kirin Village',
  klugetown: 'Klugetown',
  manehattan: 'Manehattan',
  maretime_bay: 'Maretime Bay',
  our_town: 'Our Town',
  pear_orchard: 'Pear Orchard',
  ponyville: 'Ponyville',
  rock_farm: 'Rock Farm',
  sweet_apple_acres: 'Sweet Apple Acres',
  yakyakistan: 'Yakyakistan',
  zephyr_heights: 'Zephyr Heights'
};


async function getRandomTitle(rarity, guildId, background = null, isUnique = false) {
  const titleKeys = {
    BASIC: ['venture.title_basic_1', 'venture.title_basic_2', 'venture.title_basic_3', 'venture.title_basic_4'],
    RARE: ['venture.title_rare_1', 'venture.title_rare_2', 'venture.title_rare_3', 'venture.title_rare_4'],
    EPIC: ['venture.title_epic_1', 'venture.title_epic_2', 'venture.title_epic_3', 'venture.title_epic_4'],
    MYTHIC: ['venture.title_mythic_1', 'venture.title_mythic_2', 'venture.title_mythic_3', 'venture.title_mythic_4'],
    LEGEND: ['venture.title_legend_1', 'venture.title_legend_2', 'venture.title_legend_3', 'venture.title_legend_4'],
    CUSTOM: ['venture.title_custom_1', 'venture.title_custom_2', 'venture.title_custom_3', 'venture.title_custom_4'],
    SECRET: ['venture.title_secret_1', 'venture.title_secret_2', 'venture.title_secret_3', 'venture.title_secret_4'],
    EVENT: ['venture.title_event_1', 'venture.title_event_2', 'venture.title_event_3', 'venture.title_event_4'],
    EXCLUSIVE: ['venture.title_exclusive_1', 'venture.title_exclusive_2', 'venture.title_exclusive_3', 'venture.title_exclusive_4']
  };
  
  const keys = titleKeys[rarity] || titleKeys.BASIC;
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const title = await t(randomKey, guildId);
  

  const backgroundEmoji = background && BACKGROUND_EMOJIS[background] ? `[${BACKGROUND_EMOJIS[background]}] ` : '';
  
  return backgroundEmoji + title + (isUnique ? await t('venture.unique', guildId) : '');
}


const SUCCESS_TITLES = {
  BASIC: {
    newFriend: ["Correct! New Friend!", "Well done!", "Great guess!", "Nice job!"],
    duplicate: ["Correct! Already Friends!", "Good memory!", "You know this pony!", "Familiar face!"]
  },
  RARE: {
    newFriend: ["RARE friend acquired!", "Excellent! RARE find!", "RARE connection made!", "Amazing RARE guess!"],
    duplicate: ["RARE friend again!", "You remember this RARE one!", "RARE reunion!", "RARE encounter repeated!"]
  },
  EPIC: {
    newFriend: ["EPIC friendship unlocked!", "EPIC guess! New ally!", "EPIC connection achieved!", "Outstanding! EPIC friend!"],
    duplicate: ["EPIC friend returns!", "EPIC memory skills!", "Another EPIC meeting!", "EPIC reunion!"]
  },
  MYTHIC: {
    newFriend: ["MYTHICAL bond forged!", "INCREDIBLE! MYTHIC friend!", "LEGENDARY guess! MYTHIC ally!", "MYTHICAL friendship achieved!"],
    duplicate: ["MYTHIC friend again!", "Unforgettable MYTHICAL bond!", "MYTHIC reunion!", "Your MYTHICAL friend returns!"]
  },
  LEGEND: {
    newFriend: ["LEGENDARY FRIENDSHIP!", "UNBELIEVABLE! LEGEND befriended!", "EPIC WIN! LEGENDARY ally!", "LEGENDARY bond created!"],
    duplicate: ["LEGENDARY friend returns!", "LEGENDARY reunion!", "Your LEGENDARY ally again!", "LEGENDARY memory!"]
  },
  CUSTOM: {
    newFriend: ["CUSTOM friendship made!", "Unique CUSTOM bond!", "Special CUSTOM connection!", "CUSTOM friend acquired!"],
    duplicate: ["CUSTOM friend again!", "Your special CUSTOM ally!", "CUSTOM reunion!", "Unique bond renewed!"]
  },
  SECRET: {
    newFriend: ["SECRET friend revealed!", "Hidden bond unlocked!", "SECRET friendship made!", "Mysterious ally gained!"],
    duplicate: ["SECRET friend returns!", "Your mysterious ally again!", "SECRET reunion!", "Hidden bond renewed!"]
  },
  EVENT: {
    newFriend: ["EVENT friendship unlocked!", "Special bond created!", "EVENT ally gained!", "Rare connection made!"],
    duplicate: ["EVENT friend returns!", "Your special ally again!", "EVENT reunion!", "Special bond renewed!"]
  },
  EXCLUSIVE: {
    newFriend: ["EXCLUSIVE bond forged!", "AMAZING! EXCLUSIVE friend!", "EXCLUSIVE connection made!", "Ultimate EXCLUSIVE ally!"],
    duplicate: ["EXCLUSIVE friend again!", "Your EXCLUSIVE companion!", "EXCLUSIVE reunion!", "Precious bond renewed!"]
  }
};


function getSuccessTitle(rarity, isDuplicate = false, background = null) {
  const rarityTitles = SUCCESS_TITLES[rarity] || SUCCESS_TITLES.BASIC;
  const titleType = isDuplicate ? 'duplicate' : 'newFriend';
  const titles = rarityTitles[titleType];
  const baseTitle = titles[Math.floor(Math.random() * titles.length)];
  

  const backgroundEmoji = background && BACKGROUND_EMOJIS[background] ? `[${BACKGROUND_EMOJIS[background]}] ` : '';
  
  return backgroundEmoji + baseTitle;
}


const WRONG_TITLES = {
  BASIC: ["Wrong Guess!", "Not quite!", "Try again!", "Close, but no!"],
  RARE: ["Rare miss!", "Not this RARE one!", "RARE mistake!", "Missed the RARE mark!"],
  EPIC: ["EPIC fail!", "Not this EPIC one!", "EPIC misjudgment!", "EPIC wrong guess!"],
  MYTHIC: ["MYTHICAL mystery unsolved!", "Not this MYTHIC being!", "MYTHICAL mistake!", "MYTHIC misjudgment!"],
  LEGEND: ["LEGENDARY miss!", "Not this LEGEND!", "LEGENDARY mistake!", "Missed the LEGEND!"],
  CUSTOM: ["CUSTOM confusion!", "Not this CUSTOM one!", "CUSTOM mistake!", "Wrong CUSTOM guess!"],
  SECRET: ["SECRET remains hidden!", "SECRET still unknown!", "SECRET mistake!", "SECRET not revealed!"],
  EVENT: ["EVENT confusion!", "Wrong special one!", "EVENT mistake!", "Not this event pony!"],
  EXCLUSIVE: ["EXCLUSIVE mystery!", "Not this EXCLUSIVE one!", "EXCLUSIVE challenge!", "Wrong EXCLUSIVE guess!"]
};


function getWrongTitle(rarity, background = null) {
  const titles = WRONG_TITLES[rarity] || WRONG_TITLES.BASIC;
  const baseTitle = titles[Math.floor(Math.random() * titles.length)];
  

  const backgroundEmoji = background && BACKGROUND_EMOJIS[background] ? `[${BACKGROUND_EMOJIS[background]}] ` : '';
  
  return backgroundEmoji + baseTitle;
}


function fixImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  


  return url.replace(/^h+ttps:/, 'https:').replace(/^h+ttp:/, 'http:');
}


const RARITY_CHANCES = {
  BASIC: 0.40,
  RARE: 0.075,
  EPIC: 0.01,
  MYTHIC: 0.003,
  LEGEND: 0.0015,
  CUSTOM: 0.001,
  SECRET: 0.00075,
  EVENT: 0.00025
}; 


const EXCLUDED_EVENT_PONIES = [
  'Sweetie Angel',
  'Rarity Angel', 
  'Cozy Demon',
  'Rarity Demon'
];


const EXCLUDED_PONIES = [
  'Aryanne',
  'Peachy Sprinkle',
  'Pumpkin Seed',
  'Nocturn'
];

async function createPonyEncounterComponentsV2(randomPony, masked, guildId, interaction, options = {}) {
  const { hintUsed = false, superHintUsed = false, originalImagePath = null } = options;
  const title = await getRandomTitle(randomPony.rarity, guildId, randomPony.background, randomPony.is_unique);
  

  const headerText = new TextDisplayBuilder()
    .setContent(`**${title}** ${RARITY_EMOJIS[randomPony.rarity]}${randomPony.is_unique ? ` ${await t('venture.unique', guildId)}` : ''}\n-# A mysterious encounter awaits your decision`);
  
  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);
  
  const container = new ContainerBuilder()
    .addTextDisplayComponents(headerText)
    .addSeparatorComponents(separator);

  const imagePath = originalImagePath || randomPony.image;
  if (imagePath) {
    const imageInfo = getImageInfo(imagePath);
    if (imageInfo && imageInfo.type === 'url') {
      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(imagePath)
        );
      container.addMediaGalleryComponents(mediaGallery);
      container.addSeparatorComponents(separator);
    } else if (imageInfo && imageInfo.type === 'attachment') {
      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(`attachment://${imageInfo.filename}`)
        );
      container.addMediaGalleryComponents(mediaGallery);
      container.addSeparatorComponents(separator);
    }
  }

  let encounterContent = await t('venture.encountered_pony', guildId, { 
    unique: '',
    rarity: '',
    name: superHintUsed ? `${randomPony.name} ✨` : masked
  });

  encounterContent = `**${encounterContent}**`;
  
  if (hintUsed && !superHintUsed) {
    encounterContent += '\n-# Some letters have been revealed to help you!';
  } else if (superHintUsed) {
    encounterContent += '\n-# The full name has been revealed for 750 bits!';
  }
  
  const encounterText = new TextDisplayBuilder()
    .setContent(encounterContent);
  
  container.addTextDisplayComponents(encounterText)
    .addSeparatorComponents(separator);
  
  const befriendButton = new ButtonBuilder()
    .setCustomId('befriend')
    .setLabel(await t('venture.befriend', guildId))
    .setStyle(ButtonStyle.Primary);
  
  const ignoreButton = new ButtonBuilder()
    .setCustomId('ignore')
    .setLabel(await t('venture.ignore', guildId))
    .setStyle(ButtonStyle.Secondary);
  
  const hintButton = new ButtonBuilder()
    .setCustomId('hint')
    .setLabel(await t('venture.hint', guildId))
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(hintUsed);
  
  const superHintButton = new ButtonBuilder()
    .setCustomId('super_hint')
    .setLabel(await t('venture.super_hint', guildId))
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(superHintUsed);
  
  const actionRow = new ActionRowBuilder()
    .addComponents(befriendButton, ignoreButton, hintButton, superHintButton);
  
  container.addActionRowComponents(actionRow);
  
  return container;
}

const COOLDOWN_TIME = 10 * 60 * 1000;
const TIMEOUT_DURATION = 2 * 60 * 1000;



function getMaskedName(name, revealed = []) {

  return name.split('').map((ch, idx) => {
    if (ch === ' ') return '   ';
    if (revealed.includes(idx)) return ch;
    return '_';
  }).join(' ');
}


async function getActionRow(guildId, userId, disabled = { befriend: false, ignore: false, hint: false, superHint: false, showBell: true }) {
  const buttons = [
    new ButtonBuilder()
      .setCustomId('befriend')
      .setLabel(await t('venture.befriend', guildId))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!!disabled.befriend),
    new ButtonBuilder()
      .setCustomId('ignore')
      .setLabel(await t('venture.ignore', guildId))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!!disabled.ignore),
    new ButtonBuilder()
      .setCustomId('hint')
      .setLabel(await t('venture.hint', guildId))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!!disabled.hint),
    new ButtonBuilder()
      .setCustomId('super_hint')
      .setLabel(await t('venture.super_hint', guildId))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!!disabled.superHint)
  ];


  if (disabled.showBell) {
    const notificationEnabled = await isNotificationEnabled(userId);
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`toggle_notification_${userId}`)
        .setLabel('Remind me')
        .setEmoji('🔔')
        .setStyle(notificationEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(false)
    );
  }

  return new ActionRowBuilder().addComponents(buttons);
}


async function getBellOnlyActionRow(userId) {
  const notificationEnabled = await isNotificationEnabled(userId);
  const bellButton = new ButtonBuilder()
    .setCustomId(`toggle_notification_${userId}`)
    .setLabel('Remind me')
    .setEmoji('🔔')
    .setStyle(notificationEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
    .setDisabled(false);

  return new ActionRowBuilder().addComponents(bellButton);
}

const userCooldowns = new Map();

function createNotificationEnabledComponents() {
  const headerText = new TextDisplayBuilder()
    .setContent('🔔 **Notifications enabled!**\n-# You will receive a DM when the cooldown expires.');
  
  return new ContainerBuilder()
    .addTextDisplayComponents(headerText);
}

function createNotificationDisabledComponents() {
  const headerText = new TextDisplayBuilder()
    .setContent('🔔 **Notifications disabled.**\n-# You will no longer receive DM reminders when cooldown expires.');
  
  return new ContainerBuilder()
    .addTextDisplayComponents(headerText);
}

function createDMsClosedComponents() {
  const headerText = new TextDisplayBuilder()
    .setContent('**Cannot enable notifications**\n-# Your DMs are closed. Please open DMs and try again.');
  
  return new ContainerBuilder()
    .addTextDisplayComponents(headerText);
}


async function canSendDM(user) {
  try {
    const dmChannel = await user.createDM();
    return true;
  } catch (error) {
    if (error.code === 50007) {
      return false;
    }
    return false;
  }
}


async function sendCooldownNotification(userId, client) {
  try {
    console.log(`[sendCooldownNotification] Attempting to send notification to user ${userId}`);
    const user = await client.users.fetch(userId);
    if (!user) {
      console.log(`[sendCooldownNotification] User ${userId} not found`);
      return;
    }
    
    const canSend = await canSendDM(user);
    if (!canSend) {
      console.log(`[sendCooldownNotification] Cannot send DM to user ${userId}, disabling notifications`);
      await disableNotification(userId);
      return;
    }
    
    console.log(`[sendCooldownNotification] Sending DM to user ${userId}`);
    const { sendDMWithDelete } = await import('../../utils/components.js');
    const headerText = new TextDisplayBuilder()
      .setContent('**🔔 Venture Ready!**\n-# Your venture cooldown has expired! You can now use `/venture` again.');
    const container = new ContainerBuilder().addTextDisplayComponents(headerText);
    await sendDMWithDelete(user, {
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
    
    console.log(`[sendCooldownNotification] Successfully sent DM to user ${userId}`);

  } catch (error) {
    console.error(`[sendCooldownNotification] Error sending cooldown notification to ${userId}:`, error);

    try {
      await disableNotification(userId);
    } catch (dbError) {
      console.error(`[sendCooldownNotification] Error disabling notification for ${userId}:`, dbError);
    }
  }
}

export const data = new SlashCommandBuilder()
  .setName('adventure')
  .setDescription('Adventure through Equestria for adventures, encounters, and rewards')
  .setDescriptionLocalizations({
    'ru': 'Отправьтесь в приключение по Понивиллю за наградами и встречами'
  })
  .setDMPermission(false);

  export async function execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = userId === '1372601851781972038' ? null : interaction.guild?.id;
      const pony = await getPony(userId);
      

      if (!pony) {
        const { createNoPonyContainer } = await import('../../utils/pony/ponyMiddleware.js');
        const container = createNoPonyContainer(
          'No Pony Found',
          'You need to have a pony to go on ventures!'
        );
        
        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container]
        });
      }
      

      if (userCooldowns.has(userId)) {
        const cooldownExpiration = userCooldowns.get(userId);
        const timeLeft = cooldownExpiration - Date.now();
        
        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          
          const cooldownText = new TextDisplayBuilder()
            .setContent(`**${await t('venture.cooldown_title', guildId)}**\n-# ${await t('venture.cooldown_message', guildId, { minutes, seconds })}`);
          
          const cooldownContainer = new ContainerBuilder()
            .addTextDisplayComponents(cooldownText);
          
          return interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [cooldownContainer]
          });
        }
      }
      

      const slotCheck = await canGetNewPony(userId);
      if (!slotCheck.canGet) {
        const stableFullText = new TextDisplayBuilder()
          .setContent(`**🏠 Stable Full**\n-# ${slotCheck.message}`);
        
        const stableFullContainer = new ContainerBuilder()
          .addTextDisplayComponents(stableFullText);
        
        return interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [stableFullContainer]
        });
      }
      

      const modifiedChances = await getModifiedRarityChances(userId);
      const randomValue = Math.random();
      let selectedRarity = 'BASIC';
      let cumulativeChance = 0;
      for (const [rarity, chance] of Object.entries(modifiedChances)) {
        cumulativeChance += chance;
        if (randomValue <= cumulativeChance) {
          selectedRarity = rarity;
          break;
        }
      }


        await handlePonyEncounter(interaction, pony, selectedRarity);
      
      userCooldowns.set(userId, Date.now() + COOLDOWN_TIME);
      

      const hasNotifications = await isNotificationEnabled(userId);
      if (hasNotifications) {
        console.log(`[venture] User ${userId} has notifications enabled, scheduling notification in ${COOLDOWN_TIME}ms`);
        setTimeout(() => {
          sendCooldownNotification(userId, interaction.client);
        }, COOLDOWN_TIME);
      } else {
        console.log(`[venture] User ${userId} does not have notifications enabled`);
      }
      
    } catch (error) {
      console.error('Error in venture command:', error);

      return;
    }
    
  }

async function handlePonyEncounter(interaction, pony, selectedRarity) {
  try {
    const guildId = interaction.user.id === '1372601851781972038' ? null : interaction.guild?.id;
    let poniesOfRarity;
    

    if (interaction.replied || interaction.deferred) {
      console.error('[handlePonyEncounter] Interaction already handled');
      return;
    }
    

    await interaction.deferReply();
    

    poniesOfRarity = await getPonyFriendsByRarity(selectedRarity);
    

    if (selectedRarity === 'EVENT' && poniesOfRarity) {
      poniesOfRarity = poniesOfRarity.filter(pony => !EXCLUDED_EVENT_PONIES.includes(pony.name));
    }
    

    if (poniesOfRarity) {
      poniesOfRarity = poniesOfRarity.filter(pony => !EXCLUDED_PONIES.includes(pony.name));
    }
    
    if (!poniesOfRarity || poniesOfRarity.length === 0) {
      return handleRegularVenture(interaction, pony);
    }


    if (!Array.isArray(poniesOfRarity) || poniesOfRarity.length === 0) {
      return handleRegularVenture(interaction, pony);
    }


    const randomIndex = Math.floor(Math.random() * poniesOfRarity.length);
    let randomPony = poniesOfRarity[randomIndex];
    

    console.log(`[VENTURE] ${randomPony.rarity} pony "${randomPony.name}" encountered on ${interaction.guild?.name || 'DM'} (${interaction.guild?.id || 'DM'})`);
    

    const originalImagePath = randomPony.image;
    console.log(`[venture] Original randomPony.image: "${originalImagePath}"`);
    
    if (randomPony.image) {
      randomPony.image = getImageUrl(randomPony.image);
      console.log(`[handlePonyEncounter] Image URL: ${originalImagePath} -> ${randomPony.image || 'null (local file)'}`);
    } else {
      console.log(`[venture] randomPony.image is empty/null`);
    }
    

    const hintState = new Map();

    let ponyName = randomPony.name;
    
    const revealed = [];
    hintState.set(interaction.user.id, revealed);
    

    const masked = getMaskedName(ponyName, revealed);
    

    let ponyWithBackground = null;
    

    const embedColor = RARITY_COLORS[randomPony.rarity];
    

    let title = await getRandomTitle(randomPony.rarity, guildId, randomPony.background, randomPony.is_unique);
    
    const container = await createPonyEncounterComponentsV2(randomPony, masked, guildId, interaction, { originalImagePath });
    
    let hintUsed = false;
    let superHintUsed = false;
    

    const replyOptions = {
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    };
    
    if (originalImagePath) {
      console.log(`[venture] Processing image: "${originalImagePath}"`);
      const imageAttachment = getImageAttachment(originalImagePath);
      console.log(`[venture] getImageAttachment result:`, imageAttachment);
      if (imageAttachment) {
        const safeFilename = imageAttachment.filename;
        const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
        replyOptions.files = [attachment];
        console.log(`[venture] Added attachment with safe filename: ${safeFilename}`);
      } else {
        console.log(`[venture] No attachment created for: "${originalImagePath}"`);
      }
    }

    
    const response = await interaction.editReply(replyOptions);
    
    const message = await interaction.fetchReply();
    
    try {
      const collector = message.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: TIMEOUT_DURATION

      });

      let modalCollector = null;
      
      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          const notForYouText = new TextDisplayBuilder()
            .setContent('This interaction is not for you!');
          
          const notForYouContainer = new ContainerBuilder()
            .addTextDisplayComponents(notForYouText);
          
          return i.reply({ 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [notForYouContainer]
          });
        }
        
        if (i.customId === 'hint') {
          if (hintUsed) return;
          hintUsed = true;

          let revealed = hintState.get(i.user.id) || [];
          const nameArr = ponyName.split('');
          const hiddenIdxs = nameArr.map((ch, idx) => (ch !== ' ' && !revealed.includes(idx) ? idx : null)).filter(idx => idx !== null);
          const toReveal = Math.min(3, hiddenIdxs.length);
          for (let n = 0; n < toReveal; n++) {
            if (hiddenIdxs.length === 0) break;
            const rand = Math.floor(Math.random() * hiddenIdxs.length);
            revealed.push(hiddenIdxs[rand]);
            hiddenIdxs.splice(rand, 1);
          }
          hintState.set(i.user.id, revealed);
          const newMasked = getMaskedName(ponyName, revealed);
          
          const updatedContainer = await createPonyEncounterComponentsV2(randomPony, newMasked, guildId, interaction, { hintUsed: true, superHintUsed, originalImagePath });
          
          const updateOptions = {
            flags: MessageFlags.IsComponentsV2,
            components: [updatedContainer]
          };
          
          if (originalImagePath) {
            const imageAttachment = getImageAttachment(originalImagePath);
            if (imageAttachment) {
              const safeFilename = imageAttachment.filename;
              const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
              updateOptions.files = [attachment];
            }
          }
          
          if (ponyWithBackground) {
            updateOptions.files = [ponyWithBackground];
          }
          
          await i.update(updateOptions);
          return;
        }

        if (i.customId === 'super_hint') {
          const currentPony = await getPony(interaction.user.id);
          if (currentPony.bits < 750) {
            const notEnoughBitsText = new TextDisplayBuilder()
              .setContent(`**${await t('venture.not_enough_bits', guildId)}**\n-# ${await t('venture.super_hint_cost', guildId, { bits: currentPony.bits })}`);
            
            const notEnoughBitsContainer = new ContainerBuilder()
              .addTextDisplayComponents(notEnoughBitsText);
            
            return i.reply({
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
              components: [notEnoughBitsContainer]
            });
          }

          await query('UPDATE ponies SET bits = bits - 750 WHERE user_id = ?', [interaction.user.id]);
          
          superHintUsed = true;
          
          const nameArr = ponyName.split('');
          const revealed = nameArr.map((ch, idx) => ch !== ' ' ? idx : null).filter(idx => idx !== null);
          hintState.set(i.user.id, revealed);
          
          const updatedContainer = await createPonyEncounterComponentsV2(randomPony, ponyName, guildId, interaction, { hintUsed, superHintUsed: true, originalImagePath });
          
          const updateOptions = {
            flags: MessageFlags.IsComponentsV2,
            components: [updatedContainer]
          };
          
          if (originalImagePath) {
            const imageAttachment = getImageAttachment(originalImagePath);
            if (imageAttachment) {
              const safeFilename = imageAttachment.filename;
              const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
              updateOptions.files = [attachment];
            }
          }
          
          if (ponyWithBackground) {
            updateOptions.files = [ponyWithBackground];
          }
          
          await i.update(updateOptions);
          return;
        }

        if (i.customId === 'ignore') {

          const bitsEarned = 150;
          

          const caseChance = Math.random();
          const keyChance = Math.random();
          let rewardText = '';
          
          await addBits(pony.user_id, bitsEarned);
          

          try {
            const { addQuestProgress } = await import('../../utils/questUtils.js');
            await addQuestProgress(pony.user_id, 'earn_bits', bitsEarned);
          } catch (questError) {
            console.debug('Quest progress error:', questError.message);
          }
          
          if (caseChance <= 0.10) {
            await addCases(pony.user_id, 1);
            rewardText += '\n<:case:1417301084291993712> You got a case!';
          }
          
          if (keyChance <= 0.03) {
            await addResource(pony.user_id, 'keys', 1);
            rewardText += '\n<a:goldkey:1426332679103709314> You found a key!';
          }
          
          const ventureMessages = [
            'You decided to continue your adventure on your own.',
            'You politely excused yourself and continued exploring.',
            'You waved goodbye and went on your way to discover more of Equestria.',
            'You smiled and continued your journey through town.'
          ];
          const randomMessage = ventureMessages[Math.floor(Math.random() * ventureMessages.length)];
          
          const headerText = new TextDisplayBuilder()
            .setContent(`**${await t('venture.adventure_continues', guildId)}**\n-# ${randomMessage}`);

          const descText = new TextDisplayBuilder()
            .setContent(`You found <:bits:1411354539935666197> **${bitsEarned} bits**!${rewardText}`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(headerText)
            .addTextDisplayComponents(descText);

          await i.update({ 
            flags: MessageFlags.IsComponentsV2,
            components: [container]
          });
          

          collector.stop('ignored');
          return;
        }
        
        if (i.customId === 'befriend') {

          const modal = new ModalBuilder()
            .setCustomId(`guess_pony_${randomPony.id}`)
            .setTitle('Guess the Pony Name!');

          const nameInput = new TextInputBuilder()
            .setCustomId('pony_name')
            .setLabel(await t('venture.enter_name', guildId))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., Twilight Sparkle or twilight sparkle')
            .setRequired(true)
            .setMaxLength(50);

          const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
          modal.addComponents(firstActionRow);

          await i.showModal(modal);
          

          if (!modalCollector) {
            modalCollector = i.awaitModalSubmit({
              filter: (modalSubmit) => modalSubmit.customId === `guess_pony_${randomPony.id}` && modalSubmit.user.id === interaction.user.id,
              time: TIMEOUT_DURATION
            });
            
            modalCollector.then(async (modalSubmit) => {
              const guessedName = modalSubmit.fields.getTextInputValue('pony_name').toLowerCase().trim();
              

              let correctName = randomPony.name.toLowerCase().trim();
              

              let isCorrect = guessedName === correctName;
              
              if (isCorrect) {

                const duplicateMultiplier = await getPonyDuplicateMultiplier(pony.user_id);
                

                const newFriend = await addFriend(pony.user_id, randomPony.id);
                

                if (duplicateMultiplier > 1 && newFriend) {
                  for (let i = 1; i < duplicateMultiplier; i++) {
                    await addFriend(pony.user_id, randomPony.id);
                  }
                }
                

                try {
                  const { addQuestProgress } = await import('../../utils/questUtils.js');
                  if (newFriend && newFriend.isNew) {
                    await addQuestProgress(pony.user_id, 'get_ponies');
                  }
                  await addQuestProgress(pony.user_id, 'earn_bits', bitsReward);
                } catch (questError) {
                  console.debug('Quest progress error:', questError.message);
                }
                

                const bitsReward = Math.floor(Math.random() * 51) + 50;
                await addBits(pony.user_id, bitsReward);
                

                const caseChance = Math.random();
                const keyChance = Math.random();
                let resourceText = '';
                
                if (caseChance <= 0.10) {
                  await addCases(pony.user_id, 1);
                  resourceText += '\n> <:case:1417301084291993712> You got a case!';
                }
                
                if (keyChance <= 0.03) {
                  await addResource(pony.user_id, 'keys', 1);
                  resourceText += '\n> <a:goldkey:1426332679103709314> You found a key!';
                }
                
                let bingoText = '';
                try {
                  const bingoUpdate = await checkBingoUpdate(pony.user_id, randomPony.name);
                  if (bingoUpdate) {
                    if (bingoUpdate.isWin && bingoUpdate.reward) {
                      bingoText = `\n> **BINGO!** You completed 2 different line types! Rewards: ${bingoUpdate.reward.keys} keys, ${bingoUpdate.reward.bits} bits, ${bingoUpdate.reward.cases} cases`;
                      if (bingoUpdate.reward.diamonds > 0) {
                        bingoText += `, ${bingoUpdate.reward.diamonds} diamonds`;
                      }
                    } else if (bingoUpdate.isWin) {
                      bingoText = '\n> **BINGO!** You completed 2 different line types!';
                    } else {
                      const progress = bingoUpdate.lineTypes.needsMore 
                        ? `(need ${2 - bingoUpdate.lineTypes.count} more line type${2 - bingoUpdate.lineTypes.count > 1 ? 's' : ''})`
                        : '(need different line type)';
                      bingoText = `\n> **Bingo!** ${randomPony.name} crossed off! ${progress}`;
                    }
                  }
                } catch (bingoError) {
                  console.error('Error checking bingo update in venture:', bingoError);
                }

                let displayName = randomPony.name;
                

                let duplicateText = '';
                let titleText = getSuccessTitle(randomPony.rarity, newFriend && !newFriend.isNew, randomPony.background);
                let friendText = '';
                
                if (newFriend && newFriend.isNew) {
                  friendText = `${displayName} has been added to your friends list!\nUse \`/myponies\` to view your ponies.`;
                } else {
                  friendText = `You already have ${displayName} in your collection!`;
                }
                
                if (!modalSubmit.replied && !modalSubmit.deferred) {
                  const description = randomPony.description || await t('venture.default_description', guildId);
                  const bellActionRow = await getBellOnlyActionRow(interaction.user.id);
                  
                  const headerText = new TextDisplayBuilder()
                    .setContent(`**${titleText}**\n-# ${await t('venture.correct_answer', guildId, {
                      name: displayName,
                      description: description,
                      rarity: RARITY_EMOJIS[randomPony.rarity],
                      bits_reward: bitsReward,
                      resource_text: resourceText + bingoText,
                      duplicate_text: duplicateText,
                      faction_points_text: '',
                      friend_text: friendText
                    })}`);

                  const container = new ContainerBuilder()
                    .addTextDisplayComponents(headerText);

                  const bellSection = new SectionBuilder()
                    .addTextDisplayComponents(
                      new TextDisplayBuilder().setContent('**🔔 Notifications**'),
                      new TextDisplayBuilder().setContent('Get reminded when your venture cooldown ends')
                    )
                    .setButtonAccessory(bellActionRow.components[0]);

                  const updateOptions = {
                    flags: MessageFlags.IsComponentsV2,
                    components: [container, bellSection]
                  };
                  

                  if (ponyWithBackground) {
                    updateOptions.files = [ponyWithBackground];
                  }
                  
                  await modalSubmit.update(updateOptions);
                }
              } else {

                
                if (!modalSubmit.replied && !modalSubmit.deferred) {
                  const bellActionRow = await getBellOnlyActionRow(interaction.user.id);
                  

                  let displayName = randomPony.name;
                  
                  const wrongHeader = new TextDisplayBuilder()
                    .setContent(`**${getWrongTitle(randomPony.rarity, randomPony.background)}**\n-# Sorry, that's not correct.`);

                  const wrongDesc = new TextDisplayBuilder()
                    .setContent(`The pony was **${displayName}**.\n\nBetter luck next time!`);

                  const wrongContainer = new ContainerBuilder()
                    .addTextDisplayComponents(wrongHeader)
                    .addTextDisplayComponents(wrongDesc);

                  const bellSection = new SectionBuilder()
                    .addTextDisplayComponents(
                      new TextDisplayBuilder().setContent('**🔔 Notifications**'),
                      new TextDisplayBuilder().setContent('Get reminded when your venture cooldown ends')
                    )
                    .setButtonAccessory(bellActionRow.components[0]);

                  const updateOptions = {
                    flags: MessageFlags.IsComponentsV2,
                    components: [wrongContainer, bellSection]
                  };
                  

                  if (ponyWithBackground) {
                    updateOptions.files = [ponyWithBackground];
                  }
                  
                  await modalSubmit.update(updateOptions);
                }
              }
              collector.stop();
            }).catch(async (error) => {
              console.error('Modal submission error:', error);
              if (error.code === 'InteractionCollectorError') {

                return;
              }
            });
          }
          
          return;
        }
      });
      
      collector.on('end', async (collected, reason) => {
        try {

          if (reason === 'time') {

            
            const headerText = new TextDisplayBuilder()
              .setContent(`**Too Late!** ${RARITY_EMOJIS[randomPony.rarity]}\n-# You took too long to respond (2 minutes) and the mysterious pony walked away.`);
            
            const container = new ContainerBuilder()
              .addTextDisplayComponents(headerText);

            const notificationEnabled = await isNotificationEnabled(interaction.user.id);
            const bellButton = new ButtonBuilder()
              .setCustomId(`toggle_notification_${interaction.user.id}`)
              .setLabel('Remind me')
              .setEmoji('🔔')
              .setStyle(notificationEnabled ? ButtonStyle.Success : ButtonStyle.Secondary);

            const bellSection = new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**🔔 Notifications**'),
                new TextDisplayBuilder().setContent('Get reminded when your venture cooldown ends')
              )
              .setButtonAccessory(bellButton);

            container.addSectionComponents(bellSection);

            const updateOptions = { 
              flags: MessageFlags.IsComponentsV2,
              components: [container]
            };

            if (ponyWithBackground) {
              updateOptions.files = [ponyWithBackground];
            }

            await interaction.editReply(updateOptions).catch(err => {
              console.error('[handlePonyEncounter] Failed to edit reply on timeout:', err);
            });
          } else {

            console.log(`[handlePonyEncounter] Collector stopped with reason: ${reason}`);
          }
        } catch (error) {
          console.error('[handlePonyEncounter] Error in collector end handler:', error);
        }
      });
      
    } catch (error) {
      console.error('Error in pony encounter:', error);

    }
    
  } catch (error) {
    console.error('Error handling pony encounter:', error);

  }
}


async function handleNotificationToggle(interaction, userId, guildId) {
  try {

    if (interaction.user.id !== userId) {
      try {
        if (!interaction.replied && !interaction.deferred) {
          const accessDeniedText = new TextDisplayBuilder()
            .setContent('You can only manage your own notification settings.');
          
          const accessDeniedContainer = new ContainerBuilder()
            .addTextDisplayComponents(accessDeniedText);
          
          await interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [accessDeniedContainer]
          });
        }
      } catch (error) {
        console.log('Could not respond to interaction - it may have expired');
      }
      return;
    }
    
    const isCurrentlyEnabled = await isNotificationEnabled(userId);
    
    if (isCurrentlyEnabled) {
      await disableNotification(userId);
      

      await updateBellButtonOnly(interaction, userId);
      

      try {
        await interaction.followUp({
          components: [createNotificationDisabledComponents()],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.log('Could not send followUp - interaction may have expired');
      }
    } else {

      const user = await interaction.client.users.fetch(userId);
      const canSend = await canSendDM(user);
      if (!canSend) {
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              components: [createDMsClosedComponents()],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
            });
          }
        } catch (error) {
          console.log('Could not respond to interaction - it may have expired');
        }
        return;
      }
      
      await enableNotification(userId);
      

      await updateBellButtonOnly(interaction, userId);
      

      try {
        await interaction.followUp({
          components: [createNotificationEnabledComponents()],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      } catch (error) {
        console.log('Could not send followUp - interaction may have expired');
      }
    }
  } catch (error) {
    console.error('Error in handleNotificationToggle:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while changing notification settings.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.log('Could not send error message - interaction may have expired');
    }
  }
}


async function updateBellButtonOnly(interaction, userId) {
  try {
    const currentComponents = interaction.message.components;
    if (!currentComponents || currentComponents.length === 0) return;
    
    const actionRow = currentComponents[0];
    if (!actionRow || !actionRow.components) return;
    

    const notificationEnabled = await isNotificationEnabled(userId);
    

    const newActionRow = new ActionRowBuilder();
    
    let unknownButtonIndex = 0;
    for (const component of actionRow.components) {
      if (component.customId === `toggle_notification_${userId}`) {

        const bellButton = new ButtonBuilder()
          .setCustomId(`toggle_notification_${userId}`)
          .setLabel('Remind me')
          .setEmoji('🔔')
          .setStyle(notificationEnabled ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(false);
        newActionRow.addComponents(bellButton);
      } else {
        if (!component.customId || !component.label) {
          continue;
        }

        const button = new ButtonBuilder()
          .setCustomId(component.customId)
          .setLabel(component.label)
          .setStyle(component.style || ButtonStyle.Secondary)
          .setDisabled(component.disabled || false);
        
        if (component.emoji) {
          button.setEmoji(component.emoji);
        }
        
        newActionRow.addComponents(button);
      }
    }
    
    if (newActionRow.components.length > 0) {
      await interaction.update({
        components: [newActionRow]
      });
    } else {
      await interaction.deferUpdate();
    }
  } catch (error) {
    console.error('Error updating bell button:', error);

    if (!interaction.replied) {
      await interaction.deferUpdate();
    }
  }
}

export async function handleModal(interaction) {
  try {
    if (!interaction.customId.startsWith('guess_pony_')) return;
    

    await interaction.deferReply();
    
    const ponyId = parseInt(interaction.customId.split('_')[2]);
    const guessedName = interaction.fields.getTextInputValue('pony_name').trim();
    

    const ponyData = await getRow('SELECT * FROM pony_friends WHERE id = ?', [ponyId]);
    
    if (!ponyData) {
      return interaction.editReply({
        content: 'Error: Pony not found!',
        flags: MessageFlags.Ephemeral
      });
    }
    

    if (ponyData.image) {
      ponyData.image = getImageUrl(ponyData.image);
    }
    

    let correctName = ponyData.name;
    
    const userGuess = guessedName.toLowerCase();
    const correctGuess = correctName.toLowerCase();
    

    let isCorrect = correctGuess === userGuess;
    
    const userId = interaction.user.id;
    const pony = await getPony(userId);
    
    if (isCorrect) {

      const duplicateMultiplier = await getPonyDuplicateMultiplier(pony.user_id);
      

      const friendResult = await addFriend(pony.user_id, ponyId);
      

      if (duplicateMultiplier > 1 && friendResult.success) {
        for (let i = 1; i < duplicateMultiplier; i++) {
          await addFriend(pony.user_id, ponyId);
        }
      }
      
      if (!friendResult.success) {
        console.error(`[handlePonyEncounter] Failed to add friend: ${friendResult.error}`);
        const errorText = new TextDisplayBuilder()
          .setContent(`**❌ Error Adding Friend**\n-# There was an error adding ${ponyData.name} to your friends list. Please try again later.`);

        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorText);

        await interaction.editReply({ 
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [errorContainer]
        });
        return;
      }
      

      try {
        const { addQuestProgress } = await import('../../utils/questUtils.js');
        if (friendResult.isNew) {
          await addQuestProgress(pony.user_id, 'get_ponies');
        }
        await addQuestProgress(pony.user_id, 'earn_bits', bitsReward);
      } catch (questError) {
        console.debug('Quest progress error:', questError.message);
      }
      

      const bitsReward = Math.floor(Math.random() * 51) + 50;
      await addBits(pony.user_id, bitsReward);
      

      const caseChance = Math.random();
      const keyChance = Math.random();
      let resourceText = '';
      
      if (caseChance <= 0.10) {
        await addCases(pony.user_id, 1);
        resourceText += '\n<:case:1417301084291993712> You got a case!';
      }
      
      if (keyChance <= 0.03) {
        await addResource(pony.user_id, 'keys', 1);
        resourceText += '\n<a:goldkey:1426332679103709314> You found a key!';
      }
      
      let duplicateText = '';
      if (friendResult && !friendResult.isNew) {
        duplicateText = `\n\n🔄 You already have this pony in your collection!`;
      }
      

      let factionPointsText = '';
      if (ponyData.rarity === 'EVENT') {
        factionPointsText = `\n\n⚔️ **+15 Faction Points** earned for your faction!`;
      }
      
      const headerText = new TextDisplayBuilder()
        .setContent(`**${getSuccessTitle(ponyData.rarity, false, ponyData.background)}**\n-# Excellent! You correctly identified **${ponyData.name}**!`);

      const descText = new TextDisplayBuilder()
        .setContent(`*${ponyData.description}*\n\n**Rarity:** ${RARITY_EMOJIS[ponyData.rarity]}\n**+${bitsReward} bits**${resourceText}${duplicateText}${factionPointsText}\n${ponyData.name} has been added to your friends list!`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(headerText)
        .addTextDisplayComponents(descText);

      if (ponyData.image) {
      }

      await interaction.message.edit({ flags: MessageFlags.IsComponentsV2, components: [container] }).catch(err => console.error('Failed to edit message with result container:', err));
      await interaction.deleteReply();
      return;
    } else {


    
      const wrongHeader = new TextDisplayBuilder()
        .setContent(`**${getWrongTitle(ponyData.rarity, ponyData.background)}**\n-# Sorry, that's not correct!`);

      const wrongDesc = new TextDisplayBuilder()
        .setContent(`You guessed "${guessedName}" but this was **${ponyData.name}**.\n\n*${ponyData.description}*\n\nBetter luck next time!`);

      const wrongContainer = new ContainerBuilder()
        .addTextDisplayComponents(wrongHeader)
        .addTextDisplayComponents(wrongDesc);

      await interaction.message.edit({ flags: MessageFlags.IsComponentsV2, components: [wrongContainer] }).catch(err => console.error('Failed to edit message with wrong-guess container:', err));
      await interaction.deleteReply();
    }
  } catch (error) {
    console.error('Error handling pony guess modal:', error);

    if (interaction.deferred && !interaction.replied) {
      try {
        await interaction.editReply({
          content: 'An error occurred while processing your guess. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    } else if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'An error occurred while processing your guess. Please try again.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  }
}

async function handleRegularVenture(interaction, pony) {
  try {

    

    const bitsEarned = 150;
    

    const caseChance = Math.random();
    const keyChance = Math.random();
    let rewardText = '';
    
    await addBits(pony.user_id, bitsEarned);
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(pony.user_id, 'earn_bits', bitsEarned);
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    if (caseChance <= 0.10) {
      await addCases(pony.user_id, 1);
      rewardText += '\n<:case:1417301084291993712> You got a case!';
    }
    
    if (keyChance <= 0.03) {
      await addResource(pony.user_id, 'keys', 1);
      rewardText += '\n<a:goldkey:1426332679103709314> You found a key!';
    }
    
    const ventureMessages = [
      'You explored the orchards of Sweet Apple Acres and found some treasures.',
      'You wandered through Carousel Boutique and helped Rarity with her designs.',
      'You joined Rainbow Dash for a quick flight over the countryside.',
      'You visited Sugarcube Corner and sampled some of Pinkie Pie\'s new treats.',
      'You spent time at Fluttershy\'s cottage helping with her animal friends.',
      'You discovered an interesting book at the local library.',
      'You explored the outskirts of town and found useful materials.',
      'You helped Derpy Hooves navigate her mail delivery route.',
      'You visited the local schoolhouse during recess.',
      'You browsed the local shops and stalls.',
      'You went on a scenic walk around Sweet Apple Acres.',
      'You joined one of Pinkie Pie\'s impromptu street performances.',
      'You observed Twilight Sparkle\'s magical experiments from a safe distance.',
      'You took a peaceful stroll through the park.',
      'You chatted with Big Mac while he was delivering apples.',
      'You followed the Cutie Mark Crusaders on one of their adventures.',
      'You ventured to the edge of the Everfree Forest with Zecora.',
      'You attended a town meeting led by Mayor Mare.',
      'You listened to Granny Smith\'s stories about the old days.',
      'You watched the Wonderbolts practice their aerial maneuvers.',
      'You helped Spike sort through Twilight\'s scrolls.',
      'You explored the setup for the upcoming fair.',
      'You sat in on one of Cheerilee\'s fascinating lessons.',
      'You observed the weather team creating a scheduled rain shower.',
      'You sampled candies at Bon Bon and Lyra\'s sweet shop.',
      'You toured the local hospital with Nurse Redheart.',
      'You attended Octavia\'s street performance in the town square.',
      'You danced to Vinyl Scratch\'s beats at her outdoor setup.',
      'You admired Roseluck\'s beautiful flower arrangements.',
      'You relaxed briefly at the Ponyville Spa.',
      'You chatted with Aloe and Lotus about their spa techniques.',
      'You followed the mail route through Ponyville.',
      'You observed Doctor Hooves testing his latest invention.',
      'You watched the trains arrive at Ponyville Station.',
      'You sampled some of the Cakes\' experimental cupcake flavors.',
      'You participated in a Ponyville emergency drill.',
      'You joined a neighborhood watch patrol.',
      'You explored the exhibits at the Ponyville Museum.',
      'You watched a rehearsal at the Ponyville Theater.',
      'You admired new artwork at the Ponyville Art Gallery.',
      'You listened to the Ponyville Orchestra\'s practice session.'
    ];
    const randomMessage = ventureMessages[Math.floor(Math.random() * ventureMessages.length)];
    
    const headerText = new TextDisplayBuilder()
      .setContent('**🗺️ Adventure Complete!**\n-# Your venture concluded successfully');

    const descText = new TextDisplayBuilder()
      .setContent(`${randomMessage}\n\nYou found <:bits:1411354539935666197> **${bitsEarned} bits**!${rewardText}`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(headerText)
      .addTextDisplayComponents(descText);

    return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    
  } catch (error) {
    console.error('Error handling regular venture:', error);

  }
}


export async function handleNotificationButton(interaction) {
  if (interaction.customId.startsWith('toggle_notification_')) {
    const userId = interaction.customId.split('_')[2];
    

    if (interaction.user.id !== userId) {
      try {
        const accessDeniedText = new TextDisplayBuilder()
          .setContent('You can only toggle your own notification settings!');
        
        const accessDeniedContainer = new ContainerBuilder()
          .addTextDisplayComponents(accessDeniedText);

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [accessDeniedContainer]
          });
        } else {

          await interaction.followUp({ 
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [accessDeniedContainer]
          });
        }
      } catch (error) {

        console.log('Could not respond to interaction - it may have expired');
      }
      return true;
    }
    
    await handleNotificationToggle(interaction, userId, userId === '1372601851781972038' ? null : interaction.guild?.id);
    return true;
  }
  return false;
}


async function getModifiedRarityChances(userId) {
  const baseChances = { ...RARITY_CHANCES };
  

  const { getRebirthBonuses } = await import('./rebirth.js');
  const rebirthBonuses = await getRebirthBonuses(userId);
  

  if (rebirthBonuses.ventureBonus > 0) {
    const bonusMultiplier = 1 + (rebirthBonuses.ventureBonus / 100);
    

    baseChances.BASIC *= (2 - bonusMultiplier);
    baseChances.RARE *= bonusMultiplier;
    baseChances.EPIC *= bonusMultiplier;
    baseChances.MYTHIC *= bonusMultiplier;
    baseChances.LEGEND *= bonusMultiplier;
    baseChances.SECRET *= bonusMultiplier;
    baseChances.CUSTOM *= bonusMultiplier;
  }
  

  const hasLuckPotion = await hasActivePotion(userId, 'luck');
  const hasDiscoveryPotion = await hasActivePotion(userId, 'discovery');
  const hasNightmarePotion = await hasActivePotion(userId, 'nightmare');
  
  if (hasDiscoveryPotion) {


    baseChances.BASIC *= 0.6;
    baseChances.EPIC *= 1.15;
    baseChances.MYTHIC *= 1.1;
    baseChances.LEGEND *= 1.1;
    baseChances.SECRET *= 1.1;
    baseChances.CUSTOM *= 1.1;
  }
  
  if (hasNightmarePotion) {

    baseChances.EVENT *= 1.3;
  }
  

  const totalChance = Object.values(baseChances).reduce((sum, chance) => sum + chance, 0);
  for (const rarity in baseChances) {
    baseChances[rarity] /= totalChance;
  }
  
  return baseChances;
}


async function getModifiedCaseChance(userId) {
  let baseChance = 0.05;
  
  const hasLuckPotion = await hasActivePotion(userId, 'luck');
  if (hasLuckPotion) {
    baseChance *= 1.1;
  }
  
  return baseChance;
}


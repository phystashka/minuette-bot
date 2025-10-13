import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
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
import { t } from '../../utils/localization.js';
import { hasActivePotion } from '../../models/ResourceModel.js';
import { getUserRebirth, getPonyDuplicateMultiplier, canGetNewPony } from './rebirth.js';


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
  EXCLUSIVE: '<:E1:1425524316858224822><:X2:1425524310570696815><:C3:1425524308997963857><:L4:1425524306833834185><:U5:1425524304845475840><:S6:1425524303470002319><:I7:1425524323002876015><:V8:1425524320985153586><:E9:1425524318732812461>'
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
  EXCLUSIVE: 0xFF69B4
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
  BASIC: 0.80,
  RARE: 0.15,
  EPIC: 0.02,
  MYTHIC: 0.006,
  LEGEND: 0.003,
  CUSTOM: 0.002,
  SECRET: 0.0015,
  EVENT: 0.0005
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
    await sendDMWithDelete(user, {
      embeds: [createEmbed({
        title: '🔔 Venture Ready!',
        description: 'Your venture cooldown has expired! You can now use `/venture` again.',
        user: user,
        footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
      })]
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
  .setName('venture')
  .setDescription('Venture through Equestria for adventures, encounters, and rewards')
  .setDescriptionLocalizations({
    'ru': 'Отправьтесь в приключение по Понивиллю за наградами и встречами'
  })
  .setDMPermission(false);

  export async function execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild?.id;
      const pony = await getPony(userId);
      

      if (!pony) {
        return interaction.reply({
          embeds: [
            createEmbed({
              title: 'No Pony Found',
              description: 'You need to have a pony to go on ventures!\n\nUse `/pony create` to create your first pony.',
              user: interaction.user,
              thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
              footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
            })
          ],
          ephemeral: true
        });
      }
      

      if (userCooldowns.has(userId)) {
        const cooldownExpiration = userCooldowns.get(userId);
        const timeLeft = cooldownExpiration - Date.now();
        
        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          
          return interaction.reply({
            embeds: [
              createEmbed({
                title: await t('venture.cooldown_title', guildId),
                description: await t('venture.cooldown_message', guildId, { minutes, seconds }),
                user: interaction.user,
                thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
                footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
              })
            ],
            ephemeral: true
          });
        }
      }
      

      const slotCheck = await canGetNewPony(userId);
      if (!slotCheck.canGet) {
        return interaction.reply({
          embeds: [createEmbed({
            title: '🏠 Stable Full',
            description: slotCheck.message,
            user: interaction.user,
            color: 0xe74c3c
          })],
          ephemeral: true
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
    const guildId = interaction.guild?.id;
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
    

    console.log(`[VENTURE] ${randomPony.rarity} pony "${randomPony.name}" encountered on ${interaction.guild?.name} (${interaction.guild?.id})`);
    

    if (randomPony.image) {
      const originalUrl = randomPony.image;
      randomPony.image = fixImageUrl(randomPony.image);
      if (originalUrl !== randomPony.image) {
        console.log(`[handlePonyEncounter] Fixed image URL: ${originalUrl} -> ${randomPony.image}`);
      }
    }
    

    const hintState = new Map();

    let ponyName = randomPony.name;
    
    const revealed = [];
    hintState.set(interaction.user.id, revealed);
    

    const masked = getMaskedName(ponyName, revealed);
    

    let ponyWithBackground;
    try {
      ponyWithBackground = await createVenturePonyImage(randomPony);
    } catch (error) {
      console.error('Error creating pony with background:', error);

      ponyWithBackground = null;
    }
    

    const embedColor = RARITY_COLORS[randomPony.rarity];
    

    let title = await getRandomTitle(randomPony.rarity, guildId, randomPony.background, randomPony.is_unique);
    
    const encounterEmbed = createEmbed({
      title: title,
      description: await t('venture.encountered_pony', guildId, { 
        unique: randomPony.is_unique ? await t('venture.unique', guildId) : '',
        rarity: RARITY_EMOJIS[randomPony.rarity],
        name: masked
      }),
      image: ponyWithBackground ? `attachment://${ponyWithBackground.name}` : randomPony.image,
      color: embedColor,
      user: interaction.user,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      footer: { text: 'Support the bot! Use /vote to get free diamonds and keys!' }
    });
    
    let hintUsed = false;
    let superHintUsed = false;
    const actionRow = await getActionRow(guildId, interaction.user.id);
    

    const replyOptions = {
      embeds: [encounterEmbed],
      components: [actionRow]
    };
    

    if (ponyWithBackground) {
      replyOptions.files = [ponyWithBackground];
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
          return i.reply({ 
            content: await t('venture.not_for_you', guildId), 
            ephemeral: true 
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
          const newEmbed = createEmbed({
            title: await getRandomTitle(randomPony.rarity, guildId, randomPony.background, randomPony.is_unique),
            description: await t('venture.encountered_pony', guildId, { 
              unique: randomPony.is_unique ? await t('venture.unique', guildId) : '',
              rarity: RARITY_EMOJIS[randomPony.rarity],
              name: newMasked
            }),
            image: ponyWithBackground ? `attachment://${ponyWithBackground.name}` : randomPony.image,
            user: interaction.user,
            thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
            footer: { text: 'Support the bot! Use /vote to get free diamonds and keys!' }
          });
          const newActionRow = await getActionRow(guildId, interaction.user.id, { hint: true, showBell: true });
          
          const updateOptions = {
            embeds: [newEmbed],
            components: [newActionRow]
          };
          

          if (ponyWithBackground) {
            updateOptions.files = [ponyWithBackground];
          }
          
          await i.update(updateOptions);
          return;
        }

        if (i.customId === 'super_hint') {

          const currentPony = await getPony(interaction.user.id);
          if (currentPony.bits < 750) {
            return i.reply({
              embeds: [createEmbed({
                title: await t('venture.not_enough_bits', guildId),
                description: await t('venture.super_hint_cost', guildId, { bits: currentPony.bits }),
                user: interaction.user,
                thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
                footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
              })],
              ephemeral: true
            });
          }


          await query('UPDATE ponies SET bits = bits - 750 WHERE user_id = ?', [interaction.user.id]);
          
          superHintUsed = true;
          

          const nameArr = ponyName.split('');
          const revealed = nameArr.map((ch, idx) => ch !== ' ' ? idx : null).filter(idx => idx !== null);
          hintState.set(i.user.id, revealed);
          

          const newEmbed = createEmbed({
            title: await getRandomTitle(randomPony.rarity, guildId, randomPony.background, randomPony.is_unique),
            description: await t('venture.encountered_pony', guildId, { 
              unique: randomPony.is_unique ? await t('venture.unique', guildId) : '',
              rarity: RARITY_EMOJIS[randomPony.rarity],
              name: `${ponyName} ✨`
            }),
            image: ponyWithBackground ? `attachment://${ponyWithBackground.name}` : randomPony.image,
            user: interaction.user,
            thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
            footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
          });
          

          const newActionRow = await getActionRow(guildId, interaction.user.id, { hint: true, superHint: true, showBell: true });
          
          const updateOptions = {
            embeds: [newEmbed],
            components: [newActionRow]
          };
          

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
          
          const ventureEmbed = createEmbed({
            title: await t('venture.adventure_continues', guildId),
            description: `${randomMessage}\n\nYou found <:bits:1411354539935666197> **${bitsEarned} bits**!${rewardText}`,
            user: interaction.user,
            thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
            footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
          });
          
          const disabledRow = await getActionRow(guildId, interaction.user.id, { befriend: true, ignore: true, hint: true, superHint: true, showBell: false });
          await i.update({ 
            embeds: [ventureEmbed], 
            components: [],
            files: []
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
                  
                  const updateOptions = {
                    embeds: [createEmbed({
                      title: titleText,
                      description: await t('venture.correct_answer', guildId, {
                        name: displayName,
                        description: description,
                        rarity: RARITY_EMOJIS[randomPony.rarity],
                        bits_reward: bitsReward,
                        resource_text: resourceText,
                        duplicate_text: duplicateText,
                        faction_points_text: '',
                        friend_text: friendText
                      }),
                      image: ponyWithBackground ? `attachment://${ponyWithBackground.name}` : randomPony.image,
                      user: interaction.user,
                      thumbnail: interaction.user.displayAvatarURL({ dynamic: true })
                    })],
                    components: [bellActionRow]
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
                  
                  const updateOptions = {
                    embeds: [createEmbed({
                      title: getWrongTitle(randomPony.rarity, randomPony.background),
                      description: `> Sorry, that's not correct. The pony was **${displayName}**.\n\n> **Rarity:** ${RARITY_EMOJIS[randomPony.rarity]}\n\n> Better luck next time!`,
                      image: ponyWithBackground ? `attachment://${ponyWithBackground.name}` : randomPony.image,
                      user: interaction.user,
                      thumbnail: interaction.user.displayAvatarURL({ dynamic: true })
                    })],
                    components: [bellActionRow]
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

            
            const timeoutEmbed = createEmbed({
              title: `Too Late!`,
              description: `> You took too long to respond (2 minutes) and the mysterious pony walked away.\n\n> **Rarity:** ${RARITY_EMOJIS[randomPony.rarity]}`,
              image: ponyWithBackground ? `attachment://${ponyWithBackground.name}` : randomPony.image,
              user: interaction.user,
              thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
              footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
            });
            
            const bellActionRow = await getBellOnlyActionRow(interaction.user.id);
            
            const updateOptions = { 
              embeds: [timeoutEmbed], 
              components: [bellActionRow] 
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
          await interaction.reply({
            content: '❌ You can only manage your own notification settings.',
            ephemeral: true
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
          content: '🔔 Notifications disabled. You will no longer receive DM reminders when cooldown expires.',
          ephemeral: true
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
              content: '❌ Cannot enable notifications - your DMs are closed. Please open DMs and try again.',
              ephemeral: true
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
          content: '🔔 Notifications enabled! You will receive a DM when the cooldown expires.',
          ephemeral: true
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
          ephemeral: true
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

        const button = new ButtonBuilder()
          .setCustomId(component.customId)
          .setLabel(component.label)
          .setStyle(component.style)
          .setDisabled(component.disabled);
        
        if (component.emoji) {
          button.setEmoji(component.emoji);
        }
        
        newActionRow.addComponents(button);
      }
    }
    
    await interaction.update({
      components: [newActionRow]
    });
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
        flags: [InteractionResponseFlags.Ephemeral]
      });
    }
    

    if (ponyData.image) {
      ponyData.image = fixImageUrl(ponyData.image);
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
        const errorEmbed = createEmbed({
          title: '❌ Error Adding Friend',
          description: `There was an error adding ${ponyData.name} to your friends list. Please try again later.`,
          image: ponyData.image,
          user: interaction.user,
          thumbnail: interaction.user.displayAvatarURL({ dynamic: true })
        });
        await interaction.editReply({ 
          embeds: [errorEmbed],
          ephemeral: true
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
      
      const resultEmbed = createEmbed({
        title: getSuccessTitle(ponyData.rarity, false, ponyData.background),
        description: `> Excellent! You correctly identified **${ponyData.name}**!\n\n> *${ponyData.description}*\n\n> **Rarity:** ${RARITY_EMOJIS[ponyData.rarity]}\n> **+${bitsReward} bits**${resourceText}${duplicateText}${factionPointsText}\n${ponyData.name} has been added to your friends list!`,
        image: ponyData.image,
        user: interaction.user,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
        footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
      });
      await interaction.message.edit({ embeds: [resultEmbed], components: [] });
      await interaction.deleteReply();
      return;
    } else {


    
      const wrongGuessEmbed = createEmbed({
      title: getWrongTitle(ponyData.rarity, ponyData.background),
      description: `> Sorry, that's not correct! You guessed "${guessedName}" but this was **${ponyData.name}**.\n\n> *${ponyData.description}*\n\n> **Rarity:** ${RARITY_EMOJIS[ponyData.rarity]}\n\n> Better luck next time!`,
      image: ponyData.image,
      user: interaction.user,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
    });
    
      await interaction.message.edit({ embeds: [wrongGuessEmbed], components: [] });
      await interaction.deleteReply();
    }
  } catch (error) {
    console.error('Error handling pony guess modal:', error);

    if (interaction.deferred && !interaction.replied) {
      try {
        await interaction.editReply({
          content: 'An error occurred while processing your guess. Please try again.',
          ephemeral: true
        });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    } else if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'An error occurred while processing your guess. Please try again.',
          ephemeral: true
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
    
    const ventureEmbed = createEmbed({
      title: '🗺️ Adventure Complete!',
      description: `${randomMessage}\n\nYou found <:bits:1411354539935666197> **${bitsEarned} bits**!${rewardText}`,
      user: interaction.user,
      thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      footer: { text: "Support the bot! Use /vote to get free diamonds and keys!" }
    });
    
    return interaction.editReply({
      embeds: [ventureEmbed]
    });
    
  } catch (error) {
    console.error('Error handling regular venture:', error);

  }
}


export async function handleNotificationButton(interaction) {
  if (interaction.customId.startsWith('toggle_notification_')) {
    const userId = interaction.customId.split('_')[2];
    

    if (interaction.user.id !== userId) {
      try {

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ 
            content: "You can only toggle your own notification settings!", 
            ephemeral: true 
          });
        } else {

          await interaction.followUp({ 
            content: "You can only toggle your own notification settings!", 
            ephemeral: true 
          });
        }
      } catch (error) {

        console.log('Could not respond to interaction - it may have expired');
      }
      return true;
    }
    
    await handleNotificationToggle(interaction, userId, interaction.guild?.id);
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


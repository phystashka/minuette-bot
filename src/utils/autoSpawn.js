import { 
  AttachmentBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} from 'discord.js';
import { createEmbed } from './components.js';
import * as SpawnChannelModel from '../models/SpawnChannelModel.js';
import { getAllActiveSpawnChannels, resetChannelAfterSpawn } from '../models/SpawnChannelModel.js';
import { getPonyFriendsByRarity, addFriend } from '../models/FriendshipModel.js';
import { createVenturePonyImage } from './backgroundRenderer.js';
import { t } from './localization.js';
import fs from 'fs';
import { addBits, getPony } from '../utils/pony/index.js';
import { addCases, addResource } from '../models/ResourceModel.js';
import { addHarmony } from '../models/HarmonyModel.js';
import { getImageInfo } from './imageResolver.js';

function processPonyImage(pony) {
  const imageInfo = getImageInfo(pony.image);
  if (imageInfo && imageInfo.type === 'attachment') {
    pony.originalImagePath = pony.image;
    pony.imageType = 'file';
    pony.imageFilePath = imageInfo.attachmentPath;
    pony.imageFileName = imageInfo.filename;
  } else if (imageInfo && imageInfo.type === 'url') {
    pony.imageType = 'url';
  } else {
    pony.imageType = 'none';
  }
  return pony;
}

function getImageAttachment(imagePath) {
  const imageInfo = getImageInfo(imagePath);
  if (imageInfo && imageInfo.type === 'attachment') {
    try {
      const stats = fs.statSync(imageInfo.attachmentPath);
      
      const maxSize = 25 * 1024 * 1024;
      
      if (stats.size > maxSize) {
        console.warn(`❌ Image file too large: ${stats.size} bytes (max: ${maxSize}). Path: ${imageInfo.attachmentPath}`);
        return null;
      }
      
      return {
        path: imageInfo.attachmentPath,
        filename: imageInfo.filename
      };
    } catch (error) {
      console.error(`❌ Error accessing image file: ${imageInfo.attachmentPath}`, error);
      return null;
    }
  }
  return null;
}

function getMaskedName(name, revealed = []) {
  return name.split('').map((ch, idx) => {
    if (ch === ' ') return '   ';
    if (revealed.includes(idx)) return ch;
    return '_';
  }).join(' ');
}

function createSafeFilename(filename) {
  return filename
    .replace(/[^\w\s\-\.]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function createAutoSpawnContainer(pony, guildId, ponyName) {
  const title = `A wild pony appeared!`;
  
  const headerText = new TextDisplayBuilder()
    .setContent(`**${title}** ${RARITY_EMOJIS[pony.rarity]}${pony.is_unique ? ` Unique` : ''}\n-# A mysterious pony awaits to be caught`);
  
  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);
  
  const container = new ContainerBuilder()
    .addTextDisplayComponents(headerText)
    .addSeparatorComponents(separator);

  if (pony.originalImagePath) {
    const imageInfo = getImageInfo(pony.originalImagePath);
    if (imageInfo && imageInfo.type === 'url') {
      const mediaGallery = new MediaGalleryBuilder()
        .addItems(
          new MediaGalleryItemBuilder()
            .setURL(pony.originalImagePath)
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

  const nameArr = ponyName.split('');
  const revealed = [];
  
  if (nameArr.length > 0 && nameArr[0] !== ' ') {
    revealed.push(0);
  }
  
  const lastIndex = nameArr.length - 1;
  if (lastIndex > 0 && nameArr[lastIndex] !== ' ' && !revealed.includes(lastIndex)) {
    revealed.push(lastIndex);
  }
  
  if (nameArr.length > 6) {
    const availableIndexes = nameArr
      .map((ch, idx) => (ch !== ' ' && !revealed.includes(idx) ? idx : null))
      .filter(idx => idx !== null);
    
    if (availableIndexes.length > 0) {
      const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
      revealed.push(randomIndex);
    }
  }

  const maskedName = getMaskedName(ponyName, revealed);
  
  const encounterContent = `**Guess the pony's name to catch it!**\n\nName: \`\`\`${maskedName}\`\`\`\n\nType the pony's full name in chat to catch it before others do!`;
  
  const encounterText = new TextDisplayBuilder()
    .setContent(encounterContent);
  
  container.addTextDisplayComponents(encounterText);

  return container;
}
import { getUsersForPonyAlert } from '../models/PonyAlertModel.js';
import { isBloodMoonCurrentlyActive } from '../models/BloodMoonModel.js';
import { getUserRebirth, getPonyDuplicateMultiplier, canGetNewPony } from '../commands/economy/rebirth.js';
import { 
  hasActiveCharmOfBinding, 
  hasActiveBlessingOfFortuna, 
  hasActiveServerCharms,
  markAutocatchUsed, 
  hasUsedAutocatch 
} from './artifactManager.js';
import { checkBingoUpdate, createBingoUpdateEmbed } from './bingoManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const activeSpawns = new Map();

export const activeServerCharmsIntervals = new Map();


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
  ADMIN: 0x800080,
  BLOOD_MOON: 0x8B0000
};

const BACKGROUND_EMOJIS = {
  airship: 'Airship',
  appleloosa: 'Appleloosa',
  blood_moon_event: 'Blood Moon Event',
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
  zephyr_heights: 'Zephyr Heights',
  limbo: 'Limbo',
  somnambula_village: 'Somnambula Village',
  breezie_grove: 'Breezie Grove',
  dream_realm: 'Dream Realm'
};


const RARITY_CHANCES = {
  BASIC: 0.125,
  RARE: 0.10,
  EPIC: 0.0225,
  MYTHIC: 0.00125,
  LEGEND: 0.000625,
  CUSTOM: 0.0003125,
  SECRET: 0.000125,
  EVENT: 0.0000625
};

function calculateCorrectLettersPercentage(guessedName, correctName) {
  const guess = guessedName.toLowerCase().replace(/\s/g, '');
  const correct = correctName.toLowerCase().replace(/\s/g, '');
  
  if (guess.length === 0) return 0;
  
  const correctLetters = {};
  for (let char of correct) {
    correctLetters[char] = (correctLetters[char] || 0) + 1;
  }
  
  let matches = 0;
  const usedLetters = {};
  
  for (let char of guess) {
    if (correctLetters[char] && (!usedLetters[char] || usedLetters[char] < correctLetters[char])) {
      matches++;
      usedLetters[char] = (usedLetters[char] || 0) + 1;
    }
  }
  
  return (matches / guess.length) * 100;
}
function generateNameHint(correctName) {
  const name = correctName.toLowerCase();
  const nameLength = name.length;
  const lettersToShow = Math.ceil(nameLength * 0.75);
  
  const indices = Array.from({ length: nameLength }, (_, i) => i);
  
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  const showIndices = indices.slice(0, lettersToShow).sort((a, b) => a - b);
  
  let hint = '';
  for (let i = 0; i < nameLength; i++) {
    if (i > 0 && name[i-1] !== ' ' && name[i] !== ' ') {
      hint += ' '; 
    }
    
    if (showIndices.includes(i)) {
      hint += name[i] === ' ' ? '   ' : name[i].toUpperCase(); 
    } else {
      hint += name[i] === ' ' ? '   ' : '_';
    }
  }
  
  return hint;
}

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
    UNIQUE: ['venture.title_unique_1', 'venture.title_unique_2', 'venture.title_unique_3', 'venture.title_unique_4']
  };
  
  const keys = titleKeys[rarity] || titleKeys.BASIC;
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const title = await t(randomKey, guildId);
  

  const backgroundEmoji = background && BACKGROUND_EMOJIS[background] ? `[${BACKGROUND_EMOJIS[background]}] ` : '';
  
  return backgroundEmoji + title + (isUnique ? await t('venture.unique', guildId) : '');
}

function fixImageUrl(url) {
  if (!url || typeof url !== 'string') return url;

  return url.replace(/^h+ttps:/, 'https:').replace(/^h+ttp:/, 'http:');
}

async function selectRarity(guildId = null) {
  const random = Math.random();
  let cumulativeChance = 0;
  
  let modifiedChances = { ...RARITY_CHANCES };
  if (guildId && await hasActiveBlessingOfFortuna(guildId)) {
    const allRarities = Object.keys(modifiedChances).filter(rarity => rarity !== 'BASIC');
    for (const rarity of allRarities) {
      if (modifiedChances[rarity]) {
        modifiedChances[rarity] *= 1.35;
      }
    }

    const totalRareChance = allRarities.reduce((sum, rarity) => 
      sum + (modifiedChances[rarity] || 0), 0
    );
    
    modifiedChances.BASIC = Math.max(0, 1.0 - totalRareChance);
  }
  
  for (const [rarity, chance] of Object.entries(modifiedChances)) {
    cumulativeChance += chance;
    if (random <= cumulativeChance) {
      return rarity;
    }
  }
  
  return 'BASIC';
}


const EXCLUDED_EVENT_PONIES = [
  'Sweetie Angel',
  'Rarity Angel', 
  'Cozy Demon',
  'Rarity Demon'
];


const EXCLUDED_PONIES = [
  'Aryanne',
  'Pumpkin Seed',
];


const GHOST_RESPONSES = {
  flirt: [
    "The ghost lifted its gaze in surprise but said nothing.",
    "A faint shadow of a smile crossed its face.",
    "The ghost gave a quiet chuckle, almost amused.",
    "The mist around it shimmered softly.",
    "It shook its head, yet lingered.",
    "Its figure trembled slightly, as if warmer for a moment.",
    "The voice came quieter, softer: \"Strange…\"",
    "The ghost seemed almost shy, though its face was hard to see.",
    "The air brightened, as if the moon peeked from behind clouds.",
    "The ghost stayed longer than expected.",
    "Its eyes glimmered, not in threat, but like a spark.",
    "It looked as if ready to speak, but stayed silent.",
    "For a moment, it seemed to drift closer.",
    "The mist swirled in a slow waltz.",
    "\"You're bold…\" it murmured with a faint smirk.",
    "The ghost nearly faded, then returned again.",
    "Its shape tilted, as if listening closely.",
    "\"Why would you…?\" it whispered faintly.",
    "A chill swept the air, but not a harsh one.",
    "Its gaze lingered on you a moment longer."
  ],
  talk: [
    "\"Do you hear the whispers of the dead?\"",
    "The ghost lowered its head, listening.",
    "\"Sometimes, even we wish to speak to the living…\"",
    "Its voice echoed faintly in the void.",
    "\"I have waited long for someone to hear me.\"",
    "The shadow thickened, yet grew calmer.",
    "\"It is too quiet here.\"",
    "The ghost reached out, its hand dissolving in air.",
    "\"Are you searching for answers too?\"",
    "Its voice was sad, yet kind.",
    "\"We were all once like you.\"",
    "The figure swayed gently, as if in a dance.",
    "\"I have seen many moons, all the same.\"",
    "Its whisper felt closer than its shape.",
    "\"A pity we meet only like this.\"",
    "The ghost seemed lost in thought, weighing its words.",
    "\"Perhaps you will understand what I never did.\"",
    "Its voice rang like a bell in the fog.",
    "\"Stay with me… just a little longer.\"",
    "Its form flickered like a candle in the wind."
  ],
  silent: [
    "The ghost watches you closely.",
    "Silence hangs heavy in the air.",
    "It sighs without sound.",
    "The ghost waits, but no reply comes.",
    "The quiet becomes almost tangible.",
    "Its eyes grow dim and hollow.",
    "The figure tilts its head slightly.",
    "Only the cold whisper of wind is heard.",
    "Its form sways as if uncertain.",
    "\"Hm…\" — a vague, unreadable sound.",
    "The ghost settles into the silence.",
    "The fog thickens around you.",
    "It drifts back a little, distant.",
    "The quiet is more unsettling than words.",
    "The ghost flickered, then dimmed.",
    "It waits, hearing nothing in return.",
    "Its gaze faded for a moment.",
    "The air grew colder.",
    "The silence stretched on.",
    "The ghost exhaled emptiness."
  ]
};

const GHOST_ENDINGS = [
  { message: "After the exchange, the ghost turned and drifted away, leaving only a handful of candy behind.", reward: "candies" },
  { message: "The mist cleared, and a small pumpkin remained on the ground.", reward: "pumpkins" },
  { message: "The ghost vanished into the air, and something dropped at your hooves.", reward: "candies" },
  { message: "It disappeared, but the faint clatter of candy lingered.", reward: "candies" },
  { message: "The figure melted away, leaving only a chill and a gift.", reward: "pumpkins" },
  { message: "The ghost faded as if it had never been, yet sweets glimmered on the ground.", reward: "candies" },
  { message: "Its shape dissolved into the night, leaving behind the scent of pumpkin and sugar.", reward: "pumpkins" }
];

async function generateRandomPony(guildId = null) {
  try {

    const isBloodMoon = await isBloodMoonCurrentlyActive();
    
    if (isBloodMoon) {

      if (Math.random() < 0.05) {

        const mythicPonies = await getPonyFriendsByRarity('MYTHIC');
        const rarePonies = await getPonyFriendsByRarity('RARE');
        const legendPonies = await getPonyFriendsByRarity('LEGEND');
        
        const allPonies = [...(mythicPonies || []), ...(rarePonies || []), ...(legendPonies || [])];
        const bloodPonies = allPonies.filter(pony => 
          pony.name.includes('Blood 🩸') && pony.background === 'blood_moon_event'
        );
        
        if (bloodPonies.length > 0) {
          const randomIndex = Math.floor(Math.random() * bloodPonies.length);
          let pony = bloodPonies[randomIndex];
          pony = processPonyImage(pony);
          pony.isBloodMoon = true;
          return pony;
        }
      }
    }
    
    const selectedRarity = await selectRarity(guildId);
    let poniesOfRarity = await getPonyFriendsByRarity(selectedRarity);
    

    if (poniesOfRarity) {
      poniesOfRarity = poniesOfRarity.filter(pony => 
        !pony.name.includes('Blood 🩸') || pony.background !== 'blood_moon_event'
      );
    }
    

    if (selectedRarity === 'EVENT' && poniesOfRarity) {
      poniesOfRarity = poniesOfRarity.filter(pony => !EXCLUDED_EVENT_PONIES.includes(pony.name));
    }
    

    if (poniesOfRarity) {
      poniesOfRarity = poniesOfRarity.filter(pony => !EXCLUDED_PONIES.includes(pony.name));
    }
    

    if (selectedRarity === 'EXCLUSIVE' && poniesOfRarity) {
      poniesOfRarity = poniesOfRarity.filter(pony => pony.rarity !== 'EXCLUSIVE');
    }
    
    if (!poniesOfRarity || poniesOfRarity.length === 0) {
      let basicPonies = await getPonyFriendsByRarity('BASIC');
      

      if (basicPonies) {
        basicPonies = basicPonies.filter(pony => 
          !pony.name.includes('Blood 🩸') || pony.background !== 'blood_moon_event'
        );
      }
      

      if (basicPonies) {
        basicPonies = basicPonies.filter(pony => !EXCLUDED_PONIES.includes(pony.name));
      }
      

      if (basicPonies) {
        basicPonies = basicPonies.filter(pony => pony.rarity !== 'EXCLUSIVE');
      }
      
      if (!basicPonies || basicPonies.length === 0) {
        throw new Error('No ponies available for spawn');
      }
      const randomIndex = Math.floor(Math.random() * basicPonies.length);
      let pony = basicPonies[randomIndex];
      pony = processPonyImage(pony);
      return pony;
    }
    
    const randomIndex = Math.floor(Math.random() * poniesOfRarity.length);
    let pony = poniesOfRarity[randomIndex];
    pony = processPonyImage(pony);
    return pony;
  } catch (error) {
    console.error('Error generating random pony:', error);
    throw error;
  }
}

async function createPonyEmbed(pony, guild) {
  const guildId = guild.id;
  let ponyName = pony.name;


  if (pony.isBloodMoon && ponyName.includes('Blood 🩸')) {
    ponyName = ponyName.replace(' Blood 🩸', '');
  }

  const revealed = [0]; 
  const masked = getMaskedName(ponyName, revealed);
  

  const embedColor = pony.isBloodMoon ? RARITY_COLORS.BLOOD_MOON : RARITY_COLORS[pony.rarity];
  

  let title = await getRandomTitle(pony.rarity, guildId, pony.background, pony.is_unique);
  if (pony.isBloodMoon) {
    title = `🩸 ${title} 🩸`;
  }
  
  const embed = createEmbed({
    title: title,
    description: `> **Rarity:** ${RARITY_EMOJIS[pony.rarity]}\n> \`${masked}\`\n\nType the correct pony name to friend them!`,
    color: embedColor,
    image: null,
    thumbnail: null,
    footer: { text: `A wild pony has appeared! • ID: ${pony.id}` }
  });
  
  return { embed, ponyName };
}

async function getPonyAlertMentions(guild, channel, pony) {
  try {
    const alertUsers = await getUsersForPonyAlert(pony.name);
    
    if (alertUsers.length === 0) return '';
    

    
    const mentions = [];
    
    for (const userId of alertUsers) {
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) continue;
        
        if (!channel.permissionsFor(member).has('ViewChannel')) continue;
        
        mentions.push(`<@${userId}>`);
        
      } catch (error) {
        console.error(`Error checking user ${userId}:`, error);
      }
    }
    
    if (mentions.length === 0) return '';
    
    return `🔔 ${mentions.join(' ')}`;
    
  } catch (error) {
    console.error('Error in getPonyAlertMentions:', error);
    return '';
  }
}

async function spawnGhost(client, guildId, channelId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {

      return;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {

      return;
    }

    if (!channel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {

      return;
    }


    const embed = createEmbed({
      title: "👻 Ghost Appears!",
      description: "A spectral figure materializes before you, its ethereal form wavering in the moonlight. What do you do?",
      color: 0x4B0082,
      footer: { text: "Halloween Event • Choose your action!" }
    });


    const ghostImagePath = path.join(__dirname, '..', 'public', 'halloween', 'ghost.png');
    const ghostAttachment = new AttachmentBuilder(ghostImagePath, { name: 'ghost.png' });
    embed.setImage('attachment://ghost.png');


    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ghost_flirt')
          .setLabel('💘 Flirt')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ghost_talk')
          .setLabel('💬 Talk')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ghost_silent')
          .setLabel('🤐 Stay Silent')
          .setStyle(ButtonStyle.Secondary)
      );

    const message = await channel.send({
      embeds: [embed],
      components: [row],
      files: [ghostAttachment]
    });




    const collector = message.createMessageComponentCollector({
      time: 120000
    });

    let interacted = false;

    collector.on('collect', async (interaction) => {
      if (interacted) {
        return interaction.reply({
          content: "Someone has already interacted with this ghost!",
          flags: MessageFlags.Ephemeral
        });
      }

      interacted = true;
      await interaction.deferReply();

      const action = interaction.customId.split('_')[1];
      const response = GHOST_RESPONSES[action][Math.floor(Math.random() * GHOST_RESPONSES[action].length)];
      const ending = GHOST_ENDINGS[Math.floor(Math.random() * GHOST_ENDINGS.length)];
      

      let rewardAmount, rewardText;
      if (ending.reward === 'pumpkins') {
        rewardAmount = Math.floor(Math.random() * 71) + 80;
        rewardText = `🎃 **${rewardAmount}** pumpkin${rewardAmount > 1 ? 's' : ''}`;
      } else {
        rewardAmount = Math.floor(Math.random() * 101) + 100;
        rewardText = `🍬 **${rewardAmount}** candies`;
      }


      await addResource(interaction.user.id, ending.reward, rewardAmount);


      const responseEmbed = createEmbed({
        title: "👻 Ghost's Response",
        description: `${response}\n\n*${ending.message}*\n\n**You received:** ${rewardText}`,
        color: 0x4B0082,
        footer: { text: `Claimed by ${interaction.user.tag}` }
      });

      await interaction.editReply({
        embeds: [responseEmbed]
      });


      await message.edit({
        embeds: [embed],
        components: []
      });

      collector.stop();
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && !interacted) {

        await message.edit({
          embeds: [embed],
          components: []
        });
      }
    });

  } catch (error) {
    console.error('Error spawning ghost:', error);
  }
}

async function spawnPony(client, guildId, channelId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      return;
    }

    if (!channel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
      return;
    }
    
    const pony = await generateRandomPony(guildId);
    
    processPonyImage(pony);

    const { ponyName } = await createPonyEmbed(pony, guild);
    
    const container = await createAutoSpawnContainer(pony, guildId, ponyName);

    const alertMentions = await getPonyAlertMentions(guild, channel, pony);

    const messageOptions = {
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    };

    if (alertMentions) {
      messageOptions.content = alertMentions;
    }
    
    if (pony.originalImagePath) {
      const imageAttachment = getImageAttachment(pony.originalImagePath);
      if (imageAttachment) {
        try {
          const safeFilename = imageAttachment.filename;
          const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
          messageOptions.files = [attachment];
        } catch (attachmentError) {
          console.error(`❌ Error creating attachment for pony ${pony.id}:`, attachmentError);
        }
      } else {
        console.warn(`❌ Could not get image attachment for pony ${pony.id}, path: ${pony.originalImagePath}`);
      }
    }
    
    const message = await channel.send(messageOptions);


    activeSpawns.set(channelId, {
      messageId: message.id,
      channelId: channelId,
      guildId: guildId,
      pony: pony,
      ponyName: ponyName,
      message: message, 
      timestamp: Date.now()
    });

    await checkAndHandleAutocatch(message, guildId);

  } catch (error) {
    console.error(`❌ Error spawning pony in guild ${guildId}:`);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status
    });
    
    if (error.requestBody) {
      console.error('Request body size:', JSON.stringify(error.requestBody).length);
    }
  }
}

export async function handleSpawnMessage(message) {
  try {
    const channelId = message.channel.id;
    const spawn = activeSpawns.get(channelId);
    
    if (!spawn) {
      return;
    }
    
    console.log(`DEBUG: Processing message "${message.content}" in channel with active spawn "${spawn.pony.name}"`);
    




    

    if (message.reference && message.reference.messageId !== spawn.messageId) {
      return;
    }
    
    const guessedName = message.content.toLowerCase().trim();
    const correctName = spawn.pony.name.toLowerCase();
    

    

    const isGuessAttempt = guessedName.length >= 3 && /^[a-zA-Z\s\-']+$/.test(guessedName);
    
    if (isGuessAttempt) {

      const userId = message.author.id;
      const pony = await getPony(userId);
      
      if (!pony) {
        await message.reply('❌ You need to create a pony first with `/equestria` before you can catch ponies!');
        return;
      }

      const { query } = await import('./database.js');
      const activeCharm = await query(
        'SELECT 1 FROM active_artifacts WHERE user_id = ? AND guild_id = ? AND artifact_type = ? AND expires_at > ?',
        [userId, message.guild.id, 'charm_of_binding', Date.now()]
      );
      
      if (activeCharm && activeCharm.length > 0) {
        await message.reply({
          embeds: [createEmbed({
            title: '🔮 Charm of Binding Active!',
            description: `You have an active **Charm of Binding** that automatically catches ponies for you. Manual catching is disabled while the charm is active.`,
            user: message.author,
            color: 0x8A2BE2
          })]
        });
        return;
      }
      
      if (guessedName === correctName) {
        
        const slotCheck = await canGetNewPony(userId);
        if (!slotCheck.canGet) {
          await message.reply({
            embeds: [createEmbed({
              title: '🏠 Stable Full',
              description: slotCheck.message,
              user: message.author,
              color: 0xe74c3c
            })]
          });
          return;
        }
      
      activeSpawns.delete(channelId);

      
      try {

        const duplicateMultiplier = await getPonyDuplicateMultiplier(pony.user_id);
        
        const newFriend = await addFriend(pony.user_id, spawn.pony.id);
        

        if (duplicateMultiplier > 1 && newFriend) {
          for (let i = 1; i < duplicateMultiplier; i++) {
            await addFriend(pony.user_id, spawn.pony.id);
          }
        }


        const bitsReward = Math.floor(Math.random() * 21) + 10;
        await addBits(pony.user_id, bitsReward);
        

        try {
          const { addQuestProgress } = await import('./questUtils.js');
          if (newFriend && newFriend.isNew) {
            await addQuestProgress(pony.user_id, 'get_ponies');
          }
          await addQuestProgress(pony.user_id, 'earn_bits', bitsReward);
        } catch (questError) {
          console.debug('Quest progress error in autospawn:', questError.message);
        }



        await addHarmony(pony.user_id, 5, 'Caught a pony in autospawn');


        let resourceText = '';
        

        if (Math.random() <= 0.05) {
          await addCases(pony.user_id, 1);
          resourceText += '\n<:case:1417301084291993712> You got a case!';
        }
        

        if (Math.random() <= 0.005) {
          await addResource(pony.user_id, 'keys', 1);
          resourceText += '\n<a:goldkey:1426332679103709314> You got a key!';
        }

        let bingoText = '';
        try {
          const bingoUpdate = await checkBingoUpdate(pony.user_id, spawn.pony.name);
          if (bingoUpdate) {
            if (bingoUpdate.isWin && bingoUpdate.reward) {
              bingoText = `\n**BINGO!** You completed 2 different line types! Rewards: ${bingoUpdate.reward.keys} keys, ${bingoUpdate.reward.bits} bits, ${bingoUpdate.reward.cases} cases`;
              if (bingoUpdate.reward.diamonds > 0) {
                bingoText += `, ${bingoUpdate.reward.diamonds} diamonds`;
              }
            } else if (bingoUpdate.isWin) {
              bingoText = '\n**BINGO!** You completed 2 different line types!';
            } else {
              const progress = bingoUpdate.lineTypes.needsMore 
                ? `(need ${2 - bingoUpdate.lineTypes.count} more line type${2 - bingoUpdate.lineTypes.count > 1 ? 's' : ''})`
                : '(need different line type)';
              bingoText = `\n**Bingo!** ${spawn.pony.name} crossed off! ${progress}`;
            }
          }
        } catch (bingoError) {
          console.error('Error checking bingo update in autospawn:', bingoError);
        }

        const embed = createEmbed({
          title: '🎉 Pony Friend!',
          description: `**${message.author.username}** successfully befriended **${spawn.pony.name}**!\nUse \`/myponies\` to view your collection!\n\n+${bitsReward} <:bits:1411354539935666197> +5 <:harmony:1416514347789844541>${resourceText}${bingoText}`,
          color: RARITY_COLORS[spawn.pony.rarity] || 0x3498db,
          user: message.author,
          thumbnail: null
        });

        await message.reply({ embeds: [embed] });
        
        if (Math.random() < 0.03) {
          const voteEmbed = createEmbed({
            title: '💎 Support Minuette Bot!',
            description: '**Love catching ponies?** Support the bot and get rewards!\n\n🗳️ **Use `/vote`** to get **10 diamonds** and **5 keys**!\n💬 **Need help or found a bug?** Send me a DM!\n\nYour support helps keep the bot running! ❤️',
            color: 0x9b59b6,
            user: message.author,
            thumbnail: message.client.user.displayAvatarURL()
          });
          
          setTimeout(() => {
            message.channel.send({ embeds: [voteEmbed] }).catch(console.error);
          }, 2000);
        }
        
        await resetChannelAfterSpawn(channelId);

      } catch (ponyError) {
        console.error('Error processing successful catch:', ponyError);
        await message.reply('❌ An error occurred while processing your catch. Please try again later.');
      }
      } else {
        const correctPercentage = calculateCorrectLettersPercentage(guessedName, correctName);
        
        console.log(`DEBUG: Guessed: "${guessedName}", Correct: "${correctName}", Percentage: ${correctPercentage}%`);
        
        if (correctPercentage >= 50) {
          const nameHint = generateNameHint(spawn.pony.name);
          
          console.log(`DEBUG: Showing hint for ${spawn.pony.name}: ${nameHint}`);
          
          const hintEmbed = createEmbed({
            title: '💛 Just a little more!',
            description: `You're close to the correct answer! Here's a hint:\n\n\`\`\`${nameHint}\`\`\`\n\nTry again!`,
            color: 0xFFD700,
            user: message.author,
            thumbnail: null
          });
          
          await message.reply({ embeds: [hintEmbed] });
        } else {
          console.log(`DEBUG: Percentage ${correctPercentage}% is less than 50%, no hint shown`);
        }
      }
    }

  } catch (error) {
    console.error('Error handling spawn message:', error);
  }
}


export async function handleSpawnGuessModal(interaction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    
    const { query } = await import('./database.js');
    const activeCharm = await query(
      'SELECT 1 FROM active_artifacts WHERE user_id = ? AND guild_id = ? AND artifact_type = ? AND expires_at > ?',
      [userId, guildId, 'charm_of_binding', Date.now()]
    );
    
    if (activeCharm && activeCharm.length > 0) {
      return await interaction.reply({
        embeds: [createEmbed({
          title: '🔮 Charm of Binding Active!',
          description: `You have an active **Charm of Binding** that automatically catches ponies for you. Manual catching is disabled while the charm is active.`,
          user: interaction.user,
          color: 0x8A2BE2
        })],
        flags: MessageFlags.Ephemeral
      });
    }
    
    const spawn = activeSpawns.get(guildId);
    
    if (!spawn) {

      return await interaction.reply({
        content: 'There is no active pony spawn in this server.',
        flags: MessageFlags.Ephemeral
      });
    }
    
    const guessedName = interaction.fields.getTextInputValue('pony_name').toLowerCase().trim();
    const correctName = spawn.pony.name.toLowerCase();
    

    
    if (guessedName === correctName) {
      
      const slotCheck = await canGetNewPony(userId);
      if (!slotCheck.canGet) {
        return await interaction.reply({
          embeds: [createEmbed({
            title: '🏠 Stable Full',
            description: slotCheck.message,
            user: interaction.user,
            color: 0xe74c3c
          })],
          flags: MessageFlags.Ephemeral
        });
      }
      
      await interaction.deferUpdate();

      activeSpawns.delete(spawn.channelId);
      

      await resetChannelAfterSpawn(spawn.guildId, spawn.channelId);

      
      try {

        const pony = await getPony(userId);
        

        const duplicateMultiplier = await getPonyDuplicateMultiplier(pony.user_id);

        const newFriend = await addFriend(pony.user_id, spawn.pony.id);
        

        if (duplicateMultiplier > 1 && newFriend) {
          for (let i = 1; i < duplicateMultiplier; i++) {
            await addFriend(pony.user_id, spawn.pony.id);
          }
        }


        const bitsReward = Math.floor(Math.random() * 21) + 10;
        await addBits(pony.user_id, bitsReward);
        

        try {
          const { addQuestProgress } = await import('./questUtils.js');
          if (newFriend && newFriend.isNew) {
            await addQuestProgress(pony.user_id, 'get_ponies');
          }
          await addQuestProgress(pony.user_id, 'earn_bits', bitsReward);
        } catch (questError) {
          console.debug('Quest progress error in autospawn:', questError.message);
        }



        await addHarmony(pony.user_id, 5, 'Caught a pony in autospawn');


        let resourceText = '';
        

        if (Math.random() <= 0.05) {
          await addCases(pony.user_id, 1);
          resourceText += '\n> <:case:1417301084291993712> You got a case!';
        }
        

        if (Math.random() <= 0.005) {
          await addResource(pony.user_id, 'keys', 1);
          resourceText += '\n> <a:goldkey:1426332679103709314> You got a key!';
        }

        let resultText = '';
        if (newFriend.isDuplicate) {
          resultText = `${interaction.user} caught **${spawn.pony.name}**!\n\nYou already have this pony in your collection (${newFriend.encounterCount} encounters).\n\n> **Reward:** ${bitsReward} bits, <:harmony:1416514347789844541> 5 ${resourceText}`;
        } else {
          resultText = `${interaction.user} caught **${spawn.pony.name}**!\n\nThis pony has been added to your collection!\n\n> **Reward:** ${bitsReward} bits, <:harmony:1416514347789844541> 5 ${resourceText}`;
        }
        
        if (spawn.message) {
          try {

            const updatedEmbed = EmbedBuilder.from(spawn.message.embeds[0])
              .setTitle('Pony Friend!')
              .setDescription(`${resultText}\n> **Rarity:** ${RARITY_EMOJIS[spawn.pony.rarity]}`)
              .setColor('#7289da');
            
            if (spawn.ponyWithBackground) {
              updatedEmbed.setImage(`attachment://${spawn.ponyWithBackground.name}`);
            } else {
              updatedEmbed.setImage(spawn.pony.image);
            }
            
            const files = [];
            if (spawn.ponyWithBackground) {
              files.push(spawn.ponyWithBackground);
            }

            if (spawn.pony.imageType === 'file' && spawn.pony.imageFilePath && spawn.pony.imageFileName) {
              const { AttachmentBuilder } = await import('discord.js');
              const ponyAttachment = new AttachmentBuilder(spawn.pony.imageFilePath, { name: spawn.pony.imageFileName });
              files.push(ponyAttachment);
            }
            
            await spawn.message.edit({
              embeds: [updatedEmbed],
              components: [], 
              files: files
            });

            if (Math.random() < 0.03) {
              const voteEmbed = createEmbed({
                title: '💎 Support Minuette Bot!',
                description: '**Love catching ponies?** Support the bot and get rewards!\n\n🗳️ **Use `/vote`** to get **10 diamonds** and **5 keys**!\n💬 **Need help or found a bug?** Send me a DM!\n\nYour support helps keep the bot running! ❤️',
                color: 0x9b59b6,
                user: interaction.user,
                thumbnail: interaction.client.user.displayAvatarURL()
              });
              
              setTimeout(() => {
                interaction.followUp({ embeds: [voteEmbed] }).catch(console.error);
              }, 2000);
            }

          } catch (updateError) {
            console.error('Error updating spawn message:', updateError);
          }
        } else {

        }
      } catch (ponyError) {
        console.error('Error with pony profile:', ponyError);
        
        if (spawn.message) {
          try {
            const updatedEmbed = EmbedBuilder.from(spawn.message.embeds[0])
              .setTitle('Pony Friend!')
              .setDescription(`${interaction.user} caught **${spawn.pony.name}**!\n\nHowever, you need to create a pony profile first to collect ponies.\nUse \`/equestria\` to create your profile!\n> **Rarity:** ${RARITY_EMOJIS[spawn.pony.rarity]}`)
              .setColor('#7289da');
            
            if (spawn.ponyWithBackground) {
              updatedEmbed.setImage(`attachment://${spawn.ponyWithBackground.name}`);
            } else {
              updatedEmbed.setImage(spawn.pony.image);
            }
            
            const files = [];
            if (spawn.ponyWithBackground) {
              files.push(spawn.ponyWithBackground);
            }
 
            if (spawn.pony.imageType === 'file' && spawn.pony.imageFilePath && spawn.pony.imageFileName) {
              const { AttachmentBuilder } = await import('discord.js');
              const ponyAttachment = new AttachmentBuilder(spawn.pony.imageFilePath, { name: spawn.pony.imageFileName });
              files.push(ponyAttachment);
            }
            
            await spawn.message.edit({
              embeds: [updatedEmbed],
              components: [],
              files: files
            });
          } catch (updateError) {
            console.error('Error updating spawn message:', updateError);
          }
        }
      }
    } else {
      const correctPercentage = calculateCorrectLettersPercentage(guessedName, correctName);
      
      console.log(`DEBUG Modal: Guessed: "${guessedName}", Correct: "${correctName}", Percentage: ${correctPercentage}%`);
      
      if (correctPercentage >= 50) {
        const nameHint = generateNameHint(spawn.pony.name);
        
        console.log(`DEBUG Modal: Showing hint for ${spawn.pony.name}: ${nameHint}`);
        
        const hintEmbed = createEmbed({
          title: '💛 Just a little more!',
          description: `You're close to the correct answer! Here's a hint:\n\n\`\`\`${nameHint}\`\`\`\n\nTry again!`,
          color: 0xFFD700, 
          user: interaction.user,
          thumbnail: null
        });
        
        await interaction.reply({
          embeds: [hintEmbed],
          flags: MessageFlags.Ephemeral
        });
      } else {
        console.log(`DEBUG Modal: Percentage ${correctPercentage}% is less than 50%, showing normal error`);
        await interaction.reply({
          content: `❌ Wrong guess! **${guessedName}** is not the correct name. Try again!`,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  } catch (error) {
    console.error('Error handling spawn guess modal:', error);
    console.error('Error stack:', error.stack);
    
    if (!interaction.replied) {
      await interaction.reply({
        content: 'An error occurred while processing your guess.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}


export async function handleSpawnGuess(message, guessedName) {
  const channelId = message.channel.id;
  const spawn = activeSpawns.get(channelId);
  
  if (!spawn) return false;
  
  const userId = message.author.id;
  const { query } = await import('./database.js');
  const activeCharm = await query(
    'SELECT 1 FROM active_artifacts WHERE user_id = ? AND guild_id = ? AND artifact_type = ? AND expires_at > ?',
    [userId, message.guild.id, 'charm_of_binding', Date.now()]
  );
  
  if (activeCharm && activeCharm.length > 0) {
    return false;
  }

  let isCorrectGuess = guessedName.toLowerCase() === spawn.ponyName.toLowerCase();
  

  if (!isCorrectGuess && spawn.pony.isBloodMoon) {
    const fullBloodName = spawn.pony.name;
    isCorrectGuess = guessedName.toLowerCase() === fullBloodName.toLowerCase();
  }
  
  if (isCorrectGuess) {
    try {

      if (spawn.pony.rarity === 'EXCLUSIVE') {
        await message.reply({
          embeds: [createEmbed({
            title: 'Nuh uh.',
            description: 'Nice try',
            color: 0xFF69B4
          })]
        });
        return false;
      }
      

      const slotCheck = await canGetNewPony(message.author.id);
      if (!slotCheck.canGet) {
        await message.reply({
          embeds: [createEmbed({
            title: '🏠 Stable Full',
            description: slotCheck.message,
            user: message.author,
            color: 0xe74c3c
          })]
        });
        return false;
      }
      

      const duplicateMultiplier = await getPonyDuplicateMultiplier(message.author.id);
      

      const newFriend = await addFriend(message.author.id, spawn.pony.id);
      

      if (duplicateMultiplier > 1 && newFriend) {
        for (let i = 1; i < duplicateMultiplier; i++) {
          await addFriend(message.author.id, spawn.pony.id);
        }
      }
      

      const bits = Math.floor(Math.random() * 21) + 10;
      const cases = Math.random() < 0.25 ? 1 : 0;
      const harmony = Math.floor(Math.random() * 3) + 3;
      
      await addBits(message.author.id, bits);
      

      try {
        const { addQuestProgress } = await import('./questUtils.js');
        if (newFriend && newFriend.isNew) {
          await addQuestProgress(message.author.id, 'get_ponies');
        }
        await addQuestProgress(message.author.id, 'earn_bits', bits);
      } catch (questError) {
        console.debug('Quest progress error in autospawn:', questError.message);
      }
      if (cases > 0) {
        await addCases(message.author.id, cases);
      }
      await addHarmony(message.author.id, harmony);
      

      let rewardsText = `<:bits:1411354539935666197> ${bits} bits, <:harmony:1416514347789844541> ${harmony} harmony`;
      if (cases > 0) {
        rewardsText += `, <:case:1417301084291993712> ${cases} case`;
      }
      

      const successEmbed = new EmbedBuilder()
        .setTitle('🎉 Pony Friend!')
        .setDescription(`**${message.author.username}** successfully befriended **${spawn.ponyName}**!\nUse \`/myponies\` to view your collection!`)
        .addFields(
          { name: 'Rewards', value: rewardsText, inline: false }
        )
        .setColor(0x00FF00)
        .setTimestamp();
      
      await message.channel.send({ embeds: [successEmbed] });
      
      if (Math.random() < 0.03) {
        const voteEmbed = createEmbed({
          title: '💎 Support Minuette Bot!',
          description: '**Love catching ponies?** Support the bot and get rewards!\n\n🗳️ **Use `/vote`** to get **10 diamonds** and **5 keys**!\n💬 **Need help or found a bug?** Send me a DM!\n\nYour support helps keep the bot running! ❤️',
          color: 0x9b59b6,
          user: message.author,
          thumbnail: message.client.user.displayAvatarURL()
        });
        
        setTimeout(() => {
          message.channel.send({ embeds: [voteEmbed] }).catch(console.error);
        }, 2000);
      }

      activeSpawns.delete(channelId);
      

      await resetChannelAfterSpawn(spawn.guildId, channelId);

      return true;
      
    } catch (error) {
      console.error('Error handling successful guess:', error);
      return false;
    }
  }
  
  return false;
}


export async function checkAndSpawn(client, readyChannels) {
  for (const channelInfo of readyChannels) {
    const { channel_id, guild_id } = channelInfo;
    

    const ghostChance = Math.random();
    const isHalloweenEvent = ghostChance < 0.05;
    
    if (isHalloweenEvent) {
      await spawnGhost(client, guild_id, channel_id);
    } else {
      await spawnPony(client, guild_id, channel_id);
    }
  }
}

export function startAutoSpawn(client) {

  

  setInterval(cleanupActiveSpawns, 10 * 60 * 1000);
  

}

export function getActiveSpawn(channelId) {
  return activeSpawns.get(channelId);
}

export function cleanupActiveSpawns() {
  const now = Date.now();
  const CLEANUP_TIME = 30 * 60 * 1000;
  
  for (const [channelId, spawn] of activeSpawns.entries()) {
    if (now - spawn.timestamp > CLEANUP_TIME) {
      activeSpawns.delete(channelId);

    }
  }
}


export async function spawnTestPony(client, guildId, channelId, pony) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.error('Guild not found:', guildId);
      return false;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      console.error('Channel not found:', channelId);
      return false;
    }

    if (!channel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
      console.error('No permissions to send messages in channel:', channelId);
      return false;
    }


    processPonyImage(pony);
    
    const { ponyName } = await createPonyEmbed(pony, guild);
    
    const container = await createAutoSpawnContainer(pony, guildId, ponyName);
    
    const messageOptions = {
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    };

    if (pony.originalImagePath) {
      const imageAttachment = getImageAttachment(pony.originalImagePath);
      if (imageAttachment) {
        const safeFilename = imageAttachment.filename;
        const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
        messageOptions.files = [attachment];
      }
    }

    const message = await channel.send(messageOptions);


    activeSpawns.set(channelId, {
      messageId: message.id,
      channelId: channelId,
      guildId: guildId,
      pony: pony,
      ponyName: ponyName,
      message: message, 
      timestamp: Date.now()
    });

    console.log(`[MANUAL SPAWN] spawned pony "${pony.name}" (ID: ${pony.id}) in ${guild.name}/${channel.name}`);

    return true;

  } catch (error) {
    console.error('Error in spawnTestPony:', error);
    return false;
  }
}

const activeCharmsCache = new Map();
const CACHE_DURATION = 30000; 


setInterval(() => {
  const now = Date.now();
  for (const [key, value] of activeCharmsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION * 2) { 
      activeCharmsCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

async function checkAndHandleAutocatch(message, guildId) {
  try {
    const cacheKey = `charms_${guildId}`;
    
    const { query } = await import('./database.js');
    const activeCharms = await query(
      'SELECT user_id FROM active_artifacts WHERE guild_id = ? AND artifact_type = ? AND expires_at > ?',
      [guildId, 'charm_of_binding', Date.now()]
    );

    activeCharmsCache.set(cacheKey, {
      data: activeCharms || [],
      timestamp: Date.now()
    });
    
    console.log(`[AUTOCATCH DEBUG] Guild ${guildId}: Found ${activeCharms?.length || 0} active charms`);
    if (activeCharms && activeCharms.length > 0) {
      console.log(`[AUTOCATCH DEBUG] Active users: ${activeCharms.map(c => c.user_id).join(', ')}`);
    }

    if (!activeCharms || activeCharms.length === 0) {
      return;
    }

    const spawn = activeSpawns.get(message.channel.id);
    if (!spawn) {
      return;
    }

    const processLimit = activeCharms.length;
    const successfulCatches = [];
    
    for (let i = 0; i < processLimit; i++) {
      const charm = activeCharms[i];
      const userId = charm.user_id;
      
      console.log(`[AUTOCATCH DEBUG] Processing user ${userId} (${i+1}/${processLimit})`);
      
      try {
        const alreadyUsed = await hasUsedAutocatch(userId, guildId, spawn.messageId);
        if (alreadyUsed) {
          console.log(`[AUTOCATCH DEBUG] User ${userId} already used autocatch for this spawn`);
          continue;
        }

        const slotCheck = await canGetNewPony(userId);
        if (!slotCheck.canGet) {
          console.log(`[AUTOCATCH DEBUG] User ${userId} cannot get new pony: ${slotCheck.message}`);
          continue;
        }

        console.log(`[AUTOCATCH DEBUG] Processing autocatch for user ${userId}`);
        await markAutocatchUsed(userId, guildId, spawn.messageId);
        const result = await handleAutocatchSilent(message, spawn, userId);
        
        if (result.success) {
          successfulCatches.push({
            userId: userId,
            user: result.user,
            bitsReward: result.bitsReward,
            resourceText: result.resourceText
          });
          console.log(`[AUTOCATCH] Charm of Binding activated for user ${userId} in guild ${guildId}`);
        } else {
          console.log(`[AUTOCATCH DEBUG] Failed to process autocatch for user ${userId}`);
        }
      } catch (userError) {
        console.error(`[AUTOCATCH] Error processing user ${userId}:`, userError.message);
        continue; 
      }
    }
    
    if (successfulCatches.length > 0) {
      await sendMultipleAutocatchMessage(message, spawn, successfulCatches);
    }
  } catch (error) {
    console.error('[AUTOCATCH] Error in checkAndHandleAutocatch:', error);
  }
}

async function handleAutocatchSilent(message, spawn, userId) {
  try {
    const guild = message.guild;
    const discordUser = await guild.members.fetch(userId).then(member => member.user).catch(() => null);
    
    if (!discordUser) {
      console.error(`[AUTOCATCH] Could not fetch Discord user ${userId}`);
      return { success: false };
    }
    
    const pony = await getPony(userId);
    const duplicateMultiplier = await getPonyDuplicateMultiplier(pony.user_id);
    
    const newFriend = await addFriend(pony.user_id, spawn.pony.id);
    
    if (duplicateMultiplier > 1 && newFriend) {
      for (let i = 1; i < duplicateMultiplier; i++) {
        await addFriend(pony.user_id, spawn.pony.id);
      }
    }

    const bitsReward = 0;
    
    try {
      const { addQuestProgress } = await import('./questUtils.js');
      if (newFriend && newFriend.isNew) {
        await addQuestProgress(pony.user_id, 'get_ponies');
      }
      await addQuestProgress(pony.user_id, 'earn_bits', bitsReward);
    } catch (questError) {
      console.debug('Quest progress error in autocatch:', questError.message);
    }

    await addHarmony(pony.user_id, 5, 'Autocaught a pony with Charm of Binding');

    let resourceText = '';
    if (Math.random() <= 0.05) {
      await addCases(pony.user_id, 1);
      resourceText += '\n<:case:1417301084291993712> You got a case!';
    }


    let bingoUpdate = null;
    try {
      bingoUpdate = await checkBingoUpdate(pony.user_id, spawn.pony.name);
    } catch (bingoError) {
      console.error('Error checking bingo update in autocatch:', bingoError);
    }

    return {
      success: true,
      user: discordUser,
      bitsReward: bitsReward,
      resourceText: resourceText,
      bingoUpdate: bingoUpdate
    };

  } catch (error) {
    console.error('Error in handleAutocatchSilent:', error);
    return { success: false };
  }
}

async function sendMultipleAutocatchMessage(message, spawn, catches) {
  try {
    const displayLimit = 5;
    const displayCatches = catches.slice(0, displayLimit);
    const hasMore = catches.length > displayLimit;
    
    let userMentions;
    if (hasMore) {
      userMentions = displayCatches.map(c => c.user.toString()).join(', ') + '...';
    } else {
      userMentions = displayCatches.map(c => c.user.toString()).join(', ');
    }
    
    const rewardsText = displayCatches.map(c => {
      let bingoText = '';
      if (c.bingoUpdate) {
        if (c.bingoUpdate.isWin) {
          bingoText = ' 🎉 **BINGO!**';
        } else {
          bingoText = ' 🎯 **Bingo Progress!**';
        }
      }
      return `**${c.user.displayName}**: <:harmony:1416514347789844541> +5 harmony${c.resourceText}${bingoText}`;
    }).join('\n') + (hasMore ? `\n... and other ${catches.length - displayLimit} users` : '');
    
    const title = catches.length === 1 ? 'Charm of Binding Activated!' : 'Charms of Binding Activated!';
    const description = catches.length === 1 
      ? `${userMentions}, your **Charm of Binding** automatically caught a pony!\n\n**Rewards:**\n${rewardsText}\n\n*Others can still try to catch this pony manually.*`
      : `${userMentions}, your **Charms of Binding** automatically caught a pony!\n\n**Rewards:**\n${rewardsText}\n\n*Others can still try to catch this pony manually.*`;

    const embed = createEmbed({
      title: title,
      description: description,
      color: 0x8A2BE2,
      user: catches[0].user
    });


    const messageOptions = { embeds: [embed] };
    

    await message.channel.send(messageOptions);
    if (Math.random() <= 0.03) {
      const voteEmbed = createEmbed({
        title: '🗳️ Support Minuette Bot!',
        description: `You caught a pony! Consider voting for the bot to get **10 <a:diamond:1423629073984524298> diamonds** and **5 <:case:1417301084291993712> cases** as a reward!\n\nUse \`/vote\` to get the voting link!`,
        color: 0x3498DB,
        user: catches[0].user
      });

      setTimeout(async () => {
        try {
          await message.channel.send({ embeds: [voteEmbed] });
        } catch (error) {
          console.debug('Failed to send vote promotion:', error.message);
        }
      }, 2000);
    }

    if (catches.length > 0) {
      await resetChannelAfterSpawn(spawn.channelId);
    }

  } catch (error) {
    console.error('Error in sendMultipleAutocatchMessage:', error);
  }
}

async function handleAutocatch(message, spawn, userId) {
  try {
    const guild = message.guild;
    const discordUser = await guild.members.fetch(userId).then(member => member.user).catch(() => null);
    
    if (!discordUser) {
      console.error(`[AUTOCATCH] Could not fetch Discord user ${userId}`);
      return;
    }

    
    const pony = await getPony(userId);
    const duplicateMultiplier = await getPonyDuplicateMultiplier(pony.user_id);
    
    const newFriend = await addFriend(pony.user_id, spawn.pony.id);
    
    if (duplicateMultiplier > 1 && newFriend) {
      for (let i = 1; i < duplicateMultiplier; i++) {
        await addFriend(pony.user_id, spawn.pony.id);
      }
    }

    const bitsReward = Math.floor(Math.random() * 21) + 10;
    await addBits(pony.user_id, bitsReward);
    
    try {
      const { addQuestProgress } = await import('./questUtils.js');
      if (newFriend && newFriend.isNew) {
        await addQuestProgress(pony.user_id, 'get_ponies');
      }
      await addQuestProgress(pony.user_id, 'earn_bits', bitsReward);
    } catch (questError) {
      console.debug('Quest progress error in autocatch:', questError.message);
    }

    await addHarmony(pony.user_id, 5, 'Autocaught a pony with Charm of Binding');

    let resourceText = '';
    if (Math.random() <= 0.05) {
      await addCases(pony.user_id, 1);
      resourceText += '\n<:case:1417301084291993712> You got a case!';
    }

    const embed = createEmbed({
      title: 'Charm of Binding Activated!',
      description: `${discordUser}, your **Charm of Binding** automatically caught a pony!\n\n**Rewards:**\n<:bits:1411354539935666197> +${bitsReward} bits\n<:harmony:1416514347789844541> +5 harmony${resourceText}\n\n*Others can still try to catch this pony manually.*`,
      color: 0x8A2BE2,
      user: discordUser
    });


    const messageOptions = { embeds: [embed] };
    

    if (spawn.pony.imageType === 'file' && spawn.pony.imageFilePath && spawn.pony.imageFileName) {
      const { AttachmentBuilder } = await import('discord.js');
      const ponyAttachment = new AttachmentBuilder(spawn.pony.imageFilePath, { name: spawn.pony.imageFileName });
      messageOptions.files = [ponyAttachment];
    }

    await message.channel.send(messageOptions);

    if (Math.random() <= 0.03) {
      const voteEmbed = createEmbed({
        title: '🗳️ Support Minuette Bot!',
        description: `${discordUser}, you caught a pony! Consider voting for the bot to get **10 <a:diamond:1423629073984524298> diamonds** and **5 <:case:1417301084291993712> cases** as a reward!\n\nUse \`/vote\` to get the voting link!`,
        color: 0x3498DB,
        user: discordUser
      });

      setTimeout(async () => {
        try {
          await message.channel.send({ embeds: [voteEmbed] });
        } catch (error) {
          console.debug('Failed to send vote promotion:', error.message);
        }
      }, 2000);
    }

    await resetChannelAfterSpawn(spawn.channelId);

  } catch (error) {
    console.error('Error in handleAutocatch:', error);
  }
}

export function startServerCharms(client, guildId) {
  if (activeServerCharmsIntervals.has(guildId)) {
    console.log(`[SERVER CHARMS] Already running for guild ${guildId}, skipping...`);
    return activeServerCharmsIntervals.get(guildId);
  }

  const interval = setInterval(async () => {
    try {
      if (!(await hasActiveServerCharms(guildId))) {
        clearInterval(interval);
        activeServerCharmsIntervals.delete(guildId);
        console.log(`[SERVER CHARMS] Ended for guild ${guildId}`);
        return;
      }
    
      const channels = await getAllActiveSpawnChannels();
      const guildChannels = channels.filter(ch => ch.guild_id === guildId);
      
      if (guildChannels.length === 0) {
        console.log(`[SERVER CHARMS] No spawn channels configured for guild ${guildId}`);
        return;
      }

      const randomChannel = guildChannels[Math.floor(Math.random() * guildChannels.length)];
      
      console.log(`[SERVER CHARMS] Spawning in channel ${randomChannel.channel_id} for guild ${guildId}`);
      await spawnPony(client, guildId, randomChannel.channel_id);
      
    } catch (error) {
      console.error('[SERVER CHARMS] Error:', error);
    }
  }, 5000); 

  activeServerCharmsIntervals.set(guildId, interval);
  console.log(`[SERVER CHARMS] Started for guild ${guildId}`);
  return interval;
}

export function stopServerCharms(guildId) {
  const interval = activeServerCharmsIntervals.get(guildId);
  if (interval) {
    clearInterval(interval);
    activeServerCharmsIntervals.delete(guildId);
    console.log(`[SERVER CHARMS] Manually stopped for guild ${guildId}`);
    return true;
  }
  return false;
}

export async function initializeActiveServerCharms(client) {
  try {
    const { query } = await import('./database.js');
    const activeServerCharms = await query(
      'SELECT DISTINCT guild_id FROM active_artifacts WHERE artifact_type = ? AND expires_at > ?',
      ['server_charms', Date.now()]
    );
    
    if (activeServerCharms && activeServerCharms.length > 0) {
      console.log(`[SERVER CHARMS] Initializing ${activeServerCharms.length} active Server Charms...`);
      for (const artifact of activeServerCharms) {
        startServerCharms(client, artifact.guild_id);
      }
    }
  } catch (error) {
    console.error('[SERVER CHARMS] Error initializing active Server Charms:', error);
  }
}

export function clearAutocatchCache(guildId) {
  const cacheKey = `charms_${guildId}`;
  activeCharmsCache.delete(cacheKey);
  console.log(`[AUTOCATCH] Cache cleared for guild ${guildId}`);
}

export async function refreshAutocatchCache(guildId) {
  try {
    const cacheKey = `charms_${guildId}`;
    const { query } = await import('./database.js');
    const activeCharms = await query(
      'SELECT user_id FROM active_artifacts WHERE guild_id = ? AND artifact_type = ? AND expires_at > ?',
      [guildId, 'charm_of_binding', Date.now()]
    );

    activeCharmsCache.set(cacheKey, {
      data: activeCharms || [],
      timestamp: Date.now()
    });
    
    console.log(`[AUTOCATCH] Cache refreshed for guild ${guildId}, found ${activeCharms?.length || 0} active charms`);
    if (activeCharms && activeCharms.length > 0) {
      console.log(`[AUTOCATCH] Active users: ${activeCharms.map(c => c.user_id).join(', ')}`);
    }
  } catch (error) {
    console.error(`[AUTOCATCH] Error refreshing cache for guild ${guildId}:`, error);
  }
}

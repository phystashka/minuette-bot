import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed } from './components.js';
import * as SpawnChannelModel from '../models/SpawnChannelModel.js';
import { getAllActiveSpawnChannels, resetChannelAfterSpawn } from '../models/SpawnChannelModel.js';
import { getPonyFriendsByRarity, addFriend } from '../models/FriendshipModel.js';
import { createVenturePonyImage } from './backgroundRenderer.js';
import { t } from './localization.js';
import { addBits, getPony } from '../utils/pony/index.js';
import { addCases, addResource } from '../models/ResourceModel.js';
import { addHarmony } from '../models/HarmonyModel.js';
import { getUsersForPonyAlert } from '../models/PonyAlertModel.js';
import { isBloodMoonCurrentlyActive } from '../models/BloodMoonModel.js';
import { getUserRebirth, getPonyDuplicateMultiplier, canGetNewPony } from '../commands/economy/rebirth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const activeSpawns = new Map();


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
  EXCLUSIVE: 0xFF69B4,
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
  zephyr_heights: 'Zephyr Heights'
};


const RARITY_CHANCES = {
  BASIC: 0.50,
  RARE: 0.40,
  EPIC: 0.09,
  MYTHIC: 0.005,
  LEGEND: 0.0025,
  CUSTOM: 0.00125,
  SECRET: 0.0005,
  EVENT: 0.00025
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

function getMaskedName(name, revealed = []) {
  return name.split('').map((ch, idx) => {
    if (ch === ' ') return '   ';
    if (revealed.includes(idx)) return ch;
    return '_';
  }).join(' ');
}

function selectRarity() {
  const random = Math.random();
  let cumulativeChance = 0;
  
  for (const [rarity, chance] of Object.entries(RARITY_CHANCES)) {
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
  'Peachy Sprinkle',
  'Pumpkin Seed',
  'Nocturn'
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

async function generateRandomPony() {
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
          const pony = bloodPonies[randomIndex];
          pony.image = fixImageUrl(pony.image);
          pony.isBloodMoon = true;
          return pony;
        }
      }
    }
    
    const selectedRarity = selectRarity();
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
      const pony = basicPonies[randomIndex];
      pony.image = fixImageUrl(pony.image);
      return pony;
    }
    
    const randomIndex = Math.floor(Math.random() * poniesOfRarity.length);
    const pony = poniesOfRarity[randomIndex];
    pony.image = fixImageUrl(pony.image);
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
    image: pony.image,
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
          ephemeral: true
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
    
    const pony = await generateRandomPony();


    let ponyWithBackground = null;
    /*
    try {
      ponyWithBackground = await createVenturePonyImage(pony);
    } catch (error) {
      console.error('Error creating pony with background:', error);
      ponyWithBackground = null;
    }
    */

    const { embed, ponyName } = await createPonyEmbed(pony, guild);
    
    if (ponyWithBackground) {
      embed.setImage(`attachment://${ponyWithBackground.name}`);
    }

    const alertMentions = await getPonyAlertMentions(guild, channel, pony);

    const messageOptions = {
      embeds: [embed]
    };

    if (alertMentions) {
      messageOptions.content = alertMentions;
    }
    
    if (ponyWithBackground) {
      messageOptions.files = [ponyWithBackground];
    }
    
    const message = await channel.send(messageOptions);


    activeSpawns.set(channelId, {
      messageId: message.id,
      channelId: channelId,
      guildId: guildId,
      pony: pony,
      ponyName: ponyName,
      ponyWithBackground: ponyWithBackground,
      message: message, 
      timestamp: Date.now()
    });



  } catch (error) {
    console.error(`❌ Error spawning pony in ${guild?.name || guildId}:`, error);
  }
}

export async function handleSpawnMessage(message) {
  try {
    const channelId = message.channel.id;
    const spawn = activeSpawns.get(channelId);
    
    if (!spawn) {
      return;
    }
    




    

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

        const embed = createEmbed({
          title: '🎉 Pony Friend!',
          description: `**${message.author.username}** successfully befriended **${spawn.pony.name}**!\nUse \`/myponies\` to view your collection!\n\n+${bitsReward} <:bits:1411354539935666197> +5 <:harmony:1416514347789844541>${resourceText}`,
          color: RARITY_COLORS[spawn.pony.rarity] || 0x3498db,
          user: message.author,
          thumbnail: spawn.pony.image || null
        });

        await message.reply({ embeds: [embed] });
        
        await updateLastSpawn(guildId);

      } catch (ponyError) {
        console.error('Error processing successful catch:', ponyError);
        await message.reply('❌ An error occurred while processing your catch. Please try again later.');
      }
      }
    }

  } catch (error) {
    console.error('Error handling spawn message:', error);
  }
}


export async function handleSpawnGuessModal(interaction) {
  try {
    const guildId = interaction.guild.id;
    const spawn = activeSpawns.get(guildId);
    
    if (!spawn) {

      return await interaction.reply({
        content: 'There is no active pony spawn in this server.',
        ephemeral: true
      });
    }
    
    const guessedName = interaction.fields.getTextInputValue('pony_name').toLowerCase().trim();
    const correctName = spawn.pony.name.toLowerCase();
    

    
    if (guessedName === correctName) {
      const userId = interaction.user.id;
      

      const slotCheck = await canGetNewPony(userId);
      if (!slotCheck.canGet) {
        return await interaction.reply({
          embeds: [createEmbed({
            title: '🏠 Stable Full',
            description: slotCheck.message,
            user: interaction.user,
            color: 0xe74c3c
          })],
          ephemeral: true
        });
      }
      
      await interaction.deferUpdate();

      activeSpawns.delete(channelId);
      

      await resetChannelAfterSpawn(spawn.guildId, channelId);

      
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
            
            const files = spawn.ponyWithBackground ? [spawn.ponyWithBackground] : [];
            
            await spawn.message.edit({
              embeds: [updatedEmbed],
              components: [], 
              files: files
            });

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
            
            const files = spawn.ponyWithBackground ? [spawn.ponyWithBackground] : [];
            
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

      await interaction.reply({
        content: `❌ Wrong guess! **${guessedName}** is not the correct name. Try again!`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error handling spawn guess modal:', error);
    console.error('Error stack:', error.stack);
    
    if (!interaction.replied) {
      await interaction.reply({
        content: 'An error occurred while processing your guess.',
        ephemeral: true
      });
    }
  }
}


export async function handleSpawnGuess(message, guessedName) {
  const channelId = message.channel.id;
  const spawn = activeSpawns.get(channelId);
  
  if (!spawn) return false;
  

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


    const { embed, ponyName } = await createPonyEmbed(pony, guild);
    

    const message = await channel.send({
      embeds: [embed]
    });


    activeSpawns.set(channelId, {
      messageId: message.id,
      channelId: channelId,
      guildId: guildId,
      pony: pony,
      ponyName: ponyName,
      ponyWithBackground: null,
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

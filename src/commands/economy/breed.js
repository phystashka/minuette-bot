import { 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder, AttachmentBuilder
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { getUserFriends } from '../../models/FriendshipModel.js';
import { query, getRow } from '../../utils/database.js';
import { addFriend, getPonyFriendsByRarity } from '../../models/FriendshipModel.js';
import { addBits } from '../../utils/pony/index.js';
import { addHarmony } from '../../models/HarmonyModel.js';
import { t } from '../../utils/localization.js';
import { addQuestProgress } from '../../utils/questUtils.js';
import { getImageInfo } from '../../utils/imageResolver.js';

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

function createSafeFilename(filename) {
  return filename
    .replace(/[^\w\s\-\.]/g, '') 
    .replace(/\s+/g, '_') 
    .replace(/_{2,}/g, '_') 
    .replace(/^_+|_+$/g, ''); 
}

const BREED_CHANCES = {
  "BASIC+BASIC":   { BASIC: 0.88, RARE: 0.11, EPIC: 0.008, MYTHIC: 0.0015, LEGEND: 0.0003, SECRET: 0.0001, CUSTOM: 0.0001 },
  "BASIC+CUSTOM":  { BASIC: 0.75, RARE: 0.15, EPIC: 0.05, MYTHIC: 0.015, LEGEND: 0.001, SECRET: 0.0005, CUSTOM: 0.033 },
  "BASIC+EPIC":    { EPIC: 0.70, RARE: 0.20, BASIC: 0.08, MYTHIC: 0.012, LEGEND: 0.001, SECRET: 0.0003, CUSTOM: 0.0007 },
  "BASIC+LEGEND":  { MYTHIC: 0.60, LEGEND: 0.12, EPIC: 0.18, RARE: 0.08, BASIC: 0.015, SECRET: 0.001, CUSTOM: 0.004 },
  "BASIC+MYTHIC":  { EPIC: 0.62, MYTHIC: 0.22, RARE: 0.10, LEGEND: 0.012, BASIC: 0.043, SECRET: 0.0008, CUSTOM: 0.0032 },
  "BASIC+RARE":    { RARE: 0.68, EPIC: 0.25, BASIC: 0.06, MYTHIC: 0.009, LEGEND: 0.0003, SECRET: 0.0001, CUSTOM: 0.0006 },
  "BASIC+SECRET":  { LEGEND: 0.22, SECRET: 0.002, MYTHIC: 0.30, EPIC: 0.28, RARE: 0.15, BASIC: 0.043, CUSTOM: 0.005 },
  "BASIC+UNIQUE":  { LEGEND: 0.45, MYTHIC: 0.25, SECRET: 0.03, EPIC: 0.15, RARE: 0.08, BASIC: 0.04 },
  "BASIC+EXCLUSIVE": { LEGEND: 0.50, MYTHIC: 0.25, SECRET: 0.04, EPIC: 0.12, RARE: 0.06, BASIC: 0.03 },

  "CUSTOM+CUSTOM": { CUSTOM: 0.35, SECRET: 0.008, LEGEND: 0.04, MYTHIC: 0.20, EPIC: 0.22, RARE: 0.14, BASIC: 0.042 },
  "CUSTOM+EPIC":   { EPIC: 0.65, MYTHIC: 0.12, LEGEND: 0.015, RARE: 0.12, SECRET: 0.002, BASIC: 0.05, CUSTOM: 0.043 },
  "CUSTOM+LEGEND": { LEGEND: 0.20, SECRET: 0.01, MYTHIC: 0.25, EPIC: 0.20, RARE: 0.15, BASIC: 0.065, CUSTOM: 0.115 },
  "CUSTOM+MYTHIC": { MYTHIC: 0.55, LEGEND: 0.05, EPIC: 0.18, SECRET: 0.002, RARE: 0.13, BASIC: 0.063, CUSTOM: 0.065 },
  "CUSTOM+RARE":   { RARE: 0.65, EPIC: 0.18, MYTHIC: 0.05, LEGEND: 0.008, SECRET: 0.001, BASIC: 0.062, CUSTOM: 0.049 },
  "CUSTOM+SECRET": { SECRET: 0.0021, LEGEND: 0.08, MYTHIC: 0.35, EPIC: 0.25, RARE: 0.18, BASIC: 0.109, CUSTOM: 0.0369 },
  "CUSTOM+UNIQUE": { LEGEND: 0.18, MYTHIC: 0.25, SECRET: 0.008, EPIC: 0.22, RARE: 0.15, BASIC: 0.097, CUSTOM: 0.085 },
  "CUSTOM+EXCLUSIVE": { LEGEND: 0.20, MYTHIC: 0.28, SECRET: 0.012, EPIC: 0.20, RARE: 0.14, BASIC: 0.088, CUSTOM: 0.060 },

  "RARE+RARE":     { RARE: 0.75, EPIC: 0.18, MYTHIC: 0.03, LEGEND: 0.008, SECRET: 0.002, BASIC: 0.028, CUSTOM: 0.002 },
  "EPIC+RARE":     { EPIC: 0.68, RARE: 0.20, MYTHIC: 0.08, LEGEND: 0.012, SECRET: 0.003, BASIC: 0.020, CUSTOM: 0.005 },
  "MYTHIC+RARE":   { EPIC: 0.58, MYTHIC: 0.25, LEGEND: 0.06, RARE: 0.08, SECRET: 0.006, BASIC: 0.013, CUSTOM: 0.002 },
  "LEGEND+RARE":   { MYTHIC: 0.55, LEGEND: 0.15, EPIC: 0.18, RARE: 0.085, SECRET: 0.008, BASIC: 0.022, CUSTOM: 0.005 },
  "RARE+SECRET":   { LEGEND: 0.25, SECRET: 0.003, MYTHIC: 0.32, EPIC: 0.25, RARE: 0.15, BASIC: 0.047, CUSTOM: 0.013 },
  "RARE+UNIQUE":   { LEGEND: 0.40, MYTHIC: 0.25, SECRET: 0.03, EPIC: 0.18, RARE: 0.10, BASIC: 0.020 },
  "RARE+EXCLUSIVE": { LEGEND: 0.45, MYTHIC: 0.25, SECRET: 0.04, EPIC: 0.15, RARE: 0.08, BASIC: 0.025 },

  "EPIC+EPIC":     { EPIC: 0.75, MYTHIC: 0.15, LEGEND: 0.04, SECRET: 0.006, RARE: 0.035, BASIC: 0.015, CUSTOM: 0.004 },
  "EPIC+MYTHIC":   { MYTHIC: 0.65, EPIC: 0.20, LEGEND: 0.06, SECRET: 0.008, RARE: 0.045, BASIC: 0.032, CUSTOM: 0.005 },
  "EPIC+LEGEND":   { MYTHIC: 0.60, LEGEND: 0.15, EPIC: 0.15, SECRET: 0.01, RARE: 0.06, BASIC: 0.025, CUSTOM: 0.005 },
  "EPIC+SECRET":   { LEGEND: 0.28, SECRET: 0.004, MYTHIC: 0.35, EPIC: 0.25, RARE: 0.10, BASIC: 0.043, CUSTOM: 0.007 },
  "EPIC+UNIQUE":   { LEGEND: 0.40, MYTHIC: 0.25, SECRET: 0.03, EPIC: 0.18, RARE: 0.10, BASIC: 0.050 },
  "EPIC+EXCLUSIVE": { LEGEND: 0.45, MYTHIC: 0.25, SECRET: 0.04, EPIC: 0.15, RARE: 0.08, BASIC: 0.035 },

  "MYTHIC+MYTHIC": { MYTHIC: 0.75, LEGEND: 0.12, SECRET: 0.008, EPIC: 0.08, RARE: 0.035, BASIC: 0.015, CUSTOM: 0.002 },
  "LEGEND+MYTHIC": { LEGEND: 0.22, MYTHIC: 0.45, SECRET: 0.01, EPIC: 0.15, RARE: 0.08, BASIC: 0.035, CUSTOM: 0.005 },
  "MYTHIC+SECRET": { LEGEND: 0.30, SECRET: 0.006, MYTHIC: 0.40, EPIC: 0.20, RARE: 0.08, BASIC: 0.039, CUSTOM: 0.005 },
  "MYTHIC+UNIQUE": { LEGEND: 0.40, MYTHIC: 0.25, SECRET: 0.03, EPIC: 0.18, RARE: 0.10, BASIC: 0.050 },
  "MYTHIC+EXCLUSIVE": { LEGEND: 0.45, MYTHIC: 0.25, SECRET: 0.04, EPIC: 0.15, RARE: 0.08, BASIC: 0.035 },

  "LEGEND+LEGEND": { LEGEND: 0.20, SECRET: 0.015, MYTHIC: 0.40, EPIC: 0.22, RARE: 0.10, BASIC: 0.060, CUSTOM: 0.005 },
  "LEGEND+SECRET": { LEGEND: 0.22, SECRET: 0.008, MYTHIC: 0.38, EPIC: 0.22, RARE: 0.12, BASIC: 0.047, CUSTOM: 0.003 },
  "LEGEND+UNIQUE": { LEGEND: 0.40, MYTHIC: 0.25, SECRET: 0.03, EPIC: 0.18, RARE: 0.10, BASIC: 0.050 },
  "LEGEND+EXCLUSIVE": { LEGEND: 0.45, MYTHIC: 0.25, SECRET: 0.04, EPIC: 0.15, RARE: 0.08, BASIC: 0.035 },

  "SECRET+SECRET": { SECRET: 0.005, LEGEND: 0.12, MYTHIC: 0.38, EPIC: 0.28, RARE: 0.15, BASIC: 0.062, CUSTOM: 0.003, UNIQUE: 0.000005 },
  "SECRET+UNIQUE": { LEGEND: 0.25, MYTHIC: 0.30, SECRET: 0.015, EPIC: 0.22, RARE: 0.12, BASIC: 0.0725, UNIQUE: 0.0000075 },
  "SECRET+EXCLUSIVE": { LEGEND: 0.28, MYTHIC: 0.32, SECRET: 0.018, EPIC: 0.20, RARE: 0.11, BASIC: 0.0694, UNIQUE: 0.000001 },

  "UNIQUE+UNIQUE": { LEGEND: 0.35, MYTHIC: 0.30, SECRET: 0.04, EPIC: 0.18, RARE: 0.10, BASIC: 0.0298, UNIQUE: 0.00002 },
  "UNIQUE+EXCLUSIVE": { LEGEND: 0.40, MYTHIC: 0.25, SECRET: 0.05, EPIC: 0.15, RARE: 0.08, BASIC: 0.0466, UNIQUE: 0.00003 },

  "EXCLUSIVE+EXCLUSIVE": { LEGEND: 0.35, MYTHIC: 0.30, SECRET: 0.06, EPIC: 0.15, RARE: 0.08, BASIC: 0.0495, UNIQUE: 0.00005 }
};


const BREED_WAIT_TIMES = {
  BASIC: 30,     
  RARE: 60,      
  EPIC: 120,      
  MYTHIC: 240,   
  LEGEND: 300,   
  CUSTOM: 360,  
  SECRET: 420,  
  UNIQUE: 480,   
  EXCLUSIVE: 540,
  EVENT: 120      
};


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


export const createBreedingTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS breeding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      pony1_id INTEGER NOT NULL,
      pony2_id INTEGER NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finish_at TIMESTAMP NOT NULL,
      is_completed INTEGER DEFAULT 0,
      result_claimed INTEGER DEFAULT 0,
      result_pony_id INTEGER,
      message_id TEXT,
      channel_id TEXT
    )
  `;
  
  await query(sql);
  

  const tableInfo = await query(`PRAGMA table_info(breeding)`);
  const existingColumns = tableInfo.map(col => col.name);
  
  if (!existingColumns.includes('result_pony_id')) {
    try {
      await query(`ALTER TABLE breeding ADD COLUMN result_pony_id INTEGER`);
      console.log('✅ Added result_pony_id column to breeding table');
    } catch (error) {
      console.log('⚠️ result_pony_id column already exists or error:', error.message);
    }
  }
  
  if (!existingColumns.includes('message_id')) {
    try {
      await query(`ALTER TABLE breeding ADD COLUMN message_id TEXT`);
      console.log('✅ Added message_id column to breeding table');
    } catch (error) {
      console.log('⚠️ message_id column already exists or error:', error.message);
    }
  }
  
  if (!existingColumns.includes('channel_id')) {
    try {
      await query(`ALTER TABLE breeding ADD COLUMN channel_id TEXT`);
      console.log('✅ Added channel_id column to breeding table');
    } catch (error) {
      console.log('⚠️ channel_id column already exists or error:', error.message);
    }
  }
  

  await query(`CREATE INDEX IF NOT EXISTS idx_breeding_user_id ON breeding (user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_breeding_finish_at ON breeding (finish_at)`);
};


const getActiveBreeding = async (userId) => {
  const sql = `
    SELECT b.*, 
           p1.name as pony1_name, p1.rarity as pony1_rarity, p1.image as pony1_image,
           p2.name as pony2_name, p2.rarity as pony2_rarity, p2.image as pony2_image
    FROM breeding b
    JOIN pony_friends p1 ON b.pony1_id = p1.id
    JOIN pony_friends p2 ON b.pony2_id = p2.id
    WHERE b.user_id = ? AND b.result_claimed = 0
    ORDER BY b.started_at DESC
    LIMIT 1
  `;
  
  return await getRow(sql, [userId]);
};


const startBreeding = async (userId, pony1Id, pony2Id, finishAt) => {
  const sql = `
    INSERT INTO breeding (user_id, pony1_id, pony2_id, finish_at)
    VALUES (?, ?, ?, ?)
  `;
  
  return await query(sql, [userId, pony1Id, pony2Id, finishAt]);
};


const completeBreeding = async (breedingId, resultPonyId = null) => {
  if (resultPonyId) {
    const sql = `UPDATE breeding SET is_completed = 1, result_pony_id = ? WHERE id = ?`;
    return await query(sql, [resultPonyId, breedingId]);
  } else {
    const sql = `UPDATE breeding SET is_completed = 1 WHERE id = ?`;
    return await query(sql, [breedingId]);
  }
};


const claimBreedingResult = async (breedingId) => {
  const sql = `UPDATE breeding SET result_claimed = 1 WHERE id = ?`;
  return await query(sql, [breedingId]);
};


const updateBreedingMessage = async (breedingId, messageId, channelId) => {
  const sql = `UPDATE breeding SET message_id = ?, channel_id = ? WHERE id = ?`;
  return await query(sql, [messageId, channelId, breedingId]);
};


const findBreedingMessage = async (interaction, breeding) => {
  if (!breeding.message_id || !breeding.channel_id) {
    return null;
  }
  
  try {

    const channel = await interaction.client.channels.fetch(breeding.channel_id);
    if (!channel) return null;
    

    const message = await channel.messages.fetch(breeding.message_id);
    return message;
  } catch (error) {

    return null;
  }
};


const determineResultRarity = (rarity1, rarity2) => {

  const rarities = [rarity1, rarity2].sort();
  let key = `${rarities[0]}+${rarities[1]}`;
  

  if (!BREED_CHANCES[key]) {
    key = `${rarities[1]}+${rarities[0]}`;
  }
  

  if (!BREED_CHANCES[key]) {
    key = "BASIC+BASIC";
  }
  
  const chances = BREED_CHANCES[key];
  const random = Math.random();
  let cumulativeChance = 0;
  
  for (const [rarity, chance] of Object.entries(chances)) {
    cumulativeChance += chance;
    if (random <= cumulativeChance) {
      return rarity;
    }
  }
  
  return 'BASIC';
};


const determineWaitTime = async (rarity1, rarity2, userId = null) => {

  const rarityPriority = {
    BASIC: 0, RARE: 1, EPIC: 2, CUSTOM: 3, MYTHIC: 4, 
    LEGEND: 5, SECRET: 6, UNIQUE: 7, EXCLUSIVE: 8, EVENT: 2
  };
  
  const priority1 = rarityPriority[rarity1] || 0;
  const priority2 = rarityPriority[rarity2] || 0;
  const maxPriority = Math.max(priority1, priority2);
  
  const rarityKeys = Object.keys(BREED_WAIT_TIMES);
  const selectedRarity = Object.keys(rarityPriority).find(r => rarityPriority[r] === maxPriority) || 'BASIC';
  
  let waitTime = BREED_WAIT_TIMES[selectedRarity] || BREED_WAIT_TIMES.BASIC;
  

  if (userId) {
    try {
      const { getRebirthBonuses } = await import('./rebirth.js');
      const rebirthBonuses = await getRebirthBonuses(userId);
      
      if (rebirthBonuses.breedReduction > 0) {
        const reductionMinutes = rebirthBonuses.breedReduction;
        const minimumWaitTime = Math.max(waitTime * 0.5, 30);
        waitTime = Math.max(waitTime - reductionMinutes, minimumWaitTime);
      }
    } catch (error) {
      console.error('Error applying rebirth bonuses to breeding time:', error);
    }
  }
  
  return waitTime;
};


const formatTime = (minutes) => {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
};

export const data = new SlashCommandBuilder()
  .setName('breed')
  .setDescription('Breed two of your ponies to get a new pony')
  .setDescriptionLocalizations({
    'ru': 'Скрестите двух своих пони чтобы получить новую пони'
  })
  .setDMPermission(false);

export async function execute(interaction) {

  const ponyCheck = await requirePony(interaction);
  if (ponyCheck !== true) {
    return;
  }
  
  try {
    const userId = interaction.user.id;
    

    const { hasBreedingAccess } = await import('./rebirth.js');
    const hasAccess = await hasBreedingAccess(userId);
    
    if (!hasAccess) {
      return interaction.reply({
        content: '🔒 Breeding is locked! You need to perform at least 1 **Rebirth** to unlock the breeding system.\n\nUse `/rebirth` to learn more about the rebirth system and unlock breeding!',
        ephemeral: true
      });
    }
    

    const activeBreeding = await getActiveBreeding(userId);
    
    if (activeBreeding) {
      const now = new Date();
      const finishTime = new Date(activeBreeding.finish_at);
      
      if (now >= finishTime && !activeBreeding.is_completed) {

        const resultRarity = determineResultRarity(activeBreeding.pony1_rarity, activeBreeding.pony2_rarity);
        let resultPony = null;
        

        const poniesOfRarity = await getPonyFriendsByRarity(resultRarity);
        if (poniesOfRarity && poniesOfRarity.length > 0) {

          const availablePonies = poniesOfRarity.filter(pony => 
            pony.rarity !== 'EVENT' && 
            pony.name !== 'aryanne' && 
            !pony.name.includes('Blood') && 
            !pony.name.includes('🩸')
          );
          
          if (availablePonies.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePonies.length);
            resultPony = availablePonies[randomIndex];
          }
        }
        
        if (resultPony) {
          try {
            console.log('[BREED DEBUG] Result pony:', {
              id: resultPony.id,
              name: resultPony.name,
              rarity: resultPony.rarity,
              image: resultPony.image
            });

            await completeBreeding(activeBreeding.id, resultPony.id);
          
          const completionContainer = new ContainerBuilder();
          
          const titleText = new TextDisplayBuilder()
            .setContent('**Breeding Complete**');
          
          const descriptionText = new TextDisplayBuilder()
            .setContent(`Your ponies **${activeBreeding.pony1_name}** and **${activeBreeding.pony2_name}** have successfully produced a beautiful new foal!\n\n${RARITY_EMOJIS[resultPony.rarity]} **${resultPony.name}**\n\n💝 Click the button below to welcome your new pony to the family!`);
          
          completionContainer.addTextDisplayComponents(titleText, descriptionText);
          
          if (resultPony.image) {
            console.log('[BREED DEBUG] Processing image:', resultPony.image);
            const imageInfo = getImageInfo(resultPony.image);
            console.log('[BREED DEBUG] Image info:', imageInfo);
            
            if (imageInfo && imageInfo.type === 'url') {
              console.log('[BREED DEBUG] Adding URL image to MediaGallery');
              const mediaGallery = new MediaGalleryBuilder()
                .addItems(
                  new MediaGalleryItemBuilder()
                    .setURL(resultPony.image)
                );
              completionContainer.addMediaGalleryComponents(mediaGallery);
            } else if (imageInfo && imageInfo.type === 'attachment') {
              console.log('[BREED DEBUG] Adding local file image to MediaGallery');
              const safeFilename = createSafeFilename(imageInfo.filename);
              const mediaGallery = new MediaGalleryBuilder()
                .addItems(
                  new MediaGalleryItemBuilder()
                    .setURL(`attachment://${safeFilename}`)
                );
              completionContainer.addMediaGalleryComponents(mediaGallery);
            } else {
              console.log('[BREED DEBUG] No valid image info found');
            }
          } else {
            console.log('[BREED DEBUG] No image found for result pony');
          }
          
          const claimButton = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`claim_breeding_${activeBreeding.id}_${resultPony.id}`)
                .setLabel('Claim New Pony')
                .setStyle(ButtonStyle.Success)
            );
          
          completionContainer.addActionRowComponents(claimButton);
          
          const replyOptions = {
            flags: MessageFlags.IsComponentsV2,
            components: [completionContainer]
          };
          
          if (resultPony.image) {
            console.log('[BREED DEBUG] Getting image attachment for:', resultPony.image);
            const imageAttachment = getImageAttachment(resultPony.image);
            console.log('[BREED DEBUG] Image attachment result:', imageAttachment);
            if (imageAttachment) {
              const safeFilename = createSafeFilename(imageAttachment.filename);
              const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
              replyOptions.files = [attachment];
              console.log('[BREED DEBUG] Added attachment file:', safeFilename);
            } else {
              console.log('[BREED DEBUG] No attachment created');
            }
          }
          
          const reply = await interaction.reply(replyOptions);
          

          await updateBreedingMessage(activeBreeding.id, reply.id, interaction.channel.id);
          
          return reply;
          } catch (breedError) {
            console.error('[BREED ERROR] Error in breeding completion:', breedError);
            return interaction.reply({
              content: '❌ An error occurred while processing the breeding result. Please try again later.',
              ephemeral: true
            });
          }
        } else {
          return interaction.reply({
            content: '❌ An error occurred while determining the breeding result. Please try again later.',
            ephemeral: true
          });
        }
        
      } else if (activeBreeding.is_completed && !activeBreeding.result_claimed) {


        const oldMessage = await findBreedingMessage(interaction, activeBreeding);
        
        if (oldMessage) {

          return interaction.reply({
            content: `Your breeding is complete! [Click here to claim your result](${oldMessage.url})`,
            ephemeral: true
          });
        } else {


          let resultPony = null;
          
          if (activeBreeding.result_pony_id) {

            resultPony = await getRow('SELECT * FROM pony_friends WHERE id = ?', [activeBreeding.result_pony_id]);
          } else {

            const resultRarity = determineResultRarity(activeBreeding.pony1_rarity, activeBreeding.pony2_rarity);
            const poniesOfRarity = await getPonyFriendsByRarity(resultRarity);
            
            if (poniesOfRarity && poniesOfRarity.length > 0) {
              const availablePonies = poniesOfRarity.filter(pony => 
                pony.rarity !== 'EVENT' && 
                pony.name !== 'aryanne' && 
                !pony.name.includes('Blood') && 
                !pony.name.includes('🩸')
              );
              
              if (availablePonies.length > 0) {
                const randomIndex = Math.floor(Math.random() * availablePonies.length);
                resultPony = availablePonies[randomIndex];
                

                await completeBreeding(activeBreeding.id, resultPony.id);
              }
            }
          }
          
          if (resultPony) {
            const completionContainer = new ContainerBuilder();
            
            const titleText = new TextDisplayBuilder()
              .setContent('**Breeding Complete!**');
            
            const descriptionText = new TextDisplayBuilder()
              .setContent(`Your ponies **${activeBreeding.pony1_name}** and **${activeBreeding.pony2_name}** have successfully produced a beautiful new foal!\n\n${RARITY_EMOJIS[resultPony.rarity]} **${resultPony.name}**\n\n💝 Click the button below to welcome your new pony to the family!`);
            
            completionContainer.addTextDisplayComponents(titleText, descriptionText);
            
            if (resultPony.image) {
              const imageInfo = getImageInfo(resultPony.image);
              if (imageInfo && imageInfo.type === 'url') {
                const mediaGallery = new MediaGalleryBuilder()
                  .addItems(
                    new MediaGalleryItemBuilder()
                      .setURL(resultPony.image)
                  );
                completionContainer.addMediaGalleryComponents(mediaGallery);
              } else if (imageInfo && imageInfo.type === 'attachment') {
                const safeFilename = createSafeFilename(imageInfo.filename);
                const mediaGallery = new MediaGalleryBuilder()
                  .addItems(
                    new MediaGalleryItemBuilder()
                      .setURL(`attachment://${safeFilename}`)
                  );
                completionContainer.addMediaGalleryComponents(mediaGallery);
              }
            }
            
            const claimButton = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`claim_breeding_${activeBreeding.id}_${resultPony.id}`)
                  .setLabel('Claim New Pony')
                  .setStyle(ButtonStyle.Success)
              );
            
            completionContainer.addActionRowComponents(claimButton);
            
            const replyOptions = {
              flags: MessageFlags.IsComponentsV2,
              components: [completionContainer]
            };
            
            if (resultPony.image) {
              const imageAttachment = getImageAttachment(resultPony.image);
              if (imageAttachment) {
                const safeFilename = createSafeFilename(imageAttachment.filename);
                const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
                replyOptions.files = [attachment];
              }
            }
            
            const reply = await interaction.reply(replyOptions);
            

            await updateBreedingMessage(activeBreeding.id, reply.id, interaction.channel.id);
            
            return reply;
          } else {
            return interaction.reply({
              content: '❌ An error occurred while determining the breeding result. Please try again later.',
              ephemeral: true
            });
          }
        }
        
      } else {

        const timeLeft = Math.ceil((finishTime - now) / (1000 * 60));
        
        const embed = createEmbed({
          title: 'Breeding in Progress',
          description: `Your ponies are currently breeding:\n\n${RARITY_EMOJIS[activeBreeding.pony1_rarity]} **${activeBreeding.pony1_name}**\n${RARITY_EMOJIS[activeBreeding.pony2_rarity]} **${activeBreeding.pony2_name}**\n\n⏰ Time remaining: **${formatTime(timeLeft)}**`,
          color: 0xFF69B4,
          footer: { text: `Started ${new Date(activeBreeding.started_at).toLocaleString()}` }
        });
        
        return interaction.reply({
          embeds: [embed],
          ephemeral: true
        });
      }
    }
    

    const userFriends = await getUserFriends(userId);
    
    if (!userFriends || userFriends.length < 2) {
      return interaction.reply({
        content: '❌ You need at least 2 ponies to start breeding. Catch more ponies with `/venture` or wait for autospawn!',
        ephemeral: true
      });
    }
    

    const breedablePonies = userFriends.filter(pony => 
      pony.rarity !== 'EVENT' && 
      !pony.name.includes('Blood') && 
      !pony.name.includes('🩸')
    );
    
    if (breedablePonies.length < 2) {
      return interaction.reply({
        content: '❌ You need at least 2 breedable ponies (EVENT and Blood ponies cannot be bred). Catch more ponies with `/venture` or wait for autospawn!',
        ephemeral: true
      });
    }


    const { container, attachmentFiles } = await createBreedingSetupContainer(userId, breedablePonies);

    const replyOptions = {
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    };
    
    if (attachmentFiles.length > 0) {
      replyOptions.files = attachmentFiles;
    }

    await interaction.reply(replyOptions);
    
  } catch (error) {
    console.error('Error in breed command:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing the breeding command.',
      ephemeral: true
    });
  }
}


export const handleClaimBreeding = async (interaction) => {
  try {

    if (interaction.replied || interaction.deferred) {
      console.log('Claim interaction already handled, skipping...');
      return;
    }

    const customIdParts = interaction.customId.split('_');
    const breedingId = parseInt(customIdParts[2]);
    const resultPonyId = parseInt(customIdParts[3]);
    
    const userId = interaction.user.id;
    

    if (isNaN(breedingId) || isNaN(resultPonyId)) {
      return interaction.reply({
        content: '❌ Invalid breeding parameters. Please try starting a new breeding session.',
        ephemeral: true
      });
    }
    

    const breeding = await getActiveBreeding(userId);
    if (!breeding) {
      return interaction.reply({
        content: '❌ You don\'t have any active breeding session to claim.',
        ephemeral: true
      });
    }
    
    if (breeding.id !== breedingId) {
      return interaction.reply({
        content: '❌ This breeding result is from an old session. Please use `/breed` to check your current breeding status.',
        ephemeral: true
      });
    }
    

    if (!breeding.is_completed) {
      const now = Date.now();
      const finishTime = new Date(breeding.finish_time).getTime();
      const timeLeft = Math.ceil((finishTime - now) / (1000 * 60));
      
      return interaction.reply({
        content: `⏰ Your breeding is not complete yet. Please wait ${timeLeft} more minute(s).`,
        ephemeral: true
      });
    }
    

    if (breeding.result_claimed) {
      return interaction.reply({
        content: '✅ You have already claimed this breeding result. Use `/breed` to start a new breeding session!',
        ephemeral: true
      });
    }
    

    const actualResultPonyId = breeding.result_pony_id || resultPonyId;
    

    const ponyInfo = await getRow('SELECT * FROM pony_friends WHERE id = ?', [actualResultPonyId]);
    if (!ponyInfo) {
      return interaction.reply({
        content: '❌ Error: Could not find the pony information.',
        ephemeral: true
      });
    }
    

    const newFriend = await addFriend(userId, actualResultPonyId);
    

    const bitsReward = Math.floor(Math.random() * 100) + 100;
    await addBits(userId, bitsReward);
    

    const harmonyRewards = {
      BASIC: 30,
      RARE: 50,
      EPIC: 100,
      MYTHIC: 200,
      LEGEND: 300,
      CUSTOM: 250,
      SECRET: 400,
      UNIQUE: 450,
      EXCLUSIVE: 500
    };
    const harmonyReward = harmonyRewards[ponyInfo.rarity] || 50;
    await addHarmony(userId, harmonyReward, 'Breeding reward');
    

    try {
      await addQuestProgress(userId, 'earn_bits', bitsReward);
    } catch (questError) {
      console.debug('Quest progress error in breed:', questError.message);
    }
    

    await claimBreedingResult(breedingId);
    
    const resultContainer = new ContainerBuilder();
    
    const titleText = new TextDisplayBuilder()
      .setContent('**Breeding Result Claimed!**');
    
    const descriptionText = new TextDisplayBuilder()
      .setContent(`Congratulations! You have successfully welcomed your new family member from breeding!\n\n${RARITY_EMOJIS[ponyInfo.rarity]} **${ponyInfo.name}**\n\n**🎁 Rewards Earned:**\n<:bits:1429131029628588153> ${bitsReward} bits\n<:harmony:1416514347789844541> ${harmonyReward} harmony\n\n${newFriend.isNew ? '🌟 This beautiful pony has joined your growing family!' : `💝 You already had this wonderful pony (now you have ${newFriend.encounterCount || 'multiple'} of them in your collection!)`}`);
    
    const footerText = new TextDisplayBuilder()
      .setContent('✨ Use /myponies to view your complete pony family');
    
    resultContainer.addTextDisplayComponents(titleText, descriptionText, footerText);
    
    if (ponyInfo.image) {
      const imageInfo = getImageInfo(ponyInfo.image);
      if (imageInfo && imageInfo.type === 'url') {
        const mediaGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL(ponyInfo.image)
          );
        resultContainer.addMediaGalleryComponents(mediaGallery);
      } else if (imageInfo && imageInfo.type === 'attachment') {
        const safeFilename = createSafeFilename(imageInfo.filename);
        const mediaGallery = new MediaGalleryBuilder()
          .addItems(
            new MediaGalleryItemBuilder()
              .setURL(`attachment://${safeFilename}`)
          );
        resultContainer.addMediaGalleryComponents(mediaGallery);
      }
    }

    const updateOptions = {
      flags: MessageFlags.IsComponentsV2,
      components: [resultContainer]
    };
    
    if (ponyInfo.image) {
      const imageAttachment = getImageAttachment(ponyInfo.image);
      if (imageAttachment) {
        const safeFilename = createSafeFilename(imageAttachment.filename);
        const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
        updateOptions.files = [attachment];
      }
    }

    await interaction.update(updateOptions);
    
  } catch (error) {
    console.error('Error in handleClaimBreeding:', error);
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while claiming your breeding result.',
          ephemeral: true
        });
      } else {

        console.error('Cannot respond to interaction - already handled');
      }
    } catch (interactionError) {
      console.error('Failed to respond to interaction:', interactionError.message);
    }
  }
};


export const handleBreedingSelectMenu = async (interaction) => {
  try {
    const { customId, values } = interaction;
    const selectedPonyId = parseInt(values[0]);
    const userId = interaction.user.id;
    
    if (customId === 'breed_select_pony1') {

      const userFriends = await getUserFriends(userId);
      
      if (!userFriends || userFriends.length < 2) {
        return interaction.reply({
          content: '❌ You need at least 2 ponies to start breeding.',
          ephemeral: true
        });
      }
      

      const availablePonies = userFriends.filter(pony => 
        pony.rarity !== 'UNIQUE' && 
        pony.rarity !== 'EXCLUSIVE' && 
        pony.rarity !== 'EVENT' && 
        !pony.name.includes('Blood') && 
        !pony.name.includes('🩸') &&
        pony.friend_id !== selectedPonyId
      );
      
      if (availablePonies.length === 0) {
        return interaction.reply({
          content: '❌ No other breedable ponies available.',
          ephemeral: true
        });
      }
      

      const selectedPony1 = userFriends.find(pony => pony.friend_id === selectedPonyId);
      

      const poniesGrouped = availablePonies.reduce((acc, pony) => {
        if (!acc[pony.rarity]) acc[pony.rarity] = [];
        acc[pony.rarity].push(pony);
        return acc;
      }, {});
      

      const selectOptions = [];
      const rarityOrder = ['SECRET', 'CUSTOM', 'LEGEND', 'MYTHIC', 'EPIC', 'RARE', 'BASIC', 'EVENT'];
      
      for (const rarity of rarityOrder) {
        if (poniesGrouped[rarity]) {
          for (const pony of poniesGrouped[rarity]) {
            selectOptions.push(
              new StringSelectMenuOptionBuilder()
                .setLabel(`${pony.name}`)
                .setValue(`${selectedPonyId}_${pony.friend_id}`)
                .setDescription(`${rarity} • ID: ${pony.friend_id}`)
                .setEmoji(RARITY_EMOJIS[rarity].split(':')[2].split('>')[0])
            );
          }
        }
      }
      

      if (selectOptions.length > 25) {
        selectOptions.splice(25);
      }
      
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('breed_select_pony2')
        .setPlaceholder('Select second pony for breeding...')
        .addOptions(selectOptions);
      
      const row = new ActionRowBuilder().addComponents(selectMenu);
      
      const embed = createEmbed({
        title: 'Pony Breeding',
        description: `**First pony selected:** ${RARITY_EMOJIS[selectedPony1.rarity]} **${selectedPony1.name}**\n\nNow select the second pony for breeding.\n\n**Available ponies:** ${availablePonies.length}`,
        color: RARITY_COLORS[selectedPony1.rarity],
        image: selectedPony1.image,
        footer: { text: 'Step 2: Select the second pony' }
      });
      
      await interaction.update({
        embeds: [embed],
        components: [row]
      });
      
    } else if (customId === 'breed_select_pony2') {

      const [pony1Id, pony2Id] = values[0].split('_').map(id => parseInt(id));
      
      const userFriends = await getUserFriends(userId);
      const pony1 = userFriends.find(pony => pony.friend_id === pony1Id);
      const pony2 = userFriends.find(pony => pony.friend_id === pony2Id);
      
      if (!pony1 || !pony2) {
        return interaction.reply({
          content: '❌ One or both selected ponies could not be found.',
          ephemeral: true
        });
      }
      

      const waitTimeMinutes = await determineWaitTime(pony1.rarity, pony2.rarity, userId);
      const finishTime = new Date(Date.now() + waitTimeMinutes * 60 * 1000);
      

      await startBreeding(userId, pony1Id, pony2Id, finishTime.toISOString());
      
      const startContainer = new ContainerBuilder();
      
      const titleText = new TextDisplayBuilder()
        .setContent('**Breeding Started!**');
      
      const descriptionText = new TextDisplayBuilder()
        .setContent(`Your ponies have started their magical breeding journey!\n\n${RARITY_EMOJIS[pony1.rarity]} **${pony1.name}**\n${RARITY_EMOJIS[pony2.rarity]} **${pony2.name}**\n\n⏰ **Duration:** ${formatTime(waitTimeMinutes)}\n🕒 **Finish time:** <t:${Math.floor(finishTime.getTime() / 1000)}:R>\n\n✨ Use \`/breed\` again to check the status of your breeding.`);
      
      startContainer.addTextDisplayComponents(titleText, descriptionText);
      
      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [startContainer]
      });
    }
    
  } catch (error) {
    console.error('Error in handleBreedingSelectMenu:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your selection.',
        ephemeral: true
      });
    }
  }
};


export const handleBreedingModal = async (interaction) => {
  try {
    const userId = interaction.user.id;
    const pony1IdStr = interaction.fields.getTextInputValue('pony1_id');
    const pony2IdStr = interaction.fields.getTextInputValue('pony2_id');


    const pony1Id = parseInt(pony1IdStr);
    const pony2Id = parseInt(pony2IdStr);

    if (isNaN(pony1Id) || isNaN(pony2Id)) {
      return interaction.reply({
        content: '❌ Please enter valid numeric pony IDs.',
        ephemeral: true
      });
    }

    if (pony1Id === pony2Id) {
      return interaction.reply({
        content: '❌ You cannot breed a pony with itself! Please select two different ponies.',
        ephemeral: true
      });
    }


    const userFriends = await getUserFriends(userId);
    if (!userFriends || userFriends.length < 2) {
      return interaction.reply({
        content: '❌ You need at least 2 ponies to start breeding.',
        ephemeral: true
      });
    }


    const pony1 = userFriends.find(pony => pony.friendship_id === pony1Id);
    const pony2 = userFriends.find(pony => pony.friendship_id === pony2Id);

    if (!pony1) {
      return interaction.reply({
        content: `❌ Pony with ID ${pony1Id} not found in your collection.`,
        ephemeral: true
      });
    }

    if (!pony2) {
      return interaction.reply({
        content: `❌ Pony with ID ${pony2Id} not found in your collection.`,
        ephemeral: true
      });
    }


    if (pony1.rarity === 'EVENT') {
      return interaction.reply({
        content: `❌ ${pony1.name} (${pony1.rarity}) cannot be bred. EVENT ponies cannot be used for breeding.`,
        ephemeral: true
      });
    }

    if (pony2.rarity === 'EVENT') {
      return interaction.reply({
        content: `❌ ${pony2.name} (${pony2.rarity}) cannot be bred. EVENT ponies cannot be used for breeding.`,
        ephemeral: true
      });
    }


    const activeBreeding = await getActiveBreeding(userId);
    if (activeBreeding) {
      return interaction.reply({
        content: '❌ You already have an active breeding session. Please wait for it to complete or claim the result.',
        ephemeral: true
      });
    }


    const waitTimeMinutes = await determineWaitTime(pony1.rarity, pony2.rarity, userId);
    const finishTime = new Date(Date.now() + waitTimeMinutes * 60 * 1000);


    await startBreeding(userId, pony1.friend_id, pony2.friend_id, finishTime.toISOString());

    const startContainer = new ContainerBuilder();
    
    const titleText = new TextDisplayBuilder()
      .setContent('**Breeding Started!**');
    
    const descriptionText = new TextDisplayBuilder()
      .setContent(`Your ponies have started their magical breeding journey!\n\n${RARITY_EMOJIS[pony1.rarity]} **${pony1.name}** (ID: ${pony1Id})\n${RARITY_EMOJIS[pony2.rarity]} **${pony2.name}** (ID: ${pony2Id})\n\n⏰ **Duration:** ${formatTime(waitTimeMinutes)}\n🕒 **Finish time:** <t:${Math.floor(finishTime.getTime() / 1000)}:R>\n\n✨ Use \`/breed\` again to check the status of your breeding.`);
    
    startContainer.addTextDisplayComponents(titleText, descriptionText);

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [startContainer],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error in handleBreedingModal:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your breeding request.',
        ephemeral: true
      });
    }
  }
};

export const category = 'economy';


const breedingSetup = new Map();

const POPULAR_SHIPS = {
  'bon bon+lyra heartstrings': 'Best Friends Forever - "We make beautiful music together!"',
  'lyra heartstrings+bon bon': 'Magical Harmony - "Our love is like a perfect melody!"',
  'princess luna+princess celestia': 'Royal Sisters - "Together we balance day and night!"',
  'princess celestia+princess luna': 'Celestial Union - "Our bond is stronger than time itself!"',
  'twilight sparkle+sunset shimmer': 'Magic of Friendship - "Two worlds, one heart!"',
  'sunset shimmer+twilight sparkle': 'Starlight Romance - "You taught me what friendship truly means!"',
  'applejack+rainbow dash': 'Country & Speed - "Fast as lightning, strong as an oak!"',
  'rainbow dash+applejack': 'Rainbow Apples - "20% cooler with some country charm!"',
  'fluttershy+rainbow dash': 'Opposites Attract - "You give me courage to fly higher!"',
  'rainbow dash+fluttershy': 'Gentle Thunder - "You help me find my softer side!"',
  'rarity+applejack': 'Diamond in the Rough - "Elegance meets authenticity!"',
  'applejack+rarity': 'Sweet Sophistication - "Honest work, beautiful results!"',
  'pinkie pie+cheese sandwich': 'Party of Two - "Let\'s make everypony smile together!"',
  'cheese sandwich+pinkie pie': 'Endless Celebration - "The party never ends with you!"',
  'discord+fluttershy': 'Chaos & Kindness - "You bring order to my chaotic heart!"',
  'fluttershy+discord': 'Beauty & The Beast - "I see the good in your wild spirit!"',
  'big macintosh+cheerilee': 'School Days Romance - "Eeyup to forever with you!"',
  'cheerilee+big macintosh': 'Lesson in Love - "You teach my heart new things every day!"',
  'cadance+shining armor': 'True Love\'s Shield - "My love, my protection, my everything!"',
  'shining armor+cadance': 'Knight & Princess - "I\'ll defend your heart with my life!"',
  'spike+rarity': 'Dragon\'s Devotion - "You\'re the most beautiful gem I\'ve ever seen!"',
  'rarity+spike': 'Precious Dragon - "My little gentleman, so sweet and brave!"',
  
  'apple bloom+sweetie belle': 'Cutie Mark Crusaders - "Sisters in everything but blood!"',
  'sweetie belle+apple bloom': 'Sweet Harmony - "Our friendship is magical!"',
  'apple bloom+scootaloo': 'Adventure Buddies - "Ready for any crusade together!"',
  'scootaloo+apple bloom': 'Fearless Friends - "Nothing can stop us when we\'re together!"',
  'sweetie belle+scootaloo': 'Dynamic Duo - "We\'ll find our marks together!"',
  'scootaloo+sweetie belle': 'Speed & Song - "Fast friends forever!"',

  'derpy hooves+doctor whooves': 'Time & Space Mail - "I deliver love across all dimensions!"',
  'doctor whooves+derpy hooves': 'Timey-Wimey Love - "You make time stand still for me!"',
  'vinyl scratch+octavia melody': 'Bass & Class - "We make the perfect symphony!"',
  'octavia melody+vinyl scratch': 'Classical Beats - "You add the spark to my refined melodies!"',
  'trixie+starlight glimmer': 'Great & Powerful Duo - "Two magicians, one spectacular show!"',
  'starlight glimmer+trixie': 'Magic & Mischief - "Together we can rewrite the rules!"',
  
  'twilight sparkle+flash sentry': 'Study Date - "You protect my heart like you protect Equestria!"',
  'flash sentry+twilight sparkle': 'Royal Guard Romance - "My princess of friendship and knowledge!"',
  'spitfire+soarin': 'Wonderbolt Wings - "Flying together through every storm!"',
  'soarin+spitfire': 'Sky High Love - "You set my heart on fire!"',
  'apple bloom+tender taps': 'Young Love - "Dancing through life together!"',
  'tender taps+apple bloom': 'Sweet Steps - "Every dance with you is perfect!"',
  'button mash+sweetie belle': 'Game Over Romance - "Player 1 loves Player 2!"',
  'sweetie belle+button mash': 'Musical Gaming - "You\'re my favorite co-op partner!"',
  'timber spruce+twilight sparkle': 'Forest Magic - "Natural magic meets friendship magic!"',
  'twilight sparkle+timber spruce': 'Camping Chronicles - "You show me adventure beyond books!"',
  'lightning dust+rainbow dash': 'Lightning & Rainbow - "Racing hearts at maximum speed!"',
  'rainbow dash+lightning dust': 'Storm Chaser - "Fast, fierce, and fabulous together!"',
  'marble pie+big macintosh': 'Quiet Love - "Few words, deep feelings!"',
  'big macintosh+marble pie': 'Silent Symphony - "Eeyup to our peaceful love!"',
  'sugar belle+big macintosh': 'Sweet Apple - "You make my heart rise like fresh bread!"',
  'big macintosh+sugar belle': 'Country Baker - "Sweet as sugar, strong as apples!"'
};

function createAccessErrorContainer() {
  const container = new ContainerBuilder();
  
  const descText = new TextDisplayBuilder()
    .setContent('Only the person who used the breeding command can use these buttons.');
  container.addTextDisplayComponents(descText);
  
  return container;
}

async function createBreedingSetupContainer(userId, breedablePonies) {
  const setupData = breedingSetup.get(userId) || { pony1: null, pony2: null };
  
  const container = new ContainerBuilder();
  
  if (setupData.pony1 && setupData.pony2) {
    const pony1Color = RARITY_COLORS[setupData.pony1.rarity] || 0xFF69B4;
    const pony2Color = RARITY_COLORS[setupData.pony2.rarity] || 0xFF69B4;
    container.setAccentColor(Math.max(pony1Color, pony2Color));
  } else if (setupData.pony1) {
    container.setAccentColor(RARITY_COLORS[setupData.pony1.rarity] || 0xFF69B4);
  } else if (setupData.pony2) {
    container.setAccentColor(RARITY_COLORS[setupData.pony2.rarity] || 0xFF69B4);
  } else {
    container.setAccentColor(0xFF69B4);
  }
  
  let headerTitle = '**💕 Pony Breeding**';
  
  if (setupData.pony1 && setupData.pony2) {
    const pony1Name = setupData.pony1.name.toLowerCase();
    const pony2Name = setupData.pony2.name.toLowerCase();
    const shipKey = `${pony1Name}+${pony2Name}`;
    
    if (POPULAR_SHIPS[shipKey]) {
      headerTitle = `**${POPULAR_SHIPS[shipKey]}**`;
    }
  }
  
  const headerText = new TextDisplayBuilder()
    .setContent(headerTitle);
  container.addTextDisplayComponents(headerText);
  
  const attachmentFiles = [];
  
  if (setupData.pony1 || setupData.pony2) {
    const mediaGallery = new MediaGalleryBuilder();
    
    if (setupData.pony1 && setupData.pony1.image) {
      const imageInfo = getImageInfo(setupData.pony1.image);
      if (imageInfo && imageInfo.type === 'url') {
        mediaGallery.addItems(
          new MediaGalleryItemBuilder()
            .setURL(setupData.pony1.image)
        );
      } else if (imageInfo && imageInfo.type === 'attachment') {
        const safeFilename = createSafeFilename(imageInfo.filename);
        mediaGallery.addItems(
          new MediaGalleryItemBuilder()
            .setURL(`attachment://${safeFilename}`)
        );
        
        const imageAttachment = getImageAttachment(setupData.pony1.image);
        if (imageAttachment) {
          const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
          attachmentFiles.push(attachment);
        }
      }
    }

    if (setupData.pony2 && setupData.pony2.image) {
      const imageInfo = getImageInfo(setupData.pony2.image);
      if (imageInfo && imageInfo.type === 'url') {
        mediaGallery.addItems(
          new MediaGalleryItemBuilder()
            .setURL(setupData.pony2.image)
        );
      } else if (imageInfo && imageInfo.type === 'attachment') {
        const safeFilename = createSafeFilename(imageInfo.filename);
        mediaGallery.addItems(
          new MediaGalleryItemBuilder()
            .setURL(`attachment://${safeFilename}`)
        );
        
        const imageAttachment = getImageAttachment(setupData.pony2.image);
        if (imageAttachment) {
          const attachment = new AttachmentBuilder(imageAttachment.path, { name: safeFilename });
          attachmentFiles.push(attachment);
        }
      }
    }
    
    container.addMediaGalleryComponents(mediaGallery);
  }
  
  let ponyInfo = '';
  
  if (setupData.pony1) {
    const rarityEmoji = RARITY_EMOJIS[setupData.pony1.rarity] || '❓';
    ponyInfo += `${setupData.pony1.friendship_id} ${rarityEmoji} **${setupData.pony1.name}**`;
  } else {
    ponyInfo += 'Select first pony';
  }
  
  ponyInfo += ' + ';
  
  if (setupData.pony2) {
    const rarityEmoji = RARITY_EMOJIS[setupData.pony2.rarity] || '❓';
    ponyInfo += `${setupData.pony2.friendship_id} ${rarityEmoji} **${setupData.pony2.name}**`;
  } else {
    ponyInfo += 'Select second pony';
  }
  
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(ponyInfo)
  );
  
  if (setupData.pony1 && setupData.pony2) {
    const possibleResults = getPossibleBreedingResults(setupData.pony1.rarity, setupData.pony2.rarity);
    const topResults = possibleResults
      .filter(r => r.chance >= 0.05)
      .slice(0, 3);
    
    if (topResults.length > 0) {
      const chancesText = topResults
        .map(result => `${RARITY_EMOJIS[result.rarity]} ${(result.chance * 100).toFixed(0)}%`)
        .join(' • ');
      
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(chancesText)
      );
    }

    const waitTime = await determineWaitTime(setupData.pony1.rarity, setupData.pony2.rarity, userId);
    const timeInfo = new TextDisplayBuilder()
      .setContent(`⏰ **Breeding Time:** ${formatTime(waitTime)}`);
    container.addTextDisplayComponents(timeInfo);
  }

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);
  container.addSeparatorComponents(separator);
  
  const timeInfoText = new TextDisplayBuilder()
    .setContent(`-# ⏰ **Breeding Times:** Basic 30m • Rare 1h • Epic 2h • Mythic 4h • Legend 5h • Custom 6h • Secret 7h • Unique 8h • Exclusive 9h`);
  container.addTextDisplayComponents(timeInfoText);

  const allButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('breed_add_pony1')
        .setLabel(setupData.pony1 ? 'Change First' : 'Add First Pony')
        .setStyle(setupData.pony1 ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('breed_add_pony2')
        .setLabel(setupData.pony2 ? 'Change Second' : 'Add Second Pony')
        .setStyle(setupData.pony2 ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('breed_clear')
        .setLabel('Clear')
        .setStyle(ButtonStyle.Secondary)
    );

  if (setupData.pony1 && setupData.pony2) {
    allButtons.addComponents(
      new ButtonBuilder()
        .setCustomId('breed_start')
        .setLabel('Start Breeding')
        .setStyle(ButtonStyle.Primary) 
    );
  }
  
  container.addActionRowComponents(allButtons);
  
  return { container, attachmentFiles };
}

async function createBreedingSetupEmbed(userId, breedablePonies) {
  const setupData = breedingSetup.get(userId) || { pony1: null, pony2: null };
  
  const formatPonyDisplay = (pony) => {
    if (!pony) return 'Not selected';
    
    const rarityEmoji = RARITY_EMOJIS[pony.rarity] || '❓';
    const friendshipLevel = pony.friendship_level || 1;
    
    return `\`${pony.friendship_id}\` ${rarityEmoji} **${pony.name}** • Friend LvL ${friendshipLevel}`;
  };

  const pony1Display = formatPonyDisplay(setupData.pony1);
  const pony2Display = formatPonyDisplay(setupData.pony2);

  const embed = new EmbedBuilder()
    .setTitle('Pony Breeding Setup')
    .setColor(0xFF69B4)
    .addFields(
      {
        name: 'First Pony',
        value: pony1Display,
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true
      },
      {
        name: 'Second Pony',
        value: pony2Display,
        inline: true
      }
    )
    .setFooter({ 
      text: 'Select two ponies to see breeding chances.' 
    });


  if (setupData.pony1 && setupData.pony2) {
    const possibleResults = getPossibleBreedingResults(setupData.pony1.rarity, setupData.pony2.rarity);
    

    const highChanceResults = possibleResults.filter(r => r.chance >= 0.01);
    const lowChanceResults = possibleResults.filter(r => r.chance < 0.01 && r.chance > 0);
    

    const combination = `${setupData.pony1.rarity} + ${setupData.pony2.rarity}`;
    

    if (highChanceResults.length > 0) {
      const highChanceText = highChanceResults
        .map(result => `**${result.rarity}**: ${(result.chance * 100).toFixed(2)}%`)
        .join(' • ');
      
      embed.addFields({
        name: `Breeding Results: ${combination}`,
        value: `**High Chance (≥1%):**\n${highChanceText}`,
        inline: false
      });
    }
    
    if (lowChanceResults.length > 0) {
      const lowChanceText = lowChanceResults
        .map(result => `**${result.rarity}**: ${(result.chance * 100).toFixed(3)}%`)
        .join(' • ');
      
      embed.addFields({
        name: 'Low Chance Results (<1%)',
        value: lowChanceText,
        inline: false
      });
    }
    
    if (possibleResults.length === 0) {
      embed.addFields({
        name: `Breeding Results: ${combination}`,
        value: 'No results available for this combination',
        inline: false
      });
    }
  }

  return embed;
}


function createBreedingSetupComponents() {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('breed_add_pony1')
        .setLabel('Add First Pony')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('breed_add_pony2')
        .setLabel('Add Second Pony')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('breed_clear')
        .setLabel('Clear All')
        .setStyle(ButtonStyle.Secondary)
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('breed_start')
        .setLabel('Start Breeding')
        .setStyle(ButtonStyle.Success)
    );

  return [row1, row2];
}


function getPossibleBreedingResults(rarity1, rarity2) {

  const combination1 = `${rarity1}+${rarity2}`;
  const combination2 = `${rarity2}+${rarity1}`;
  
  let chances = BREED_CHANCES[combination1] || BREED_CHANCES[combination2];
  
  if (!chances) return [];
  
  return Object.entries(chances)
    .map(([rarity, chance]) => ({ rarity, chance }))
    .filter(result => result.chance > 0)
    .sort((a, b) => b.chance - a.chance);
}


export const handleBreedingButtons = async (interaction) => {
  try {

    if (interaction.replied || interaction.deferred) {
      console.log('Interaction already handled, skipping...');
      return;
    }

    const userId = interaction.user.id;
    const customId = interaction.customId;


    const originalUserId = interaction.message.interaction?.user?.id;
    if (originalUserId && originalUserId !== userId) {
      const errorContainer = createAccessErrorContainer();
      await interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
      return;
    }


    const userFriends = await getUserFriends(userId);
    const breedablePonies = userFriends.filter(pony => 
      pony.rarity !== 'EVENT' && 
      !pony.name.includes('Blood') && 
      !pony.name.includes('🩸')
    );

    if (customId === 'breed_add_pony1' || customId === 'breed_add_pony2') {

      const ponyNumber = customId === 'breed_add_pony1' ? '1' : '2';
      
      const modal = new ModalBuilder()
        .setCustomId(`breed_modal_pony${ponyNumber}`)
        .setTitle(`Add ${ponyNumber === '1' ? 'First' : 'Second'} Pony`);

      const ponyInput = new TextInputBuilder()
        .setCustomId('pony_id')
        .setLabel(`${ponyNumber === '1' ? 'First' : 'Second'} Pony ID`)
        .setPlaceholder('Enter the ID of the pony')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(ponyInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
      
    } else if (customId === 'breed_clear') {

      breedingSetup.delete(userId);
      
      const { container, attachmentFiles } = await createBreedingSetupContainer(userId, breedablePonies);

      const updateOptions = {
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      };
      
      if (attachmentFiles.length > 0) {
        updateOptions.files = attachmentFiles;
      }

      await interaction.update(updateOptions);
      
    } else if (customId === 'breed_start') {

      const setupData = breedingSetup.get(userId);
      
      if (!setupData || !setupData.pony1 || !setupData.pony2) {
        return interaction.reply({
          content: '❌ Please select both ponies before starting breeding.',
          ephemeral: true
        });
      }


      const activeBreeding = await getActiveBreeding(userId);
      if (activeBreeding) {
        return interaction.reply({
          content: '❌ You already have an active breeding session.',
          ephemeral: true
        });
      }


      const waitTimeMinutes = await determineWaitTime(setupData.pony1.rarity, setupData.pony2.rarity, userId);
      const finishTime = new Date(Date.now() + waitTimeMinutes * 60 * 1000);


      await startBreeding(userId, setupData.pony1.friend_id, setupData.pony2.friend_id, finishTime.toISOString());


      breedingSetup.delete(userId);

      const completionContainer = new ContainerBuilder();
      
      const titleText = new TextDisplayBuilder()
        .setContent('**Breeding Started!**');
      
      const descriptionText = new TextDisplayBuilder()
        .setContent(`Your ponies have started their magical breeding journey!\n\n${RARITY_EMOJIS[setupData.pony1.rarity]} **${setupData.pony1.name}** (ID: ${setupData.pony1.friendship_id})\n${RARITY_EMOJIS[setupData.pony2.rarity]} **${setupData.pony2.name}** (ID: ${setupData.pony2.friendship_id})\n\n⏰ **Duration:** ${formatTime(waitTimeMinutes)}\n🕒 **Finish time:** <t:${Math.floor(finishTime.getTime() / 1000)}:R>\n\n✨ Use \`/breed\` again to check the status of your breeding.`);
      
      completionContainer.addTextDisplayComponents(titleText, descriptionText);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [completionContainer]
      });
    }
    
  } catch (error) {
    console.error('Error in handleBreedingButtons:', error);
    

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ An error occurred while processing your request.',
          components: []
        });
      }
    } catch (interactionError) {
      console.error('Failed to respond to interaction:', interactionError.message);
    }
  }
};


export const handleBreedingPonyModal = async (interaction) => {
  try {
    const userId = interaction.user.id;
    const customId = interaction.customId;
    const ponyIdStr = interaction.fields.getTextInputValue('pony_id');


    const ponyId = parseInt(ponyIdStr);
    if (isNaN(ponyId)) {
      return interaction.reply({
        content: '❌ Please enter a valid numeric pony ID.',
        ephemeral: true
      });
    }


    const userFriends = await getUserFriends(userId);
    const breedablePonies = userFriends.filter(pony => 
      pony.rarity !== 'EVENT'
    );


    const selectedPony = breedablePonies.find(pony => pony.friendship_id === ponyId);

    if (!selectedPony) {
      return interaction.reply({
        content: `❌ Pony with ID ${ponyId} not found in your breedable collection. Make sure the ID is correct and the pony is not EVENT.`,
        ephemeral: true
      });
    }


    let setupData = breedingSetup.get(userId) || { pony1: null, pony2: null };
    

    if (customId === 'breed_modal_pony1') {
      setupData.pony1 = selectedPony;
    } else if (customId === 'breed_modal_pony2') {
      setupData.pony2 = selectedPony;
    }


    if (setupData.pony1 && setupData.pony2 && setupData.pony1.friendship_id === setupData.pony2.friendship_id) {
      setupData.pony2 = null;
      
      breedingSetup.set(userId, setupData);
      
      return interaction.reply({
        content: '❌ You cannot breed a pony with itself! Please select a different pony for the second slot.',
        ephemeral: true
      });
    }


    breedingSetup.set(userId, setupData);


    const { container, attachmentFiles } = await createBreedingSetupContainer(userId, breedablePonies);

    const updateOptions = {
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    };
    
    if (attachmentFiles.length > 0) {
      updateOptions.files = attachmentFiles;
    }

    await interaction.update(updateOptions);

  } catch (error) {
    console.error('Error in handleBreedingPonyModal:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your pony selection.',
        ephemeral: true
      });
    }
  }
};

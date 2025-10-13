import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { getUserFriends } from '../../models/FriendshipModel.js';
import { query, getRow } from '../../utils/database.js';
import { addFriend, getPonyFriendsByRarity } from '../../models/FriendshipModel.js';
import { addBits } from '../../utils/pony/index.js';
import { addHarmony } from '../../models/HarmonyModel.js';
import { t } from '../../utils/localization.js';
import { addQuestProgress } from '../../utils/questUtils.js';

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


const WAIT_RANGES_MIN = {
  BASIC: [60, 120],
  RARE: [90, 150],
  EPIC: [120, 180],
  CUSTOM: [150, 210],
  MYTHIC: [180, 240],
  LEGEND: [240, 300],
  SECRET: [300, 360],
  UNIQUE: [360, 420],
  EXCLUSIVE: [420, 480]
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
    BASIC: 0, RARE: 1, EPIC: 2, CUSTOM: 3, MYTHIC: 4, LEGEND: 5, SECRET: 6,
    EVENT: 2, UNIQUE: 4, EXCLUSIVE: 6
  };
  
  const priority1 = rarityPriority[rarity1] || 0;
  const priority2 = rarityPriority[rarity2] || 0;
  const maxPriority = Math.max(priority1, priority2);
  
  const rarityKeys = Object.keys(WAIT_RANGES_MIN);
  const selectedRarity = rarityKeys[Math.min(maxPriority, rarityKeys.length - 1)];
  
  const [min, max] = WAIT_RANGES_MIN[selectedRarity];
  let waitTime = Math.floor(Math.random() * (max - min + 1)) + min;
  

  if (userId) {
    try {
      const { getRebirthBonuses } = await import('./rebirth.js');
      const rebirthBonuses = await getRebirthBonuses(userId);
      
      if (rebirthBonuses.breedReduction > 0) {
        const reductionMinutes = rebirthBonuses.breedReduction;
        waitTime = Math.max(waitTime - reductionMinutes, 1);
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
            pony.rarity !== 'EVENT'
          );
          
          if (availablePonies.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePonies.length);
            resultPony = availablePonies[randomIndex];
          }
        }
        
        if (resultPony) {

          await completeBreeding(activeBreeding.id, resultPony.id);
          const embed = createEmbed({
            title: 'Breeding Complete!',
            description: `Your breeding is complete! **${activeBreeding.pony1_name}** and **${activeBreeding.pony2_name}** produced:\n\n${RARITY_EMOJIS[resultPony.rarity]} **${resultPony.name}**\n\nClick the button below to claim your new pony!`,
            color: RARITY_COLORS[resultPony.rarity],
            image: resultPony.image,
            footer: { text: `Breeding ID: ${activeBreeding.id}` }
          });
          
          const claimButton = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`claim_breeding_${activeBreeding.id}_${resultPony.id}`)
                .setLabel('Claim New Pony')
                .setStyle(ButtonStyle.Success)
            );
          
          const reply = await interaction.reply({
            embeds: [embed],
            components: [claimButton]
          });
          

          await updateBreedingMessage(activeBreeding.id, reply.id, interaction.channel.id);
          
          return reply;
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
                pony.rarity !== 'EVENT'
              );
              
              if (availablePonies.length > 0) {
                const randomIndex = Math.floor(Math.random() * availablePonies.length);
                resultPony = availablePonies[randomIndex];
                

                await completeBreeding(activeBreeding.id, resultPony.id);
              }
            }
          }
          
          if (resultPony) {
            const embed = createEmbed({
              title: 'Breeding Complete!',
              description: `Your breeding is complete! **${activeBreeding.pony1_name}** and **${activeBreeding.pony2_name}** produced:\n\n${RARITY_EMOJIS[resultPony.rarity]} **${resultPony.name}**\n\nClick the button below to claim your new pony!`,
              color: RARITY_COLORS[resultPony.rarity],
              image: resultPony.image,
              footer: { text: `Breeding ID: ${activeBreeding.id}` }
            });
            
            const claimButton = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId(`claim_breeding_${activeBreeding.id}_${resultPony.id}`)
                  .setLabel('Claim New Pony')
                  .setStyle(ButtonStyle.Success)
              );
            
            const reply = await interaction.reply({
              embeds: [embed],
              components: [claimButton]
            });
            

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
      pony.rarity !== 'EVENT'
    );
    
    if (breedablePonies.length < 2) {
      return interaction.reply({
        content: '❌ You need at least 2 breedable ponies (EVENT ponies cannot be bred). Catch more ponies with `/venture` or wait for autospawn!',
        ephemeral: true
      });
    }


    const embed = await createBreedingSetupEmbed(userId, breedablePonies);
    const components = createBreedingSetupComponents();

    await interaction.reply({
      embeds: [embed],
      components: components
    });
    
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
    

    const embed = createEmbed({
      title: 'Breeding Result Claimed!',
      description: `Congratulations! You have successfully claimed your new pony from breeding!\n\n${RARITY_EMOJIS[ponyInfo.rarity]} **${ponyInfo.name}**\n\n**Rewards:**\n<:bits:1411354539935666197> ${bitsReward} bits\n<:harmony:1416514347789844541> ${harmonyReward} harmony\n\n${newFriend.isNew ? 'This pony has been added to your collection!' : `You already had this pony (now you have ${newFriend.encounterCount || 'multiple'} of them)`}`,
      color: RARITY_COLORS[ponyInfo.rarity],
      image: ponyInfo.image,
      footer: { text: `Use /myponies to view your collection` }
    });
    

    await interaction.update({
      embeds: [embed],
      components: []
    });
    
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
      
      const embed = createEmbed({
        title: 'Breeding Started!',
        description: `Your ponies have started breeding!\n\n${RARITY_EMOJIS[pony1.rarity]} **${pony1.name}**\n${RARITY_EMOJIS[pony2.rarity]} **${pony2.name}**\n\n⏰ **Duration:** ${formatTime(waitTimeMinutes)}\n🕒 **Finish time:** <t:${Math.floor(finishTime.getTime() / 1000)}:R>\n\nUse \`/breed\` again to check the status of your breeding.`,
        color: 0xFF69B4,
        footer: { text: `Breeding will complete in ${formatTime(waitTimeMinutes)}` }
      });
      
      await interaction.update({
        embeds: [embed],
        components: []
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

    const embed = createEmbed({
      title: 'Breeding Started!',
      description: `Your ponies have started breeding!\n\n${RARITY_EMOJIS[pony1.rarity]} **${pony1.name}** (ID: ${pony1Id})\n${RARITY_EMOJIS[pony2.rarity]} **${pony2.name}** (ID: ${pony2Id})\n\n⏰ **Duration:** ${formatTime(waitTimeMinutes)}\n🕒 **Finish time:** <t:${Math.floor(finishTime.getTime() / 1000)}:R>\n\nUse \`/breed\` again to check the status of your breeding.`,
      color: 0xFF69B4,
      footer: { text: `Breeding will complete in ${formatTime(waitTimeMinutes)}` }
    });

    await interaction.reply({
      embeds: [embed],
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
        name: `🎲 Breeding Results: ${combination}`,
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
        name: `🎲 Breeding Results: ${combination}`,
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
      await interaction.reply({
        content: 'Only the person who used the breeding command can use these buttons.',
        ephemeral: true
      });
      return;
    }


    const userFriends = await getUserFriends(userId);
    const breedablePonies = userFriends.filter(pony => 
      pony.rarity !== 'EVENT'
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
      
      const embed = await createBreedingSetupEmbed(userId, breedablePonies);
      const components = createBreedingSetupComponents();

      await interaction.update({
        embeds: [embed],
        components: components
      });
      
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

      const embed = createEmbed({
        title: 'Breeding Started!',
        description: `Your ponies have started breeding!\n\n${RARITY_EMOJIS[setupData.pony1.rarity]} **${setupData.pony1.name}** (ID: ${setupData.pony1.friendship_id})\n${RARITY_EMOJIS[setupData.pony2.rarity]} **${setupData.pony2.name}** (ID: ${setupData.pony2.friendship_id})\n\n⏰ **Duration:** ${formatTime(waitTimeMinutes)}\n🕒 **Finish time:** <t:${Math.floor(finishTime.getTime() / 1000)}:R>\n\nUse \`/breed\` again to check the status of your breeding.`,
        color: 0xFF69B4,
        footer: { text: `Breeding will complete in ${formatTime(waitTimeMinutes)}` }
      });

      await interaction.update({
        embeds: [embed],
        components: []
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


    const embed = await createBreedingSetupEmbed(userId, breedablePonies);
    const components = createBreedingSetupComponents();

    await interaction.update({
      embeds: [embed],
      components: components
    });

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
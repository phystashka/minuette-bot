import { initDatabase, query, sequelize } from './database.js';
import { createGuildsTable } from '../models/GuildModel.js';
import { initUserTables } from '../models/UserModel.js';
import PonyModel from '../models/PonyModel.js';
import ResourceModel from '../models/ResourceModel.js';
import { createMarriageTable } from '../models/MarriageModel.js';
import { createAdoptionTable } from '../models/AdoptionModel.js';
import { initProfileBackgroundTables } from '../models/ProfileBackgroundModel.js';
import { createHarmonyTable } from '../models/HarmonyModel.js';
import { createSpawnChannelsTable } from '../models/SpawnChannelModel.js';
import { createPonyAlertsTable } from '../models/PonyAlertModel.js';
import { createUserSkinsTable } from '../models/SkinModel.js';
import { createFarmTable } from '../models/FarmModel.js';
import { createUserStatsTable } from '../models/UserStatsModel.js';
import { createBloodMoonTable } from '../models/BloodMoonModel.js';
import { initDonatorTables } from '../models/DonatorModel.js';
import { createClansTable } from '../models/ClanModel.js';
import { createBreedingTable } from '../commands/economy/breed.js';
import { updatePonyFriendsTableStructure } from '../models/FriendshipModel.js';
import { createPerformanceIndexes } from './performanceOptimizer.js';
import { createVoteTable } from '../models/VoteModel.js';




export const setupDatabase = async () => {
  try {
    const connected = await initDatabase();
    
    if (!connected) {
      console.error('Failed to connect to database. Check your database configuration.');
      return false;
    }


    await createGuildsTable();
    await initUserTables();
    await createMarriageTable();
    await createAdoptionTable();
    

    await PonyModel.initPonyTables();
    await ResourceModel.initResourceTables();
    await initProfileBackgroundTables();
    await createHarmonyTable();
    

    await createSpawnChannelsTable();
    

    await createPonyAlertsTable();
    

    await createUserSkinsTable();
    

    await createFarmTable();
    

    await createBloodMoonTable();
    

    await createUserStatsTable();
    

    await initDonatorTables();
    

    await createClansTable();
    

    await createBreedingTable();
    

    await createVoteTable();
    

    const { createRebirthTable } = await import('../commands/economy/rebirth.js');
    await createRebirthTable();
    

    await updatePonyFriendsTableStructure();
    

    await updatePonyTableSchema();
    

    try {
      await createPerformanceIndexes();
    } catch (error) {
      console.error('Error creating performance indexes:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error.message);
    return false;
  }
};



async function updatePonyTableSchema() {
  try {

    const checkTableSql = `
      PRAGMA table_info(ponies)
    `;
    
    const columnInfo = await query(checkTableSql);
    const columns = columnInfo.map(col => col.name);
    

    if (!columns.includes('reputation')) {
      const addReputationSql = `
        ALTER TABLE ponies 
        ADD COLUMN reputation INTEGER NOT NULL DEFAULT 50
      `;
      
      await query(addReputationSql);
      
      const updateRecordsSql = `
        UPDATE ponies 
        SET reputation = 50 
        WHERE reputation IS NULL
      `;
      
      await query(updateRecordsSql);
      
    }
    

    if (!columns.includes('influence')) {
      const addInfluenceSql = `
        ALTER TABLE ponies 
        ADD COLUMN influence REAL NOT NULL DEFAULT 0
      `;
      
      await query(addInfluenceSql);
      
      const updateInfluenceSql = `
        UPDATE ponies 
        SET influence = 0 
        WHERE influence IS NULL
      `;
      
      await query(updateInfluenceSql);
    }
  } catch (error) {
    console.error('Ошибка при обновлении схемы таблицы ponies:', error.message);
  }
}
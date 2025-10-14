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
      console.error('Failed to connect to database.');
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
    
    await createArtifactsTables();
    

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

async function createArtifactsTables() {
  try {
    const createActiveArtifactsTable = `
      CREATE TABLE IF NOT EXISTS active_artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        artifact_type TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await query(createActiveArtifactsTable);
    
    const createAutocatchHistoryTable = `
      CREATE TABLE IF NOT EXISTS autocatch_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        spawn_id TEXT NOT NULL,
        caught_at BIGINT NOT NULL,
        UNIQUE(user_id, guild_id, spawn_id)
      )
    `;
    
    await query(createAutocatchHistoryTable);

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_active_artifacts_user_type ON active_artifacts(user_id, artifact_type)',
      'CREATE INDEX IF NOT EXISTS idx_active_artifacts_guild_type ON active_artifacts(guild_id, artifact_type)',
      'CREATE INDEX IF NOT EXISTS idx_active_artifacts_expires ON active_artifacts(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_autocatch_history_user_guild ON autocatch_history(user_id, guild_id)',
      'CREATE INDEX IF NOT EXISTS idx_autocatch_history_caught_at ON autocatch_history(caught_at)'
    ];
    
    for (const indexSQL of createIndexes) {
      try {
        await query(indexSQL);
      } catch (indexError) {
        console.log('Index might already exist:', indexError.message);
      }
    }
    
    console.log('✅ Artifacts tables created successfully');
  } catch (error) {
    console.error('❌ Error creating artifacts tables:', error.message);
  }
}
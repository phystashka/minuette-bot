
import { query } from './database.js';

export const createPerformanceIndexes = async () => {
  console.log('🔧 Creating performance optimization indexes...');
  
  try {

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ponies_bits_desc ON ponies (bits DESC)
    `);
    console.log('✅ Created index: idx_ponies_bits_desc');
    

    await query(`
      CREATE INDEX IF NOT EXISTS idx_bank_accounts_balance ON bank_accounts (balance DESC)
    `);
    console.log('✅ Created index: idx_bank_accounts_balance');
    

    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_stats_voice_desc ON user_stats (voice_time DESC)
    `);
    console.log('✅ Created index: idx_user_stats_voice_desc');
    

    await query(`
      CREATE INDEX IF NOT EXISTS idx_friendship_user_count ON friendship (user_id, friend_id)
    `);
    console.log('✅ Created index: idx_friendship_user_count');
    

    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_farms_level_desc ON user_farms (level DESC, user_id ASC)
    `);
    console.log('✅ Created index: idx_user_farms_level_desc');
    

    await query(`
      CREATE INDEX IF NOT EXISTS idx_ponies_user_bits ON ponies (user_id, bits)
    `);
    console.log('✅ Created index: idx_ponies_user_bits');
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_balance ON bank_accounts (user_id, balance)
    `);
    console.log('✅ Created index: idx_bank_accounts_user_balance');
    

    await query(`
      CREATE INDEX IF NOT EXISTS idx_friendship_count ON friendship (user_id)
    `);
    console.log('✅ Created index: idx_friendship_count');
    
    console.log('🎉 All performance indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating performance indexes:', error);
    throw error;
  }
};


export const analyzeQueryPerformance = async (sql, params = []) => {
  try {
    const explainSql = `EXPLAIN QUERY PLAN ${sql}`;
    const plan = await query(explainSql, params);
    
    console.log('📊 Query Plan:', sql);
    console.table(plan);
    
    return plan;
  } catch (error) {
    console.error('Error analyzing query performance:', error);
    return null;
  }
};


export const getIndexStats = async () => {
  try {

    const indexes = await query(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name LIKE 'idx_%'
      ORDER BY tbl_name, name
    `);
    
    console.log('📋 Database Indexes:');
    console.table(indexes);
    
    return indexes;
  } catch (error) {
    console.error('Error getting index stats:', error);
    return [];
  }
};


export const getDatabaseStats = async () => {
  try {

    const pragma = await query('PRAGMA database_list');
    

    const tables = await query(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `);
    
    const stats = {};
    
    for (const table of tables) {
      try {
        const count = await query(`SELECT COUNT(*) as count FROM ${table.name}`);
        stats[table.name] = count[0].count;
      } catch (err) {

        stats[table.name] = 'N/A';
      }
    }
    
    console.log('📊 Database Statistics:');
    console.log('Tables and row counts:', stats);
    
    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {};
  }
};
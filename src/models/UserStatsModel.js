
import { query } from '../utils/database.js';
import { leaderboardCache } from '../utils/leaderboardCache.js';


export const createUserStatsTable = async () => {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        voice_time INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id)
      )
    `;
    
    await query(sql);
    

    await query('CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats (user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_user_stats_voice_time ON user_stats (voice_time)');
    
    console.log('✅ User stats table created/verified successfully');
  } catch (error) {
    console.error('❌ Error creating user stats table:', error);
    throw error;
  }
};


export const addVoiceTime = async (userId, minutes) => {
  try {
    console.log(`🔍 DEBUG: Starting addVoiceTime for user ${userId}, adding ${minutes} minutes`);
    

    await query(`
      INSERT OR IGNORE INTO user_stats (user_id, voice_time) 
      VALUES (?, 0)
    `, [userId]);
    
    console.log(`🔍 DEBUG: INSERT OR IGNORE completed for user ${userId}`);
    

    const result = await query(`
      UPDATE user_stats 
      SET voice_time = voice_time + ? 
      WHERE user_id = ?
    `, [minutes, userId]);
    
    console.log(`🔍 DEBUG: UPDATE completed for user ${userId}, affected rows:`, result);
    

    if (result > 0) {
      leaderboardCache.invalidateLeaderboard('voice');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding voice time:', error);
    return false;
  }
};


export const getUserVoiceStats = async (userId) => {
  try {
    const result = await query(
      'SELECT voice_time FROM user_stats WHERE user_id = ?',
      [userId]
    );
    
    return result?.[0] || { voice_time: 0 };
  } catch (error) {
    console.error('Error getting user voice stats:', error);
    return { voice_time: 0 };
  }
};


export const getTopVoiceUsers = async (limit = 10, offset = 0) => {
  try {
    const result = await query(
      'SELECT user_id, voice_time FROM user_stats WHERE voice_time > 0 ORDER BY voice_time DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    return result || [];
  } catch (error) {
    console.error('Error getting top voice users:', error);
    return [];
  }
};


try {
  createUserStatsTable();
} catch (error) {
  console.error('Error initializing user stats table:', error);
}

import { query, getRow, insert, update } from '../utils/database.js';

export const createHarmonyTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS harmony (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      harmony_points REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  const indexSql = `
    CREATE INDEX IF NOT EXISTS idx_harmony_user_id ON harmony (user_id)
  `;
  
  await query(indexSql);
  
  console.log('Harmony table created successfully');
};


export const getHarmony = async (userId) => {
  try {
    const result = await getRow('SELECT harmony_points FROM harmony WHERE user_id = ?', [userId]);
    return result ? result.harmony_points : 0;
  } catch (error) {
    console.error('Error getting harmony:', error);
    return 0;
  }
};


export const addHarmony = async (userId, amount, reason = '') => {
  try {

    const currentHarmony = await getHarmony(userId);
    let newHarmonyValue = currentHarmony + amount;
    

    let harmonyLimit = 1000;
    try {
      const { getHarmonyLimit } = await import('../commands/economy/rebirth.js');
      harmonyLimit = await getHarmonyLimit(userId);
    } catch (error) {
      console.error('Error getting harmony limit from rebirth:', error);
    }
    

    newHarmonyValue = Math.max(0, Math.min(harmonyLimit, newHarmonyValue));
    

    const actualChange = newHarmonyValue - currentHarmony;
    

    const existing = await getRow('SELECT harmony_points FROM harmony WHERE user_id = ?', [userId]);
    
    if (existing) {

      await query(
        'UPDATE harmony SET harmony_points = ?, updated_at = ? WHERE user_id = ?',
        [newHarmonyValue, new Date().toISOString(), userId]
      );
    } else {

      await query(
        'INSERT INTO harmony (user_id, harmony_points, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [userId, newHarmonyValue, new Date().toISOString(), new Date().toISOString()]
      );
    }
    
    console.log(`[HARMONY] ${userId}: ${actualChange > 0 ? '+' : ''}${actualChange.toFixed(1)} (${reason}) -> ${newHarmonyValue.toFixed(1)}`);
    
    return newHarmonyValue;
  } catch (error) {
    console.error('Error adding harmony:', error);
    return 0;
  }
};


export const removeHarmony = async (userId, amount, reason = '') => {
  return await addHarmony(userId, -amount, reason);
};


export const setHarmony = async (userId, amount) => {
  try {

    let harmonyLimit = 1000;
    try {
      const { getHarmonyLimit } = await import('../commands/economy/rebirth.js');
      harmonyLimit = await getHarmonyLimit(userId);
    } catch (error) {
      console.error('Error getting harmony limit from rebirth:', error);
    }
    

    const clampedAmount = Math.max(0, Math.min(harmonyLimit, amount));
    
    const existing = await getRow('SELECT harmony_points FROM harmony WHERE user_id = ?', [userId]);
    
    if (existing) {
      await query(
        'UPDATE harmony SET harmony_points = ?, updated_at = ? WHERE user_id = ?',
        [clampedAmount, new Date().toISOString(), userId]
      );
    } else {
      await query(
        'INSERT INTO harmony (user_id, harmony_points, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [userId, clampedAmount, new Date().toISOString(), new Date().toISOString()]
      );
    }
    
    return clampedAmount;
  } catch (error) {
    console.error('Error setting harmony:', error);
    return 0;
  }
};


export const getHarmonyLeaderboard = async (limit = 10) => {
  try {
    const result = await query(
      'SELECT user_id, harmony_points FROM harmony ORDER BY harmony_points DESC LIMIT ?',
      [limit]
    );
    return result || [];
  } catch (error) {
    console.error('Error getting harmony leaderboard:', error);
    return [];
  }
};


export const getUserHarmonyRank = async (userId) => {
  try {
    const result = await query(`
      SELECT COUNT(*) + 1 as rank 
      FROM harmony 
      WHERE harmony_points > (
        SELECT COALESCE(harmony_points, 0) 
        FROM harmony 
        WHERE user_id = ?
      )
    `, [userId]);
    
    return result && result[0] ? result[0].rank : null;
  } catch (error) {
    console.error('Error getting harmony rank:', error);
    return null;
  }
};


export const spendHarmony = async (userId, amount) => {
  try {
    const currentHarmony = await getHarmony(userId);
    
    if (currentHarmony < amount) {
      return false;
    }
    
    const newHarmonyValue = currentHarmony - amount;
    

    const existingRecord = await getRow('SELECT id FROM harmony WHERE user_id = ?', [userId]);
    
    if (existingRecord) {

      await update('harmony', 
        { harmony_points: newHarmonyValue, updated_at: new Date().toISOString() },
        { user_id: userId }
      );
    } else {

      await insert('harmony', {
        user_id: userId,
        harmony_points: Math.max(0, newHarmonyValue)
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error spending harmony:', error);
    return false;
  }
};

export default {
  createHarmonyTable,
  getHarmony,
  addHarmony,
  removeHarmony,
  setHarmony,
  spendHarmony,
  getHarmonyLeaderboard,
  getUserHarmonyRank
};
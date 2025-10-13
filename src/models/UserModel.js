
import { query, getRow, insert, update } from '../utils/database.js';

export const createUsersTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      username TEXT,
      active_background TEXT DEFAULT 'default_farm1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  const indexSql = `CREATE INDEX IF NOT EXISTS idx_users_user_id ON users (user_id)`;
  await query(indexSql);
  

  try {
    const checkColumnSql = `PRAGMA table_info(users)`;
    const columns = await query(checkColumnSql);
    const hasActiveBackground = columns.some(col => col.name === 'active_background');
    const hasLastTimely = columns.some(col => col.name === 'last_timely');
    
    if (!hasActiveBackground) {
      const addColumnSql = `ALTER TABLE users ADD COLUMN active_background TEXT DEFAULT 'default_farm1'`;
      await query(addColumnSql);
      console.log('Added active_background column to users table');
    }
    
    if (!hasLastTimely) {
      const addTimelyColumnSql = `ALTER TABLE users ADD COLUMN last_timely TEXT DEFAULT NULL`;
      await query(addTimelyColumnSql);
      console.log('Added last_timely column to users table');
    }
  } catch (error) {
    console.error('Error checking/adding columns:', error);
  }
};

export const initUserTables = async () => {
  await createUsersTable();
};

export const getUserById = async (userId) => {
  const sql = `
    SELECT * FROM users
    WHERE user_id = ?
  `;
  
  return await getRow(sql, [userId]);
};

export const createOrUpdateUser = async (userId, username) => {
  try {
    const sql = `
      INSERT OR REPLACE INTO users (user_id, username)
      VALUES (?, ?)
    `;
    
    await query(sql, [userId, username]);
    

    return await getUserById(userId);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
};


export const getUser = async (userId, guildId) => {
  return await getUserById(userId);
};


export const updateUserBackground = async (userId, backgroundId) => {
  try {
    const sql = `
      UPDATE users 
      SET active_background = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;
    
    await query(sql, [backgroundId, userId]);
    return await getUserById(userId);
  } catch (error) {
    console.error('Error updating user background:', error);
    throw error;
  }
};


export const createUser = async (userId, guildId, username = 'Unknown') => {
  return await createOrUpdateUser(userId, username);
};

export default {
  initUserTables,
  createUsersTable,
  getUserById,
  createOrUpdateUser,
  getUser,
  createUser
}; 
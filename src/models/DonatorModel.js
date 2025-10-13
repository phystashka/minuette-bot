
import { query, getRow, insert, update } from '../utils/database.js';

export const createDonatorsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS donators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      username TEXT,
      custom_emoji TEXT DEFAULT NULL,
      collections_purchased INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  const indexSql = `CREATE INDEX IF NOT EXISTS idx_donators_user_id ON donators (user_id)`;
  await query(indexSql);
};

export const initDonatorTables = async () => {
  await createDonatorsTable();
};


export const getDonator = async (userId) => {
  const sql = 'SELECT * FROM donators WHERE user_id = ?';
  return await getRow(sql, [userId]);
};


export const addDonator = async (userId, username) => {
  const existingDonator = await getDonator(userId);
  
  if (existingDonator) {

    const updateSql = 'UPDATE donators SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
    await query(updateSql, [username, userId]);
    return { success: true, message: 'Donator status already exists, username updated' };
  }
  

  await insert('donators', {
    user_id: userId,
    username: username
  });
  return { success: true, message: 'New donator added successfully' };
};


export const removeDonator = async (userId) => {
  const sql = 'DELETE FROM donators WHERE user_id = ?';
  const result = await query(sql, [userId]);
  
  if (result.changes > 0) {
    return { success: true, message: 'Donator removed successfully' };
  }
  return { success: false, message: 'Donator not found' };
};


export const getAllDonators = async () => {
  const sql = 'SELECT * FROM donators ORDER BY created_at ASC';
  return await query(sql);
};

export const isDonator = async (userId) => {
  const donator = await getDonator(userId);
  return donator !== null;
};


export const setDonatorEmoji = async (userId, emoji) => {
  const donator = await getDonator(userId);
  
  if (!donator) {
    return { success: false, message: 'User is not a donator' };
  }
  
  const sql = 'UPDATE donators SET custom_emoji = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
  await query(sql, [emoji, userId]);
  return { success: true, message: 'Custom emoji updated successfully' };
};


export const getDonatorEmoji = async (userId) => {
  const donator = await getDonator(userId);
  return donator ? donator.custom_emoji : null;
};
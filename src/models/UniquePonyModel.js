import { query, getRow, insert, update } from '../utils/database.js';

export const createUniquePonyUpgradeTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS unique_pony_upgrades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      pony_name TEXT NOT NULL,
      upgrade_level INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, pony_name)
    )
  `;
  
  await query(sql);
  
  const indexSql = `
    CREATE INDEX IF NOT EXISTS idx_unique_upgrades_user_id ON unique_pony_upgrades (user_id)
  `;
  
  await query(indexSql);
  
  console.log('Unique pony upgrades table created successfully');
};

export const getUniquePonyUpgrade = async (userId, ponyName) => {
  try {
    const result = await getRow(
      'SELECT upgrade_level FROM unique_pony_upgrades WHERE user_id = ? AND pony_name = ?',
      [userId, ponyName]
    );
    return result ? result.upgrade_level : 0;
  } catch (error) {
    console.error('Error getting unique pony upgrade:', error);
    return 0;
  }
};

export const upgradeUniquePony = async (userId, ponyName, newLevel) => {
  try {
    const existing = await getRow(
      'SELECT id FROM unique_pony_upgrades WHERE user_id = ? AND pony_name = ?',
      [userId, ponyName]
    );
    
    if (existing) {
      await update(
        'unique_pony_upgrades',
        { upgrade_level: newLevel, updated_at: new Date().toISOString() },
        'id = ?',
        [existing.id]
      );
    } else {
      await insert('unique_pony_upgrades', {
        user_id: userId,
        pony_name: ponyName,
        upgrade_level: newLevel
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error upgrading unique pony:', error);
    return false;
  }
};

export const getAllUserUniqueUpgrades = async (userId) => {
  try {
    const result = await query(
      'SELECT pony_name, upgrade_level FROM unique_pony_upgrades WHERE user_id = ?',
      [userId]
    );
    return result || [];
  } catch (error) {
    console.error('Error getting all user unique upgrades:', error);
    return [];
  }
};
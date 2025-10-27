import { query, getRow } from '../utils/database.js';

export async function createClanMapTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS clan_map_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clan_id INTEGER NOT NULL,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      total_experience INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(clan_id)
    )
  `);
}

export async function getClanMapProgress(clanId) {
  let progress = await getRow(
    'SELECT * FROM clan_map_progress WHERE clan_id = ?',
    [clanId]
  );

  if (!progress) {
    await query(
      'INSERT INTO clan_map_progress (clan_id, level, experience, total_experience) VALUES (?, 1, 0, 0)',
      [clanId]
    );
    
    progress = {
      clan_id: clanId,
      level: 1,
      experience: 0,
      total_experience: 0,
      last_updated: new Date().toISOString()
    };
  }

  return progress;
}

export async function addClanMapExperience(clanId, expAmount) {
  const progress = await getClanMapProgress(clanId);
  
  const newExp = progress.experience + expAmount;
  const newTotalExp = progress.total_experience + expAmount;
  
  const newLevel = Math.floor(newTotalExp / 10000) + 1;
  const maxLevel = 13;
  
  const finalLevel = Math.min(newLevel, maxLevel);
  const expForCurrentLevel = newTotalExp % 10000;
  
  const finalExp = finalLevel >= maxLevel ? 0 : expForCurrentLevel;
  const finalTotalExp = finalLevel >= maxLevel ? (maxLevel - 1) * 10000 : newTotalExp;
  
  await query(
    `UPDATE clan_map_progress 
     SET level = ?, experience = ?, total_experience = ?, last_updated = CURRENT_TIMESTAMP 
     WHERE clan_id = ?`,
    [finalLevel, finalExp, finalTotalExp, clanId]
  );
  
  const leveledUp = finalLevel > progress.level;
  
  return {
    leveledUp,
    oldLevel: progress.level,
    newLevel: finalLevel,
    expGained: expAmount,
    currentExp: finalExp,
    expToNext: finalLevel >= maxLevel ? 0 : 10000 - finalExp,
    totalExp: finalTotalExp
  };
}

export async function getClanMapLeaderboard(limit = 10) {
  return await query(
    `SELECT cmp.*, c.name as clan_name 
     FROM clan_map_progress cmp
     LEFT JOIN clans c ON cmp.clan_id = c.id
     ORDER BY cmp.total_experience DESC, cmp.level DESC
     LIMIT ?`,
    [limit]
  );
}

export async function getClanMapStats() {
  const stats = await getRow(
    `SELECT 
       COUNT(*) as total_clans,
       MAX(level) as highest_level,
       MAX(total_experience) as highest_exp,
       AVG(level) as average_level
     FROM clan_map_progress`
  );
  
  return stats || {
    total_clans: 0,
    highest_level: 1,
    highest_exp: 0,
    average_level: 1
  };
}

export const CLAN_MAP_CONSTANTS = {
  MAX_LEVEL: 20,
  EXP_PER_LEVEL: 1000,
  MAP_SIZE: {
    WIDTH: 800,
    HEIGHT: 600
  }
};
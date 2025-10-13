
import { query, getRow } from '../utils/database.js';


export const BACKGROUNDS = {
  DEFAULT: { id: 'default_farm1', name: 'Default', file: 'default_farm1.png', cost: 0 },
  HOME: { id: 'fluttershyhome_farm1', name: 'Fluttershy Home', file: 'fluttershyhome_farm1.png', cost: 1000 },
  UNDERWATER_KINGDOM: { id: 'underwaterkingdom_farm1', name: 'Underwater Kingdom', file: 'underwaterkingdom_farm1.png', cost: 2500 },
  CLOUDSDALE: { id: 'cloudsdale_farm1', name: 'Cloudsdale', file: 'cloudsdale_farm1.png', cost: 5000 },
  

  HALLOWEEN: { 
    id: 'halloween_farm1', 
    name: 'Halloween', 
    file: 'halloween_farm1.png', 
    cost: 0, 
    hidden: true,
    donatorOnly: true,
    description: 'Spooky Halloween theme - donation exclusive!'






  },
  

  FLAWLESS: { 
    id: 'flawless_farm1', 
    name: 'Flawless', 
    file: 'flawless_farm1.png', 
    cost: 0, 
    hidden: true,
    donatorOnly: true,






  },
  

  SUNSET_SATAN: { 
    id: 'sunset_farm1', 
    name: 'Sunset Satan', 
    file: 'sunset_farm1.png', 
    cost: 0, 
    hidden: true,
    donatorOnly: true,
    description: 'Demonic theme featuring the corrupted Sunset Shimmer!'






  },
  

  NIGHTMARE_NIGHT: { 
    id: 'night_farm1', 
    name: 'Nightmare Night', 
    file: 'night_farm1.png', 
    cost: 0, 
    hidden: true,
    rewardOnly: true,
    description: 'Exclusive reward for fully decorating Ponyville for Nightmare Night!'






  }
};

export const createProfileBackgroundsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS profile_backgrounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      background_id TEXT NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, background_id)
    )
  `;
  
  await query(sql);
  
  const indexSql = `CREATE INDEX IF NOT EXISTS idx_profile_backgrounds_user_id ON profile_backgrounds (user_id)`;
  await query(indexSql);
};

export const createUserProfilesTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      active_background TEXT DEFAULT 'default_farm1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  
  const indexSql = `CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id)`;
  await query(indexSql);
};

export const initProfileBackgroundTables = async () => {
  await createProfileBackgroundsTable();
  await createUserProfilesTable();
};


export const getUserBackgrounds = async (userId) => {
  const sql = `
    SELECT background_id FROM profile_backgrounds
    WHERE user_id = ?
  `;
  
  const result = await query(sql, [userId]);
  const purchased = result.map(row => row.background_id);
  

  if (!purchased.includes('default_farm1')) {
    purchased.unshift('default_farm1');
  }
  
  return purchased;
};


export const purchaseBackground = async (userId, backgroundId) => {
  console.log(`[purchaseBackground DEBUG] Adding background ${backgroundId} for user ${userId}`);
  const sql = `
    INSERT OR IGNORE INTO profile_backgrounds (user_id, background_id)
    VALUES (?, ?)
  `;
  
  await query(sql, [userId, backgroundId]);
  console.log(`[purchaseBackground DEBUG] Successfully added background ${backgroundId} for user ${userId}`);
};


export const hasBackground = async (userId, backgroundId) => {
  console.log(`[hasBackground DEBUG] Checking userId: ${userId}, backgroundId: ${backgroundId}`);
  
  if (backgroundId === 'default_farm1') {
    console.log(`[hasBackground DEBUG] Default background detected, returning true`);
    return true;
  }
  
  const sql = `
    SELECT COUNT(*) as count FROM profile_backgrounds
    WHERE user_id = ? AND background_id = ?
  `;
  
  const result = await getRow(sql, [userId, backgroundId]);
  const hasIt = result.count > 0;
  console.log(`[hasBackground DEBUG] Database result for ${backgroundId}: ${hasIt}`);
  return hasIt;
};


export const ensureDefaultBackground = async (userId) => {
  try {
    const sql = `
      INSERT OR IGNORE INTO profile_backgrounds (user_id, background_id)
      VALUES (?, 'default_farm1')
    `;
    await query(sql, [userId]);
    console.log(`[ensureDefaultBackground] Added default background for user ${userId}`);
  } catch (error) {
    console.error('Error ensuring default background:', error);
  }
};


export const setActiveBackground = async (userId, backgroundId) => {

  const checkSql = `
    SELECT user_id FROM user_profiles WHERE user_id = ?
  `;
  
  const exists = await getRow(checkSql, [userId]);
  
  if (exists) {

    const updateSql = `
      UPDATE user_profiles 
      SET active_background = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;
    await query(updateSql, [backgroundId, userId]);
  } else {

    const insertSql = `
      INSERT INTO user_profiles (user_id, active_background)
      VALUES (?, ?)
    `;
    await query(insertSql, [userId, backgroundId]);
  }
};


export const getActiveBackground = async (userId) => {
  const sql = `
    SELECT active_background FROM user_profiles
    WHERE user_id = ?
  `;
  
  const result = await getRow(sql, [userId]);
  return result?.active_background || 'default_farm1';
};

export const getBackgroundInfo = (backgroundId) => {
  let background = Object.values(BACKGROUNDS).find(bg => bg.id === backgroundId);
  

  if (!background && backgroundId.includes('_farm')) {
    const baseId = backgroundId.replace(/_farm\d+$/, '_farm1');
    background = Object.values(BACKGROUNDS).find(bg => bg.id === baseId);
   
    if (background) {
      const farmPart = backgroundId.match(/_farm(\d+)$/)?.[1] || '1';
      const baseFileName = background.file.replace(/_farm1\.png$/, '');
      
      return {
        ...background,
        id: backgroundId,
        file: `${baseFileName}_farm${farmPart}.png`
      };
    }
  }
  
  return background || BACKGROUNDS.DEFAULT;
};

export const getAllBackgrounds = (includeHidden = false) => {
  if (includeHidden) {
    return Object.values(BACKGROUNDS);
  }

  return Object.values(BACKGROUNDS).filter(bg => !bg.hidden);
};


export const initProfileBackgrounds = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS profile_backgrounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      background_id TEXT NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, background_id)
    )
  `;
  
  await query(sql);
};


export const grantDonatorBackground = async (userId) => {
  try {

    await purchaseBackground(userId, 'flawless_farm1');
    console.log(`[grantDonatorBackground] Granted Flawless theme to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error granting donator background:', error);
    return false;
  }
};


export const hasDonatorBackground = async (userId) => {
  return await hasBackground(userId, 'flawless_farm1');
};


export const grantNightmareNightBackground = async (userId) => {
  try {

    await purchaseBackground(userId, 'night_farm1');
    console.log(`[grantNightmareNightBackground] Granted Nightmare Night theme to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error granting Nightmare Night background:', error);
    return false;
  }
};


export const hasNightmareNightBackground = async (userId) => {
  return await hasBackground(userId, 'night_farm1');
};
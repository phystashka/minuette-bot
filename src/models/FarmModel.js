
import { query, getRow, insert, update } from '../utils/database.js';
import { getResourceAmount, updateResources } from './ResourceModel.js';
import { leaderboardCache } from '../utils/leaderboardCache.js';

export const createFarmTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_farms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      level INTEGER DEFAULT 1,
      production_type TEXT DEFAULT 'apple',
      harvest_started_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  
  const indexSql = `CREATE INDEX IF NOT EXISTS idx_user_farms_user_id ON user_farms (user_id)`;
  await query(indexSql);


  const expansionPlansSql = `
    CREATE TABLE IF NOT EXISTS expansion_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      plans INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(expansionPlansSql);
  
  const expansionIndexSql = `CREATE INDEX IF NOT EXISTS idx_expansion_plans_user_id ON expansion_plans (user_id)`;
  await query(expansionIndexSql);


  const productionTimersSql = `
    CREATE TABLE IF NOT EXISTS production_timers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      production_type TEXT NOT NULL,
      harvest_started_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, production_type)
    )
  `;
  
  await query(productionTimersSql);
  
  const timersIndexSql = `CREATE INDEX IF NOT EXISTS idx_production_timers_user_id ON production_timers (user_id)`;
  await query(timersIndexSql);


  const purchasedProductionsSql = `
    CREATE TABLE IF NOT EXISTS purchased_productions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      production_type TEXT NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, production_type)
    )
  `;
  
  await query(purchasedProductionsSql);
  
  const purchasedProductionsIndexSql = `CREATE INDEX IF NOT EXISTS idx_purchased_productions_user_id ON purchased_productions (user_id)`;
  await query(purchasedProductionsIndexSql);
};


export const getUserFarm = async (userId) => {
  try {
    const farm = await getRow(
      'SELECT * FROM user_farms WHERE user_id = ?',
      [userId]
    );
    return farm;
  } catch (error) {
    console.error('Error getting user farm:', error);
    return null;
  }
};


export const createFarm = async (userId) => {
  try {
    await insert('user_farms', {
      user_id: userId,
      level: 1,
      production_type: 'apple',
      harvest_started_at: new Date().toISOString()
    });
    

    await addPurchasedProduction(userId, 'apple');
    

    const { getHarmony, addHarmony } = await import('./HarmonyModel.js');
    const existingHarmony = await getHarmony(userId);
    if (existingHarmony === 0) {

      const { getRow } = await import('../utils/database.js');
      const harmonyRecord = await getRow('SELECT harmony_points FROM harmony WHERE user_id = ?', [userId]);
      if (!harmonyRecord) {
        await addHarmony(userId, 0, 'Farm initialization');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error creating farm:', error);
    return false;
  }
};


export const getExpansionPlans = async (userId) => {
  try {
    const amount = await getResourceAmount(userId, 'expansion_plans');
    return amount || 0;
  } catch (error) {
    console.error('Error getting expansion plans:', error);
    return 0;
  }
};


export const addExpansionPlans = async (userId, amount) => {
  try {
    const current = await getExpansionPlans(userId);
    const newAmount = current + amount;
    
    await updateResources(userId, { expansion_plans: newAmount });
    
    return true;
  } catch (error) {
    console.error('Error adding expansion plans:', error);
    return false;
  }
};


export const spendExpansionPlans = async (userId, amount) => {
  try {
    const current = await getExpansionPlans(userId);
    
    if (current < amount) {
      return false;
    }
    
    const newAmount = current - amount;
    await updateResources(userId, { expansion_plans: newAmount });
    
    return true;
  } catch (error) {
    console.error('Error spending expansion plans:', error);
    return false;
  }
};


export const changeFarmProduction = async (userId, productionType) => {
  try {
    const currentFarm = await getUserFarm(userId);
    if (!currentFarm) {
      return false;
    }


    if (currentFarm.harvest_started_at) {
      await setProductionTimer(userId, currentFarm.production_type, currentFarm.harvest_started_at);
    }


    const newProductionTimer = await getProductionTimer(userId, productionType);
    const newHarvestStartedAt = newProductionTimer ? newProductionTimer.harvest_started_at : null;


    await query(
      'UPDATE user_farms SET production_type = ?, harvest_started_at = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [productionType, newHarvestStartedAt, userId]
    );
    
    return true;
  } catch (error) {
    console.error('Error changing farm production:', error);
    return false;
  }
};


export const startHarvest = async (userId) => {
  try {
    const farm = await getUserFarm(userId);
    if (!farm) {
      return false;
    }

    const currentTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    

    await query(
      'UPDATE user_farms SET harvest_started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
    

    await setProductionTimer(userId, farm.production_type, currentTime);
    
    return true;
  } catch (error) {
    console.error('Error starting harvest:', error);
    return false;
  }
};


export const getHarvestTime = (farmLevel) => {
  const baseTime = 240;

  const reductions = Math.floor(farmLevel / 15);
  const finalTime = Math.max(60, baseTime - (reductions * 30));
  return finalTime;
};


export const isHarvestReady = async (userId) => {
  try {
    const farm = await getUserFarm(userId);
    if (!farm || !farm.harvest_started_at) {
      return false;
    }
    
    const harvestTime = getHarvestTime(farm.level);
    const startTime = new Date(farm.harvest_started_at);
    const currentTime = new Date();
    const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
    
    return elapsedMinutes >= harvestTime;
  } catch (error) {
    console.error('Error checking harvest readiness:', error);
    return false;
  }
};


export const upgradeFarm = async (userId) => {
  try {
    const result = await query(
      'UPDATE user_farms SET level = level + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
    

    if (result.changes > 0) {
      leaderboardCache.invalidateLeaderboard('farm');
    }
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error upgrading farm:', error);
    return false;
  }
};


export const hasFarm = async (userId) => {
  try {
    const farm = await getUserFarm(userId);
    return !!farm;
  } catch (error) {
    console.error('Error checking farm:', error);
    return false;
  }
};


export const calculateUpgradeCost = async (currentLevel, userId = null) => {
  const nextLevel = currentLevel + 1;
  

  let bits = 500;
  let harmony = 15;
  let resources = 50;
  

  bits += (nextLevel - 2) * 100;
  resources += (nextLevel - 2) * 100;
  

  const tensLevel = Math.floor((nextLevel - 1) / 10);
  bits += tensLevel * 1000;
  harmony += tensLevel * 20;
  

  if (userId) {
    try {
      const { getRebirthBonuses } = await import('../commands/economy/rebirth.js');
      const rebirthBonuses = await getRebirthBonuses(userId);
      
      if (rebirthBonuses.farmReduction > 0) {
        const reductionMultiplier = 1 - (rebirthBonuses.farmReduction / 100);
        bits = Math.floor(bits * reductionMultiplier);
        harmony = Math.floor(harmony * reductionMultiplier);
        resources = Math.floor(resources * reductionMultiplier);
      }
    } catch (error) {
      console.error('Error applying rebirth bonuses to farm upgrade cost:', error);
    }
  }
  
  return {
    bits,
    harmony,
    wood: resources,
    stone: resources,
    tools: resources
  };
};


export const getFarmPurchaseCost = async (userId = null) => {
  let bits = 2500;
  let harmony = 30;
  let resources = 200;
  

  if (userId) {
    try {
      const { getRebirthBonuses } = await import('../commands/economy/rebirth.js');
      const rebirthBonuses = await getRebirthBonuses(userId);
      
      if (rebirthBonuses.farmReduction > 0) {
        const reductionMultiplier = 1 - (rebirthBonuses.farmReduction / 100);
        bits = Math.floor(bits * reductionMultiplier);
        harmony = Math.floor(harmony * reductionMultiplier);
        resources = Math.floor(resources * reductionMultiplier);
      }
    } catch (error) {
      console.error('Error applying rebirth bonuses to farm purchase cost:', error);
    }
  }
  
  return {
    bits,
    harmony,
    wood: resources,
    stone: resources,
    tools: resources
  };
};


export const getUserHarvestTimestamp = async (userId) => {
  try {
    const farm = await getUserFarm(userId);
    if (!farm || !farm.harvest_started_at) {
      return null;
    }
    
    const harvestTimeMinutes = getHarvestTime(farm.level);

    const startTime = new Date(farm.harvest_started_at.replace(' ', 'T') + 'Z');
    const harvestTime = new Date(startTime.getTime() + (harvestTimeMinutes * 60 * 1000));
    
    return harvestTime.getTime();
  } catch (error) {
    console.error('Error getting user harvest timestamp:', error);
    return null;
  }
};




export const addPurchasedProduction = async (userId, productionType) => {
  try {
    await query(
      'INSERT OR IGNORE INTO purchased_productions (user_id, production_type) VALUES (?, ?)',
      [userId, productionType]
    );
    return true;
  } catch (error) {
    console.error('Error adding purchased production:', error);
    return false;
  }
};


export const getPurchasedProductions = async (userId) => {
  try {
    const productions = await query(
      'SELECT production_type FROM purchased_productions WHERE user_id = ?',
      [userId]
    );
    return productions.map(row => row.production_type);
  } catch (error) {
    console.error('Error getting purchased productions:', error);
    return [];
  }
};


export const hasProductionType = async (userId, productionType) => {
  try {

    if (productionType === 'apple') {
      return true;
    }
    
    const result = await getRow(
      'SELECT id FROM purchased_productions WHERE user_id = ? AND production_type = ?',
      [userId, productionType]
    );
    return !!result;
  } catch (error) {
    console.error('Error checking production type:', error);
    return false;
  }
};




export const getProductionTimer = async (userId, productionType) => {
  try {
    const timer = await getRow(
      'SELECT * FROM production_timers WHERE user_id = ? AND production_type = ?',
      [userId, productionType]
    );
    return timer;
  } catch (error) {
    console.error('Error getting production timer:', error);
    return null;
  }
};


export const setProductionTimer = async (userId, productionType, harvestStartedAt) => {
  try {
    await query(
      `INSERT OR REPLACE INTO production_timers 
       (user_id, production_type, harvest_started_at, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, productionType, harvestStartedAt]
    );
    return true;
  } catch (error) {
    console.error('Error setting production timer:', error);
    return false;
  }
};


export const getUserHarvestTimestampForProduction = async (userId, productionType) => {
  try {
    const timer = await getProductionTimer(userId, productionType);
    if (!timer || !timer.harvest_started_at) {
      return null;
    }
    
    const farm = await getUserFarm(userId);
    if (!farm) {
      return null;
    }
    
    const harvestTimeMinutes = getHarvestTime(farm.level);
    

    let startTimeMs;
    if (typeof timer.harvest_started_at === 'number') {

      startTimeMs = timer.harvest_started_at;
    } else if (typeof timer.harvest_started_at === 'string') {

      const startTime = new Date(timer.harvest_started_at.replace(' ', 'T') + 'Z');
      startTimeMs = startTime.getTime();
    } else {
      console.error('Unexpected harvest_started_at type:', typeof timer.harvest_started_at, timer.harvest_started_at);
      return null;
    }
    
    const harvestTime = new Date(startTimeMs + (harvestTimeMinutes * 60 * 1000));
    return harvestTime.getTime();
  } catch (error) {
    console.error('Error getting user harvest timestamp for production:', error);
    return null;
  }
};
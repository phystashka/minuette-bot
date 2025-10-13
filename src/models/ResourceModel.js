
import { query, getRow, insert, update, sequelize } from '../utils/database.js';

export const createResourcesTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      wood INTEGER NOT NULL DEFAULT 0,
      stone INTEGER NOT NULL DEFAULT 0,
      tools INTEGER NOT NULL DEFAULT 0,
      celestial_fabric INTEGER NOT NULL DEFAULT 0,
      sun_crystal INTEGER NOT NULL DEFAULT 0,
      royal_wax INTEGER NOT NULL DEFAULT 0,
      cases INTEGER NOT NULL DEFAULT 0,
      gifts INTEGER NOT NULL DEFAULT 0,
      apples INTEGER NOT NULL DEFAULT 0,
      eggs INTEGER NOT NULL DEFAULT 0,
      milk INTEGER NOT NULL DEFAULT 0,
      expansion_plans INTEGER NOT NULL DEFAULT 0,
      pumpkins INTEGER NOT NULL DEFAULT 0,
      candies INTEGER NOT NULL DEFAULT 0,
      pumpkin_baskets INTEGER NOT NULL DEFAULT 0,
      keys INTEGER NOT NULL DEFAULT 0,
      forest_herbs INTEGER NOT NULL DEFAULT 0,
      bone_dust INTEGER NOT NULL DEFAULT 0,
      moonstone_shard INTEGER NOT NULL DEFAULT 0,
      active_battle_potion INTEGER NOT NULL DEFAULT 0,
      battle_potion_expires INTEGER NOT NULL DEFAULT 0,
      active_resource_potion INTEGER NOT NULL DEFAULT 0,
      resource_potion_expires INTEGER NOT NULL DEFAULT 0,
      active_luck_potion INTEGER NOT NULL DEFAULT 0,
      luck_potion_expires INTEGER NOT NULL DEFAULT 0,
      active_discovery_potion INTEGER NOT NULL DEFAULT 0,
      discovery_potion_expires INTEGER NOT NULL DEFAULT 0,
      active_nightmare_potion INTEGER NOT NULL DEFAULT 0,
      nightmare_potion_expires INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  try {
    const columns = await query(`PRAGMA table_info(resources)`);
    const hasGiftsColumn = columns.some(col => col.name === 'gifts');
    const hasPumpkinsColumn = columns.some(col => col.name === 'pumpkins');
    const hasCandiesColumn = columns.some(col => col.name === 'candies');
    const hasApplesColumn = columns.some(col => col.name === 'apples');
    const hasEggsColumn = columns.some(col => col.name === 'eggs');
    const hasMilkColumn = columns.some(col => col.name === 'milk');
    const hasExpansionPlansColumn = columns.some(col => col.name === 'expansion_plans');
    const hasPumpkinBasketsColumn = columns.some(col => col.name === 'pumpkin_baskets');
    
    if (!hasGiftsColumn) {
      await query(`ALTER TABLE resources ADD COLUMN gifts INTEGER NOT NULL DEFAULT 0`);
      console.log('Added gifts column to resources table');
    }
    
    if (!hasPumpkinsColumn) {
      await query(`ALTER TABLE resources ADD COLUMN pumpkins INTEGER NOT NULL DEFAULT 0`);
      console.log('Added pumpkins column to resources table');
    }
    
    if (!hasCandiesColumn) {
      await query(`ALTER TABLE resources ADD COLUMN candies INTEGER NOT NULL DEFAULT 0`);
      console.log('Added candies column to resources table');
    }
    
    if (!hasApplesColumn) {
      await query(`ALTER TABLE resources ADD COLUMN apples INTEGER NOT NULL DEFAULT 0`);
      console.log('Added apples column to resources table');
    }
    
    if (!hasEggsColumn) {
      await query(`ALTER TABLE resources ADD COLUMN eggs INTEGER NOT NULL DEFAULT 0`);
      console.log('Added eggs column to resources table');
    }
    
    if (!hasMilkColumn) {
      await query(`ALTER TABLE resources ADD COLUMN milk INTEGER NOT NULL DEFAULT 0`);
      console.log('Added milk column to resources table');
    }
    
    if (!hasExpansionPlansColumn) {
      await query(`ALTER TABLE resources ADD COLUMN expansion_plans INTEGER NOT NULL DEFAULT 0`);
      console.log('Added expansion_plans column to resources table');
    }
    
    if (!hasPumpkinBasketsColumn) {
      await query(`ALTER TABLE resources ADD COLUMN pumpkin_baskets INTEGER NOT NULL DEFAULT 0`);
      console.log('Added pumpkin_baskets column to resources table');
    }
    

    const hasKeysColumn = columns.some(col => col.name === 'keys');
    if (!hasKeysColumn) {
      await query(`ALTER TABLE resources ADD COLUMN keys INTEGER NOT NULL DEFAULT 0`);
      console.log('Added keys column to resources table');
    }
    

    const hasForestHerbsColumn = columns.some(col => col.name === 'forest_herbs');
    const hasBoneDustColumn = columns.some(col => col.name === 'bone_dust');
    const hasMoonstoneShardColumn = columns.some(col => col.name === 'moonstone_shard');
    
    if (!hasForestHerbsColumn) {
      await query(`ALTER TABLE resources ADD COLUMN forest_herbs INTEGER NOT NULL DEFAULT 0`);
      console.log('Added forest_herbs column to resources table');
    }
    
    if (!hasBoneDustColumn) {
      await query(`ALTER TABLE resources ADD COLUMN bone_dust INTEGER NOT NULL DEFAULT 0`);
      console.log('Added bone_dust column to resources table');
    }
    
    if (!hasMoonstoneShardColumn) {
      await query(`ALTER TABLE resources ADD COLUMN moonstone_shard INTEGER NOT NULL DEFAULT 0`);
      console.log('Added moonstone_shard column to resources table');
    }
    
    const hasDiamondsColumn = columns.some(col => col.name === 'diamonds');
    if (!hasDiamondsColumn) {
      await query(`ALTER TABLE resources ADD COLUMN diamonds INTEGER NOT NULL DEFAULT 0`);
      console.log('Added diamonds column to resources table');
    }
    

    const potionColumns = [
      'active_battle_potion', 'battle_potion_expires',
      'active_resource_potion', 'resource_potion_expires', 
      'active_luck_potion', 'luck_potion_expires',
      'active_discovery_potion', 'discovery_potion_expires',
      'active_nightmare_potion', 'nightmare_potion_expires'
    ];
    
    for (const columnName of potionColumns) {
      const hasColumn = columns.some(col => col.name === columnName);
      if (!hasColumn) {
        const columnType = columnName.includes('expires') ? 'INTEGER' : 'INTEGER';
        await query(`ALTER TABLE resources ADD COLUMN ${columnName} ${columnType} NOT NULL DEFAULT 0`);
        console.log(`Added ${columnName} column to resources table`);
      }
    }
  } catch (error) {
    console.error('Error checking/adding columns:', error);
  }
  

  const indexSql = `
    CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources (user_id)
  `;
  
  await query(indexSql);
};

export const initResourceTables = async () => {
  await createResourcesTable();
};


try {
  initResourceTables();

} catch (error) {
  console.error('Error initializing resource tables:', error);
}

export const getResourcesByUserId = async (userId) => {
  const sql = `
    SELECT * FROM resources
    WHERE user_id = ?
  `;
  
  return await getRow(sql, [userId]);
};

export const createResources = async (userId) => {
  try {
    const id = await insert('resources', {
      user_id: userId,
      wood: 0,
      stone: 0,
      tools: 0,
      celestial_fabric: 0,
      sun_crystal: 0,
      royal_wax: 0,
      cases: 0,
      gifts: 0,
      apples: 0,
      eggs: 0,
      milk: 0,
      expansion_plans: 0,
      pumpkins: 0,
      candies: 0,
      pumpkin_baskets: 0,
      keys: 0
    });
    
    return { 
      id, 
      user_id: userId, 
      wood: 0, 
      stone: 0, 
      tools: 0,
      celestial_fabric: 0,
      sun_crystal: 0,
      royal_wax: 0,
      cases: 0,
      gifts: 0,
      apples: 0,
      eggs: 0,
      milk: 0,
      expansion_plans: 0,
      pumpkins: 0,
      candies: 0,
      pumpkin_baskets: 0,
      keys: 0
    };
  } catch (error) {
    throw error;
  }
};

export const updateResources = async (userId, data) => {
  try {
    const updateData = {};
    
    if (data.wood !== undefined) updateData.wood = data.wood;
    if (data.stone !== undefined) updateData.stone = data.stone;
    if (data.tools !== undefined) updateData.tools = data.tools;
    if (data.celestial_fabric !== undefined) updateData.celestial_fabric = data.celestial_fabric;
    if (data.sun_crystal !== undefined) updateData.sun_crystal = data.sun_crystal;
    if (data.royal_wax !== undefined) updateData.royal_wax = data.royal_wax;
    if (data.cases !== undefined) updateData.cases = data.cases;
    if (data.expansion_plans !== undefined) updateData.expansion_plans = data.expansion_plans;
    if (data.apples !== undefined) updateData.apples = data.apples;
    if (data.eggs !== undefined) updateData.eggs = data.eggs;
    if (data.milk !== undefined) updateData.milk = data.milk;
    if (data.gifts !== undefined) updateData.gifts = data.gifts;
    if (data.pumpkins !== undefined) updateData.pumpkins = data.pumpkins;
    if (data.candies !== undefined) updateData.candies = data.candies;
    if (data.pumpkin_baskets !== undefined) updateData.pumpkin_baskets = data.pumpkin_baskets;
    if (data.keys !== undefined) updateData.keys = data.keys;
    if (data.diamonds !== undefined) updateData.diamonds = data.diamonds;
    

    if (data.forest_herbs !== undefined) updateData.forest_herbs = data.forest_herbs;
    if (data.bone_dust !== undefined) updateData.bone_dust = data.bone_dust;
    if (data.moonstone_shard !== undefined) updateData.moonstone_shard = data.moonstone_shard;
    

    if (data.forest_herbs !== undefined) updateData.forest_herbs = data.forest_herbs;
    if (data.bone_dust !== undefined) updateData.bone_dust = data.bone_dust;
    if (data.moonstone_shard !== undefined) updateData.moonstone_shard = data.moonstone_shard;
    

    if (data.active_battle_potion !== undefined) updateData.active_battle_potion = data.active_battle_potion;
    if (data.battle_potion_expires !== undefined) updateData.battle_potion_expires = data.battle_potion_expires;
    if (data.active_resource_potion !== undefined) updateData.active_resource_potion = data.active_resource_potion;
    if (data.resource_potion_expires !== undefined) updateData.resource_potion_expires = data.resource_potion_expires;
    if (data.active_luck_potion !== undefined) updateData.active_luck_potion = data.active_luck_potion;
    if (data.luck_potion_expires !== undefined) updateData.luck_potion_expires = data.luck_potion_expires;
    if (data.active_discovery_potion !== undefined) updateData.active_discovery_potion = data.active_discovery_potion;
    if (data.discovery_potion_expires !== undefined) updateData.discovery_potion_expires = data.discovery_potion_expires;
    if (data.active_nightmare_potion !== undefined) updateData.active_nightmare_potion = data.active_nightmare_potion;
    if (data.nightmare_potion_expires !== undefined) updateData.nightmare_potion_expires = data.nightmare_potion_expires;
    

    updateData.updated_at = new Date().toISOString();
    
    const result = await update('resources', updateData, { user_id: userId });
    return result > 0;
  } catch (error) {
    throw error;
  }
};

export const addResource = async (userId, resourceType, amount) => {
  try {
    let resources = await getResourcesByUserId(userId);
    
    if (!resources) {
      resources = await createResources(userId);
    }
    
    const updateData = {};
    
    switch (resourceType.toLowerCase()) {
      case 'wood':
        updateData.wood = (resources.wood || 0) + amount;
        break;
      case 'stone':
        updateData.stone = (resources.stone || 0) + amount;
        break;
      case 'tools':
        updateData.tools = (resources.tools || 0) + amount;
        break;
      case 'celestial_fabric':
        updateData.celestial_fabric = (resources.celestial_fabric || 0) + amount;
        break;
      case 'sun_crystal':
        updateData.sun_crystal = (resources.sun_crystal || 0) + amount;
        break;
      case 'royal_wax':
        updateData.royal_wax = (resources.royal_wax || 0) + amount;
        break;
      case 'apples':
        updateData.apples = (resources.apples || 0) + amount;
        break;
      case 'eggs':
        updateData.eggs = (resources.eggs || 0) + amount;
        break;
      case 'milk':
        updateData.milk = (resources.milk || 0) + amount;
        break;
      case 'expansion_plans':
        updateData.expansion_plans = (resources.expansion_plans || 0) + amount;
        break;
      case 'pumpkins':
        updateData.pumpkins = (resources.pumpkins || 0) + amount;
        break;
      case 'candies':
        updateData.candies = (resources.candies || 0) + amount;
        break;
      case 'pumpkin_baskets':
        updateData.pumpkin_baskets = (resources.pumpkin_baskets || 0) + amount;
        break;
      case 'keys':
        updateData.keys = (resources.keys || 0) + amount;
        break;
      case 'forest_herbs':
        updateData.forest_herbs = (resources.forest_herbs || 0) + amount;
        break;
      case 'bone_dust':
        updateData.bone_dust = (resources.bone_dust || 0) + amount;
        break;
      case 'moonstone_shard':
        updateData.moonstone_shard = (resources.moonstone_shard || 0) + amount;
        break;

      default:
        throw new Error('Invalid resource type');
    }
    
    const result = await updateResources(userId, updateData);
    return result;
  } catch (error) {
    throw error;
  }
};

export const getResourceAmount = async (userId, resourceType) => {
  try {
    const resources = await getResourcesByUserId(userId);
    
    if (!resources) {
      return 0;
    }
    
    switch (resourceType.toLowerCase()) {
      case 'wood':
        return resources.wood || 0;
      case 'stone':
        return resources.stone || 0;
      case 'tools':
        return resources.tools || 0;
      case 'celestial_fabric':
        return resources.celestial_fabric || 0;
      case 'sun_crystal':
        return resources.sun_crystal || 0;
      case 'royal_wax':
        return resources.royal_wax || 0;
      case 'expansion_plans':
        return resources.expansion_plans || 0;
      case 'apples':
        return resources.apples || 0;
      case 'eggs':
        return resources.eggs || 0;
      case 'milk':
        return resources.milk || 0;
      case 'pumpkins':
        return resources.pumpkins || 0;
      case 'candies':
        return resources.candies || 0;
      case 'pumpkin_baskets':
        return resources.pumpkin_baskets || 0;
      case 'keys':
        return resources.keys || 0;
      case 'forest_herbs':
        return resources.forest_herbs || 0;
      case 'bone_dust':
        return resources.bone_dust || 0;
      case 'moonstone_shard':
        return resources.moonstone_shard || 0;

      default:
        throw new Error('Invalid resource type');
    }
  } catch (error) {
    throw error;
  }
};

export const removeResource = async (userId, resourceType, amount) => {
  try {
    let resources = await getResourcesByUserId(userId);
    
    if (!resources) {
      throw new Error('User has no resources');
    }
    
    const updateData = {};
    
    switch (resourceType.toLowerCase()) {
      case 'wood':
        if (resources.wood < amount) {
          throw new Error('Not enough wood');
        }
        updateData.wood = resources.wood - amount;
        break;
      case 'stone':
        if (resources.stone < amount) {
          throw new Error('Not enough stone');
        }
        updateData.stone = resources.stone - amount;
        break;
      case 'tools':
        if (resources.tools < amount) {
          throw new Error('Not enough tools');
        }
        updateData.tools = resources.tools - amount;
        break;
      case 'celestial_fabric':
        if (resources.celestial_fabric < amount) {
          throw new Error('Not enough celestial fabric');
        }
        updateData.celestial_fabric = resources.celestial_fabric - amount;
        break;
      case 'sun_crystal':
        if (resources.sun_crystal < amount) {
          throw new Error('Not enough sun crystal');
        }
        updateData.sun_crystal = resources.sun_crystal - amount;
        break;
      case 'royal_wax':
        if (resources.royal_wax < amount) {
          throw new Error('Not enough royal wax');
        }
        updateData.royal_wax = resources.royal_wax - amount;
        break;
      case 'expansion_plans':
        if ((resources.expansion_plans || 0) < amount) {
          throw new Error('Not enough expansion plans');
        }
        updateData.expansion_plans = (resources.expansion_plans || 0) - amount;
        break;
      case 'apples':
        if ((resources.apples || 0) < amount) {
          throw new Error('Not enough apples');
        }
        updateData.apples = (resources.apples || 0) - amount;
        break;
      case 'eggs':
        if ((resources.eggs || 0) < amount) {
          throw new Error('Not enough eggs');
        }
        updateData.eggs = (resources.eggs || 0) - amount;
        break;
      case 'milk':
        if ((resources.milk || 0) < amount) {
          throw new Error('Not enough milk');
        }
        updateData.milk = (resources.milk || 0) - amount;
        break;
      case 'pumpkins':
        if ((resources.pumpkins || 0) < amount) {
          throw new Error('Not enough pumpkins');
        }
        updateData.pumpkins = (resources.pumpkins || 0) - amount;
        break;
      case 'candies':
        if ((resources.candies || 0) < amount) {
          throw new Error('Not enough candies');
        }
        updateData.candies = (resources.candies || 0) - amount;
        break;
      case 'pumpkin_baskets':
        if ((resources.pumpkin_baskets || 0) < amount) {
          throw new Error('Not enough pumpkin baskets');
        }
        updateData.pumpkin_baskets = (resources.pumpkin_baskets || 0) - amount;
        break;
      case 'keys':
        if ((resources.keys || 0) < amount) {
          throw new Error('Not enough keys');
        }
        updateData.keys = (resources.keys || 0) - amount;
        break;
      case 'forest_herbs':
        if ((resources.forest_herbs || 0) < amount) {
          throw new Error('Not enough forest herbs');
        }
        updateData.forest_herbs = (resources.forest_herbs || 0) - amount;
        break;
      case 'bone_dust':
        if ((resources.bone_dust || 0) < amount) {
          throw new Error('Not enough bone dust');
        }
        updateData.bone_dust = (resources.bone_dust || 0) - amount;
        break;
      case 'moonstone_shard':
        if ((resources.moonstone_shard || 0) < amount) {
          throw new Error('Not enough moonstone shard');
        }
        updateData.moonstone_shard = (resources.moonstone_shard || 0) - amount;
        break;

      default:
        throw new Error('Invalid resource type');
    }
    
    return await updateResources(userId, updateData);
  } catch (error) {
    throw error;
  }
};

export const getResourcesFormatted = async (userId) => {
  try {
    const resources = await getResourcesByUserId(userId);
    
    if (!resources) {
      return [];
    }
    
    return [
      { resource_type: 'wood', amount: resources.wood },
      { resource_type: 'stone', amount: resources.stone },
      { resource_type: 'tools', amount: resources.tools },
      { resource_type: 'celestial_fabric', amount: resources.celestial_fabric },
      { resource_type: 'sun_crystal', amount: resources.sun_crystal },
      { resource_type: 'royal_wax', amount: resources.royal_wax }

    ];
  } catch (error) {
    throw error;
  }
};


export const getCases = async (userId) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    return resources.cases || 0;
  } catch (error) {
    console.error('Error getting cases:', error);
    return 0;
  }
};

export const addCases = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    
    const newAmount = (resources.cases || 0) + amount;
    await updateResources(userId, { cases: newAmount });
    return newAmount;
  } catch (error) {
    console.error('Error adding cases:', error);
    throw error;
  }
};

export const removeCases = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      return false;
    }
    
    const currentCases = resources.cases || 0;
    if (currentCases < amount) {
      return false;
    }
    
    const newAmount = currentCases - amount;
    await updateResources(userId, { cases: newAmount });
    return true;
  } catch (error) {
    console.error('Error removing cases:', error);
    return false;
  }
};


export const getGifts = async (userId) => {
  try {
    let resources = await getResourcesByUserId(userId);
    console.log(`Getting gifts for user ${userId}, resources:`, resources);
    if (!resources) {
      resources = await createResources(userId);
    }
    const gifts = resources.gifts || 0;
    console.log(`Returning gifts count: ${gifts}`);
    return gifts;
  } catch (error) {
    console.error('Error getting gifts:', error);
    return 0;
  }
};

export const addGifts = async (userId, amount = 1) => {
  try {
    console.log(`Adding ${amount} gifts to user ${userId}`);
    let resources = await getResourcesByUserId(userId);
    console.log(`Current resources:`, resources);
    if (!resources) {
      resources = await createResources(userId);
      console.log(`Created new resources:`, resources);
    }
    
    const newAmount = (resources.gifts || 0) + amount;
    console.log(`New gift amount will be: ${newAmount}`);
    await updateResources(userId, { gifts: newAmount });
    console.log(`Updated resources with gifts: ${newAmount}`);
    return newAmount;
  } catch (error) {
    console.error('Error adding gifts:', error);
    throw error;
  }
};

export const removeGifts = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      return false;
    }
    
    const currentGifts = resources.gifts || 0;
    if (currentGifts < amount) {
      return false;
    }
    
    const newAmount = currentGifts - amount;
    await updateResources(userId, { gifts: newAmount });
    return true;
  } catch (error) {
    console.error('Error removing gifts:', error);
    return false;
  }
};


export const getPumpkinBaskets = async (userId) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    return resources.pumpkin_baskets || 0;
  } catch (error) {
    console.error('Error getting pumpkin baskets:', error);
    return 0;
  }
};

export const addPumpkinBaskets = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    
    const newAmount = (resources.pumpkin_baskets || 0) + amount;
    await updateResources(userId, { pumpkin_baskets: newAmount });
    return newAmount;
  } catch (error) {
    console.error('Error adding pumpkin baskets:', error);
    throw error;
  }
};

export const removePumpkinBaskets = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      return false;
    }
    
    const currentBaskets = resources.pumpkin_baskets || 0;
    if (currentBaskets < amount) {
      return false;
    }
    
    const newAmount = currentBaskets - amount;
    await updateResources(userId, { pumpkin_baskets: newAmount });
    return true;
  } catch (error) {
    console.error('Error removing pumpkin baskets:', error);
    return false;
  }
};


export const getKeys = async (userId) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    return resources.keys || 0;
  } catch (error) {
    console.error('Error getting keys:', error);
    return 0;
  }
};

export const addKeys = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    
    const newAmount = (resources.keys || 0) + amount;
    await updateResources(userId, { keys: newAmount });
    return newAmount;
  } catch (error) {
    console.error('Error adding keys:', error);
    throw error;
  }
};

export const removeKeys = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      return false;
    }
    
    const currentKeys = resources.keys || 0;
    if (currentKeys < amount) {
      return false;
    }
    
    const newAmount = currentKeys - amount;
    await updateResources(userId, { keys: newAmount });
    return true;
  } catch (error) {
    console.error('Error removing keys:', error);
    return false;
  }
};


export const getDiamonds = async (userId) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    return resources.diamonds || 0;
  } catch (error) {
    console.error('Error getting diamonds:', error);
    return 0;
  }
};

export const addDiamonds = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    
    const newAmount = (resources.diamonds || 0) + amount;
    await updateResources(userId, { diamonds: newAmount });
    return newAmount;
  } catch (error) {
    console.error('Error adding diamonds:', error);
    throw error;
  }
};

export const removeDiamonds = async (userId, amount = 1) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      return false;
    }
    
    const currentDiamonds = resources.diamonds || 0;
    if (currentDiamonds < amount) {
      return false;
    }
    
    const newAmount = currentDiamonds - amount;
    await updateResources(userId, { diamonds: newAmount });
    return true;
  } catch (error) {
    console.error('Error removing diamonds:', error);
    return false;
  }
};


export const getForestHerbs = async (userId) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    return resources.forest_herbs || 0;
  } catch (error) {
    console.error('Error getting forest herbs:', error);
    return 0;
  }
};

export const getBoneDust = async (userId) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    return resources.bone_dust || 0;
  } catch (error) {
    console.error('Error getting bone dust:', error);
    return 0;
  }
};

export const getMoonstoneShard = async (userId) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    return resources.moonstone_shard || 0;
  } catch (error) {
    console.error('Error getting moonstone shard:', error);
    return 0;
  }
};


export const hasActivePotion = async (userId, potionType) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      return false;
    }
    
    const activeColumn = `active_${potionType}_potion`;
    const expiresColumn = `${potionType}_potion_expires`;
    
    const isActive = resources[activeColumn] > 0;
    const expiresAt = resources[expiresColumn] || 0;
    const now = Date.now();
    

    if (isActive && expiresAt > 0 && now > expiresAt) {
      await updateResources(userId, {
        ...resources,
        [activeColumn]: 0,
        [expiresColumn]: 0
      });
      return false;
    }
    
    return isActive && expiresAt > now;
  } catch (error) {
    console.error('Error checking active potion:', error);
    return false;
  }
};

export const activatePotion = async (userId, potionType, duration) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      resources = await createResources(userId);
    }
    
    const activeColumn = `active_${potionType}_potion`;
    const expiresColumn = `${potionType}_potion_expires`;
    const expiresAt = Date.now() + duration;
    
    await updateResources(userId, {
      ...resources,
      [activeColumn]: 1,
      [expiresColumn]: expiresAt
    });
    
    return true;
  } catch (error) {
    console.error('Error activating potion:', error);
    return false;
  }
};

export const getPotionTimeLeft = async (userId, potionType) => {
  try {
    let resources = await getResourcesByUserId(userId);
    if (!resources) {
      return 0;
    }
    
    const activeColumn = `active_${potionType}`;
    const expiresColumn = `${potionType}_expires`;
    
    const isActive = resources[activeColumn] > 0;
    const expiresAt = resources[expiresColumn] || 0;
    const now = Date.now();
    
    if (!isActive || expiresAt <= now) {
      return 0;
    }
    
    return expiresAt - now;
  } catch (error) {
    console.error('Error getting potion time left:', error);
    return 0;
  }
};

export default {
  initResourceTables,
  createResourcesTable,
  getResourcesByUserId,
  createResources,
  updateResources,
  addResource,
  getResourceAmount,
  removeResource,
  deductResource: removeResource,
  getResourcesFormatted,
  getCases,
  addCases,
  removeCases,
  getGifts,
  addGifts,
  removeGifts,
  getPumpkinBaskets,
  addPumpkinBaskets,
  removePumpkinBaskets,
  getDiamonds,
  addDiamonds,
  removeDiamonds,
  getForestHerbs,
  getBoneDust,
  getMoonstoneShard,
  hasActivePotion,
  activatePotion,
  getPotionTimeLeft
}; 
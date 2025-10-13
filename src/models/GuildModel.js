
import { query, getRow, insert, update, sequelize } from '../utils/database.js';

export const createGuildsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon_url TEXT,
      owner_id TEXT NOT NULL,
      member_count INTEGER DEFAULT 0,
      premium_tier INTEGER DEFAULT 0,
      language TEXT DEFAULT 'en',
      joined_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `;
  
  return await query(sql);
};

export const getGuild = async (guildId) => {
  const sql = 'SELECT * FROM guilds WHERE guild_id = ?';
  return await getRow(sql, [guildId]);
};

export const saveGuild = async (guildData) => {
  const existingGuild = await getGuild(guildData.guild_id);
  
  const now = new Date().toISOString();
  
  if (existingGuild) {
    const data = {
      name: guildData.name,
      icon_url: guildData.icon_url,
      owner_id: guildData.owner_id,
      member_count: guildData.member_count,
      premium_tier: guildData.premium_tier || 0,
      updated_at: now
    };
    
    return await update('guilds', data, { guild_id: guildData.guild_id });
  } else {
    const data = {
      guild_id: guildData.guild_id,
      name: guildData.name,
      icon_url: guildData.icon_url,
      owner_id: guildData.owner_id,
      member_count: guildData.member_count || 0,
      premium_tier: guildData.premium_tier || 0,
      joined_at: now,
      updated_at: now
    };
    
    return await insert('guilds', data);
  }
};

export const getAllGuilds = async () => {
  const sql = 'SELECT * FROM guilds ORDER BY member_count DESC';
  return await sequelize.query(sql, {
    type: sequelize.QueryTypes.SELECT
  });
};

export const getActiveGuilds = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sql = 'SELECT * FROM guilds WHERE updated_at > ? ORDER BY member_count DESC';
  return await sequelize.query(sql, {
    replacements: [thirtyDaysAgo.toISOString()],
    type: sequelize.QueryTypes.SELECT
  });
};

export const removeGuild = async (guildId) => {
  const sql = 'DELETE FROM guilds WHERE guild_id = ?';
  const [result] = await sequelize.query(sql, {
    replacements: [guildId],
    type: sequelize.QueryTypes.DELETE
  });
  return result > 0;
};


export const getGuildLanguage = async (guildId) => {
  try {
    const guild = await getGuild(guildId);
    return guild?.language || 'en';
  } catch (error) {
    console.error('Error getting guild language:', error);
    return 'en';
  }
};

export const setGuildLanguage = async (guildId, language) => {
  try {
    console.log(`Setting language ${language} for guild ${guildId}`);
    

    if (!['en', 'ru'].includes(language)) {
      throw new Error('Unsupported language');
    }
    
    const existingGuild = await getGuild(guildId);
    console.log(`Existing guild found:`, !!existingGuild);
    
    const now = new Date().toISOString();
    
    if (existingGuild) {

      const data = {
        language: language,
        updated_at: now
      };
      
      console.log(`Updating guild with data:`, data);
      const result = await update('guilds', data, { guild_id: guildId });
      console.log(`Update result:`, result);
      

      const success = result > 0;
      console.log(`Update successful: ${success} (${result} rows affected)`);
      return success;
    } else {

      const data = {
        guild_id: guildId,
        name: 'Unknown',
        owner_id: 'Unknown',
        language: language,
        joined_at: now,
        updated_at: now
      };
      
      console.log(`Inserting new guild with data:`, data);
      const result = await insert('guilds', data);
      console.log(`Insert result:`, result);
      return !!result;
    }
  } catch (error) {
    console.error('Error setting guild language:', error);
    return false;
  }
};


export const updateGuildsTableStructure = async () => {
  try {
    const checkTableSql = `PRAGMA table_info(guilds)`;
    
    const columnInfo = await sequelize.query(checkTableSql, {
      type: sequelize.QueryTypes.SELECT
    });
    
    const columns = columnInfo.map(col => col.name);
    

    if (!columns.includes('language')) {
      console.log('Updating guilds table: adding language column...');
      await query(`ALTER TABLE guilds ADD COLUMN language TEXT DEFAULT 'en'`);
      console.log('Successfully added language column');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating guilds table structure:', error);
    throw error;
  }
}; 
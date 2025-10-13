import { Sequelize } from 'sequelize';
import { dbConfig } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../', dbConfig.storage);


export const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbPath,
  logging: dbConfig.logging,
  define: dbConfig.define
});


export const initDatabase = async () => {
  try {

    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    

    await sequelize.authenticate();

    

    process.on('SIGINT', async () => {

      await sequelize.close();
      process.exit(0);
    });
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};


export const query = async (sql, params = []) => {
  const MAX_RETRIES = 3;
  let retries = 0;

  async function attemptQuery() {
    try {

      const queryType = sql.trim().split(' ')[0].toUpperCase();
      let type = sequelize.QueryTypes.SELECT;
      

      if (queryType === 'INSERT') {
        type = sequelize.QueryTypes.INSERT;
      } else if (queryType === 'UPDATE') {
        type = sequelize.QueryTypes.UPDATE;
      } else if (queryType === 'DELETE') {
        type = sequelize.QueryTypes.DELETE;
      } else if (queryType === 'CREATE' || queryType === 'ALTER' || queryType === 'DROP' || queryType === 'PRAGMA') {
        type = sequelize.QueryTypes.RAW;
      }
      
      const results = await sequelize.query(sql, {
        replacements: params,
        type: type
      });


      if (type === sequelize.QueryTypes.DELETE || type === sequelize.QueryTypes.UPDATE) {
        return results;
      }


      if (type === sequelize.QueryTypes.SELECT) {
        return results;
      }
      

      return results[0];
    } catch (error) {
      if (retries < MAX_RETRIES) {
        retries++;

        try {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          return await attemptQuery();
        } catch (reconnectError) {
          console.error('Error during retry:', reconnectError);
        }
      }
      
      throw error;
    }
  }

  return await attemptQuery();
};


export const getRow = async (sql, params = []) => {
  const results = await sequelize.query(sql, {
    replacements: params,
    type: sequelize.QueryTypes.SELECT
  });
  
  return results[0] || null;
};


export const insert = async (table, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;


  
  try {
    const [result] = await sequelize.query(sql, {
      replacements: values,
      type: sequelize.QueryTypes.INSERT
    });

    return result;
  } catch (error) {
    console.error(`[DEBUG-insert] Error inserting into ${table}:`, error);
    

    try {
      const tableCheckSql = `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`;
      const tableExists = await sequelize.query(tableCheckSql, {
        type: sequelize.QueryTypes.SELECT
      });

      
      if (tableExists.length === 0) {
        console.error(`[DEBUG-insert] Table '${table}' does not exist!`);
      } else {

        const structureSql = `PRAGMA table_info(${table})`;
        const structure = await sequelize.query(structureSql, {
          type: sequelize.QueryTypes.SELECT
        });

      }
    } catch (checkError) {
      console.error(`[DEBUG-insert] Error checking table:`, checkError);
    }
    
    throw error;
  }
};


export const update = async (table, data, where) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  
  let sql, params;
  
  if (typeof where === 'string') {
    sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    params = values;
  } else if (typeof where === 'object') {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
    
    sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    params = [...values, ...whereValues];
  } else {
    throw new Error("Oh my! The 'where' parameter must be a string or an object!");
  }
  
  try {
    const result = await sequelize.query(sql, {
      replacements: params,
      type: sequelize.QueryTypes.UPDATE
    });
    


    return result && result.length >= 2 ? result[1] : 0;
  } catch (error) {
    console.error(`Error updating ${table}:`, error);
    throw error;
  }
};


export const remove = async (table, where, params = []) => {
  const sql = `DELETE FROM ${table} WHERE ${where}`;
  
  try {
    const [result] = await sequelize.query(sql, {
      replacements: params,
      type: sequelize.QueryTypes.DELETE
    });
    return result;
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error);
    throw error;
  }
};

export const healthCheck = async () => {
  try {
    await sequelize.authenticate();
    
    const versionResult = await sequelize.query('SELECT sqlite_version() as version', {
      type: sequelize.QueryTypes.SELECT
    });
    
    return {
      status: 'ok',
      version: versionResult[0]?.version || 'Unknown',
      file: dbPath,
      dialect: dbConfig.dialect
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Oh no! My gears are stuck connecting to the database: ${error.message}`
    };
  }
};


export const closeDatabase = async () => {
  try {
    await sequelize.close();

  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};


import { query, getRow, insert, update, remove } from '../utils/database.js';
import { leaderboardCache } from '../utils/leaderboardCache.js';

export const createPoniesTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS ponies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      pony_name TEXT NOT NULL,
      pony_age INTEGER NOT NULL,
      pony_race TEXT NOT NULL,
      pony_description TEXT,
      bits INTEGER NOT NULL DEFAULT 100,
      reputation INTEGER NOT NULL DEFAULT 50,
      influence REAL NOT NULL DEFAULT 0,
      canterlot_unlocked INTEGER NOT NULL DEFAULT 0,
      location TEXT NOT NULL DEFAULT 'ponyville',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  const indexSql = `
    CREATE INDEX IF NOT EXISTS idx_ponies_user_id ON ponies (user_id)
  `;
  
  await query(indexSql);


  const bankSql = `
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES ponies(user_id) ON DELETE CASCADE
    )
  `;

  await query(bankSql);


  const bankIndexSql = `
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts (user_id)
  `;

  await query(bankIndexSql);
};

export const initPonyTables = async () => {
  await createPoniesTable();
};


try {
  initPonyTables();

} catch (error) {
  console.error('Error initializing pony tables:', error);
}

export const getPonyByUserId = async (userId) => {
  const sql = `
    SELECT p.*, COALESCE(b.balance, 0) as bank_balance
    FROM ponies p
    LEFT JOIN bank_accounts b ON p.user_id = b.user_id
    WHERE p.user_id = ?
  `;
  
  return await getRow(sql, [userId]);
};

export const createPony = async (data) => {
  try {

    const existingPony = await getPonyByUserId(data.user_id);
    if (existingPony) {
      const error = new Error('User already has a pony');
      error.code = 'PONY_EXISTS';
      throw error;
    }

    const id = await insert('ponies', {
      user_id: data.user_id,
      pony_name: data.pony_name,
      pony_age: data.pony_age,
      pony_race: data.pony_race,
      pony_description: data.pony_description || null,
      bits: data.bits || 100,
      reputation: data.reputation || 50,
      influence: data.influence || 0,
      canterlot_unlocked: data.canterlot_unlocked ? 1 : 0
    });


    try {
      await query(`
        INSERT OR IGNORE INTO bank_accounts (user_id, balance, created_at, updated_at)
        VALUES (?, 0, datetime('now'), datetime('now'))
      `, [data.user_id]);
    } catch (bankError) {
      console.log(`Bank account for user ${data.user_id} already exists or error occurred:`, bankError.message);

    }
    
    return { id, ...data };
  } catch (error) {

    if (error.name === 'SequelizeUniqueConstraintError' || 
        (error.message && error.message.includes('UNIQUE constraint failed'))) {
      const duplicateError = new Error('User already has a pony');
      duplicateError.code = 'PONY_EXISTS';
      throw duplicateError;
    }
    throw error;
  }
};

export const updatePony = async (userId, data) => {
  try {

    if (data.canterlot_unlocked !== undefined) {
      data.canterlot_unlocked = data.canterlot_unlocked ? 1 : 0;
    }
    

    data.updated_at = new Date().toISOString();
    
    const success = await update('ponies', data, { user_id: userId });
    return success > 0;
  } catch (error) {
    throw error;
  }
};

export const addBits = async (userId, amount) => {
  try {
    const sql = `
      UPDATE ponies
      SET bits = bits + ?,
          updated_at = ?
      WHERE user_id = ?
    `;
    
    const result = await query(sql, [amount, new Date().toISOString(), userId]);
    

    const affectedRows = Array.isArray(result) ? result[1] : result;
    

    if (affectedRows > 0) {
      leaderboardCache.invalidateLeaderboard('bits');
    }
    
    return affectedRows > 0;
  } catch (error) {
    throw error;
  }
};

export const removeBits = async (userId, amount) => {
  try {
    console.log(`[REMOVE_BITS DEBUG] Attempting to remove ${amount} bits from user ${userId}`);
    

    const beforePony = await getPonyByUserId(userId);
    console.log(`[REMOVE_BITS DEBUG] User ${userId} current bits: ${beforePony?.bits || 0}`);
    
    const sql = `
      UPDATE ponies
      SET bits = bits - ?,
          updated_at = ?
      WHERE user_id = ? AND bits >= ?
    `;
    
    const result = await query(sql, [amount, new Date().toISOString(), userId, amount]);
    console.log(`[REMOVE_BITS DEBUG] Raw update result:`, result, `type: ${typeof result}`);
    

    const affectedRows = Array.isArray(result) ? result[1] : result;
    console.log(`[REMOVE_BITS DEBUG] Affected rows: ${affectedRows}`);
    

    const afterPony = await getPonyByUserId(userId);
    console.log(`[REMOVE_BITS DEBUG] User ${userId} bits after update: ${afterPony?.bits || 0}`);
    

    const success = affectedRows > 0;
    console.log(`[REMOVE_BITS DEBUG] Success based on affected rows: ${success}`);
    

    if (success) {
      leaderboardCache.invalidateLeaderboard('bits');
    }
    
    return success;
  } catch (error) {
    console.error('[REMOVE_BITS DEBUG] Error in removeBits:', error);
    throw error;
  }
};

export const addReputation = async (userId, amount) => {
  try {
    const sql = `
      UPDATE ponies
      SET reputation = reputation + ?,
          updated_at = ?
      WHERE user_id = ?
    `;
    
    const result = await query(sql, [amount, new Date().toISOString(), userId]);
    return result > 0;
  } catch (error) {
    throw error;
  }
};

export const removeReputation = async (userId, amount) => {
  try {
    const sql = `
      UPDATE ponies
      SET reputation = reputation - ?,
          updated_at = ?
      WHERE user_id = ? AND reputation >= ?
    `;
    
    const result = await query(sql, [amount, new Date().toISOString(), userId, amount]);
    return result > 0;
  } catch (error) {
    throw error;
  }
};

export const addInfluence = async (userId, amount) => {
  try {
    const sql = `
      UPDATE ponies
      SET influence = influence + ?,
          updated_at = ?
      WHERE user_id = ?
    `;
    
    const result = await query(sql, [amount, new Date().toISOString(), userId]);
    return result > 0;
  } catch (error) {
    throw error;
  }
};

export const removeInfluence = async (userId, amount) => {
  try {
    const sql = `
      UPDATE ponies
      SET influence = influence - ?,
          updated_at = ?
      WHERE user_id = ? AND influence >= ?
    `;
    
    const result = await query(sql, [amount, new Date().toISOString(), userId, amount]);
    return result > 0;
  } catch (error) {
    throw error;
  }
};

export const deletePony = async (userId) => {
  try {

    const success = await remove('ponies', 'user_id = ?', [userId]);
    return success > 0;
  } catch (error) {
    throw error;
  }
};

export const depositToBank = async (userId, amount) => {
  try {
    console.log(`[BANK] === DEPOSIT TRANSACTION START ===`);
    console.log(`[BANK] User: ${userId}, Amount: ${amount}`);
    

    const pony = await getPonyByUserId(userId);
    console.log('[BANK] Current pony state:', JSON.stringify(pony, null, 2));
    
    if (!pony) {
      console.log('[BANK] ERROR: Pony not found');
      return false;
    }

    if (pony.bits < amount) {
      console.log(`[BANK] ERROR: Insufficient cash balance. Required: ${amount}, Available: ${pony.bits}`);
      return false;
    }


    console.log('[BANK] Starting transaction...');
    await query('BEGIN TRANSACTION');

    try {

      console.log('[BANK] Step 1: Removing bits from cash balance...');
      const removeBitsResult = await query(`
        UPDATE ponies 
        SET bits = bits - ?,
            updated_at = ? 
        WHERE user_id = ? AND bits >= ?
      `, [amount, new Date().toISOString(), userId, amount]);

      console.log('[BANK] Remove bits result:', removeBitsResult);

      if (removeBitsResult === 0) {
        console.log('[BANK] ERROR: Failed to remove bits from cash balance');
        await query('ROLLBACK');
        return false;
      }


      console.log('[BANK] Step 2: Adding bits to bank balance...');
      const addToBankResult = await query(`
        INSERT OR REPLACE INTO bank_accounts (user_id, balance, created_at, updated_at)
        VALUES (
          ?, 
          COALESCE((SELECT balance FROM bank_accounts WHERE user_id = ?), 0) + ?, 
          COALESCE((SELECT created_at FROM bank_accounts WHERE user_id = ?), datetime('now')),
          datetime('now')
        )
      `, [userId, userId, amount, userId]);

      console.log('[BANK] Add to bank result:', addToBankResult);


      console.log('[BANK] Committing transaction...');
      await query('COMMIT');
      

      const updatedPony = await getPonyByUserId(userId);
      console.log('[BANK] Final pony state:', JSON.stringify(updatedPony, null, 2));
      console.log(`[BANK] === DEPOSIT TRANSACTION SUCCESS ===`);
      
      return true;
    } catch (error) {
      console.error('[BANK] ERROR during transaction:', error);
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('[BANK] CRITICAL ERROR in depositToBank:', error);
    throw error;
  }
};

export const withdrawFromBank = async (userId, amount) => {
  try {
    console.log(`[BANK] === WITHDRAW TRANSACTION START ===`);
    console.log(`[BANK] User: ${userId}, Amount: ${amount}`);
    

    const pony = await getPonyByUserId(userId);
    console.log('[BANK] Current pony state:', JSON.stringify(pony, null, 2));
    
    if (!pony) {
      console.log('[BANK] ERROR: Pony not found');
      return false;
    }

    const bankBalance = pony.bank_balance || 0;
    if (bankBalance < amount) {
      console.log(`[BANK] ERROR: Insufficient bank balance. Required: ${amount}, Available: ${bankBalance}`);
      return false;
    }


    console.log('[BANK] Starting transaction...');
    await query('BEGIN TRANSACTION');

    try {

      console.log('[BANK] Step 1: Removing bits from bank balance...');
      const removeFromBankResult = await query(`
        UPDATE bank_accounts 
        SET balance = balance - ?,
            updated_at = datetime('now')
        WHERE user_id = ? AND balance >= ?
      `, [amount, userId, amount]);

      console.log('[BANK] Remove from bank result:', removeFromBankResult);

      if (removeFromBankResult === 0) {
        console.log('[BANK] ERROR: Failed to remove bits from bank balance');
        await query('ROLLBACK');
        return false;
      }


      console.log('[BANK] Step 2: Adding bits to cash balance...');
      const addBitsResult = await query(`
        UPDATE ponies 
        SET bits = bits + ?,
            updated_at = ? 
        WHERE user_id = ?
      `, [amount, new Date().toISOString(), userId]);

      console.log('[BANK] Add bits result:', addBitsResult);

      if (addBitsResult === 0) {
        console.log('[BANK] ERROR: Failed to add bits to cash balance');
        await query('ROLLBACK');
        return false;
      }


      console.log('[BANK] Committing transaction...');
      await query('COMMIT');
      

      const updatedPony = await getPonyByUserId(userId);
      console.log('[BANK] Final pony state:', JSON.stringify(updatedPony, null, 2));
      console.log(`[BANK] === WITHDRAW TRANSACTION SUCCESS ===`);
      
      return true;
    } catch (error) {
      console.error('[BANK] ERROR during transaction:', error);
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('[BANK] CRITICAL ERROR in withdrawFromBank:', error);
    throw error;
  }
};

export default {
  createPoniesTable,
  initPonyTables,
  getPonyByUserId,
  createPony,
  updatePony,
  addBits,
  removeBits,
  addReputation,
  removeReputation,
  addInfluence,
  removeInfluence,
  deletePony,
  depositToBank,
  withdrawFromBank
};
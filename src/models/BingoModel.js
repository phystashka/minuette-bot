import { query, getRow, insert, update, remove } from '../utils/database.js';

export const createBingoTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS bingo_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      grid_data TEXT NOT NULL,
      completed_positions TEXT NOT NULL DEFAULT '[]',
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  
  const indexSql = `
    CREATE INDEX IF NOT EXISTS idx_bingo_user_id ON bingo_cards (user_id)
  `;
  
  await query(indexSql);
};

export const getBingoCard = async (userId) => {
  const sql = `SELECT * FROM bingo_cards WHERE user_id = ?`;
  return await getRow(sql, [userId]);
};

export const createBingoCard = async (userId, gridData) => {
  const sql = `
    INSERT INTO bingo_cards (user_id, grid_data, completed_positions)
    VALUES (?, ?, ?)
  `;
  return await query(sql, [userId, JSON.stringify(gridData), '[]']);
};

export const updateBingoCard = async (userId, completedPositions, isCompleted = false) => {
  const sql = `
    UPDATE bingo_cards 
    SET completed_positions = ?, is_completed = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `;
  const completedAt = isCompleted ? new Date().toISOString() : null;
  return await query(sql, [JSON.stringify(completedPositions), isCompleted ? 1 : 0, completedAt, userId]);
};

export const deleteBingoCard = async (userId) => {
  const sql = `DELETE FROM bingo_cards WHERE user_id = ?`;
  return await query(sql, [userId]);
};

export const getAllActiveBingoCards = async () => {
  const sql = `SELECT * FROM bingo_cards WHERE is_completed = 0`;
  return await query(sql);
};

export const getCompletedBingoCards = async () => {
  const sql = `SELECT * FROM bingo_cards WHERE is_completed = 1`;
  return await query(sql);
};

export const resetBingoCard = async (userId, newGridData) => {
  const sql = `
    UPDATE bingo_cards 
    SET grid_data = ?, completed_positions = ?, is_completed = 0, completed_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `;
  return await query(sql, [JSON.stringify(newGridData), '[]', userId]);
};

const normalizePonyName = (ponyName) => {
  return ponyName.toLowerCase().replace(/\s+/g, '_');
};

export const checkPonyInBingo = async (userId, ponyName) => {
  const bingoCard = await getBingoCard(userId);
  if (!bingoCard) return null;
  
  try {
    const gridData = JSON.parse(bingoCard.grid_data);
    const completedPositions = JSON.parse(bingoCard.completed_positions);
    
    const normalizedPonyName = normalizePonyName(ponyName);
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const position = row * 5 + col;
        const bingoSlotName = gridData[position].toLowerCase();
        if (bingoSlotName === normalizedPonyName && !completedPositions.includes(position)) {
          return position;
        }
      }
    }
  } catch (error) {
    console.error('Error parsing bingo card data:', error);
  }
  
  return null;
};

export const checkBingoWin = (completedPositions) => {
  const grid = Array(25).fill(false);
  completedPositions.forEach(pos => {
    grid[pos] = true;
  });
  
  let completedRows = 0;
  let completedColumns = 0;
  let completedDiagonals = 0;

  for (let row = 0; row < 5; row++) {
    let rowComplete = true;
    for (let col = 0; col < 5; col++) {
      if (!grid[row * 5 + col]) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) completedRows++;
  }

  for (let col = 0; col < 5; col++) {
    let colComplete = true;
    for (let row = 0; row < 5; row++) {
      if (!grid[row * 5 + col]) {
        colComplete = false;
        break;
      }
    }
    if (colComplete) completedColumns++;
  }
  
  let mainDiagonalComplete = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i * 5 + i]) {
      mainDiagonalComplete = false;
      break;
    }
  }
  if (mainDiagonalComplete) completedDiagonals++;

  let antiDiagonalComplete = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i * 5 + (4 - i)]) {
      antiDiagonalComplete = false;
      break;
    }
  }
  if (antiDiagonalComplete) completedDiagonals++;
  
  let completedLineTypes = 0;
  if (completedRows > 0) completedLineTypes++;
  if (completedColumns > 0) completedLineTypes++;
  if (completedDiagonals > 0) completedLineTypes++;
  
  return completedLineTypes >= 2;
};

export const getCompletedLinePositions = (completedPositions) => {
  const grid = Array(25).fill(false);
  completedPositions.forEach(pos => {
    grid[pos] = true;
  });
  
  const completedLinePositions = new Set();
  let completedLineTypes = 0;
  
  for (let row = 0; row < 5; row++) {
    let rowComplete = true;
    for (let col = 0; col < 5; col++) {
      if (!grid[row * 5 + col]) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) {
      if (completedLineTypes === 0) completedLineTypes = 1; 
      for (let col = 0; col < 5; col++) {
        completedLinePositions.add(row * 5 + col);
      }
    }
  }

  let hasCompletedColumns = false;
  for (let col = 0; col < 5; col++) {
    let colComplete = true;
    for (let row = 0; row < 5; row++) {
      if (!grid[row * 5 + col]) {
        colComplete = false;
        break;
      }
    }
    if (colComplete) {
      if (!hasCompletedColumns) {
        hasCompletedColumns = true;
        if (completedLineTypes === 1) completedLineTypes = 2; 
        else if (completedLineTypes === 0) completedLineTypes = 1; 
      }
      for (let row = 0; row < 5; row++) {
        completedLinePositions.add(row * 5 + col);
      }
    }
  }

  let hasCompletedDiagonals = false;
  let mainDiagonalComplete = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i * 5 + i]) {
      mainDiagonalComplete = false;
      break;
    }
  }
  if (mainDiagonalComplete) {
    if (!hasCompletedDiagonals) {
      hasCompletedDiagonals = true;
      if (completedLineTypes === 1) completedLineTypes = 2; 
      else if (completedLineTypes === 0) completedLineTypes = 1; 
    }
    for (let i = 0; i < 5; i++) {
      completedLinePositions.add(i * 5 + i);
    }
  }
  
  let antiDiagonalComplete = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i * 5 + (4 - i)]) {
      antiDiagonalComplete = false;
      break;
    }
  }
  if (antiDiagonalComplete) {
    if (!hasCompletedDiagonals) {
      hasCompletedDiagonals = true;
      if (completedLineTypes === 1) completedLineTypes = 2; 
      else if (completedLineTypes === 0) completedLineTypes = 1; 
    }
    for (let i = 0; i < 5; i++) {
      completedLinePositions.add(i * 5 + (4 - i));
    }
  }
  
  return completedLineTypes >= 2 ? Array.from(completedLinePositions) : [];
};

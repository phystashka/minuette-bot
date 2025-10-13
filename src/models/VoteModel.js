import { query, getRow, insert, update } from '../utils/database.js';

export const createVoteTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      vote_timestamp INTEGER NOT NULL,
      claimed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  
  try {
    const columns = await query(`PRAGMA table_info(votes)`);
    const hasClaimedColumn = columns.some(col => col.name === 'claimed');
    if (!hasClaimedColumn) {
      await query(`ALTER TABLE votes ADD COLUMN claimed INTEGER NOT NULL DEFAULT 0`);
      console.log('Added claimed column to votes table');
    }
  } catch (error) {
    console.log('Error checking/adding claimed column:', error.message);
  }
  
  const indexSql = `
    CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes (user_id)
  `;
  
  await query(indexSql);
  
  const timestampIndexSql = `
    CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes (vote_timestamp)
  `;
  
  await query(timestampIndexSql);
};

export const recordVote = async (userId) => {
  const voteTimestamp = Math.floor(Date.now() / 1000);
  
  const sql = `
    INSERT INTO votes (user_id, vote_timestamp, claimed)
    VALUES (?, ?, ?)
  `;
  
  return await query(sql, [userId, voteTimestamp, 0]);
};

export const getUnclaimedVotes = async (userId) => {
  const sql = `
    SELECT * FROM votes 
    WHERE user_id = ? AND claimed = 0
    ORDER BY vote_timestamp DESC
  `;
  
  const result = await query(sql, [userId]);
  return result || [];
};

export const claimVotes = async (userId) => {
  const sql = `
    UPDATE votes 
    SET claimed = 1 
    WHERE user_id = ? AND claimed = 0
  `;
  
  return await update(sql, [userId]);
};

export const getUserVoteStats = async (userId) => {
  const totalSql = `
    SELECT COUNT(*) as total FROM votes WHERE user_id = ?
  `;
  
  const claimedSql = `
    SELECT COUNT(*) as claimed FROM votes WHERE user_id = ? AND claimed = 1
  `;
  
  const unclaimedSql = `
    SELECT COUNT(*) as unclaimed FROM votes WHERE user_id = ? AND claimed = 0
  `;
  
  const lastVoteSql = `
    SELECT vote_timestamp FROM votes 
    WHERE user_id = ? 
    ORDER BY vote_timestamp DESC 
    LIMIT 1
  `;
  
  try {
    const [totalResult] = await query(totalSql, [userId]);
    const [claimedResult] = await query(claimedSql, [userId]);
    const [unclaimedResult] = await query(unclaimedSql, [userId]);
    const [lastVoteResult] = await query(lastVoteSql, [userId]);
    
    return {
      total: totalResult?.total || 0,
      claimed: claimedResult?.claimed || 0,
      unclaimed: unclaimedResult?.unclaimed || 0,
      lastVoteTime: lastVoteResult?.vote_timestamp || null
    };
  } catch (error) {
    console.error('Error getting vote stats:', error);
    return {
      total: 0,
      claimed: 0,
      unclaimed: 0,
      lastVoteTime: null
    };
  }
};

export const canUserVote = async (userId) => {
  const sql = `
    SELECT vote_timestamp FROM votes 
    WHERE user_id = ? 
    ORDER BY vote_timestamp DESC 
    LIMIT 1
  `;
  
  try {
    const [result] = await query(sql, [userId]);
    
    if (!result) return true;
    
    const lastVoteTime = result.vote_timestamp * 1000;
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;
    
    return (now - lastVoteTime) >= twelveHours;
  } catch (error) {
    console.error('Error checking vote cooldown:', error);
    return true;
  }
};
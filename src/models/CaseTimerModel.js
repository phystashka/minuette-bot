import { query, getRow, insert, update } from '../utils/database.js';
import { getUserStats } from './UserStatsModel.js';

export const createCaseTimersTable = async () => {

  const sql = `
    CREATE TABLE IF NOT EXISTS case_timers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      voice_start_time TIMESTAMP,
      total_voice_time INTEGER NOT NULL DEFAULT 0,
      last_case_earned TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  const tableInfo = await query(`PRAGMA table_info(case_timers)`);
  const columns = tableInfo.map(col => col.name);
  

  if (!columns.includes('guild_id')) {

    await query(`ALTER TABLE case_timers ADD COLUMN guild_id TEXT`);
  }
  

  if (!columns.includes('cases_earned')) {

    await query(`ALTER TABLE case_timers ADD COLUMN cases_earned INTEGER NOT NULL DEFAULT 0`);
  }
  

  if (!columns.includes('voice_time_used')) {

    await query(`ALTER TABLE case_timers ADD COLUMN voice_time_used INTEGER NOT NULL DEFAULT 0`);
  }
  

  try {
    const indexSql = `
      CREATE INDEX IF NOT EXISTS idx_case_timers_user_guild ON case_timers (user_id, guild_id)
    `;
    await query(indexSql);
  } catch (error) {

  }
};

export const initCaseTimerTables = async () => {
  await createCaseTimersTable();
};


try {
  initCaseTimerTables();
} catch (error) {
  console.error('Error initializing case timer tables:', error);
}

export const getCaseTimer = async (userId, guildId) => {

  let sql = `
    SELECT * FROM case_timers
    WHERE user_id = ? AND guild_id = ?
  `;
  
  let result = await getRow(sql, [userId, guildId]);
  

  if (!result && guildId) {
    sql = `
      SELECT * FROM case_timers
      WHERE user_id = ? AND guild_id IS NULL
    `;
    
    result = await getRow(sql, [userId]);
    

    if (result) {

      await query(`UPDATE case_timers SET guild_id = ? WHERE id = ?`, [guildId, result.id]);
      result.guild_id = guildId;
    }
  }
  
  return result;
};

export const createCaseTimer = async (userId, guildId) => {
  try {

    const sql = `
      INSERT OR IGNORE INTO case_timers (user_id, guild_id, cases_earned, voice_time_used, last_case_earned)
      VALUES (?, ?, 0, 0, NULL)
    `;
    
    await query(sql, [userId, guildId]);
    

    const timer = await getRow('SELECT * FROM case_timers WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
    
    return timer || {
      user_id: userId,
      guild_id: guildId,
      cases_earned: 0,
      voice_time_used: 0,
      last_case_earned: null
    };
  } catch (error) {
    throw error;
  }
};




export const getTimeUntilNextCase = async (userId, guildId) => {
  try {

    const userStats = await getUserStats(userId, guildId);
    if (!userStats) {
      return { canEarn: false, timeRemaining: 30 * 60, isInVoice: false, totalTime: 0 };
    }


    let timer = await getCaseTimer(userId, guildId);
    if (!timer) {
      timer = await createCaseTimer(userId, guildId);
    }


    const totalVoiceMinutes = userStats.voice_time || 0;

    const totalVoiceSeconds = totalVoiceMinutes * 60;
    

    const voiceTimeUsed = timer.voice_time_used || 0;
    

    const availableTime = totalVoiceSeconds - voiceTimeUsed;
    
    const requiredTime = 30 * 60;
    const timeRemaining = Math.max(0, requiredTime - availableTime);
    
    return {
      canEarn: timeRemaining === 0 && availableTime >= requiredTime,
      timeRemaining: timeRemaining,
      isInVoice: false,
      totalTime: totalVoiceSeconds,
      availableTime: availableTime,
      canEarnIfLeave: timeRemaining === 0 && availableTime >= requiredTime
    };
  } catch (error) {
    console.error('Error getting time until next case:', error);
    return { canEarn: false, timeRemaining: 30 * 60, isInVoice: false, totalTime: 0 };
  }
};

export const earnCase = async (userId, guildId) => {
  try {

    const userStats = await getUserStats(userId, guildId);
    if (!userStats) {
      return { success: false, cases: 0, reason: 'no_stats' };
    }


    let timer = await getCaseTimer(userId, guildId);
    if (!timer) {
      timer = await createCaseTimer(userId, guildId);
    }
    

    const totalVoiceMinutes = userStats.voice_time || 0;

    const totalVoiceSeconds = totalVoiceMinutes * 60;
    

    const voiceTimeUsed = timer.voice_time_used || 0;
    

    const availableTime = totalVoiceSeconds - voiceTimeUsed;
    
    const requiredTime = 30 * 60;
    
    if (availableTime < requiredTime) {
      return { success: false, cases: 0, reason: 'not_enough_time' };
    }
    

    const casesEarned = Math.floor(availableTime / requiredTime);
    
    if (casesEarned === 0) {
      return { success: false, cases: 0, reason: 'no_cases_available' };
    }
    

    if (timer.last_case_earned) {
      const lastEarnTime = new Date(timer.last_case_earned);
      const now = new Date();
      const timeSinceLastEarn = (now - lastEarnTime) / 1000;
      
      if (timeSinceLastEarn < 5) {
        return { success: false, cases: 0, reason: 'too_soon_after_last_earn' };
      }
    }
    
    const now = new Date().toISOString();
    

    const timeUsedForCases = casesEarned * requiredTime;
    const newVoiceTimeUsed = voiceTimeUsed + timeUsedForCases;
    
    await update('case_timers', {
      cases_earned: (timer.cases_earned || 0) + casesEarned,
      voice_time_used: newVoiceTimeUsed,
      last_case_earned: now,
      updated_at: now
    }, { user_id: userId, guild_id: guildId });
    
    return { success: true, cases: casesEarned };
  } catch (error) {
    console.error('Error earning case:', error);
    return { success: false, cases: 0, reason: 'error' };
  }
};

export const formatTimeRemaining = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes} min. ${remainingSeconds} sec.`;
  } else {
    return `${remainingSeconds} sec.`;
  }
};


export const getVoiceTimeInfo = async (userId, guildId) => {
  try {

    const userStats = await getUserStats(userId, guildId);
    if (!userStats) {
      return {
        totalTime: 0,
        isInVoice: false,
        currentSessionTime: 0,
        timeSinceLastEarn: null,
        canEarnCases: 0,
        availableTime: 0,
        voiceTimeUsed: 0
      };
    }


    const timer = await getCaseTimer(userId, guildId);
    

    const totalVoiceMinutes = userStats.voice_time || 0;
    const totalVoiceSeconds = totalVoiceMinutes * 60;
    

    const voiceTimeUsed = timer ? (timer.voice_time_used || 0) : 0;
    

    const availableTime = totalVoiceSeconds - voiceTimeUsed;
    
    let timeSinceLastEarn = null;
    if (timer && timer.last_case_earned) {
      const lastEarnTime = new Date(timer.last_case_earned);
      const now = new Date();
      timeSinceLastEarn = Math.floor((now - lastEarnTime) / 1000);
    }
    
    const requiredTime = 30 * 60;
    const canEarnCases = Math.floor(availableTime / requiredTime);
    
    return {
      totalTime: totalVoiceSeconds,
      isInVoice: false,
      currentSessionTime: 0,
      timeSinceLastEarn,
      canEarnCases,
      requiredTime,
      availableTime,
      voiceTimeUsed,
      totalVoiceMinutes
    };
  } catch (error) {
    console.error('Error getting voice time info:', error);
    return {
      totalTime: 0,
      isInVoice: false,
      currentSessionTime: 0,
      timeSinceLastEarn: null,
      canEarnCases: 0,
      availableTime: 0,
      voiceTimeUsed: 0
    };
  }
};

export default {
  initCaseTimerTables,
  createCaseTimersTable,
  getCaseTimer,
  createCaseTimer,
  getTimeUntilNextCase,
  earnCase,
  formatTimeRemaining,
  getVoiceTimeInfo
};

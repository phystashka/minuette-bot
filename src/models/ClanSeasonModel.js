import { query, getRow, insert, update } from '../utils/database.js';

export async function initializeClanSeasonTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS clan_season_premium (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        clan_id INTEGER NOT NULL,
        season_id TEXT NOT NULL DEFAULT 'season1',
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, clan_id, season_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS clan_season_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        clan_id INTEGER NOT NULL,
        season_id TEXT NOT NULL DEFAULT 'season1',
        level INTEGER NOT NULL,
        reward_type TEXT NOT NULL CHECK(reward_type IN ('free', 'premium')),
        claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, clan_id, season_id, level, reward_type)
      )
    `);

    console.log('Clan season tables initialized successfully');
  } catch (error) {
    console.error('Error initializing clan season tables:', error);
  }
}

export async function hasUserPremiumSeason(userId, clanId, seasonId = 'season1') {
  try {
    const result = await getRow(`
      SELECT COUNT(*) as count 
      FROM clan_season_premium 
      WHERE user_id = ? AND clan_id = ? AND season_id = ?
    `, [userId, clanId, seasonId]);
    return result.count > 0;
  } catch (error) {
    console.error('Error checking premium season:', error);
    return false;
  }
}

export async function purchasePremiumSeason(userId, clanId, seasonId = 'season1') {
  try {
    await query(`
      DELETE FROM clan_season_premium 
      WHERE user_id = ? AND clan_id = ? AND season_id = ?
    `, [userId, clanId, seasonId]);
    
    await insert('clan_season_premium', {
      user_id: userId,
      clan_id: clanId,
      season_id: seasonId
    });
    return true;
  } catch (error) {
    console.error('Error purchasing premium season:', error);
    return false;
  }
}

export async function isRewardClaimed(userId, clanId, level, rewardType, seasonId = 'season1') {
  try {
    const result = await getRow(`
      SELECT COUNT(*) as count 
      FROM clan_season_rewards 
      WHERE user_id = ? AND clan_id = ? AND season_id = ? AND level = ? AND reward_type = ?
    `, [userId, clanId, seasonId, level, rewardType]);
    return result.count > 0;
  } catch (error) {
    console.error('Error checking claimed reward:', error);
    return false;
  }
}

export async function claimReward(userId, clanId, level, rewardType, seasonId = 'season1') {
  try {
    const alreadyClaimed = await isRewardClaimed(userId, clanId, level, rewardType, seasonId);
    if (alreadyClaimed) {
      return true;
    }
    
    const result = await insert('clan_season_rewards', {
      user_id: userId,
      clan_id: clanId,
      season_id: seasonId,
      level: level,
      reward_type: rewardType
    });
    return result.id ? true : false;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'SQLITE_CONSTRAINT') {
      console.log(`Reward already claimed: user ${userId}, clan ${clanId}, level ${level}, type ${rewardType}`);
      return true;
    }
    console.error('Error claiming reward:', error);
    return false;
  }
}

export async function getUserClaimedRewards(userId, clanId, seasonId = 'season1') {
  try {
    const result = await query(`
      SELECT level, reward_type, claimed_at
      FROM clan_season_rewards 
      WHERE user_id = ? AND clan_id = ? AND season_id = ?
      ORDER BY level ASC
    `, [userId, clanId, seasonId]);
    return result;
  } catch (error) {
    console.error('Error getting claimed rewards:', error);
    return [];
  }
}

export const SEASON_REWARDS = {
  1: { free: { type: 'bits', amount: 7000 }, premium: { type: 'keys', amount: 15 } },
  2: { free: null, premium: { type: 'bits', amount: 4000 } },
  3: { free: { type: 'sparks', amount: 2 }, premium: { type: 'sparks', amount: 5 } },
  4: { free: { type: 'bits', amount: 7000 }, premium: { type: 'keys', amount: 15 } },
  5: { free: { type: 'sparks', amount: 2 }, premium: { type: 'sparks', amount: 5 } },
  6: { free: null, premium: { type: 'keys', amount: 15 } },
  7: { free: null, premium: { type: 'sparks', amount: 5 } },
  8: { free: { type: 'pony', name: 'Rarity Bat' }, premium: { type: 'pony', name: 'Pinkie Pie Bat' } },
  9: { free: { type: 'sparks', amount: 2 }, premium: { type: 'sparks', amount: 5 } },
  10: { free: { type: 'background', name: 'Trixie Halloween', backgroundId: 'trixiehalloween_farm1' }, premium: { type: 'pony', name: 'Twilight Sparkle Bat' } },
  11: { free: { type: 'sparks', amount: 2 }, premium: { type: 'sparks', amount: 5 } },
  12: { free: { type: 'pony', name: 'Applejack Bat' }, premium: { type: 'pony', name: 'Rainbow Dash Bat' } },
  13: { free: { type: 'gems', amount: 500 }, premium: { type: 'gems', amount: 250 } }
};

export default {
  initializeClanSeasonTables,
  hasUserPremiumSeason,
  purchasePremiumSeason,
  isRewardClaimed,
  claimReward,
  getUserClaimedRewards,
  SEASON_REWARDS
};
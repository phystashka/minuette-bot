
import { sequelize } from './database.js';
import ClanQuestModel from '../models/ClanQuestModel.js';

class LeaderboardCache {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000;
    

    setInterval(() => {
      this.cleanupExpiredCache();
    }, 10 * 60 * 1000);
  }


  getCacheKey(filter, guildId = 'global', page = 1, perPage = 10) {
    return `${filter}_${guildId}_${page}_${perPage}`;
  }


  async getLeaderboard(filter, guildId = 'global', page = 1, perPage = 10) {
    const cacheKey = this.getCacheKey(filter, guildId, page, perPage);
    const cached = this.cache.get(cacheKey);
    

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {

      return cached.data;
    }


    

    const data = await this.fetchLeaderboardData(filter, guildId, page, perPage);
    

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }


  async fetchLeaderboardData(filter, guildId, page, perPage) {
    const offset = (page - 1) * perPage;
    
    switch (filter) {
      case 'bits':
        return await this.getBitsLeaderboard(offset, perPage);
      
      case 'voice':
        return await this.getVoiceLeaderboard(offset, perPage);
      
      case 'ponies':
        return await this.getPoniesLeaderboard(offset, perPage);
      
      case 'farm':
        return await this.getFarmLeaderboard(offset, perPage);
      
      case 'rebirth':
        return await this.getRebirthLeaderboard(offset, perPage);
      
      case 'clans':
        return await this.getClansLeaderboard(offset, perPage);
      
      default:
        throw new Error(`Unknown leaderboard filter: ${filter}`);
    }
  }

 
  async getBitsLeaderboard(offset, perPage) {
    const [results, totalCountResult] = await Promise.all([
      sequelize.query(`
        SELECT 
          p.user_id, 
          (p.bits + COALESCE(ba.balance, 0)) as total_bits 
        FROM ponies p 
        LEFT JOIN bank_accounts ba ON p.user_id = ba.user_id 
        WHERE (p.bits + COALESCE(ba.balance, 0)) > 0 
        ORDER BY (p.bits + COALESCE(ba.balance, 0)) DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { limit: perPage, offset },
        type: sequelize.QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COUNT(*) as total
        FROM ponies p 
        LEFT JOIN bank_accounts ba ON p.user_id = ba.user_id 
        WHERE (p.bits + COALESCE(ba.balance, 0)) > 0
      `, {
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    return {
      data: results,
      totalCount: totalCountResult[0].total,
      type: 'bits'
    };
  }


  async getVoiceLeaderboard(offset, perPage) {
    const [results, totalCountResult] = await Promise.all([
      sequelize.query(`
        SELECT 
          user_id, 
          SUM(voice_time) as total_voice_time 
        FROM user_stats 
        WHERE voice_time > 0 
        GROUP BY user_id 
        ORDER BY total_voice_time DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { limit: perPage, offset },
        type: sequelize.QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COUNT(DISTINCT user_id) as total
        FROM user_stats 
        WHERE voice_time > 0
      `, {
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    return {
      data: results,
      totalCount: totalCountResult[0].total,
      type: 'voice'
    };
  }

  async getPoniesLeaderboard(offset, perPage) {
    const [results, totalCountResult] = await Promise.all([
      sequelize.query(`
        SELECT 
          user_id, 
          COUNT(*) as pony_count 
        FROM friendship 
        GROUP BY user_id 
        HAVING COUNT(*) > 0 
        ORDER BY COUNT(*) DESC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { limit: perPage, offset },
        type: sequelize.QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COUNT(DISTINCT user_id) as total
        FROM friendship
      `, {
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    return {
      data: results,
      totalCount: totalCountResult[0].total,
      type: 'ponies'
    };
  }


  async getFarmLeaderboard(offset, perPage) {
    const [results, totalCountResult] = await Promise.all([
      sequelize.query(`
        SELECT 
          user_id, 
          level as farm_level 
        FROM user_farms 
        WHERE level >= 1 
        ORDER BY level DESC, user_id ASC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { limit: perPage, offset },
        type: sequelize.QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COUNT(*) as total
        FROM user_farms 
        WHERE level >= 1
      `, {
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    return {
      data: results,
      totalCount: totalCountResult[0].total,
      type: 'farm'
    };
  }


  async getCandiesLeaderboard(offset, perPage) {
    const [results, totalCountResult] = await Promise.all([
      sequelize.query(`
        SELECT 
          user_id, 
          candies 
        FROM resources 
        WHERE candies > 0 
        ORDER BY candies DESC, user_id ASC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { limit: perPage, offset },
        type: sequelize.QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COUNT(*) as total
        FROM resources 
        WHERE candies > 0
      `, {
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    return {
      data: results,
      totalCount: totalCountResult[0].total,
      type: 'candies'
    };
  }

  async getRebirthLeaderboard(offset, perPage) {
    const [results, totalCountResult] = await Promise.all([
      sequelize.query(`
        SELECT 
          user_id, 
          rebirth_level 
        FROM rebirth 
        WHERE rebirth_level > 0 
        ORDER BY rebirth_level DESC, user_id ASC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { limit: perPage, offset },
        type: sequelize.QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COUNT(*) as total
        FROM rebirth 
        WHERE rebirth_level > 0
      `, {
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    return {
      data: results,
      totalCount: totalCountResult[0].total,
      type: 'rebirth'
    };
  }

  async getClansLeaderboard(offset, perPage) {

    
    const [results, totalCountResult] = await Promise.all([
      sequelize.query(`
        SELECT 
          c.id,
          c.name,
          c.owner_id,
          c.experience,
          c.member_count,
          c.emblem_filename
        FROM clans c
        WHERE c.member_count > 0
        ORDER BY c.experience DESC, c.member_count DESC, c.name ASC
        LIMIT :limit OFFSET :offset
      `, {
        replacements: { limit: perPage, offset },
        type: sequelize.QueryTypes.SELECT
      }),
      
      sequelize.query(`
        SELECT COUNT(*) as total
        FROM clans
        WHERE member_count > 0
      `, {
        type: sequelize.QueryTypes.SELECT
      })
    ]);


    const processedResults = results.map(clan => ({
      ...clan,
      level: ClanQuestModel.getClanLevel(clan.experience || 0)
    }));

    return {
      data: processedResults,
      totalCount: totalCountResult[0].total,
      type: 'clans'
    };
  }


  async getUserRank(userId, filter) {
    const cacheKey = `rank_${filter}_${userId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    let rank = 0;
    
    switch (filter) {
      case 'bits': {
        const result = await sequelize.query(`
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT (p.bits + COALESCE(ba.balance, 0)) as total_bits 
            FROM ponies p 
            LEFT JOIN bank_accounts ba ON p.user_id = ba.user_id 
            WHERE (p.bits + COALESCE(ba.balance, 0)) > (
              SELECT (p2.bits + COALESCE(ba2.balance, 0))
              FROM ponies p2 
              LEFT JOIN bank_accounts ba2 ON p2.user_id = ba2.user_id 
              WHERE p2.user_id = :userId
            )
          ) ranked
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        rank = result[0].rank;
        break;
      }
      
      case 'voice': {
        const result = await sequelize.query(`
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT SUM(voice_time) as total_voice_time 
            FROM user_stats 
            GROUP BY user_id 
            HAVING total_voice_time > COALESCE((
              SELECT SUM(voice_time) 
              FROM user_stats 
              WHERE user_id = :userId
            ), 0)
          ) ranked
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        rank = result[0].rank;
        break;
      }
      
      case 'ponies': {
        const result = await sequelize.query(`
          SELECT COUNT(*) + 1 as rank
          FROM (
            SELECT COUNT(*) as pony_count 
            FROM friendship 
            GROUP BY user_id 
            HAVING pony_count > COALESCE((
              SELECT COUNT(*) 
              FROM friendship 
              WHERE user_id = :userId
            ), 0)
          ) ranked
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        rank = result[0].rank;
        break;
      }
      
      case 'farm': {
        const result = await sequelize.query(`
          SELECT COUNT(*) + 1 as rank
          FROM user_farms 
          WHERE level > COALESCE((
            SELECT level 
            FROM user_farms 
            WHERE user_id = :userId
          ), 0)
          OR (level = COALESCE((
            SELECT level 
            FROM user_farms 
            WHERE user_id = :userId
          ), 0) AND user_id < :userId)
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        rank = result[0].rank;
        break;
      }
      
      case 'candies': {
        const result = await sequelize.query(`
          SELECT COUNT(*) + 1 as rank
          FROM resources 
          WHERE candies > COALESCE((
            SELECT candies 
            FROM resources 
            WHERE user_id = :userId
          ), 0)
          OR (candies = COALESCE((
            SELECT candies 
            FROM resources 
            WHERE user_id = :userId
          ), 0) AND user_id < :userId)
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        rank = result[0].rank;
        break;
      }
      
      case 'rebirth': {
        const result = await sequelize.query(`
          SELECT COUNT(*) + 1 as rank
          FROM rebirth 
          WHERE rebirth_level > COALESCE((
            SELECT rebirth_level 
            FROM rebirth 
            WHERE user_id = :userId
          ), 0)
          OR (rebirth_level = COALESCE((
            SELECT rebirth_level 
            FROM rebirth 
            WHERE user_id = :userId
          ), 0) AND user_id < :userId)
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        rank = result[0].rank;
        break;
      }
      
      case 'clans': {

        const result = await sequelize.query(`
          SELECT COUNT(*) + 1 as rank
          FROM clans c1
          WHERE (c1.experience > COALESCE((
            SELECT c2.experience 
            FROM clans c2 
            WHERE c2.owner_id = :userId
          ), 0))
          OR (c1.experience = COALESCE((
            SELECT c2.experience 
            FROM clans c2 
            WHERE c2.owner_id = :userId
          ), 0) AND c1.member_count > COALESCE((
            SELECT c2.member_count 
            FROM clans c2 
            WHERE c2.owner_id = :userId
          ), 0))
          OR (c1.experience = COALESCE((
            SELECT c2.experience 
            FROM clans c2 
            WHERE c2.owner_id = :userId
          ), 0) AND c1.member_count = COALESCE((
            SELECT c2.member_count 
            FROM clans c2 
            WHERE c2.owner_id = :userId
          ), 0) AND c1.name < COALESCE((
            SELECT c2.name 
            FROM clans c2 
            WHERE c2.owner_id = :userId
          ), ''))
        `, {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        });
        rank = result[0].rank;
        break;
      }
    }


    this.cache.set(cacheKey, {
      data: rank,
      timestamp: Date.now()
    });

    return rank;
  }

  invalidateLeaderboard(filter) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(filter + '_') || key.startsWith(`rank_${filter}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));

  }


  invalidateAll() {
    const size = this.cache.size;
    this.cache.clear();

  }


  cleanupExpiredCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_DURATION) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {

    }
  }


  getCacheStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    
    for (const value of this.cache.values()) {
      if (now - value.timestamp < this.CACHE_DURATION) {
        active++;
      } else {
        expired++;
      }
    }
    
    return {
      total: this.cache.size,
      active,
      expired,
      hitRate: this.hitRate || 0
    };
  }


  clearAllCache() {

    this.cache.clear();
  }
}


export const leaderboardCache = new LeaderboardCache();

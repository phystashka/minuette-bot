import { query } from '../utils/database.js';

export const CARD_RARITIES = {
  BASIC: 'Basic',
  RARE: 'Rare', 
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
  HARMONIOUS: 'Harmonious'
};

export const AVAILABLE_CARDS = {
  'Rainbow Dash.png': CARD_RARITIES.HARMONIOUS,
  'Twilight Sparkle.png': CARD_RARITIES.EPIC,
  'Scootaloo.png': CARD_RARITIES.BASIC
};

export async function initCardsTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        card_name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `;
    
    await query(createTableQuery);
    console.log('✅ Cards table created/verified successfully');
    
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id)
    `;
    await query(createIndexQuery);
    console.log('✅ Cards index created successfully');
    
  } catch (error) {
    console.error('Error creating cards table:', error);
    throw error;
  }
}

export async function getUserCards(userId) {
  try {
    const result = await query(
      'SELECT * FROM user_cards WHERE user_id = ? ORDER BY obtained_at DESC',
      [userId]
    );
    return result || [];
  } catch (error) {
    console.error('Error getting user cards:', error);
    return [];
  }
}

export async function addCardToUser(userId, cardName) {
  try {
    const rarity = AVAILABLE_CARDS[cardName];
    if (!rarity) {
      throw new Error(`Unknown card: ${cardName}`);
    }
    
    const result = await query(
      'INSERT INTO user_cards (user_id, card_name, rarity) VALUES (?, ?, ?)',
      [userId, cardName, rarity]
    );
    
    return {
      id: result.insertId,
      user_id: userId,
      card_name: cardName,
      rarity: rarity,
      obtained_at: new Date()
    };
  } catch (error) {
    console.error('Error adding card to user:', error);
    throw error;
  }
}

export async function userHasCard(userId, cardName) {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM user_cards WHERE user_id = ? AND card_name = ?',
      [userId, cardName]
    );
    return result[0]?.count > 0;
  } catch (error) {
    console.error('Error checking user card:', error);
    return false;
  }
}

export async function getUserCardsByRarity(userId, rarity) {
  try {
    const result = await query(
      'SELECT * FROM user_cards WHERE user_id = ? AND rarity = ? ORDER BY obtained_at DESC',
      [userId, rarity]
    );
    return result || [];
  } catch (error) {
    console.error('Error getting user cards by rarity:', error);
    return [];
  }
}

export async function getUserCardStats(userId) {
  try {
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM user_cards WHERE user_id = ?',
      [userId]
    );
    
    const rarityResult = await query(
      'SELECT rarity, COUNT(*) as count FROM user_cards WHERE user_id = ? GROUP BY rarity',
      [userId]
    );
    
    const stats = {
      total: totalResult[0]?.total || 0,
      by_rarity: {}
    };
    
    Object.values(CARD_RARITIES).forEach(rarity => {
      stats.by_rarity[rarity] = 0;
    });
    
    rarityResult.forEach(row => {
      stats.by_rarity[row.rarity] = row.count;
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting user card stats:', error);
    return { total: 0, by_rarity: {} };
  }
}

export default {
  initCardsTable,
  getUserCards,
  addCardToUser,
  userHasCard,
  getUserCardsByRarity,
  getUserCardStats,
  CARD_RARITIES,
  AVAILABLE_CARDS
};
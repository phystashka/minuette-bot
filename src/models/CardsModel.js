import { query, getRow } from '../utils/database.js';

export const CARD_RARITIES = {
  'Basic': 1,
  'Rare': 10,
  'Epic': 100,
  'Legendary': 250,
  'Harmonious': 4000
};

export async function createCardsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_name TEXT NOT NULL UNIQUE,
        rarity TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Cards table created successfully');
  } catch (error) {
    console.error('Error creating cards table:', error);
    throw error;
  }
}

export async function createUserCardsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        card_name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        quantity INTEGER DEFAULT 1,
        UNIQUE(user_id, card_name)
      )
    `);
    
    const columns = await query('PRAGMA table_info(user_cards)');
    const hasQuantityColumn = columns.some(col => col.name === 'quantity');
    
    if (!hasQuantityColumn) {
      await query('ALTER TABLE user_cards ADD COLUMN quantity INTEGER DEFAULT 1');
      console.log('Added quantity column to user_cards table');
    }
    
    console.log('User cards table created successfully');
  } catch (error) {
    console.error('Error creating user_cards table:', error);
    throw error;
  }
}

export async function createUserFavoriteCardsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_favorite_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        favorite_card_name TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('User favorite cards table created successfully');
  } catch (error) {
    console.error('Error creating user_favorite_cards table:', error);
    throw error;
  }
}

export async function addCardToUser(userId, cardName, rarity) {
  try {
    const existingCard = await getRow(
      'SELECT * FROM user_cards WHERE user_id = ? AND card_name = ?',
      [userId, cardName]
    );

    if (existingCard) {
      try {
        await query(
          'UPDATE user_cards SET quantity = quantity + 1, obtained_at = CURRENT_TIMESTAMP WHERE user_id = ? AND card_name = ?',
          [userId, cardName]
        );
        console.log(`Incremented ${cardName} for user ${userId}`);
      } catch (quantityError) {
        console.log('Quantity column not found, updating obtained_at only');
        await query(
          'UPDATE user_cards SET obtained_at = CURRENT_TIMESTAMP WHERE user_id = ? AND card_name = ?',
          [userId, cardName]
        );
        console.log(`Updated ${cardName} timestamp for user ${userId}`);
      }
    } else {
      try {
        await query(
          'INSERT INTO user_cards (user_id, card_name, rarity, quantity) VALUES (?, ?, ?, 1)',
          [userId, cardName, rarity]
        );
        console.log(`Added ${cardName} to user ${userId}'s collection`);
      } catch (quantityError) {
        console.log('Trying fallback without quantity column');
        await query(
          'INSERT INTO user_cards (user_id, card_name, rarity) VALUES (?, ?, ?)',
          [userId, cardName, rarity]
        );
        console.log(`Added ${cardName} to user ${userId}'s collection (fallback)`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error adding card to user:', error);
    throw error;
  }
}

export async function getUserCards(userId) {
  try {
    const cards = await query(
      'SELECT * FROM user_cards WHERE user_id = ? ORDER BY obtained_at DESC',
      [userId]
    );
    return cards || [];
  } catch (error) {
    console.error('Error getting user cards:', error);
    throw error;
  }
}

export async function getUserCard(userId, cardName) {
  try {
    const card = await getRow(
      'SELECT * FROM user_cards WHERE user_id = ? AND card_name = ?',
      [userId, cardName]
    );
    return card;
  } catch (error) {
    console.error('Error getting user card:', error);
    throw error;
  }
}

export async function removeCardFromUser(userId, cardName) {
  try {
    const existingCard = await getUserCard(userId, cardName);
    
    if (!existingCard) {
      throw new Error('User does not have this card');
    }

    if (existingCard.quantity > 1) {
      await query(
        'UPDATE user_cards SET quantity = quantity - 1 WHERE user_id = ? AND card_name = ?',
        [userId, cardName]
      );
      console.log(`Decremented ${cardName} for user ${userId}`);
    } else {
      await query(
        'DELETE FROM user_cards WHERE user_id = ? AND card_name = ?',
        [userId, cardName]
      );
      console.log(`Removed ${cardName} from user ${userId}'s collection`);
    }

    return true;
  } catch (error) {
    console.error('Error removing card from user:', error);
    throw error;
  }
}

export async function getUserCardCount(userId) {
  try {
    const result = await getRow(
      'SELECT COUNT(*) as count FROM user_cards WHERE user_id = ?',
      [userId]
    );
    return result ? result.count : 0;
  } catch (error) {
    console.error('Error getting user card count:', error);
    throw error;
  }
}

export async function getUserFavoriteCard(userId) {
  try {
    const favorite = await getRow(
      'SELECT * FROM user_favorite_cards WHERE user_id = ?',
      [userId]
    );
    return favorite ? favorite.favorite_card_name : null;
  } catch (error) {
    console.error('Error getting user favorite card:', error);
    return null;
  }
}

export async function setUserFavoriteCard(userId, cardName) {
  try {
    const userCard = await getUserCard(userId, cardName);
    if (!userCard) {
      throw new Error('You don\'t own this card!');
    }

    const existing = await getRow(
      'SELECT * FROM user_favorite_cards WHERE user_id = ?',
      [userId]
    );

    if (existing) {
      await query(
        'UPDATE user_favorite_cards SET favorite_card_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [cardName, userId]
      );
    } else {
      await query(
        'INSERT INTO user_favorite_cards (user_id, favorite_card_name) VALUES (?, ?)',
        [userId, cardName]
      );
    }

    return true;
  } catch (error) {
    console.error('Error setting user favorite card:', error);
    throw error;
  }
}

export async function initializeCardTables() {
  try {
    await createCardsTable();
    await createUserCardsTable();
    await createUserFavoriteCardsTable();
    console.log('Card tables initialized successfully');
  } catch (error) {
    console.error('Error initializing card tables:', error);
    throw error;
  }
}

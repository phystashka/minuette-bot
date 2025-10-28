import { query, getRow, insert, update } from '../utils/database.js';

export const createFriendsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
      requester_id TEXT NOT NULL, -- who sent the friend request
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id)
    )
  `;
  
  await query(sql);
  
  const indexSql1 = `
    CREATE INDEX IF NOT EXISTS idx_user_friends_user_id ON user_friends (user_id)
  `;
  
  const indexSql2 = `
    CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id ON user_friends (friend_id)
  `;
  
  await query(indexSql1);
  await query(indexSql2);
  
  console.log('User friends table created successfully');
};

export const getFriendRequest = async (userId, friendId) => {
  try {
    const result = await getRow(
      'SELECT * FROM user_friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );
    return result;
  } catch (error) {
    console.error('Error getting friend request:', error);
    return null;
  }
};

export const createFriendRequest = async (requesterId, targetId) => {
  try {
    await query(
      'INSERT INTO user_friends (user_id, friend_id, requester_id, status) VALUES (?, ?, ?, ?)',
      [requesterId, targetId, requesterId, 'pending']
    );
    return true;
  } catch (error) {
    console.error('Error creating friend request:', error);
    return false;
  }
};

export const updateFriendRequest = async (requesterId, targetId, status) => {
  try {

    const existingRequest = await getRow(
      'SELECT * FROM user_friends WHERE user_id = ? AND friend_id = ? AND requester_id = ? AND status = ?',
      [requesterId, targetId, requesterId, 'pending']
    );
    
    if (!existingRequest) {
      console.error('Friend request not found or not pending');
      return false;
    }

    await query(
      'UPDATE user_friends SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND friend_id = ? AND requester_id = ?',
      [status, requesterId, targetId, requesterId]
    );
    
    return true;
  } catch (error) {
    console.error('Error updating friend request:', error);
    return false;
  }
};

export const getUserFriends = async (userId) => {
  try {
    const friends = await query(
      'SELECT * FROM user_friends WHERE (user_id = ? OR friend_id = ?) AND status = ? ORDER BY created_at DESC',
      [userId, userId, 'accepted']
    );
    
    const uniqueFriends = [];
    const seen = new Set();
    
    for (const friend of friends) {
      const otherId = friend.user_id === userId ? friend.friend_id : friend.user_id;
      
      if (seen.has(otherId)) {
        continue;
      }
      
      seen.add(otherId);
      uniqueFriends.push(friend);
    }
    
    return uniqueFriends;
  } catch (error) {
    console.error('Error getting user friends:', error);
    return [];
  }
};

export const getFriendsCount = async (userId) => {
  try {
    const friends = await getUserFriends(userId);
    return friends.length;
  } catch (error) {
    console.error('Error counting friends:', error);
    return 0;
  }
};

export const areFriends = async (userId, friendId) => {
  try {
    const result = await getRow(
      'SELECT id FROM user_friends WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = ?',
      [userId, friendId, friendId, userId, 'accepted']
    );
    return !!result;
  } catch (error) {
    console.error('Error checking friendship:', error);
    return false;
  }
};

export const removeFriend = async (userId, friendId) => {
  try {
    const result = await query(
      'DELETE FROM user_friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );

    console.log('Delete operation completed successfully, result:', result);
    return true;
  } catch (error) {
    console.error('Error removing friend:', error);
    return false;
  }
};

export const cleanupDuplicateFriends = async () => {
  try {
    console.log('Cleaning up duplicate friend records...');

    const allFriends = await query(
      'SELECT * FROM user_friends WHERE status = ? ORDER BY created_at ASC',
      ['accepted']
    );
    
    const seen = new Set();
    const toDelete = [];
    
    for (const friend of allFriends) {
      const key = [friend.user_id, friend.friend_id].sort().join('_');
      
      if (seen.has(key)) {
        toDelete.push(friend.id);
      } else {
        seen.add(key);
      }
    }
    
    if (toDelete.length > 0) {
      await query(
        `DELETE FROM user_friends WHERE id IN (${toDelete.map(() => '?').join(',')})`,
        toDelete
      );
      console.log(`Deleted ${toDelete.length} duplicate friend records`);
    } else {
      console.log('No duplicate friend records found');
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up duplicate friends:', error);
    return false;
  }
};
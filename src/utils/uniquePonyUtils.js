import { getUniquePonyUpgrade } from '../models/UniquePonyModel.js';
import { getRow } from '../utils/database.js';

const CRIME_BONUSES = [0, 25, 35, 45];

export async function getLuckyRollBonus(userId) {
  try {
    const profilePony = await getRow(
      'SELECT pf.name FROM pony_friends pf JOIN friendship f ON pf.id = f.friend_id WHERE f.user_id = ? AND f.is_profile_pony = 1',
      [userId]
    );
    
    if (!profilePony || profilePony.name !== 'Lucky Roll') {
      return 0;
    }
    
    const upgradeLevel = await getUniquePonyUpgrade(userId, 'Lucky Roll');
    return CRIME_BONUSES[upgradeLevel] || 0;
    
  } catch (error) {
    console.error('Error getting Lucky Roll bonus:', error);
    return 0;
  }
}
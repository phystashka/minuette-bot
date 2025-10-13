
import { query } from './database.js';


export async function getUserClanId(userId) {
  try {

    const ownedClan = await query('SELECT id FROM clans WHERE owner_id = ?', [userId]);
    if (ownedClan.length > 0) {
      return ownedClan[0].id;
    }
    

    const viceClan = await query('SELECT id FROM clans WHERE vice_owner_id = ?', [userId]);
    if (viceClan.length > 0) {
      return viceClan[0].id;
    }
    

    const memberClan = await query('SELECT clan_id FROM clan_members WHERE user_id = ?', [userId]);
    if (memberClan.length > 0) {
      return memberClan[0].clan_id;
    }
    
    return null;
  } catch (error) {
    console.debug('Error getting user clan ID:', error.message);
    return null;
  }
}


export async function addQuestProgress(userId, questType, increment = 1) {
  try {
    const clanId = await getUserClanId(userId);
    if (!clanId) return;
    
    const {
      addBitsEarnedProgress,
      addPonyGetProgress,
      addCrimeSuccessProgress,
      addTradeSuccessProgress,
      addTicTacToeWinProgress,
      addRPSWinProgress,
      addFeedPonyProgress,
      addOpenCaseProgress
    } = await import('./questBatchUpdater.js');
    
    switch (questType) {
      case 'earn_bits':
        addBitsEarnedProgress(userId, clanId, increment);
        break;
      case 'get_ponies':
        addPonyGetProgress(userId, clanId);
        break;
      case 'crime_success':
        addCrimeSuccessProgress(userId, clanId);
        break;
      case 'trade_success':
        addTradeSuccessProgress(userId, clanId);
        break;
      case 'tictactoe_wins':
        addTicTacToeWinProgress(userId, clanId);
        break;
      case 'rps_wins':
        addRPSWinProgress(userId, clanId);
        break;
      case 'feed_ponies':
        addFeedPonyProgress(userId, clanId);
        break;
      case 'open_cases':
        addOpenCaseProgress(userId, clanId);
        break;
    }
  } catch (error) {
    console.debug('Error adding quest progress:', error.message);
  }
}
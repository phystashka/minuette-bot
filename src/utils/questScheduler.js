import cron from 'node-cron';
import ClanQuestModel from '../models/ClanQuestModel.js';

let schedulerInitialized = false;

export function initQuestScheduler() {
  if (schedulerInitialized) {
    console.log('⚠️ Quest scheduler already initialized');
    return;
  }


  cron.schedule('0 0 * * *', async () => {
    console.log('🎯 Starting daily quest reset...');
    try {
      await ClanQuestModel.resetDailyQuests();
      console.log('✅ Daily quest reset completed successfully');
    } catch (error) {
      console.error('❌ Error during daily quest reset:', error);
    }
  }, {
    timezone: 'UTC'
  });


  cron.schedule('0 * * * *', async () => {
    try {
      await ClanQuestModel.cleanupExpiredQuests();
      console.log('🧹 Expired quests cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up expired quests:', error);
    }
  }, {
    timezone: 'UTC'
  });

  schedulerInitialized = true;
  console.log('🎯 Quest scheduler initialized successfully');
  console.log('   - Daily quest reset: 00:00 UTC');
  console.log('   - Expired quest cleanup: Every hour');
}
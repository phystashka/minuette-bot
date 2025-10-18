
import cron from 'node-cron';
import { clearAllTempImages } from './ponyImageCache.js';
import { cleanExpiredArtifacts, cleanAutocatchHistory } from './artifactManager.js';
import { resetAllBingoCards } from './bingoManager.js';

export const startScheduledTasks = (client) => {
  console.log('Starting scheduled tasks...');
  

  cron.schedule('0 * * * *', async () => {
    console.log('🧹 Running hourly cleanup of temporary pony images...');
    try {
      await clearAllTempImages();
      console.log('✅ Temporary pony images cleaned up');
    } catch (error) {
      console.error('❌ Error during pony image cleanup:', error);
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    console.log('Cleaning expired artifacts...');
    try {
      const cleaned = await cleanExpiredArtifacts();
      if (cleaned > 0) {
        console.log(`✅ Cleaned ${cleaned} expired artifacts`);
      }
    } catch (error) {
      console.error('❌ Error during artifact cleanup:', error);
    }
  });

  cron.schedule('0 * * * *', async () => {
    console.log('Cleaning old autocatch history...');
    try {
      const cleaned = await cleanAutocatchHistory();
      if (cleaned > 0) {
        console.log(`✅ Cleaned ${cleaned} old autocatch records`);
      }
    } catch (error) {
      console.error('❌ Error during autocatch cleanup:', error);
    }
  });

  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Daily bingo reset: resetting ALL bingo cards...');
    try {
      const resetCount = await resetAllBingoCards();
      if (resetCount > 0) {
        console.log(`✅ Daily reset: Reset ${resetCount} bingo cards for all users`);
      } else {
        console.log('No bingo cards found to reset');
      }
    } catch (error) {
      console.error('❌ Error during daily bingo reset:', error);
    }
  });
  
  console.log('Scheduled tasks initialized successfully');
};

export default {
  startScheduledTasks
}; 
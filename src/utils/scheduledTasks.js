
import cron from 'node-cron';
import { clearAllTempImages } from './ponyImageCache.js';

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
  
  console.log('Scheduled tasks initialized successfully');
};

export default {
  startScheduledTasks
}; 
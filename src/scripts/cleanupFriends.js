import { initDatabase } from '../utils/database.js';
import { cleanupDuplicateFriends } from '../models/FriendsModel.js';

async function main() {
  console.log('Starting friend cleanup...');
  
  try {
    await initDatabase();
    console.log('Database connected successfully');
    
    const success = await cleanupDuplicateFriends();
    
    if (success) {
      console.log('Friend cleanup completed successfully!');
    } else {
      console.log('Friend cleanup failed');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  process.exit(0);
}

main();
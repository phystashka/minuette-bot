import { addNewPonies2025 } from '../utils/migrations/MainPonyMigration.js';

const runMigration = async () => {
  console.log('Starting pony migration...');
  
  try {
    const result = await addNewPonies2025();
    
    if (result.success) {
      console.log('Migration completed successfully!');
      if (result.added.length > 0) {
        console.log(`Added ${result.added.length} new ponies to the database.`);
      }
    } else {
      console.log('Migration completed with errors. Check the logs above.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};


const args = process.argv.slice(2);

if (args.includes('--rollback')) {
  console.log('Rollback function is not implemented in MainPonyMigration.js');
  console.log('Use manual rollback through database if necessary.');
  process.exit(1);
} else {
  runMigration();
}
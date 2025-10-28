import { query } from '../utils/database.js';

async function getUniquePonies() {
  try {
    console.log('Checking for unique ponies in database...');
    
    const uniquePonies = await query(
      'SELECT name, description, image, pony_type, rarity FROM pony_friends WHERE rarity = ? ORDER BY name',
      ['UNIQUE']
    );
    
    console.log(`\nFound ${uniquePonies.length} unique ponies:`);
    console.log('=' .repeat(80));
    
    uniquePonies.forEach((pony, index) => {
      console.log(`${index + 1}. ${pony.name}`);
      console.log(`   Description: ${pony.description}`);
      console.log(`   Image: ${pony.image}`);
      console.log(`   Type: ${pony.pony_type}`);
      console.log(`   Rarity: ${pony.rarity}`);
      console.log('-'.repeat(60));
    });
    
    console.log(`\nTotal unique ponies found: ${uniquePonies.length}`);
    
    return uniquePonies;
    
  } catch (error) {
    console.error('Error fetching unique ponies:', error);
    return [];
  }
}

async function checkAllRarities() {
  try {
    console.log('\nChecking all rarities in database...');
    
    const rarities = await query(
      'SELECT DISTINCT rarity, COUNT(*) as count FROM pony_friends GROUP BY rarity ORDER BY count DESC'
    );
    
    console.log('\nAll rarities found:');
    console.log('=' .repeat(40));
    
    rarities.forEach(rarity => {
      console.log(`${rarity.rarity}: ${rarity.count} ponies`);
    });
    
  } catch (error) {
    console.error('Error fetching rarities:', error);
  }
}

async function main() {
  console.log('Unique Ponies Database Check\n');
  
  await checkAllRarities();
  await getUniquePonies();
  
  process.exit(0);
}

main().catch(console.error);
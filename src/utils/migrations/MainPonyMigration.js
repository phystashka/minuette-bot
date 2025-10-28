import { query, getRow } from '../database.js';


const NEW_PONIES = [
  { name: 'Strawberry Sunrise', description: 'A competitive pegasus farmer from Ponyville who grows the sweetest strawberries and rivals Applejack in fruit contests.', image: 'Strawberry Sunrise.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: null },
  { name: 'Frazzle Rock', description: 'An enthusiastic earth pony gemologist and expert on the Equestria Friendship Statue jewels, known for her nerdy passion for minerals.', image: 'Frazzle Rock.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: null },
  { name: 'Cinnamon Chai', description: 'A unicorn baker in Canterlot famous for her unique chocolate cherry custard cake, aiding Rarity in investigations with her keen memory.', image: 'Cinnamon Chai.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },

  { name: 'Carrot Crunch', description: 'A young earth pony colt and student at Ponyville Schoolhouse, often seen attending events and meetings.', image: 'Carrot Crunch.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Lily Longsocks', description: 'A strong earth pony filly from Ponyville Schoolhouse with super strength, capable of lifting houses to retrieve her ball.', image: 'Lily Longsocks.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },

  { name: 'Citrus Blush', description: 'A fashionable unicorn mare from Canterlot, patron of Rarity\'s boutique and admirer of elegant dress designs.', image: 'Citrus Blush.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: null },
  { name: 'Starstreak', description: 'An avant-garde earth pony fashion designer focused on futuristic styles, contestant in Rarity\'s Couture du Future contest.', image: 'Starstreak.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: null },
  { name: 'Grand Pear', description: 'An elderly earth pony pear farmer and Applejack\'s maternal grandfather, who reconciled with the Apple family after a long feud.', image: 'Grand Pear.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'sweet_apple_acres', family_group: 'apple_family' },

  { name: 'Angel Wings', description: 'A nervous pegasus trainee at the Wonderbolt Academy, created through Make-A-Wish, known for her winged heart cutie mark and red bow.', image: 'Angel Wings.png', pony_type: 'pegasus', is_canon: 1, rarity: 'SECRET', background: 'cloudsdale', family_group: null },

  { name: 'Umbrum', description: 'Ancient shadowy wraith-like beings from IDW comics, imprisoned beneath the Crystal Empire, masters of manipulation and darkness led by Rabia.', image: 'https://i.imgur.com/nUwA9FZ.png', pony_type: 'umbrum', is_canon: 1, rarity: 'MYTHIC', background: 'crystal_empire', family_group: null },
];



export const addNewPonies2025 = async () => {
  console.log('\n=== STARTING PONY MIGRATION 2025 ===');
  
  const results = {
    success: true,
    added: [],
    skipped: [],
    errors: [],
    totalProcessed: 0
  };

  try {

    const maxIdResult = await query('SELECT MAX(id) as max_id FROM pony_friends');
    let nextId = (maxIdResult[0].max_id || 0) + 1;
    
    console.log(`Starting from ID: ${nextId}`);
    console.log(`Processing ${NEW_PONIES.length} new ponies...\n`);

    for (const ponyData of NEW_PONIES) {
      results.totalProcessed++;
      
      try {
        const existingPony = await getRow(
          'SELECT id, name FROM pony_friends WHERE LOWER(name) = LOWER(?)',
          [ponyData.name]
        );

        if (existingPony) {
          console.log(`⚠️  SKIPPED: "${ponyData.name}" already exists (ID: ${existingPony.id})`);
          results.skipped.push({
            name: ponyData.name,
            reason: 'Already exists',
            existingId: existingPony.id
          });
          continue;
        }

        await query(`
          INSERT INTO pony_friends (
            name, description, image, pony_type, is_canon, is_unique, 
            rarity, background, family_group, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          ponyData.name,
          ponyData.description,
          ponyData.image,
          ponyData.pony_type,
          ponyData.is_canon || 1,
          ponyData.is_unique || 0,
          ponyData.rarity,
          ponyData.background || 'ponyville',
          ponyData.family_group,
        ]);

        const addedPony = await getRow(
          'SELECT id FROM pony_friends WHERE name = ? ORDER BY id DESC LIMIT 1',
          [ponyData.name]
        );

        console.log(`✅ ADDED: "${ponyData.name}" (ID: ${addedPony.id}, Rarity: ${ponyData.rarity})`);
        results.added.push({
          name: ponyData.name,
          id: addedPony.id,
          rarity: ponyData.rarity
        });

      } catch (error) {
        console.error(`❌ ERROR adding "${ponyData.name}":`, error.message);
        results.errors.push({
          name: ponyData.name,
          error: error.message
        });
        results.success = false;
      }
    }


    console.log('\n=== MIGRATION RESULTS ===');
    console.log(`📊 Total processed: ${results.totalProcessed}`);
    console.log(`✅ Successfully added: ${results.added.length}`);
    console.log(`⚠️  Skipped (already exist): ${results.skipped.length}`);
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.added.length > 0) {
      console.log('\n📝 Added ponies by rarity:');
      const addedByRarity = results.added.reduce((acc, pony) => {
        acc[pony.rarity] = (acc[pony.rarity] || 0) + 1;
        return acc;
      }, {});
      
      for (const [rarity, count] of Object.entries(addedByRarity)) {
        console.log(`   ${rarity}: ${count} ponies`);
      }
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors occurred:');
      results.errors.forEach(error => {
        console.log(`   - ${error.name}: ${error.error}`);
      });
    }

    const totalCountResult = await query('SELECT COUNT(*) as total FROM pony_friends');
    console.log(`\n🎯 Total ponies in database: ${totalCountResult[0].total}`);

    console.log('\n=== MIGRATION COMPLETED ===\n');

    return results;

  } catch (error) {
    console.error('💥 CRITICAL ERROR during migration:', error);
    results.success = false;
    results.errors.push({
      name: 'MIGRATION_SYSTEM',
      error: error.message
    });
    return results;
  }
};


export const rollbackNewPonies2025 = async () => {
  console.log('\n⚠️  WARNING: This will remove ponies added by this migration!');
  console.log('This action cannot be undone and may affect user collections!');
  
  const ponyNames = NEW_PONIES.map(p => p.name);
  
  try {
    const poniesQuery = await query(
      `SELECT id, name, rarity FROM pony_friends WHERE name IN (${ponyNames.map(() => '?').join(',')})`,
      ponyNames
    );
    
    if (poniesQuery.length === 0) {
      console.log('✅ No ponies from this migration found in database.');
      return { success: true, removed: [] };
    }
    
    console.log('📋 Ponies to be removed:');
    poniesQuery.forEach(pony => {
      console.log(`   - ${pony.name} (ID: ${pony.id}, Rarity: ${pony.rarity})`);
    });

    console.log('\n🚨 ROLLBACK NOT IMPLEMENTED FOR SAFETY');
    console.log('To manually remove these ponies, use:');
    console.log(`DELETE FROM pony_friends WHERE name IN ('${ponyNames.join("', '")}');`);
    
    return { 
      success: false, 
      message: 'Rollback not implemented for safety. See console for manual SQL.' 
    };

  } catch (error) {
    console.error('Error during rollback:', error);
    return { success: false, error: error.message };
  }
};

export default {
  addNewPonies2025,
  rollbackNewPonies2025
};


if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting automatic migration...');
  addNewPonies2025()
    .then(results => {
      if (results.success) {
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Migration completed with errors.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}
import { query, getRow } from '../database.js';


const NEW_PONIES = [
  { name: 'Pinkie Pie Bat', description: 'A non-canon bat pony version of Pinkie Pie, with bouncy energy and bat wings, throwing glow-in-the-dark parties under the moonlight.', image: 'Pinkie Pie Bat', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'ponyville', family_group: null },
  { name: 'Rarity Bat', description: 'A non-canon bat pony version of Rarity, with sleek bat wings and a flair for crafting dazzling, night-themed fashion designs.', image: 'Rarity Bat', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'ponyville', family_group: null },
  { name: 'Twilight Sparkle Bat', description: 'A non-canon bat pony version of Twilight Sparkle, combining her magical prowess with bat-like agility and a love for starry night studies.', image: 'Twilight Sparkle Bat.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'canterlot', family_group: null },
  { name: 'Rainbow Dash Bat', description: 'A non-canon bat pony version of Rainbow Dash, soaring with bat wings and performing daring nighttime stunts with unmatched speed.', image: 'Rainbow Dash Bat.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'cloudsdale', family_group: null },
  { name: 'Applejack Bat', description: 'A non-canon bat pony version of Applejack, with rugged bat wings, tending orchards by moonlight with her signature honesty and strength.', image: 'Applejack Bat.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'sweet_apple_acres', family_group: 'apple_family' },
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
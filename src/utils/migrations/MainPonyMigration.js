import { query, getRow } from '../database.js';


const NEW_PONIES = [
  // === LEGEND ===
  { name: 'Sphinx', description: 'A tyrannical creature with a pony head, lion body, and eagle wings, who terrorizes villages with riddles and demands tribute.', image: 'https://i.imgur.com/oUy3B6A.png', pony_type: 'sphinx', is_canon: 1, rarity: 'LEGEND', background: 'somnambula_village', family_group: null },
  { name: 'Tantabus', description: 'A parasitic magical force created by Princess Luna to punish herself by turning dreams into nightmares.', image: 'https://i.imgur.com/TWd1kdz.png', pony_type: 'magical_creature', is_canon: 1, rarity: 'LEGEND', background: 'dream_realm', family_group: null },
  // === SECRET ===
  { name: 'Pony of Shadows', description: 'The dark entity formed when Stygian merged with shadows, a powerful antagonist seeking revenge on the Pillars of Old Equestria.', image: 'https://i.imgur.com/wSMPftz.png', pony_type: 'shadow_pony', is_canon: 1, rarity: 'SECRET', background: 'limbo', family_group: null },
  // === MYTHIC ===
  { name: 'Stygian', description: 'A scholarly unicorn who assembled the Pillars of Old Equestria but became the Pony of Shadows after feeling betrayed.', image: 'https://i.imgur.com/TWd1kdz.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  // === EPIC ===
  { name: 'Gilded Lily', description: 'Fancy Pants\' niece, a young unicorn filly who appears in the IDW comics, seeking her cutie mark with the Crusaders\' help.', image: 'https://i.imgur.com/elL8t13.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },
  // === RARE ===
  { name: 'Seabreeze', description: 'An outspoken male Breezie leader who guides his group during migration, speaking in a Scottish-like accent.', image: 'https://i.imgur.com/I8gkNTb.png', pony_type: 'breezie', is_canon: 1, rarity: 'RARE', background: 'breezie_grove', family_group: 'breezie_family' },
  { name: 'Soyokaze', description: 'A breezie from the tiny winged creature community in Breezie Hollow.', image: 'https://i.imgur.com/n2wPtwd.png', pony_type: 'breezie', is_canon: 1, rarity: 'RARE', background: 'breezie_grove', family_group: 'breezie_family' },
  { name: 'Ghostberry', description: 'A breezie from the tiny winged creature community in Breezie Hollow.', image: 'https://i.imgur.com/Yb8CHxG.png', pony_type: 'breezie', is_canon: 1, rarity: 'RARE', background: 'breezie_grove', family_group: 'breezie_family' },
  { name: 'Cotton', description: 'A breezie from the tiny winged creature community in Breezie Hollow.', image: 'https://i.imgur.com/PDCxanW.png', pony_type: 'breezie', is_canon: 1, rarity: 'RARE', background: 'breezie_grove', family_group: 'breezie_family' },

  { name: 'Strawberry Whirl', description: 'A kind-hearted pegasus from Cloudsdale who discovered her love for baking during a visit to Ponyville. After creating her first strawberry macaroons and seeing how they made everypony smile, she earned her cutie mark a trio of macaroons symbolizing her gift for spreading joy through sweet treats.', image: 'https://i.imgur.com/Z71paWH.png', pony_type: 'pegasus', is_canon: 1, rarity: 'CUSTOM', background: 'cloudsdale', family_group: null },
  { name: 'Ghost', description: 'Once a cheerful unicorn from Rustmane, June Flower’s life ended on her 14th birthday when a nuclear blast tore her city apart. Mutated by magic and radiation, she awoke as something else immortal, powerful, and broken. Now known as Ghost, she wanders the wastelands, haunted by the memory of her lost family and the monster she’s become.', image: 'https://i.imgur.com/FYEux5T.png', pony_type: 'alicorn', is_canon: 1, rarity: 'CUSTOM', background: 'Rustmane', family_group: null },
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
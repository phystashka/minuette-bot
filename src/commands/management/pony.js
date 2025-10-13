import { getRow, query } from '../../utils/database.js';

const OWNER_ID = '1372601851781972038';


const AVAILABLE_RARITIES = ['BASIC', 'RARE', 'EPIC', 'MYTHIC', 'LEGEND', 'SECRET'];


const RARITY_WEIGHTS = {
  'BASIC': 40,
  'RARE': 25,
  'EPIC': 15,
  'MYTHIC': 10,
  'LEGEND': 5,
  'SECRET': 5
};


function getRandomRarity() {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  let randomNum = Math.random() * totalWeight;
  
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    randomNum -= weight;
    if (randomNum <= 0) {
      return rarity;
    }
  }
  
  return 'BASIC';
}


async function getRandomPonyOfRarity(rarity) {
  const ponies = await query(
    'SELECT * FROM pony_friends WHERE rarity = ? ORDER BY RANDOM() LIMIT 1',
    [rarity]
  );
  
  return ponies.length > 0 ? ponies[0] : null;
}


async function addPonyToCollection(userId, pony, forceDuplicate = false) {
  try {
    console.log(`[MANUAL PONY] Adding pony ${pony.name} (${pony.id}) to user ${userId}, forceDuplicate: ${forceDuplicate}`);
    
    if (!forceDuplicate) {

      const existing = await getRow(
        'SELECT id FROM friendship WHERE user_id = ? AND friend_id = ?',
        [userId, pony.id]
      );
      
      if (existing) {

        console.log(`[MANUAL PONY] User already has ${pony.name}, increasing friendship level`);
        await query(
          'UPDATE friendship SET friendship_level = friendship_level + 1 WHERE user_id = ? AND friend_id = ?',
          [userId, pony.id]
        );
        return true;
      }
    }
    

    const insertResult = await query(
      'INSERT INTO friendship (user_id, friend_id, is_favorite, friendship_level, experience, created_at, updated_at) VALUES (?, ?, 0, 1, 0, datetime("now"), datetime("now"))',
      [userId, pony.id]
    );
    
    console.log(`[MANUAL PONY] Insert result for ${pony.name} (${pony.id}):`, insertResult);
    

    const verifyInsert = await query(
      'SELECT id FROM friendship WHERE user_id = ? AND friend_id = ? ORDER BY id DESC LIMIT 1',
      [userId, pony.id]
    );
    
    if (!verifyInsert || verifyInsert.length === 0) {
      console.error(`Failed to verify insertion of pony ${pony.name} (${pony.id}) for user ${userId}`);
      return false;
    } else {
      console.log(`[MANUAL PONY] Successfully verified insertion: record ID ${verifyInsert[0].id}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding pony to collection:', error);
    return false;
  }
}


export async function handlePonyCommand(message, args) {

  if (message.author.id !== OWNER_ID) {
    return;
  }

  try {
    const count = parseInt(args[0]) || 1;

    if (count > 1000) {
      await message.reply(`❌ Maximum 1000 ponies at once. Requested: ${count}`);
      return;
    }
    
    if (count <= 0) {
      await message.reply(`❌ Count must be positive. Requested: ${count}`);
      return;
    }

    const userId = message.author.id;
    console.log(`[MANUAL PONY] Processing command for user: ${userId} (${message.author.tag}), adding ${count} ponies`);
    const addedPonies = [];
    const rarityStats = {};
    

    AVAILABLE_RARITIES.forEach(rarity => {
      rarityStats[rarity] = 0;
    });
    

    const availablePoniesCheck = await query(
      'SELECT rarity, COUNT(*) as count FROM pony_friends WHERE rarity IN (?, ?, ?, ?, ?, ?) GROUP BY rarity',
      AVAILABLE_RARITIES
    );
    
    console.log(`[MANUAL PONY] Available ponies by rarity:`, availablePoniesCheck);
    

    const initialCount = await query('SELECT COUNT(*) as count FROM friendship WHERE user_id = ?', [userId]);
    console.log(`[MANUAL PONY] Initial ponies count: ${initialCount[0].count}`);


    let attempts = 0;
    let successfulAdds = 0;
    let failedAdds = 0;
    let noPonieFound = 0;
    const maxAttempts = count * 3;
    
    while (addedPonies.length < count && attempts < maxAttempts) {
      attempts++;
      
      const selectedRarity = getRandomRarity();
      const pony = await getRandomPonyOfRarity(selectedRarity);
      
      if (pony) {
        const success = await addPonyToCollection(userId, pony, true);
        if (success) {
          addedPonies.push(pony);
          rarityStats[selectedRarity]++;
          successfulAdds++;
        } else {
          failedAdds++;
          console.error(`Failed to add pony ${pony.name} (${pony.id}) to collection`);
        }
      } else {
        noPonieFound++;
        console.warn(`No pony found for rarity: ${selectedRarity}`);

        const allPonies = await query('SELECT * FROM pony_friends WHERE rarity IN (?, ?, ?, ?, ?, ?) ORDER BY RANDOM() LIMIT 1', AVAILABLE_RARITIES);
        if (allPonies.length > 0) {
          const fallbackPony = allPonies[0];
          const success = await addPonyToCollection(userId, fallbackPony, true);
          if (success) {
            addedPonies.push(fallbackPony);
            rarityStats[fallbackPony.rarity]++;
            successfulAdds++;
          } else {
            failedAdds++;
          }
        }
      }
    }
    
    console.log(`[MANUAL PONY] Stats: ${successfulAdds} successful, ${failedAdds} failed, ${noPonieFound} not found, ${attempts} total attempts`);
    
    if (addedPonies.length < count) {
      console.warn(`Could only add ${addedPonies.length}/${count} ponies after ${attempts} attempts`);
    }


    let resultText = `✅ **Added ${addedPonies.length}/${count} ponies to your collection!**`;
    
    if (addedPonies.length < count) {
      resultText += ` ⚠️ **Could not add ${count - addedPonies.length} ponies** (possibly missing ponies in database for some rarities)`;
    }
    
    resultText += '\n\n**Rarity Breakdown:**\n';
    for (const [rarity, count] of Object.entries(rarityStats)) {
      if (count > 0) {
        resultText += `• **${rarity}**: ${count} ponies\n`;
      }
    }
    

    if (addedPonies.length > 0) {
      resultText += '\n**Examples added:**\n';
      const examples = addedPonies.slice(0, 5);
      examples.forEach(pony => {
        resultText += `• **${pony.name}** (${pony.rarity})\n`;
      });
      
      if (addedPonies.length > 5) {
        resultText += `• ... and ${addedPonies.length - 5} more!\n`;
      }
    }

    await message.reply(resultText);
    

    try {
      await message.delete();
    } catch (error) {

    }
    

    const actualCount = await query('SELECT COUNT(*) as count FROM friendship WHERE user_id = ?', [userId]);
    const totalInDB = actualCount[0].count;
    

    const rarityBreakdown = await query(`
      SELECT 
        pf.rarity,
        COUNT(*) as count 
      FROM friendship f 
      JOIN pony_friends pf ON f.friend_id = pf.id 
      WHERE f.user_id = ? 
      GROUP BY pf.rarity 
      ORDER BY pf.rarity
    `, [userId]);
    
    console.log(`[MANUAL PONY] ${message.author.tag} added ${addedPonies.length} ponies to collection`);
    console.log(`[MANUAL PONY] Total ponies in database for user: ${totalInDB}`);
    console.log(`[MANUAL PONY] User's collection by rarity:`, rarityBreakdown);

  } catch (error) {
    console.error('Error in manual pony command:', error);
    await message.reply('❌ An error occurred while adding ponies.');
  }
}
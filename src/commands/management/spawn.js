
import { getRow, query } from '../../utils/database.js';

const OWNER_ID = '1372601851781972038';


export async function handleSpawnCommand(message, args) {

  if (message.author.id !== OWNER_ID) {
    return;
  }

  try {
    if (!args[0]) {
      await message.reply('❌ Please provide a pony ID or name.');
      return;
    }

    const input = args.join(' ').trim();
    let pony = null;
    
    const ponyId = parseInt(input);
    if (!isNaN(ponyId)) {
      pony = await getRow(
        'SELECT * FROM pony_friends WHERE id = ?',
        [ponyId]
      );
    }

    if (!pony) {
      pony = await getRow(
        'SELECT * FROM pony_friends WHERE LOWER(name) = LOWER(?)',
        [input]
      );
      
      if (!pony) {
        const partialMatches = await query(
          'SELECT * FROM pony_friends WHERE LOWER(name) LIKE LOWER(?) ORDER BY name LIMIT 10',
          [`%${input}%`]
        );
        
        if (partialMatches.length === 0) {
          await message.reply(`❌ No pony found with name or ID: "${input}"`);
          return;
        } else if (partialMatches.length === 1) {
          pony = partialMatches[0];
        } else {
          const matchList = partialMatches.map((p, index) => 
            `${index + 1}. **${p.name}** (ID: ${p.id})`
          ).join('\n');
          
          await message.reply(`❌ Found multiple ponies matching "${input}":\n${matchList}\n\nPlease be more specific or use the exact ID.`);
          return;
        }
      }
    }

    if (!pony) {
      await message.reply(`❌ Pony "${input}" not found in database.`);
      return;
    }

    const { spawnTestPony } = await import('../../utils/autoSpawn.js');
    
    const success = await spawnTestPony(message.client, message.guildId, message.channelId, pony);
    
    if (success) {
      try {
        await message.delete();
      } catch (error) {
      }
      
      console.log(`[MANUAL SPAWN] ${message.author.tag} spawned pony "${pony.name}" (ID: ${pony.id}) in ${message.guild?.name || 'DM'}/${message.channel.name || 'DM'}`);
      console.log(`[MANUAL SPAWN] Answer: ${pony.name}`);
    } else {
      await message.reply(`❌ Failed to spawn pony. Check console for details.`);
    }

  } catch (error) {
    console.error('Error in manual spawn command:', error);
    await message.reply('❌ An error occurred while spawning the pony.');
  }
}
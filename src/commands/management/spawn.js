
import { getRow } from '../../utils/database.js';

const OWNER_ID = '1372601851781972038';


export async function handleSpawnCommand(message, args) {

  if (message.author.id !== OWNER_ID) {
    return;
  }

  try {
    const ponyId = parseInt(args[0]) || 1;


    const pony = await getRow(
      'SELECT * FROM pony_friends WHERE id = ?',
      [ponyId]
    );

    if (!pony) {
      await message.reply(`❌ Pony with ID ${ponyId} not found in database.`);
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
import { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MessageFlags
} from 'discord.js';
import { query, getRow } from '../../utils/database.js';
import { getPony } from '../../utils/pony/index.js';

function createErrorContainer(message) {
  const container = new ContainerBuilder();
  
  const errorText = new TextDisplayBuilder()
    .setContent(`**Error**\n-# ${message}`);
  container.addTextDisplayComponents(errorText);
  
  return container;
}

function createSuccessContainer(message) {
  const container = new ContainerBuilder();
  
  const successText = new TextDisplayBuilder()
    .setContent(`**Success**\n-# ${message}`);
  container.addTextDisplayComponents(successText);
  
  return container;
}

async function setProfilePony(userId, friendshipId) {
  try {
    await query('UPDATE friendship SET is_profile_pony = 0 WHERE user_id = ?', [userId]);
    
    const setResult = await query('UPDATE friendship SET is_profile_pony = 1 WHERE user_id = ? AND id = ?', [userId, friendshipId]);
    
    if (setResult.changes === 0) {
      console.error('No pony found with friendship ID:', friendshipId);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting profile pony:', error);
    return false;
  }
}

export async function execute(interaction) {
  try {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    const ponyName = interaction.options.getString('pony_name');

    const userPony = await getPony(userId);
    if (!userPony) {
      const noPonyContainer = createErrorContainer('You need to create a pony first with `/equestria`!');
      return await interaction.editReply({
        content: '',
        components: [noPonyContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const uniquePony = await getRow(
      'SELECT id, name FROM pony_friends WHERE LOWER(name) = LOWER(?) AND rarity = ?',
      [ponyName, 'UNIQUE']
    );
    
    if (!uniquePony) {
      const notUniqueContainer = createErrorContainer(`"${ponyName}" is not a unique pony or doesn't exist.`);
      return await interaction.editReply({
        content: '',
        components: [notUniqueContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    const ownedPony = await getRow(
      'SELECT f.id, pf.name FROM friendship f JOIN pony_friends pf ON f.friend_id = pf.id WHERE f.user_id = ? AND pf.id = ? LIMIT 1',
      [userId, uniquePony.id]
    );
    
    if (!ownedPony) {
      const notOwnedContainer = createErrorContainer(`You don't own "${uniquePony.name}". Catch it first!`);
      return await interaction.editReply({
        content: '',
        components: [notOwnedContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const currentProfilePony = await getRow(
      'SELECT pf.name FROM pony_friends pf JOIN friendship f ON pf.id = f.friend_id WHERE f.user_id = ? AND f.is_profile_pony = 1',
      [userId]
    );
    
    if (currentProfilePony && currentProfilePony.name === uniquePony.name) {
      const alreadyEquippedContainer = createErrorContainer(`"${uniquePony.name}" is already your profile pony!`);
      return await interaction.editReply({
        content: '',
        components: [alreadyEquippedContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    const success = await setProfilePony(userId, ownedPony.id);
    
    if (!success) {
      const failedContainer = createErrorContainer('Failed to equip pony. Please try again.');
      return await interaction.editReply({
        content: '',
        components: [failedContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }

    let successMessage = `Successfully equipped "${uniquePony.name}" as your profile pony!`;
    if (currentProfilePony) {
      successMessage += `\n\nPrevious profile pony: "${currentProfilePony.name}"`;
    }
    
    const successContainer = createSuccessContainer(successMessage);
    
    await interaction.editReply({
      content: '',
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2
    });
    
    try {
      if (global.messageCacheManager) {
        global.messageCacheManager.invalidateActivePonyCache(userId);
        console.log(`[UNIQUE EQUIP] Cache invalidated for user ${userId}`);
      }
    } catch (error) {
      console.debug('Cache invalidation error:', error);
    }
    
  } catch (error) {
    console.error('Error in unique equip:', error);
    
    const errorContainer = createErrorContainer('Failed to equip unique pony. Please try again later.');
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '',
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    } else {
      await interaction.editReply({
        content: '',
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
}
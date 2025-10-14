import { getRow, query } from './database.js';


export async function hasActiveCharmOfBinding(userId, guildId) {
  const artifact = await getRow(
    'SELECT * FROM active_artifacts WHERE user_id = ? AND guild_id = ? AND artifact_type = ? AND expires_at > ?',
    [userId, guildId, 'charm_of_binding', Date.now()]
  );
  
  return !!artifact;
}


export async function hasActiveServerCharms(guildId) {
  const artifact = await getRow(
    'SELECT * FROM active_artifacts WHERE guild_id = ? AND artifact_type = ? AND expires_at > ?',
    [guildId, 'server_charms', Date.now()]
  );
  
  return !!artifact;
}


export async function hasActiveBlessingOfFortuna(guildId) {
  const artifact = await getRow(
    'SELECT * FROM active_artifacts WHERE guild_id = ? AND artifact_type = ? AND expires_at > ?',
    [guildId, 'blessing_of_fortuna', Date.now()]
  );
  
  return !!artifact;
}

export async function getActiveArtifact(userId, guildId, artifactType) {
  const query_params = artifactType === 'charm_of_binding' 
    ? [userId, guildId, artifactType, Date.now()]
    : [guildId, artifactType, Date.now()];
    
  const query_sql = artifactType === 'charm_of_binding'
    ? 'SELECT * FROM active_artifacts WHERE user_id = ? AND guild_id = ? AND artifact_type = ? AND expires_at > ?'
    : 'SELECT * FROM active_artifacts WHERE guild_id = ? AND artifact_type = ? AND expires_at > ?';
    
  const artifact = await getRow(query_sql, query_params);
  
  return artifact || null;
}


export async function getActiveArtifacts(guildId) {
  return await query(
    'SELECT * FROM active_artifacts WHERE guild_id = ? AND expires_at > ?',
    [guildId, Date.now()]
  );
}


export async function cleanExpiredArtifacts() {
  try {
    const expiredServerCharms = await query(
      'SELECT guild_id FROM active_artifacts WHERE artifact_type = ? AND expires_at <= ?',
      ['server_charms', Date.now()]
    );
    
    if (expiredServerCharms && expiredServerCharms.length > 0) {
      const { stopServerCharms } = await import('./autoSpawn.js');
      for (const artifact of expiredServerCharms) {
        stopServerCharms(artifact.guild_id);
      }
    }

    const expiredCharms = await query(
      'SELECT DISTINCT guild_id FROM active_artifacts WHERE artifact_type = ? AND expires_at <= ?',
      ['charm_of_binding', Date.now()]
    );
    
    const result = await query(
      'DELETE FROM active_artifacts WHERE expires_at <= ?',
      [Date.now()]
    );

    if (expiredCharms && expiredCharms.length > 0) {
      const { clearAutocatchCache } = await import('./autoSpawn.js');
      for (const artifact of expiredCharms) {
        clearAutocatchCache(artifact.guild_id);
      }
    }
    
    if (Array.isArray(result)) {
      return result.length || 0;
    }
    
    return result || 0;
  } catch (error) {
    console.error('Error cleaning expired artifacts:', error);
    return 0;
  }
}


export async function markAutocatchUsed(userId, guildId, ponySpawnId) {
  await query(
    'INSERT OR IGNORE INTO autocatch_history (user_id, guild_id, spawn_id, caught_at) VALUES (?, ?, ?, ?)',
    [userId, guildId, ponySpawnId, Date.now()]
  );
}


export async function hasUsedAutocatch(userId, guildId, ponySpawnId) {
  const record = await getRow(
    'SELECT * FROM autocatch_history WHERE user_id = ? AND guild_id = ? AND spawn_id = ?',
    [userId, guildId, ponySpawnId]
  );
  
  return !!record;
}


export async function cleanAutocatchHistory() {
  try {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const result = await query(
      'DELETE FROM autocatch_history WHERE caught_at < ?',
      [oneDayAgo]
    );
    
    if (Array.isArray(result)) {
      return result.length || 0;
    }
    
    return result || 0;
  } catch (error) {
    console.error('Error cleaning autocatch history:', error);
    return 0;
  }
}
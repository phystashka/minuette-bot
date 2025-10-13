import { query } from '../utils/database.js';
import { clearUserProfileCache } from '../utils/profileCacheManager.js';


export async function createMarriageTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS marriages (
      user_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      marriage_server TEXT NOT NULL,
      married_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id)
    )
  `);
}


export async function createMarriage(userId, partnerId, guildId) {
  await query('INSERT INTO marriages (user_id, partner_id, guild_id, marriage_server) VALUES (?, ?, ?, ?)', [userId, partnerId, guildId, guildId]);
  await query('INSERT INTO marriages (user_id, partner_id, guild_id, marriage_server) VALUES (?, ?, ?, ?)', [partnerId, userId, guildId, guildId]);
  

  clearUserProfileCache(userId);
  clearUserProfileCache(partnerId);
}


export async function getMarriageByUser(userId) {
  const rows = await query('SELECT * FROM marriages WHERE user_id = ?', [userId]);
  return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}


export async function getMarriageByUserAndGuild(userId, guildId) {
  const rows = await query('SELECT * FROM marriages WHERE user_id = ? AND guild_id = ?', [userId, guildId]);
  return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}


export async function getMarriageByPartner(partnerId) {
  const rows = await query('SELECT * FROM marriages WHERE partner_id = ?', [partnerId]);
  return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}


export async function getMarriageByPartnerAndGuild(partnerId, guildId) {
  const rows = await query('SELECT * FROM marriages WHERE partner_id = ? AND guild_id = ?', [partnerId, guildId]);
  return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}


export async function deleteMarriage(userId, partnerId) {
  await query('DELETE FROM marriages WHERE (user_id = ? AND partner_id = ?) OR (user_id = ? AND partner_id = ?)', [userId, partnerId, partnerId, userId]);
  

  clearUserProfileCache(userId);
  clearUserProfileCache(partnerId);
}


export async function getMarriagesByGuild(guildId) {
  const result = await query('SELECT * FROM marriages WHERE guild_id = ?', [guildId]);
  return Array.isArray(result) ? result : [];
}




createMarriageTable();

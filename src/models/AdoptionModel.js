import { query } from '../utils/database.js';
import { clearUserProfileCache } from '../utils/profileCacheManager.js';


export async function createAdoptionTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS adoptions (
      parent1_id TEXT NOT NULL,
      parent2_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      child_type TEXT NOT NULL CHECK(child_type IN ('son', 'daughter')),
      guild_id TEXT NOT NULL,
      adoption_server TEXT NOT NULL,
      adopted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (parent1_id, parent2_id, child_id)
    )
  `);
}


export async function createAdoption(parent1Id, parent2Id, childId, childType, guildId) {
  await query('INSERT INTO adoptions (parent1_id, parent2_id, child_id, child_type, guild_id, adoption_server) VALUES (?, ?, ?, ?, ?, ?)', 
    [parent1Id, parent2Id, childId, childType, guildId, guildId]);
  

  clearUserProfileCache(parent1Id);
  clearUserProfileCache(parent2Id);
  clearUserProfileCache(childId);
}


export async function getAdoptionByChild(childId) {
  const rows = await query('SELECT * FROM adoptions WHERE child_id = ?', [childId]);
  return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}


export async function getAdoptionByChildAndGuild(childId, guildId) {
  const rows = await query('SELECT * FROM adoptions WHERE child_id = ? AND guild_id = ?', [childId, guildId]);
  return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}


export async function getAdoptionsByParent(parentId) {
  const rows = await query('SELECT * FROM adoptions WHERE (parent1_id = ? OR parent2_id = ?)', 
    [parentId, parentId]);
  return Array.isArray(rows) ? rows : [];
}


export async function getAdoptionsByParentAndGuild(parentId, guildId) {
  const rows = await query('SELECT * FROM adoptions WHERE (parent1_id = ? OR parent2_id = ?) AND guild_id = ?', 
    [parentId, parentId, guildId]);
  return Array.isArray(rows) ? rows : [];
}


export async function getAdoptionByFamily(parent1Id, parent2Id, childId) {
  const rows = await query('SELECT * FROM adoptions WHERE parent1_id = ? AND parent2_id = ? AND child_id = ?', 
    [parent1Id, parent2Id, childId]);
  return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}


export async function getAdoptionByFamilyAndGuild(parent1Id, parent2Id, childId, guildId) {
  const rows = await query('SELECT * FROM adoptions WHERE parent1_id = ? AND parent2_id = ? AND child_id = ? AND guild_id = ?', 
    [parent1Id, parent2Id, childId, guildId]);
  return (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
}


export async function deleteAdoption(parent1Id, parent2Id, childId) {
  await query('DELETE FROM adoptions WHERE parent1_id = ? AND parent2_id = ? AND child_id = ?', 
    [parent1Id, parent2Id, childId]);
  

  clearUserProfileCache(parent1Id);
  clearUserProfileCache(parent2Id);
  clearUserProfileCache(childId);
}


export async function deleteAdoptionByGuild(parent1Id, parent2Id, childId, guildId) {
  await query('DELETE FROM adoptions WHERE parent1_id = ? AND parent2_id = ? AND child_id = ? AND guild_id = ?', 
    [parent1Id, parent2Id, childId, guildId]);
  

  clearUserProfileCache(parent1Id);
  clearUserProfileCache(parent2Id);
  clearUserProfileCache(childId);
}


export async function hasChildren(parent1Id, parent2Id) {
  const rows = await query('SELECT COUNT(*) as count FROM adoptions WHERE (parent1_id = ? AND parent2_id = ?) OR (parent1_id = ? AND parent2_id = ?)', 
    [parent1Id, parent2Id, parent2Id, parent1Id]);
  return rows[0].count > 0;
}


export async function hasChildrenOnGuild(parent1Id, parent2Id, guildId) {
  const rows = await query('SELECT COUNT(*) as count FROM adoptions WHERE (parent1_id = ? AND parent2_id = ?) OR (parent1_id = ? AND parent2_id = ?) AND guild_id = ?', 
    [parent1Id, parent2Id, parent2Id, parent1Id, guildId]);
  return rows[0].count > 0;
}


export async function getChildrenByParents(parent1Id, parent2Id) {
  const rows = await query('SELECT * FROM adoptions WHERE ((parent1_id = ? AND parent2_id = ?) OR (parent1_id = ? AND parent2_id = ?))', 
    [parent1Id, parent2Id, parent2Id, parent1Id]);
  return Array.isArray(rows) ? rows : [];
}


export async function getChildrenByParentsAndGuild(parent1Id, parent2Id, guildId) {
  const rows = await query('SELECT * FROM adoptions WHERE ((parent1_id = ? AND parent2_id = ?) OR (parent1_id = ? AND parent2_id = ?)) AND guild_id = ?', 
    [parent1Id, parent2Id, parent2Id, parent1Id, guildId]);
  return Array.isArray(rows) ? rows : [];
}


export async function getFamilyByMember(memberId) {

  const asParent = await query('SELECT * FROM adoptions WHERE (parent1_id = ? OR parent2_id = ?)', 
    [memberId, memberId]);
  

  const asChild = await query('SELECT * FROM adoptions WHERE child_id = ?', 
    [memberId]);
  
  return {
    asParent: Array.isArray(asParent) ? asParent : [],
    asChild: Array.isArray(asChild) && asChild.length > 0 ? asChild[0] : null
  };
}


export async function getFamilyByMemberAndGuild(memberId, guildId) {

  const asParent = await query('SELECT * FROM adoptions WHERE (parent1_id = ? OR parent2_id = ?) AND guild_id = ?', 
    [memberId, memberId, guildId]);
  

  const asChild = await query('SELECT * FROM adoptions WHERE child_id = ? AND guild_id = ?', 
    [memberId, guildId]);
  
  return {
    asParent: Array.isArray(asParent) ? asParent : [],
    asChild: Array.isArray(asChild) && asChild.length > 0 ? asChild[0] : null
  };
}

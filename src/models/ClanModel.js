
import { query, getRow, insert, update } from '../utils/database.js';


export const createClansTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS clans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL UNIQUE,
      vice_owner_id TEXT DEFAULT NULL,
      background_image TEXT DEFAULT 'blue.png',
      emblem_filename TEXT DEFAULT NULL,
      member_count INTEGER DEFAULT 1,
      level INTEGER DEFAULT 1,
      experience INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  
  const questTypesSQL = `
    CREATE TABLE IF NOT EXISTS clan_quest_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      target_value INTEGER NOT NULL,
      experience_reward INTEGER NOT NULL
    )
  `;
  
  await query(questTypesSQL);
  
  const userQuestsSQL = `
    CREATE TABLE IF NOT EXISTS clan_user_quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      clan_id INTEGER NOT NULL,
      quest_type_id INTEGER NOT NULL,
      current_progress INTEGER DEFAULT 0,
      target_value INTEGER NOT NULL,
      experience_reward INTEGER NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clan_id) REFERENCES clans (id),
      FOREIGN KEY (quest_type_id) REFERENCES clan_quest_types (id)
    )
  `;
  
  await query(userQuestsSQL);
  
  const membersSQL = `
    CREATE TABLE IF NOT EXISTS clan_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      clan_id INTEGER NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, clan_id),
      FOREIGN KEY (clan_id) REFERENCES clans (id)
    )
  `;
  
  await query(membersSQL);
  
  const existingTypes = await query('SELECT COUNT(*) as count FROM clan_quest_types');
  if (existingTypes[0].count === 0) {
    const questTypes = [
      { name: 'Send Messages', description: 'Send messages in Discord', type: 'send_messages', target_value: 50, experience_reward: 100 },
      { name: 'Earn Bits', description: 'Earn bits through various activities', type: 'earn_bits', target_value: 10000, experience_reward: 150 },
      { name: 'Get Ponies', description: 'Catch or obtain new ponies', type: 'get_ponies', target_value: 3, experience_reward: 200 },
      { name: 'Crime Success', description: 'Successfully complete crime activities', type: 'crime_success', target_value: 5, experience_reward: 120 },
      { name: 'Trade Success', description: 'Complete successful trades', type: 'trade_success', target_value: 2, experience_reward: 180 },
      { name: 'TicTacToe Wins', description: 'Win TicTacToe games', type: 'tictactoe_wins', target_value: 3, experience_reward: 100 },
      { name: 'RPS Wins', description: 'Win Rock Paper Scissors games', type: 'rps_wins', target_value: 5, experience_reward: 80 },
      { name: 'Feed Ponies', description: 'Feed your ponies', type: 'feed_ponies', target_value: 10, experience_reward: 90 },
      { name: 'Open Cases', description: 'Open loot cases', type: 'open_cases', target_value: 3, experience_reward: 110 }
    ];
    
    for (const questType of questTypes) {
      await query(`
        INSERT INTO clan_quest_types (name, description, type, target_value, experience_reward)
        VALUES (?, ?, ?, ?, ?)
      `, [questType.name, questType.description, questType.type, questType.target_value, questType.experience_reward]);
    }
    
    console.log('✅ Default clan quest types inserted');
  }
  
  return;
};


export const getClanByOwnerId = async (ownerId) => {
  const sql = 'SELECT * FROM clans WHERE owner_id = ?';
  return await getRow(sql, [ownerId]);
};


export const getClanByOwnerOrVice = async (userId) => {
  const sql = `
    SELECT *, 
    CASE 
      WHEN owner_id = ? THEN 'owner'
      WHEN vice_owner_id = ? THEN 'vice'
      ELSE NULL
    END as userRole
    FROM clans 
    WHERE owner_id = ? OR vice_owner_id = ?
  `;
  return await getRow(sql, [userId, userId, userId, userId]);
};


export const getClanById = async (clanId) => {
  const sql = 'SELECT * FROM clans WHERE id = ?';
  return await getRow(sql, [clanId]);
};


export const getClanByName = async (clanName) => {
  const sql = 'SELECT * FROM clans WHERE LOWER(name) = LOWER(?)';
  return await getRow(sql, [clanName]);
};


export const createClan = async (clanData) => {
  const now = new Date().toISOString();
  
  const data = {
    name: clanData.name,
    owner_id: clanData.owner_id,
    background_image: clanData.background_image || 'blue.png',
    clan_role_id: clanData.clan_role_id || null,
    guild_id: clanData.guild_id || '1369338076178026596',
    member_count: 1,
    level: 1,
    created_at: now,
    updated_at: now
  };
  
  const result = await insert('clans', data);
  return await getClanById(result);
};


export const updateClan = async (clanId, updates) => {
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  return await update('clans', updateData, { id: clanId });
};

export const deleteClan = async (clanId) => {
  const sql = 'DELETE FROM clans WHERE id = ?';
  const result = await query(sql, [clanId]);
  


  return result && (result > 0 || (Array.isArray(result) && result[0] > 0));
};


export const clanExists = async (ownerId) => {
  const clan = await getClanByOwnerId(ownerId);
  return clan !== null;
};


export const getAllClans = async (limit = 50, offset = 0) => {
  const sql = 'SELECT * FROM clans ORDER BY level DESC, member_count DESC LIMIT ? OFFSET ?';
  return await query(sql, [limit, offset]);
};


export const updateMemberCount = async (clanId, memberCount) => {
  return await updateClan(clanId, { member_count: memberCount });
};


export const updateClanBackground = async (clanId, backgroundImage) => {
  return await updateClan(clanId, { background_image: backgroundImage });
};


export const updateClanEmblem = async (ownerId, emblemFilename) => {
  const sql = `UPDATE clans SET emblem_filename = ?, updated_at = CURRENT_TIMESTAMP WHERE owner_id = ?`;
  return await query(sql, [emblemFilename, ownerId]);
};


export const updateClanVice = async (ownerId, viceOwnerId) => {
  const sql = `UPDATE clans SET vice_owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE owner_id = ?`;
  return await query(sql, [viceOwnerId, ownerId]);
};


export const addClanMember = async (clanId, userId, role = 'member') => {
  const sql = `INSERT OR IGNORE INTO clan_members (clan_id, user_id, role) VALUES (?, ?, ?)`;
  return await query(sql, [clanId, userId, role]);
};


export const getClanMember = async (clanId, userId) => {
  const sql = `SELECT * FROM clan_members WHERE clan_id = ? AND user_id = ?`;
  const result = await query(sql, [clanId, userId]);
  return result.length > 0 ? result[0] : null;
};


export const getClanMembers = async (clanId) => {
  const sql = `SELECT * FROM clan_members WHERE clan_id = ? ORDER BY joined_at ASC`;
  return await query(sql, [clanId]);
};

export const getUserClan = async (userId) => {

  const ownedClan = await getClanByOwnerId(userId);
  if (ownedClan) {
    return { ...ownedClan, userRole: 'owner' };
  }


  const memberSql = `
    SELECT c.*, cm.role as userRole, cm.joined_at as userJoinedAt 
    FROM clans c 
    JOIN clan_members cm ON c.id = cm.clan_id 
    WHERE cm.user_id = ?
  `;
  const result = await query(memberSql, [userId]);
  return result.length > 0 ? result[0] : null;
};


export const updateClanRole = async (clanId, roleId) => {
  return await updateClan(clanId, { clan_role_id: roleId });
};


export const getClansByGuildId = async (guildId) => {
  const sql = 'SELECT * FROM clans WHERE guild_id = ?';
  return await query(sql, [guildId]);
};

export const createClanRole = async (guild, clanName) => {
  try {
    const role = await guild.roles.create({
      name: `${clanName} Clan`,
      color: '#7289DA',
      reason: `Роль для клана: ${clanName}`,
      mentionable: true,
      hoist: true
    });
    
    return role;
  } catch (error) {
    console.error('Error creating clan role:', error);
    throw error;
  }
};


export const deleteClanRole = async (guild, roleId) => {
  try {
    const role = guild.roles.cache.get(roleId);
    if (role) {
      await role.delete('Клан расформирован');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting clan role:', error);
    return false;
  }
};


export const updateClanRoleName = async (guild, roleId, newClanName) => {
  try {
    const role = guild.roles.cache.get(roleId);
    if (role) {
      await role.setName(`${newClanName} Clan`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating clan role name:', error);
    return false;
  }
};


export const isUserInTargetGuild = async (client, userId, guildId = '1369338076178026596') => {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {

      return false;
    }
    

    let member = guild.members.cache.get(userId);
    

    if (!member) {
      try {
        member = await guild.members.fetch(userId);
      } catch (fetchError) {

        return false;
      }
    }
    

    return !!member;
  } catch (error) {
    console.error('Error checking user guild membership:', error);
    return false;
  }
};

export default {
  createClansTable,
  getClanByOwnerId,
  getClanByOwnerOrVice,
  getClanById,
  getClanByName,
  createClan,
  updateClan,
  deleteClan,
  clanExists,
  getAllClans,
  updateMemberCount,
  updateClanBackground,
  updateClanEmblem,
  updateClanVice,
  updateClanRole,
  getClansByGuildId,
  createClanRole,
  deleteClanRole,
  updateClanRoleName,
  isUserInTargetGuild,
  addClanMember,
  getClanMember,
  getClanMembers,
  getUserClan
};

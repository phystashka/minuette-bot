import PonyModel from '../../models/PonyModel.js';
import { createEmbed } from '../components.js';

import FriendshipModel from '../../models/FriendshipModel.js';

export async function getPony(userId) {
  try {
    return await PonyModel.getPonyByUserId(userId);
  } catch (error) {
    console.error('Error getting pony:', error);
    return null;
  }
}

export async function createPony(data) {
  try {
    return await PonyModel.createPony(data);
  } catch (error) {
    if (error.code === 'PONY_EXISTS') {
      console.log(`User ${data.user_id} already has a pony`);

      const duplicateError = new Error('User already has a pony');
      duplicateError.code = 'PONY_EXISTS';
      throw duplicateError;
    }
    console.error('Error creating pony:', error);
    throw error;
  }
}

export async function updatePony(userId, data) {
  try {
    const updateData = {};

    if (data.name !== undefined) updateData.pony_name = data.name;
    if (data.age !== undefined) updateData.pony_age = data.age;
    if (data.race !== undefined) updateData.pony_race = data.race;
    if (data.description !== undefined) updateData.pony_description = data.description;
    
    if (data.pony_name !== undefined) updateData.pony_name = data.pony_name;
    if (data.pony_age !== undefined) updateData.pony_age = data.pony_age;
    if (data.pony_race !== undefined) updateData.pony_race = data.pony_race;
    if (data.pony_description !== undefined) updateData.pony_description = data.pony_description;
    
    if (data.bits !== undefined) updateData.bits = data.bits;
    if (data.reputation !== undefined) updateData.reputation = data.reputation;
    
    const success = await PonyModel.updatePony(userId, updateData);
    
    if (success) {
      return await getPony(userId);
    }
    
    return false;
  } catch (error) {
    console.error('Error updating pony:', error);
    throw error;
  }
}

export async function addBits(userId, amount) {
  try {
    return await PonyModel.addBits(userId, amount);
  } catch (error) {
    console.error('Error adding bits:', error);
    return false;
  }
}

export async function removeBits(userId, amount) {
  try {
    return await PonyModel.removeBits(userId, amount);
  } catch (error) {
    console.error('Error removing bits:', error);
    return false;
  }
}

export async function addReputation(userId, amount) {
  try {
    return await PonyModel.addReputation(userId, amount);
  } catch (error) {
    console.error('Error adding reputation:', error);
    return false;
  }
}

export async function removeReputation(userId, amount) {
  try {
    return await PonyModel.removeReputation(userId, amount);
  } catch (error) {
    console.error('Error removing reputation:', error);
    return false;
  }
}

export async function addInfluence(userId, amount) {
  try {
    return await PonyModel.addInfluence(userId, amount);
  } catch (error) {
    console.error('Error adding influence:', error);
    return false;
  }
}

export async function removeInfluence(userId, amount) {
  try {
    return await PonyModel.removeInfluence(userId, amount);
  } catch (error) {
    console.error('Error removing influence:', error);
    return false;
  }
}

export function getRaceEmoji(race) {
  const raceEmojis = {
    'earth': '🌱',
    'unicorn': '🦄',
    'pegasus': '🕊️',
    'alicorn': '👑',
    'zebra': '🦓',
    'changeling': '🐛',
    'hippogriff': '🦅',
    'crystal': '💎',
    'batpony': '🦇',
    'bat_pony': '🦇',
    'seapony': '🌊',
    'dragon': '🐉',
    'yak': '🐃',
    'griffon': '🦅',
    'goat': '🐐',
    'satyr': '🐴',
    'ahuizotl': '🐺',
    'skeleton_pony': '💀',
    'skeleton': '💀',

    'alligator': '🐊',
    'tortoise': '🐢',
    'owl': '🦉',
    'dog': '🐕',
    'cat': '🐱',
    'bunny': '🐰',
    'bear': '🐻',
    'reindeer': '🦌',
    'phoenix': '🔥'
  };
  
  return raceEmojis[race] || '❓';
}

export function getRaceName(race) {
  const raceNames = {
    'earth': 'Earth Pony',
    'unicorn': 'Unicorn',
    'pegasus': 'Pegasus',
    'alicorn': 'Alicorn',
    'zebra': 'Zebra',
    'changeling': 'Changeling',
    'hippogriff': 'Hippogriff',
    'crystal': 'Crystal Pony',
    'batpony': 'Bat Pony',
    'seapony': 'Sea Pony',
    'dragon': 'Dragon',
    'yak': 'Yak',
    'griffon': 'Griffon',
    'goat': 'Goat',
    'satyr': 'Satyr',
    'ahuizotl': 'Ahuizotl',

    'alligator': 'Alligator',
    'tortoise': 'Tortoise',
    'owl': 'Owl',
    'dog': 'Dog',
    'cat': 'Cat',
    'bunny': 'Bunny',
    'bear': 'Bear',
    'reindeer': 'Reindeer',
    'phoenix': 'Phoenix'
  };
  
  return raceNames[race] || 'Unknown';
}

export async function createPonyEmbed(pony, user) {
  const timestamp = Math.floor(new Date(pony.created_at).getTime() / 1000);
  

  const reputation = pony.reputation || 50;
  const reputationPrefix = reputation >= 50 ? "+" : "-";
  const reputationDisplay = reputation >= 50 ? reputation - 50 : 50 - reputation;
  const reputationText = reputationDisplay > 0 ? ` (${reputationPrefix}${reputationDisplay})` : '';
  
  const fields = [
    {
      name: '> Race',
      value: getRaceName(pony.pony_race),
      inline: true
    },
    {
      name: '> Age',
      value: `${pony.pony_age} years`,
      inline: true
    },
    {
      name: '> Location',
      value: locationInfo.name,
      inline: true
    },
    {
      name: '> Cash',
      value: `${pony.bits} bits`,
      inline: true
    },
    {
      name: '> Bank',
      value: `${pony.bank_balance} bits`,
      inline: true
    }
  ];
  

    fields.push({
      name: '> Influence',
      value: pony.canterlot_unlocked ? `${pony.influence.toFixed(1)}%` : 'Locked',
      inline: true
    });
  
  fields.push({
    name: '> Owner',
    value: user.username,
    inline: true
  });
  

  fields.push({
    name: '> Created',
    value: `<t:${timestamp}:R>`,
    inline: true
  });
  
  return createEmbed({
    title: `${pony.pony_name}${reputationText}`,
    description: `> ${pony.pony_description || 'No description provided.'}`,
    fields: fields,
    user: user
  });
}

export function validatePonyAge(age) {
  const ageNum = parseInt(age);
  
  if (isNaN(ageNum)) {
    throw new Error('Age must be a number');
  }
  
  if (ageNum < 1) {
    throw new Error('Age must be at least 1 year');
  }
  
  if (ageNum > 1000) {
    throw new Error('Age cannot exceed 1000 years');
  }
  
  return true;
}

export function validatePonyRace(race) {
  const validRaces = ['earth', 'unicorn', 'pegasus', 'alicorn', 'zebra', 'changeling', 'hippogriff', 'crystal', 'batpony', 'seapony', 'dragon', 'yak', 'griffon', 'goat', 'satyr', 'ahuizotl', 'alligator', 'tortoise', 'owl', 'dog', 'cat', 'bunny', 'bear', 'reindeer', 'phoenix'];
  
  if (!race) {
    throw new Error('Pony race cannot be empty');
  }
  
  const normalizedRace = race.toLowerCase().trim();

  const raceMap = {
    'earthpony': 'earth',
    'earth pony': 'earth',
    'unicornpony': 'unicorn',
    'unicorn pony': 'unicorn',
    'pegasuspony': 'pegasus',
    'pegasus pony': 'pegasus',
    'alicornpony': 'alicorn',
    'alicorn pony': 'alicorn',
    'bat': 'batpony',
    'bat pony': 'batpony',
    'sea': 'seapony',
    'sea pony': 'seapony',
    'crystalpony': 'crystal',
    'crystal pony': 'crystal',
    'hippogryph': 'hippogriff',
    'griffon': 'griffon',
    'griffin': 'griffon',
    'change': 'changeling',
    'changling': 'changeling',
    'changeling': 'changeling',

    'gator': 'alligator',
    'crocodile': 'alligator',
    'turtle': 'tortoise',
    'hoot': 'owl',
    'puppy': 'dog',
    'hound': 'dog',
    'kitty': 'cat',
    'kitten': 'cat',
    'rabbit': 'bunny',
    'hare': 'bunny',
    'deer': 'reindeer',
    'stag': 'reindeer',
    'firebird': 'phoenix'
  };
  
  
  if (raceMap[normalizedRace]) {
    return raceMap[normalizedRace];
  }
  

  if (!validRaces.includes(normalizedRace)) {
    throw new Error(`Invalid pony race. Valid races: ${validRaces.join(', ')}`);
  }
  
  return normalizedRace;
}

export function validatePonyName(name) {
  if (!name) {
    throw new Error('Pony name cannot be empty');
  }
  
  if (name.length < 3) {
    throw new Error('Pony name must be at least 3 characters long');
  }
  
  if (name.length > 32) {
    throw new Error('Pony name cannot exceed 32 characters');
  }
  
  return true;
}

export function validatePonyDescription(description) {
  if (!description) {
    throw new Error('Pony description cannot be empty');
  }
  
  if (description.length > 1000) {
    throw new Error('Pony description cannot exceed 1000 characters');
  }
  
  return true;
}

export function getRaces() {
  return ['earth', 'unicorn', 'pegasus', 'alicorn', 'zebra', 'changeling', 'hippogriff', 'crystal', 'batpony', 'seapony', 'dragon', 'yak', 'griffon', 'goat', 'satyr', 'ahuizotl', 'alligator', 'tortoise', 'owl', 'dog', 'cat', 'bunny', 'bear', 'reindeer', 'phoenix'];
}

export function hasPony(pony) {
  return pony !== null && pony !== undefined;
}

export async function updateLocation(userId, location) {
  try {
    return await PonyModel.updateLocation(userId, location);
  } catch (error) {
    console.error('Error updating location:', error);
    return false;
  }
}

export async function resetProgress(userId) {
  try {
    return await PonyModel.resetProgress(userId);
  } catch (error) {
    console.error('Error resetting progress:', error);
    throw error;
  }
}

export async function hasAllFriends(userId) {
  try {

    const allPonyFriends = await FriendshipModel.getAllPonyFriends();
    const totalPonyCount = allPonyFriends.length;
    

    const userFriends = await FriendshipModel.getUserFriends(userId);
    const userFriendsCount = userFriends.length;
    

    return userFriendsCount >= totalPonyCount;
  } catch (error) {
    console.error('Error checking if user has all friends:', error);
    return false;
  }
} 
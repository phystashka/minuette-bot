
import { query, getRow, insert, update, sequelize } from '../utils/database.js';
import { addBits } from '../utils/pony/index.js';
import { addResource } from '../models/ResourceModel.js';
import { leaderboardCache } from '../utils/leaderboardCache.js';

export const createPonyFriendsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS pony_friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      pony_type TEXT NOT NULL,
      is_canon INTEGER DEFAULT 1,
      rarity TEXT DEFAULT 'BASIC',
      background TEXT DEFAULT 'ponyville',
      family_group TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  await query(`CREATE INDEX IF NOT EXISTS idx_pony_friends_name ON pony_friends (name)`);
};

export const createFriendshipTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS friendship (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      friend_id INTEGER NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
  

  await query(`CREATE INDEX IF NOT EXISTS idx_friendship_user_id ON friendship (user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_friendship_friend_id ON friendship (friend_id)`);
};

export const updatePonyFriendsTableStructure = async () => {
  try {

    const checkTableSql = `
      PRAGMA table_info(pony_friends)
    `;
    
    const columnInfo = await sequelize.query(checkTableSql, {
      type: sequelize.QueryTypes.SELECT
    });
    
    const columns = columnInfo.map(col => col.name);
    

    if (!columns.includes('is_canon')) {
      console.log('Updating pony_friends table: adding is_canon column...');
      await query(`ALTER TABLE pony_friends ADD COLUMN is_canon INTEGER NOT NULL DEFAULT 1`);
      console.log('Successfully added is_canon column');
    }

    if (!columns.includes('is_unique')) {
      console.log('Updating pony_friends table: adding is_unique column...');
      await query(`ALTER TABLE pony_friends ADD COLUMN is_unique INTEGER NOT NULL DEFAULT 0`);
      console.log('Successfully added is_unique column');
    }

    if (!columns.includes('rarity')) {
      console.log('Updating pony_friends table: adding rarity column...');
      await query(`ALTER TABLE pony_friends ADD COLUMN rarity TEXT DEFAULT 'BASIC'`);
      console.log('Successfully added rarity column');
    }
    

    if (!columns.includes('background')) {
      console.log('Updating pony_friends table: adding background column...');
      await query(`ALTER TABLE pony_friends ADD COLUMN background TEXT DEFAULT 'ponyville'`);
      console.log('Successfully added background column');
    }
    

    if (!columns.includes('family_group')) {
      console.log('Updating pony_friends table: adding family_group column...');
      await query(`ALTER TABLE pony_friends ADD COLUMN family_group TEXT DEFAULT NULL`);
      console.log('Successfully added family_group column');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating pony_friends table structure:', error);
    throw error;
  }
};


export const updateFriendshipTableStructure = async () => {
  try {

    const checkTableSql = `PRAGMA table_info(friendship)`;
    const columnInfo = await sequelize.query(checkTableSql, {
      type: sequelize.QueryTypes.SELECT
    });
    
    const columns = columnInfo.map(col => col.name);
    

    if (!columns.includes('friendship_level')) {
      console.log('Updating friendship table: adding friendship_level column...');
      await query(`ALTER TABLE friendship ADD COLUMN friendship_level INTEGER NOT NULL DEFAULT 1`);
      console.log('Successfully added friendship_level column');
    }
    

    if (!columns.includes('experience')) {
      console.log('Updating friendship table: adding experience column...');
      await query(`ALTER TABLE friendship ADD COLUMN experience INTEGER NOT NULL DEFAULT 0`);
      console.log('Successfully added experience column');
    }

    if (!columns.includes('custom_name')) {
      console.log('Updating friendship table: adding custom_name column...');
      await query(`ALTER TABLE friendship ADD COLUMN custom_name TEXT DEFAULT NULL`);
      console.log('Successfully added custom_name column');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating friendship table structure:', error);
    throw error;
  }
};



export const PONY_DATA = [
  { name: 'Kerfuffle', description: 'A resourceful pegasus mare from Hope Hollow featured in My Little Pony: Rainbow Roadtrip. An inventor with a prosthetic leg, she helps restore color to her town through her creative gadgets and optimistic spirit.', image: 'https://i.imgur.com/e7zapbf.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EXCLUSIVE', background: 'equestria', family_group: null },

  { name: 'Princess Celestia', description: 'Co-ruler of Equestria and former mentor to Twilight Sparkle', image: 'https://i.imgur.com/FiPZJtc.png', pony_type: 'alicorn', is_canon: 1, rarity: 'LEGEND', background: 'canterlot', family_group: 'royal_sisters' },
  { name: 'Princess Luna', description: 'Co-ruler of Equestria and guardian of dreams', image: 'https://i.imgur.com/qI9dXRf.png', pony_type: 'alicorn', is_canon: 1, rarity: 'LEGEND', background: 'canterlot', family_group: 'royal_sisters' },
  { name: 'Princess Cadance', description: 'The Princess of Love and ruler of the Crystal Empire', image: 'https://i.imgur.com/37eiQIl.png', pony_type: 'alicorn', is_canon: 1, rarity: 'LEGEND', background: 'crystal_empire', family_group: 'crystal_family' },
  { name: 'Flurry Heart', description: 'The infant alicorn daughter of Princess Cadance and Shining Armor, born in the Crystal Empire. She is the first naturally born alicorn in Equestria.', image: 'https://i.imgur.com/9Cf8rHL.png', pony_type: 'alicorn', is_canon: 1, is_unique: 1, rarity: 'LEGEND', background: 'crystal_empire', family_group: 'crystal_family' },
  { name: 'Daybreaker', description: 'The evil alternate version of Princess Celestia, representing her potential for destruction.', image: 'https://i.imgur.com/w7U1dsA.png', pony_type: 'alicorn', is_canon: 1, is_unique: 1, rarity: 'LEGEND', background: 'canterlot', family_group: 'royal_sisters' },
  { name: 'Nightmare Moon', description: 'The corrupted form of Princess Luna, who sought to bring eternal night to Equestria.', image: 'https://i.imgur.com/otE9v20.png', pony_type: 'alicorn', is_canon: 1, is_unique: 1, rarity: 'LEGEND', background: 'canterlot', family_group: 'royal_sisters' },
  { name: 'King Sombra', description: 'Former tyrant of the Crystal Empire', image: 'https://i.imgur.com/0MZEyyI.png', pony_type: 'unicorn', is_canon: 1, rarity: 'LEGEND', background: 'crystal_empire', family_group: null },
  { name: 'Queen Chrysalis', description: 'Former queen of the changelings', image: 'https://i.imgur.com/oUVh91t.png', pony_type: 'changeling', is_canon: 1, rarity: 'LEGEND', background: 'changeling_hive', family_group: null },
  { name: 'Lord Tirek', description: 'Power-hungry centaur', image: 'https://i.imgur.com/qHWChj5.png', pony_type: 'dragon', is_canon: 1, rarity: 'LEGEND', background: 'tartarus', family_group: null },
  { name: 'The Storm King', description: 'The main antagonist of the My Little Pony: The Movie (2017), a tyrannical conqueror who seeks to control Equestria\'s magic.', image: 'https://i.imgur.com/XMN7s48.png', pony_type: 'satyr', is_canon: 1, is_unique: 1, rarity: 'LEGEND', background: 'airship', family_group: null },
  { name: 'Ember', description: 'Dragon Lord of the Dragon Lands', image: 'https://i.imgur.com/lnyhLiF.png', pony_type: 'dragon', is_canon: 1, rarity: 'LEGEND', background: 'dragon_lands', family_group: null },
  { name: 'Cozy Glow', description: 'Deceptive pegasus filly', image: 'https://i.imgur.com/Vu3JVJL.png', pony_type: 'pegasus', is_canon: 1, rarity: 'LEGEND', background: 'ponyville', family_group: null },
  { name: 'Tempest Shadow', description: 'Former villain with a broken horn', image: 'https://i.imgur.com/XrjK17W.png', pony_type: 'unicorn', is_canon: 1, rarity: 'LEGEND', background: 'airship', family_group: null },
  { name: 'Queen Novo', description: 'Queen of the hippogriffs and seaponies', image: 'https://i.imgur.com/TP7tUNv.png', pony_type: 'hippogriff', is_canon: 1, rarity: 'LEGEND', background: 'mount_aris', family_group: 'hippogriff_royal' },
  { name: 'Princess Skystar', description: 'Hippogriff princess from Mount Aris', image: 'https://i.imgur.com/mt2TyCA.png', pony_type: 'hippogriff', is_canon: 1, rarity: 'LEGEND', background: 'mount_aris', family_group: 'hippogriff_royal' },
  { name: 'Grogar', description: 'The ancient ruler of monsters and father of all evil. A powerful goat-like creature who once ruled Equestria before the reign of ponies.', image: 'https://i.imgur.com/BC7DCgf.png', pony_type: 'goat', is_canon: 1, rarity: 'LEGEND', background: 'tambeleon', family_group: null },
  { name: 'Star Swirl the Bearded', description: 'The legendary unicorn wizard and mentor to Princess Celestia and Luna. Known for creating many spells and his time-travel experiments.', image: 'https://i.imgur.com/V9xNZz5.png', pony_type: 'unicorn', is_canon: 1, rarity: 'LEGEND', background: 'canterlot', family_group: null },
  { name: 'Mistmane', description: 'One of the Pillars of Equestria, known for her beauty and wisdom. She sacrificed her youth to save her homeland.', image: 'https://i.imgur.com/RZp3Y5p.png', pony_type: 'unicorn', is_canon: 1, rarity: 'LEGEND', background: 'equestria', family_group: null },
  { name: 'Prince Rutherford', description: 'Leader of the yaks, known for his stubbornness and diplomatic relations with ponies.', image: 'https://i.imgur.com/af7rdaR.png', pony_type: 'yak', is_canon: 1, rarity: 'LEGEND', background: 'yakyakistan', family_group: null },
  { name: 'Ahuizotl', description: 'Antagonist from Daring Do books, an ancient monster seeking powerful artifacts.', image: 'https://i.imgur.com/JDAaSTM.png', pony_type: 'ahuizotl', is_canon: 1, rarity: 'LEGEND', background: 'jungle', family_group: null },
  { name: 'Grubber', description: 'Tempest Shadow’s greedy hedgehog assistant from the movie, with a comedic personality.', image: 'https://i.imgur.com/TbpMnGO.png', pony_type: 'hedgehog', is_canon: 1, rarity: 'LEGEND', background: 'airship', family_group: null },
  { name: 'Opaline Arcana', description: 'A villainous alicorn seeking to conquer Equestria and drain all pony magic.', image: 'https://i.imgur.com/il8l35t.png', pony_type: 'alicorn', is_canon: 1, rarity: 'LEGEND', background: 'equestria', family_group: null },
  { name: 'Philomena', description: 'Princess Celestia\'s pet phoenix, known for her fiery rebirth cycle and playful antics in Canterlot.', image: 'https://i.imgur.com/8y1udaP.png', pony_type: 'phoenix', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: 'royal_sisters' },

  { name: 'Allura', description: 'A cunning and powerful snow leopard from Generation 5, a formidable villainess with magical abilities and a desire to control Starlight Ridge, manipulating others to achieve her goals.', image: 'https://i.imgur.com/p0VjDJm.png', pony_type: 'snow_leopard', is_canon: 1, rarity: 'LEGEND', background: 'equestria', family_group: null },



  { name: 'Twilight Sparkle', description: 'The Princess of Friendship and former Element of Magic', image: 'https://i.imgur.com/hRfENxg.png', pony_type: 'alicorn', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: 'sparkle_family' },
  { name: 'Rainbow Dash', description: 'The Element of Loyalty and weather manager of Ponyville', image: 'https://i.imgur.com/XxafdWc.png', pony_type: 'pegasus', is_canon: 1, rarity: 'MYTHIC', background: 'cloudsdale', family_group: 'dash_family' },
  { name: 'Pinkie Pie', description: 'The Element of Laughter and party planner extraordinaire', image: 'https://i.imgur.com/lCydmhB.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: 'pie_family' },
  { name: 'Rarity', description: 'The Element of Generosity and fashion designer', image: 'https://i.imgur.com/Pq1GDwP.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: 'belle_family' },
  { name: 'Applejack', description: 'The Element of Honesty and apple farmer', image: 'https://i.imgur.com/4nexpcE.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'sweet_apple_acres', family_group: 'apple_family' },
  { name: 'Fluttershy', description: 'The Element of Kindness and animal caretaker', image: 'https://i.imgur.com/gRRtVyg.png', pony_type: 'pegasus', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: 'shy_family' },
  { name: 'Spike', description: 'Twilight\'s assistant and friend', image: 'https://i.imgur.com/ZZNHzCN.png', pony_type: 'dragon', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: 'sparkle_family' },
  { name: 'Starlight Glimmer', description: 'Twilight\'s student and former villain', image: 'https://i.imgur.com/X6Z4Crf.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: null },
  { name: 'Discord', description: 'The Spirit of Chaos and reformed villain', image: 'https://i.imgur.com/rURKYhv.png', pony_type: 'dragon', is_canon: 1, rarity: 'MYTHIC', background: 'chaosville', family_group: null },
  { name: 'Shining Armor', description: 'Twilight\'s brother and co-ruler of the Crystal Empire', image: 'https://i.imgur.com/UpYEDCz.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'crystal_empire', family_group: 'crystal_family' },
  { name: 'Sunset Shimmer', description: 'A unicorn (later human in Equestria Girls) who was a former student of Princess Celestia. She becomes a key character in the Equestria Girls spin-off but also appears in the main series.', image: 'https://i.imgur.com/w3NwKyk.png', pony_type: 'unicorn', is_canon: 1, is_unique: 1, rarity: 'MYTHIC', background: 'canterlot', family_group: null },
  { name: 'Rockhoof', description: 'One of the Pillars of Equestria, known for his incredible strength and earth pony magic. A legendary hero from ancient times.', image: 'https://i.imgur.com/3hTBGds.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  { name: 'Flash Magnus', description: 'One of the Pillars of Equestria, a pegasus known for his speed and courage. Former member of the ancient royal guard.', image: 'https://i.imgur.com/uhmkM7A.png', pony_type: 'pegasus', is_canon: 1, rarity: 'MYTHIC', background: 'cloudsdale', family_group: null },
  { name: 'Meadowbrook', description: 'One of the Pillars of Equestria, an earth pony healer and herb specialist from the ancient times.', image: 'https://i.imgur.com/aMw0Qhi.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  { name: 'Somnambula', description: 'One of the Pillars of Equestria, a pegasus known for her hope and optimism. She inspired others with her unwavering faith.', image: 'https://i.imgur.com/8OwPcOP.png', pony_type: 'pegasus', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  { name: 'Maud Pie', description: 'Pinkie Pie\'s older sister, known for her deadpan personality and extensive knowledge of rocks and geology.', image: 'https://i.imgur.com/szEf8em.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'rock_farm', family_group: 'pie_family' },
  { name: 'Limestone Pie', description: 'One of Pinkie Pie\'s sisters, known for her strict and no-nonsense attitude about the family rock farm.', image: 'https://i.imgur.com/zQF6uwb.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'rock_farm', family_group: 'pie_family' },
  { name: 'Marble Pie', description: 'Pinkie Pie\'s shy and quiet sister who rarely speaks above a whisper but has a kind heart.', image: 'https://i.imgur.com/VM3beEx.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'rock_farm', family_group: 'pie_family' },
  { name: 'Radiant Hope', description: 'A unicorn and King Sombra’s childhood friend from the IDW comics, who plays a key role in his redemption arc.', image: 'https://i.imgur.com/7cHCdvr.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'crystal_empire', family_group: null },
  { name: 'Sunny Starscout', description: 'An earth pony and leader of the new generation, dedicated to uniting ponies and restoring magic to Equestria.', image: 'https://i.imgur.com/ugQ5KFw.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'maretime_bay', family_group: 'starscout_family' },
  { name: 'Izzy Moonbow', description: 'A cheerful unicorn with a creative spirit, known for her crafting skills and optimistic outlook.', image: 'https://i.imgur.com/vHbcVGc.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'bridlewood', family_group: null },
  { name: 'Hitch Trailblazer', description: 'An earth pony sheriff of Maretime Bay, loyal and responsible, with a knack for leadership and animal affinity.', image: 'https://i.imgur.com/7fHyf3X.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'maretime_bay', family_group: null },
  { name: 'Pipp Petals', description: 'A pegasus princess and social media star from Zephyr Heights, known for her singing and charisma.', image: 'https://i.imgur.com/1qRB9rV.png', pony_type: 'pegasus', is_canon: 1, rarity: 'MYTHIC', background: 'zephyr_heights', family_group: 'zephyr_royal' },
  { name: 'Zipp Storm', description: 'A pegasus princess and athletic detective from Zephyr Heights, with a passion for flying and problem-solving.', image: 'https://i.imgur.com/JQAhRnm.png', pony_type: 'pegasus', is_canon: 1, rarity: 'MYTHIC', background: 'zephyr_heights', family_group: 'zephyr_royal' },
  { name: 'Babs Seed', description: 'Apple Bloom’s cousin and Cutie Mark Crusader, a reformed bully from Manehattan.', image: 'https://i.imgur.com/FQdD3qf.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'manehattan', family_group: 'apple_family' },
  { name: 'Gallus', description: 'Young griffon student at the School of Friendship, sarcastic and a natural leader.', image: 'https://i.imgur.com/ShWToiU.png', pony_type: 'griffon', is_canon: 1, rarity: 'MYTHIC', background: 'griffonstone', family_group: null },
  { name: 'Silverstream', description: 'Energetic hippogriff student at the School of Friendship, curious and cheerful.', image: 'https://i.imgur.com/JYwdSuo.png', pony_type: 'hippogriff', is_canon: 1, rarity: 'MYTHIC', background: 'mount_aris', family_group: 'hippogriff_royal' },
  { name: 'Smolder', description: 'Skeptical and brave dragon student at the School of Friendship.', image: 'https://i.imgur.com/ykN7pi0.png', pony_type: 'dragon', is_canon: 1, rarity: 'MYTHIC', background: 'dragon_lands', family_group: null },
  { name: 'Yona', description: 'Strong and enthusiastic yak student at the School of Friendship.', image: 'https://i.imgur.com/hxvlQe5.png', pony_type: 'yak', is_canon: 1, rarity: 'MYTHIC', background: 'yakyakistan', family_group: null },
  { name: 'Sandbar', description: 'Calm and friendly earth pony student at the School of Friendship.', image: 'https://i.imgur.com/h5NFnov.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: null },
  { name: 'Ocellus', description: 'Shy and intelligent changeling student at the School of Friendship.', image: 'https://i.imgur.com/Ssr7ceo.png', pony_type: 'changeling', is_canon: 1, rarity: 'MYTHIC', background: 'changeling_hive', family_group: null },
  { name: 'Capper', description: 'Charismatic cat con-artist from the movie, turned ally of the ponies.', image: 'https://i.imgur.com/rIcNEYF.png', pony_type: 'cat', is_canon: 1, rarity: 'MYTHIC', background: 'klugetown', family_group: null },
  { name: 'Captain Celaeno', description: 'Bold parrot pirate captain from the movie, leader of a sky pirate crew.', image: 'https://i.imgur.com/BetrYiV.png', pony_type: 'parrot', is_canon: 1, rarity: 'MYTHIC', background: 'airship', family_group: null },
  { name: 'Sunburst', description: 'Starlight Glimmer\'s childhood friend and royal crystaller to Flurry Heart in the Crystal Empire.', image: 'https://i.imgur.com/FsDmqBh.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'crystal_empire', family_group: null },
  { name: 'Terramar', description: 'Silverstream\'s younger brother, a seapony/hippogriff who helps bridge the two worlds.', image: 'https://i.imgur.com/5YYt24L.png', pony_type: 'hippogriff', is_canon: 1, rarity: 'MYTHIC', background: 'mount_aris', family_group: 'hippogriff_royal' },
  { name: 'Misty Brightdawn', description: 'A young unicorn with a mysterious past, seeking friendship while grappling with loyalty to Opaline.', image: 'https://i.imgur.com/kel88bf.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'maretime_bay', family_group: null },
  { name: 'Cloudpuff', description: 'A loyal and fluffy Pomeranian dog from Generation 5, serving as the pampered pet of the royal family in Zephyr Heights. With a creamy white coat and boundless energy, he follows Queen Haven and her daughters, Pipp and Zipp, bringing joy and mischief to the palace.', image: 'https://i.imgur.com/Xr1Um6s.png', pony_type: 'dog', is_canon: 1, rarity: 'MYTHIC', background: 'zephyr_heights', family_group: 'zephyr_royal' },
  { name: 'Copper Top', description: 'A police officer in Ponyville, known for her role in law enforcement and interactions with the main characters.', image: 'https://i.imgur.com/WBDcOP2.png', pony_type: 'earth', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: null },
  { name: 'Clear Sky', description: 'A unicorn mare and single mother to Wind Sprint, girlfriend of Quibble Pants, known for her supportive and understanding nature in blending families.', image: 'https://i.imgur.com/ZRPAFyd.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  { name: 'Queen Haven', description: 'The regal pegasus queen of Zephyr Heights and mother to Pipp Petals and Zipp Storm, known for her grace and leadership in the G5 era.', image: 'https://i.imgur.com/Ng3MZTZ.png', pony_type: 'pegasus', is_canon: 1, rarity: 'MYTHIC', background: 'zephyr_heights', family_group: 'zephyr_royal' },
  { name: 'Aurora', description: 'An elderly blue reindeer and one of the Gift Givers of the Grove from My Little Pony: Best Gift Ever. She possesses retrocognitive abilities, allowing her to know about gifts given in the past, and helps create perfect gifts with her sisters.', image: 'https://i.imgur.com/rOvUCCT.png', pony_type: 'reindeer', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  { name: 'Bori', description: 'A strong gray reindeer and mediator of the Gift Givers of the Grove from My Little Pony: Best Gift Ever. She keeps her sisters Aurora and Alice in line, focusing on the present while they create magical perfect gifts.', image: 'https://i.imgur.com/cKcbVy9.png', pony_type: 'reindeer', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  { name: 'Alice', description: 'A light brown reindeer and one of the Gift Givers of the Grove from My Little Pony: Best Gift Ever. She has precognitive abilities to foresee future gifts and collaborates with her sisters to craft ideal presents for those in need.', image: 'https://i.imgur.com/l6mmBy3.png', pony_type: 'reindeer', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },


  { name: 'Mayor Mare', description: 'The mayor of Ponyville, responsible for overseeing town events and governance.', image: 'https://i.imgur.com/TsIeki6.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: null },
  { name: 'Diamond Tiara', description: 'A wealthy earth pony filly and former antagonist who bullies the Cutie Mark Crusaders but later reforms.', image: 'https://i.imgur.com/nf3blnf.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'rich_family' },
  { name: 'Silver Spoon', description: 'Diamond Tiara\'s best friend and a fellow antagonist who also reforms alongside her.', image: 'https://i.imgur.com/tv43cFd.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: null },
  { name: 'Daring Do', description: 'A pegasus adventurer and author of the Daring Do book series, revealed to be a real pony in the show.', image: 'https://i.imgur.com/tuIBXZC.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'jungle', family_group: null },
  { name: 'Coco Pommel', description: 'A kind earth pony who works in the fashion industry and becomes Rarity\'s friend after leaving her harsh boss, Suri Polomare.', image: 'https://i.imgur.com/xeOkGPS.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'manehattan', family_group: null },
  { name: 'Flash Sentry', description: 'A pegasus royal guard of the Crystal Empire. Known for his loyalty and dedication to duty.', image: 'https://i.imgur.com/UpA8gZY.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'crystal_empire', family_group: null },
  { name: 'Spitfire', description: 'The captain of the Wonderbolts aerial acrobatics team and Rainbow Dash\'s role model.', image: 'https://i.imgur.com/U5PtTU3.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'cloudsdale', family_group: null },
  { name: 'Soarin', description: 'A member of the Wonderbolts known for his love of pie and impressive flying skills.', image: 'https://i.imgur.com/hmyVhNp.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'cloudsdale', family_group: null },
  { name: 'Fancy Pants', description: 'A sophisticated unicorn from Canterlot\'s high society who becomes friends with Rarity.', image: 'https://i.imgur.com/OfJDAnR.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },
  { name: 'Fleur Dis Lee', description: 'A elegant model from Canterlot often seen at high-society events with Fancy Pants.', image: 'https://i.imgur.com/uCnDedd.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },
  { name: 'Prince Blueblood', description: 'A self-centered unicorn prince from Canterlot who disappoints Rarity at the Grand Galloping Gala.', image: 'https://i.imgur.com/W9slN2n.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: 'royal_family' },
  { name: 'Thorax', description: 'The reformed changeling who becomes the new leader of the changeling hive after Chrysalis.', image: 'https://i.imgur.com/NQ7IomP.png', pony_type: 'changeling', is_canon: 1, rarity: 'EPIC', background: 'changeling_hive', family_group: 'changeling_family' },
  { name: 'Pharynx', description: 'Thorax\'s older brother who initially resisted the changeling transformation but eventually reformed.', image: 'https://i.imgur.com/wGhQw7I.png', pony_type: 'changeling', is_canon: 1, rarity: 'EPIC', background: 'changeling_hive', family_group: 'changeling_family' },
  { name: 'Autumn Blaze', description: 'A kirin who lost her voice and later regained it, known for her chatty and friendly personality.', image: 'https://i.imgur.com/12LlOL8.png', pony_type: 'kirin', is_canon: 1, rarity: 'EPIC', background: 'kirin_village', family_group: null },
  { name: 'Rain Shine', description: 'The leader of the kirin village who maintains order and helps her people control their emotions.', image: 'https://i.imgur.com/By1lW2L.png', pony_type: 'kirin', is_canon: 1, rarity: 'EPIC', background: 'kirin_village', family_group: null },
  { name: 'Gilda', description: 'A griffon and former friend of Rainbow Dash, known for her brash attitude but later shows growth in the series.', image: 'https://i.imgur.com/H2GUmCu.png', pony_type: 'griffon', is_canon: 1, rarity: 'EPIC', background: 'griffonstone', family_group: null },
  { name: 'Coloratura', description: 'A famous earth pony pop star, known as Countess Coloratura, and an old friend of Applejack with a heartfelt journey.', image: 'https://i.imgur.com/w2klVjF.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'manehattan', family_group: null },
  { name: 'Flim', description: 'One of the con-artist brothers, selling fake goods and inventions.', image: 'https://i.imgur.com/f5jgHGU.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: 'flim_flam_brothers' },
  { name: 'Flam', description: 'Flim’s con-artist brother, partner in schemes and scams.', image: 'https://i.imgur.com/TlLb8l7.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: 'flim_flam_brothers' },
  { name: 'Iron Will', description: 'Minotaur motivational speaker who teaches Fluttershy assertiveness.', image: 'https://i.imgur.com/bMqLTN7.png', pony_type: 'minotaur', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: null },
  { name: 'Adagio Dazzle', description: 'Leader of the Dazzlings, a siren antagonist in Equestria Girls: Rainbow Rocks.', image: 'https://i.imgur.com/rd8VIor.png', pony_type: 'siren', is_canon: 1, rarity: 'EPIC', background: 'equestria_girls', family_group: 'dazzlings' },
  { name: 'Aria Blaze', description: 'Sarcastic member of the Dazzlings, a siren in Equestria Girls.', image: 'https://i.imgur.com/Wzj5Al4.png', pony_type: 'siren', is_canon: 1, rarity: 'EPIC', background: 'equestria_girls', family_group: 'dazzlings' },
  { name: 'Sonata Dusk', description: 'Naive member of the Dazzlings, a siren in Equestria Girls.', image: 'https://i.imgur.com/9ppsXUG.png', pony_type: 'siren', is_canon: 1, rarity: 'EPIC', background: 'equestria_girls', family_group: 'dazzlings' },
  { name: 'Filthy Rich', description: 'Wealthy businesspony and father of Diamond Tiara.', image: 'https://i.imgur.com/wLBWdcG.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'rich_family' },
  { name: 'Spoiled Rich', description: 'Snobbish mother of Diamond Tiara, focused on status.', image: 'https://i.imgur.com/WpmflUM.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'rich_family' },
  { name: 'Bright Mac', description: 'Applejack’s father, an apple farmer who passed away.', image: 'https://i.imgur.com/1DDVZYZ.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'sweet_apple_acres', family_group: 'apple_family' },
  { name: 'Pear Butter', description: 'Applejack’s mother from the Pear family, passed away.', image: 'https://i.imgur.com/CWCnw2B.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'sweet_apple_acres', family_group: 'apple_family' },
  { name: 'Goldie Delicious', description: 'Elderly Apple family member, keeper of family history.', image: 'https://i.imgur.com/zn2noiJ.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: 'apple_family' },
  { name: 'Apple Strudel', description: 'An elderly Apple family member known for his traditional attire and appearances at family reunions.', image: 'https://i.imgur.com/H5YkAL4.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: 'apple_family' },
  { name: 'Fume', description: 'Purple Dragon" or "Young Dragon", is a purple dragon with a blond mane and unseen eyes.', image: 'https://i.imgur.com/Im9vpzO.png', pony_type: 'kirin', is_canon: 1, rarity: 'EPIC', background: 'kirin_village', family_group: null },
  { name: 'Jack Pot', description: 'Trixie Lulamoon\'s father, a former stage magician who inspired her career.', image: 'https://i.imgur.com/bMYajKQ.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: 'lulamoon_family' },
  { name: 'Spectacle', description: 'Trixie Lulamoon\'s mother, also known as Showcase, a performer in the family\'s magic act.', image: 'https://i.imgur.com/bMkjm5j.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: 'lulamoon_family' },
  { name: 'Sky Beak', description: 'Father of Silverstream and Terramar, a hippogriff focused on seapony traditions.', image: 'https://i.imgur.com/eJQGoAt.png', pony_type: 'hippogriff', is_canon: 1, rarity: 'EPIC', background: 'mount_aris', family_group: 'hippogriff_royal' },
  { name: 'Ocean Flow', description: 'Mother of Silverstream and Terramar, an encouraging seapony ambassador.', image: 'https://i.imgur.com/9CqU3Iw.png', pony_type: 'seapony', is_canon: 1, rarity: 'EPIC', background: 'mount_aris', family_group: 'hippogriff_royal' },
  { name: 'Guard', description: 'A Diamond Dog from the Diamond Dog packs, known for his role in capturing Rarity.', image: 'https://i.imgur.com/AoCvDgy.png', pony_type: 'diamond_dog', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: null },
  { name: 'Fido', description: 'Leader of a Diamond Dog pack, greedy and scheming in pursuit of gems.', image: 'https://i.imgur.com/WR1K3XW.png', pony_type: 'diamond_dog', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: null },
  { name: 'Rover', description: 'A Diamond Dog scout who captures Rarity for her gem-finding talent.', image: 'https://i.imgur.com/Eq0fGpy.png', pony_type: 'diamond_dog', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: null },
  { name: 'Spot', description: 'A Diamond Dog worker in the mines, part of the pack that enslaves Rarity.', image: 'https://i.imgur.com/EaEOdn3.png', pony_type: 'diamond_dog', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: null },
  { name: 'Steven Magnet', description: 'A dramatic sea serpent whose mustache was ruined, helped by Fluttershy.', image: 'https://i.imgur.com/HjGlGqW.png', pony_type: 'sea_serpent', is_canon: 1, rarity: 'EPIC', background: 'equestria', family_group: null },
  { name: 'Gloriosa Daisy', description: 'Camp Everfree director and antagonist in Equestria Girls: Legend of Everfree.', image: 'https://i.imgur.com/nPPrS8J.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'equestria_girls', family_group: null },
  { name: 'Timber Spruce', description: 'Gloriosa Daisy\'s brother and camp counselor in Equestria Girls: Legend of Everfree.', image: 'https://i.imgur.com/SX5sfN1.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'equestria_girls', family_group: null },
  { name: 'Barley Barrel', description: 'One of the fraternal twin pegasus foals who greatly admire Rainbow Dash and try to copy her moves, participating in aerial training and exercises.', image: 'https://i.imgur.com/ajw7JIB.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'barrel_twins' },
  { name: 'Pickle Barrel', description: 'The brother of Barley Barrel, a fraternal twin pegasus foal who idolizes Rainbow Dash and joins in her training sessions, including dynamic flight routines.', image: 'https://i.imgur.com/ckVy4j2.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'barrel_twins' },
  { name: 'Dinky Doo', description: 'A young unicorn filly from Ponyville, often seen in the background at school or town events. Known for her playful demeanor and rumored to be Derpy Hooves\' daughter, she has a lavender coat, blonde mane, and a curious spirit.', image: 'https://i.imgur.com/uI9NAjN.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'hooves_family' },
  { name: 'Dr. Horse', description: 'A physician who works at Ponyville Hospital, often seen assisting with medical duties.', image: 'https://i.imgur.com/tBPT1dy.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Hoity Toity', description: 'A famous and dramatic fashion critic from Canterlot known for his high standards and exaggerated reactions to clothing designs.', image: 'https://i.imgur.com/d1Gn4j6.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },
  { name: 'Jet Set', description: 'A sophisticated unicorn stallion from Canterlot high society, often seen with Upper Crust at elite events and galas.', image: 'https://i.imgur.com/smTLfvW.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },
  { name: 'Upper Crust', description: 'An elegant unicorn mare from Canterlot, Jet Set\'s companion, known for her snobbish attitude and love of luxury.', image: 'https://i.imgur.com/AYUVKk4.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },
  { name: 'Garble', description: 'A teenage red dragon and bully who leads a gang of young dragons, often antagonizing Spike.', image: 'https://i.imgur.com/JYbsu1j.png', pony_type: 'dragon', is_canon: 1, rarity: 'EPIC', background: 'dragon_lands', family_group: null },
  { name: 'Wind Rider', description: 'An elderly blue pegasus and retired Wonderbolt, father of Rainbow Dash\'s rival, involved in a cheating scandal.', image: 'https://i.imgur.com/nvET3fI.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'cloudsdale', family_group: null },
  { name: 'Windy Whistles', description: 'The enthusiastic and supportive pegasus mother of Rainbow Dash, known for her over-the-top cheering and pride in her daughter\'s achievements.', image: 'https://i.imgur.com/D97f4kF.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'cloudsdale', family_group: 'dash_family' },
  { name: 'Bow Hothoof', description: 'The proud and athletic pegasus father of Rainbow Dash, often seen cheering alongside his wife and sharing stories of his own flying days.', image: 'https://i.imgur.com/PkMfR9u.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'cloudsdale', family_group: 'dash_family' },
  { name: 'Cookie Crumbles', description: 'The caring earth pony mother of Rarity and Sweetie Belle, known for her baking skills and supportive nature toward her daughters\' creative pursuits.', image: 'https://i.imgur.com/B7QtB4T.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'belle_family' },
  { name: 'Hondo Flanks', description: 'The laid-back earth pony father of Rarity and Sweetie Belle, a sports enthusiast who encourages his daughters in their endeavors.', image: 'https://i.imgur.com/hbwXcIm.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'belle_family' },
  { name: 'Firelight', description: 'The nostalgic unicorn father of Starlight Glimmer, a historian who dotes on his daughter and preserves memories of her childhood.', image: 'https://i.imgur.com/gbKRkqV.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'glimmer_family' },
  { name: 'Argyle Starshine', description: 'The scholarly earth pony father of Sunny Starscout, dedicated to researching Equestria\'s history and promoting unity among pony kinds.', image: 'https://i.imgur.com/upGGgDy.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'maretime_bay', family_group: 'starscout_family' },
  { name: 'Alphabittle Blossomforth', description: 'The competitive unicorn father of Izzy Moonbow, known for his tea shop and love of games in Bridlewood.', image: 'https://i.imgur.com/Q1oV7lC.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'bridlewood', family_group: 'moonbow_family' },
  { name: 'Snap Shutter', description: 'The adventurous earth pony father of Scootaloo, an explorer who travels the world documenting rare creatures.', image: 'https://i.imgur.com/IPSg39s.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'scootaloo_family' },
  { name: 'Mane Allgood', description: 'The dedicated pegasus mother of Scootaloo, a zoologist who studies and protects endangered animals across Equestria.', image: 'https://i.imgur.com/dnNn2AP.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: 'scootaloo_family' },
  { name: 'Songbird Serenade', description: 'A famous pegasus pop star from the My Little Pony movie, known for her stunning performances and inspiring music.', image: 'https://i.imgur.com/qS1lJcy.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },
  { name: 'Dr. Fauna', description: 'A kind-hearted earth pony veterinarian in Ponyville who cares for animals and works closely with Fluttershy.', image: 'https://i.imgur.com/Yp4RUkl.png', pony_type: 'earth', is_canon: 1, rarity: 'EPIC', background: 'ponyville', family_group: null },
  { name: 'Ruby Jubilee', description: 'An energetic pegasus pony and mayor of Hope Hollow, known for her leadership in organizing the annual Rainbow Festival and her optimistic spirit in bringing the town together.', image: 'https://i.imgur.com/613dZLb.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EPIC', background: 'hope_hollow', family_group: null },



  { name: 'Trixie Lulamoon', description: 'Magician and former rival of Twilight', image: 'https://i.imgur.com/IlzuMTc.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'equestria', family_group: 'lulamoon_family' },
  { name: 'Big McIntosh', description: 'Applejack\'s brother and apple farmer', image: 'https://i.imgur.com/fTy4Rib.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'sweet_apple_acres', family_group: 'apple_family' },
  { name: 'Granny Smith', description: 'Applejack\'s grandmother and founder of Ponyville', image: 'https://i.imgur.com/wfsKsAo.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'sweet_apple_acres', family_group: 'apple_family' },
  { name: 'Apple Bloom', description: 'Applejack\'s sister and member of the Cutie Mark Crusaders', image: 'https://i.imgur.com/3u4OnV0.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'sweet_apple_acres', family_group: 'apple_family' },
  { name: 'Sweetie Belle', description: 'Rarity\'s sister and member of the Cutie Mark Crusaders', image: 'https://i.imgur.com/kNNYUU4.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'belle_family' },
  { name: 'Scootaloo', description: 'Rainbow Dash\'s admirer and member of the Cutie Mark Crusaders', image: 'https://i.imgur.com/ILIEEP3.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'scootaloo_family' },
  { name: 'Zecora', description: 'Wise zebra from the Everfree Forest', image: 'https://i.imgur.com/EShk9kC.png', pony_type: 'zebra', is_canon: 1, rarity: 'RARE', background: 'everfree_forest', family_group: null },
  { name: 'Chief Thunderhooves', description: 'The leader of the buffalo tribe in Appleloosa, seeking peace with the ponies.', image: 'https://i.imgur.com/92WtYgK.png', pony_type: 'buffalo', is_canon: 1, rarity: 'RARE', background: 'appleloosa', family_group: 'buffalo_tribe' },
  { name: 'Little Strongheart', description: 'A young buffalo from Appleloosa who helps resolve conflicts between ponies and buffalo.', image: 'https://i.imgur.com/OqDsjNd.png', pony_type: 'buffalo', is_canon: 1, rarity: 'RARE', background: 'appleloosa', family_group: 'buffalo_tribe' },
  { name: 'Saffron Masala', description: 'An earth pony chef from Canterlot who runs a restaurant with her father, known for spicy cuisine.', image: 'https://i.imgur.com/cHti2ym.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: 'masala_family' },
  { name: 'Raven Inkwell', description: 'One of Princess Celestia\'s most trusted aides and advisors. She is known for her efficiency and organization skills in managing royal affairs.', image: 'https://i.imgur.com/ofx3Wp3.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  { name: 'Lotus Blossom', description: 'One of the spa twins who runs the Ponyville Day Spa, known for her relaxing treatments.', image: 'https://i.imgur.com/nqGTP7C.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'spa_twins' },
  { name: 'Aloe', description: 'The other spa twin who works alongside Lotus Blossom at the Ponyville Day Spa.', image: 'https://i.imgur.com/aIco49G.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'spa_twins' },
  { name: 'Vinyl Scratch', description: 'A DJ unicorn known for her electronic music and distinctive sunglasses, also called DJ Pon-3.', image: 'https://i.imgur.com/KOA5q13.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'scratch_family' },
  { name: 'Octavia Melody', description: 'A refined earth pony cellist who performs classical music, often contrasted with Vinyl Scratch.', image: 'https://i.imgur.com/7lEtM41.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Lyra Heartstrings', description: 'A unicorn with a talent for music, known for her distinctive sitting posture and obsession with humans.', image: 'https://i.imgur.com/jV1DVoC.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'lyra_bonbon_family' },
  { name: 'Bon Bon', description: 'A candy maker earth pony and Lyra\'s best friend, later revealed to be a secret agent named Agent Sweetie Drops.', image: 'https://i.imgur.com/DLNE2q4.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'lyra_bonbon_family' },
  { name: 'Roseluck', description: 'An earth pony who works at the flower shop in Ponyville, known for her dramatic reactions.', image: 'https://i.imgur.com/EolbYcO.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Berry Punch', description: 'An earth pony known for her love of beverages and often seen at social gatherings.', image: 'https://i.imgur.com/7rBvU69.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Derpy Hooves', description: 'A clumsy but well-meaning pegasus mail carrier with crossed eyes and a muffin obsession.', image: 'https://i.imgur.com/5s5VJT9.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'hooves_family' },
  { name: 'Carrot Top', description: 'An earth pony farmer who grows carrots and other vegetables, also known as Golden Harvest.', image: 'https://i.imgur.com/QzoXrOD.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Minuette', description: 'A unicorn dentist from Canterlot and old friend of Twilight Sparkle from their school days.', image: 'https://i.imgur.com/VgeerZd.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  { name: 'Lemon Hearts', description: 'A unicorn and another of Twilight\'s old school friends from Canterlot.', image: 'https://i.imgur.com/ThyZeWN.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  { name: 'Twinkleshine', description: 'A unicorn and one of Twilight\'s friends from her time in Canterlot before moving to Ponyville.', image: 'https://i.imgur.com/NBlz9gx.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  { name: 'Cheese Sandwich', description: 'An earth pony party planner who rivals Pinkie Pie, inspired by "Weird Al" Yankovic, with a knack for spreading joy.', image: 'https://i.imgur.com/VYkKvaI.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'equestria', family_group: null },
  { name: 'Sassy Saddles', description: 'A unicorn who manages Rarity’s Canterlot boutique, known for her business acumen and organizational skills.', image: 'https://i.imgur.com/WfwzleV.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  { name: 'Moon Dancer', description: 'A unicorn and Twilight Sparkle’s old friend from Canterlot, who overcame her social isolation with Twilight’s help.', image: 'https://i.imgur.com/I2f0TN1.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  { name: 'Silver Shill', description: 'An earth pony who worked for Flim and Flam but later reforms, known for his role in a scam-turned-redemption.', image: 'https://i.imgur.com/Mfo0ZRh.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'equestria', family_group: null },
  { name: 'Party Favor', description: 'Earth pony from Starlight’s village, skilled in balloon-twisting. Officially recognized as a trans pony within the My Little Pony universe.', image: 'https://i.imgur.com/c7eozMl.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'our_town', family_group: null },
  { name: 'Double Diamond', description: 'Unicorn from Starlight’s village, key in the equality arc.', image: 'https://i.imgur.com/MBljIYH.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'our_town', family_group: null },
  { name: 'Night Glider', description: 'Pegasus from Starlight’s village, adept at flying.', image: 'https://i.imgur.com/R9YiK2I.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'our_town', family_group: null },
  { name: 'Igneous Rock Pie', description: 'Pinkie Pie’s stern rock farmer father.', image: 'https://i.imgur.com/wlaDUbX.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'rock_farm', family_group: 'pie_family' },
  { name: 'Cloudy Quartz', description: 'Pinkie Pie’s quiet and devout mother.', image: 'https://i.imgur.com/F8t0ffC.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'rock_farm', family_group: 'pie_family' },
  { name: 'Juniper Montage', description: 'Antagonist in Equestria Girls: Movie Magic, a filmmaker with a grudge.', image: 'https://i.imgur.com/891yLgj.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'equestria_girls', family_group: 'montage_family' },
  { name: 'Wallflower Blush', description: 'Antagonist in Equestria Girls: Forgotten Friendship, a forgotten student.', image: 'https://i.imgur.com/KZEInam.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'equestria_girls', family_group: null },
  { name: 'Vignette Valencia', description: 'Antagonist in Equestria Girls: Rollercoaster of Friendship, a social media influencer.', image: 'https://i.imgur.com/zepQJRL.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'equestria_girls', family_group: null },
  { name: 'Twist', description: 'School filly friend of the Cutie Mark Crusaders, talented with candy.', image: 'https://i.imgur.com/LavPUgP.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Rumble', description: 'Thunderlane’s younger brother, a spirited young pegasus.', image: 'https://i.imgur.com/ztLHlJq.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'thunderlane_family' },
  { name: 'Peachy Sweet', description: 'An Earth pony member of the Apple family with a pie cutie mark, appearing in various episodes at family events and in Appleloosa.', image: 'https://i.imgur.com/2xqjSoD.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Apple Fritter', description: 'An Apple family Earth pony who appears at reunions and helps with family events like surprise parties.', image: 'https://i.imgur.com/4QAv9vo.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Gala Appleby', description: 'An Apple family Earth pony named at family brunches and appearing in reunion episodes.', image: 'https://i.imgur.com/TZrU6SF.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Jonagold', description: 'An Apple family Earth pony who participates in family gatherings and events.', image: 'https://i.imgur.com/okDe41P.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Sunny Delivery', description: 'A dedicated pegasus mail courier known for her speed and reliability. She specializes in express deliveries and has an excellent track record for getting packages to their destinations on time, rain or shine.', image: 'https://i.imgur.com/QuyVXTQ.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'cloudsdale', family_group: null },
  { name: 'Appointed Rounds', description: 'An organized pegasus who works in postal administration, planning delivery routes and schedules. Her aerial perspective and flight abilities help her efficiently map out delivery routes across Equestria.', image: 'https://i.imgur.com/1872svt.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'cloudsdale', family_group: null },
  { name: 'Stellar Flare', description: 'Sunburst\'s ambitious mother, a unicorn who pushes her son toward magical achievements.', image: 'https://i.imgur.com/kIcKwo6.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'crystal_empire', family_group: 'sunburst_family' },
  { name: 'Twilight Velvet', description: 'Twilight Sparkle and Shining Armor\'s mother, an author who loves adventure stories.', image: 'https://i.imgur.com/T9TXXEE.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: 'sparkle_family' },
  { name: 'Night Light', description: 'Twilight Sparkle and Shining Armor\'s father, a supportive and intellectual unicorn.', image: 'https://i.imgur.com/4yLT1Z2.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: 'sparkle_family' },
  { name: 'Dusty Pages', description: 'Twilight\'s favorite elderly librarian from Canterlot, dedicated to preserving knowledge.', image: 'https://i.imgur.com/b5PKWHW.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  
  { name: 'Sphinx', description: 'A tyrannical creature with a pony head, lion body, and eagle wings, who terrorizes villages with riddles and demands tribute.', image: 'https://i.imgur.com/oUy3B6A.png', pony_type: 'sphinx', is_canon: 1, rarity: 'LEGEND', background: 'somnambula_village', family_group: null },
  { name: 'Tantabus', description: 'A parasitic magical force created by Princess Luna to punish herself by turning dreams into nightmares.', image: 'https://i.imgur.com/TWd1kdz.png', pony_type: 'magical_creature', is_canon: 1, rarity: 'LEGEND', background: 'dream_realm', family_group: null },
  { name: 'Pony of Shadows', description: 'The dark entity formed when Stygian merged with shadows, a powerful antagonist seeking revenge on the Pillars of Old Equestria.', image: 'https://i.imgur.com/wSMPftz.png', pony_type: 'shadow_pony', is_canon: 1, rarity: 'SECRET', background: 'limbo', family_group: null },
  { name: 'Stygian', description: 'A scholarly unicorn who assembled the Pillars of Old Equestria but became the Pony of Shadows after feeling betrayed.', image: 'https://i.imgur.com/TWd1kdz.png', pony_type: 'unicorn', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  { name: 'Gilded Lily', description: 'Fancy Pants\' niece, a young unicorn filly who appears in the IDW comics, seeking her cutie mark with the Crusaders\' help.', image: 'https://i.imgur.com/elL8t13.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EPIC', background: 'canterlot', family_group: null },
  { name: 'Seabreeze', description: 'An outspoken male Breezie leader who guides his group during migration, speaking in a Scottish-like accent.', image: 'https://i.imgur.com/I8gkNTb.png', pony_type: 'breezie', is_canon: 1, rarity: 'RARE', background: 'breezie_grove', family_group: 'breezie_family' },
  { name: 'Soyokaze', description: 'A breezie from the tiny winged creature community in Breezie Hollow.', image: 'https://i.imgur.com/n2wPtwd.png', pony_type: 'breezie', is_canon: 1, rarity: 'RARE', background: 'breezie_grove', family_group: 'breezie_family' },
  { name: 'Ghostberry', description: 'A breezie from the tiny winged creature community in Breezie Hollow.', image: 'https://i.imgur.com/Yb8CHxG.png', pony_type: 'breezie', is_canon: 1, rarity: 'RARE', background: 'breezie_grove', family_group: 'breezie_family' },
  { name: 'Cotton', description: 'A breezie from the tiny winged creature community in Breezie Hollow.', image: 'https://i.imgur.com/PDCxanW.png', pony_type: 'breezie', is_canon: 1, rarity: 'RARE', background: 'breezie_grove', family_group: 'breezie_family' },
  
  { name: 'Matilda', description: 'A donkey who organizes the Equestria Games and is Cranky Doodle\'s fiancée.', image: 'https://i.imgur.com/yFlLlBM.png', pony_type: 'donkey', is_canon: 1, rarity: 'RARE', background: 'equestria', family_group: null },
  { name: 'Cranky Doodle Donkey', description: 'A grumpy elderly donkey searching for his lost love Matilda.', image: 'https://i.imgur.com/s8gqon3.png', pony_type: 'donkey', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Hoops', description: 'A pegasus bully and friend of Dumb-Bell, often teasing Rainbow Dash.', image: 'https://i.imgur.com/pdJs4yP.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Dumb-Bell', description: 'A pegasus bully alongside Hoops, challenging Rainbow Dash in flight competitions.', image: 'https://i.imgur.com/vFsBJfF.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Sunshower Raindrops', description: 'A female Pegasus pony from Ponyville, one of Rainbow Dash\'s wing ponies for the Equestria Games, with a jasmine coat, tiffany blue mane and tail, medium turquoise eyes, and a cutie mark of three raindrops. She shares her design with Derpy and is known for her competitive nature.', image: 'https://i.imgur.com/9BFdieW.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Sheriff Silverstar', description: 'The sheriff of Appleloosa, responsible for maintaining law and order in the town.', image: 'https://i.imgur.com/wokknqi.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'appleloosa', family_group: null },
  { name: 'Cherry Jubilee', description: 'Owner of Cherry Hill Ranch, known for her cherry business and hospitality.', image: 'https://i.imgur.com/dtCBo72.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'cherry_hill_ranch', family_group: null },
  { name: 'Ms. Peachbottom', description: 'A competitive pony seen in the Equestria Games, known for her enthusiasm.', image: 'https://i.imgur.com/zIo4j5g.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  { name: 'Ms. Harshwhinny', description: 'An Equestria Games inspector, known for her strict and professional demeanor.', image: 'https://i.imgur.com/zSWHpnR.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'canterlot', family_group: null },
  { name: 'Charity Kindheart', description: 'A Bridleway costume designer and founder of the Midsummer Theatre Revival, appears in "Made in Manehattan."', image: 'https://i.imgur.com/jEPfg7X.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'manehattan', family_group: null },
  { name: 'Trenderhoof', description: 'A charming unicorn pony architect and travel writer who develops a crush on Applejack during a convention in Appleloosa.', image: 'https://i.imgur.com/oRuvs08.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'appleloosa', family_group: null },
  { name: 'Tree Hugger', description: 'A laid-back earth pony environmentalist and musician who practices transcendental meditation and befriends Fluttershy.', image: 'https://i.imgur.com/EuXKAvi.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Pokey Pierce', description: 'A unicorn stallion with a sewing needle cutie mark, known for his enthusiasm at public events and parties.', image: 'https://i.imgur.com/EzaykIP.png', pony_type: 'unicorn', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Fleetfoot', description: 'A speedy blue pegasus mare and member of the Wonderbolts aerobatic team, known for her competitive spirit.', image: 'https://i.imgur.com/eLrMfNb.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'cloudsdale', family_group: null },
  { name: 'Blaze', description: 'An orange pegasus stallion and Wonderbolt, recognized for his precise flying and teamwork in performances.', image: 'https://i.imgur.com/eQzGjoM.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'cloudsdale', family_group: null },
  { name: 'High Winds', description: 'A mint green pegasus mare and Wonderbolt reserve, admired for her graceful aerial maneuvers.', image: 'https://i.imgur.com/Z8jIiQU.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'cloudsdale', family_group: null },
  { name: 'Surprise', description: 'A white pegasus mare with a curly yellow mane, a Wonderbolt known for her energetic and surprising flight tricks.', image: 'https://i.imgur.com/vcqnJhm.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'cloudsdale', family_group: null },
  { name: 'Zipporwhill', description: 'A cheerful pegasus filly from Ponyville, known for her love of animals, especially her pet dog Ripple.', image: 'https://i.imgur.com/bxxFUlJ.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Toola Roola', description: 'A creative earth pony filly and friend of the Cutie Mark Crusaders, known for her artistic talents and colorful personality.', image: 'https://i.imgur.com/5ujw39U.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Coconut Cream', description: 'An energetic earth pony filly and friend of the Cutie Mark Crusaders, known for her enthusiasm and adventurous spirit.', image: 'https://i.imgur.com/eVqpBAx.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Tender Taps', description: 'A young earth pony colt with a passion for dancing, who befriends Apple Bloom and discovers his cutie mark in tap dancing.', image: 'https://i.imgur.com/6dP3bOT.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Filly Guides', description: 'A group of young earth pony fillies who participate in scouting activities, known for their teamwork and community spirit in Ponyville.', image: 'https://i.imgur.com/90c41hr.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Sunny Daze', description: 'A playful earth pony filly often seen with her friend Peachy Pie, known for her bright and sunny disposition.', image: 'https://i.imgur.com/rEITTWr.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Peachy Pie', description: 'A cheerful earth pony filly and friend of Sunny Daze, known for her love of fun and games in Ponyville.', image: 'https://i.imgur.com/S0zrzOT.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'ponyville', family_group: null },
  { name: 'Misty Fly', description: 'A pegasus mare and member of the Wonderbolts, known for her disciplined flying and teamwork in aerial performances.', image: 'https://i.imgur.com/XGHrwma.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'cloudsdale', family_group: null },
  { name: 'Fire Streak', description: 'A pegasus stallion and Wonderbolt, recognized for his fiery spirit and precise aerobatic maneuvers.', image: 'https://i.imgur.com/8JIoTCq.png', pony_type: 'pegasus', is_canon: 1, rarity: 'RARE', background: 'cloudsdale', family_group: null },
  { name: 'Twitch', description: 'A quick-witted and adventurous rabbit companion to Allura, known for his agility and humorous personality in Starlight Ridge.', image: 'https://i.imgur.com/BLQx8OY.png', pony_type: 'bunny', is_canon: 1, rarity: 'RARE', background: 'starlight_ridge', family_group: null },
  { name: 'Cattail', description: 'An earth pony descendant of Mage Meadowbrook, living in Hayseed Swamp, who preserves her ancestor\'s medical knowledge and journals, assisting in cures for rare diseases like Swamp Fever.', image: 'https://i.imgur.com/Gm0dQyd.png', pony_type: 'earth', is_canon: 1, rarity: 'RARE', background: 'hayseed_swamp', family_group: null },


  { name: 'Cheerilee', description: 'The cheerful schoolteacher in Ponyville who teaches the Cutie Mark Crusaders and other foals.', image: 'https://i.imgur.com/kn8pc29.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Mrs. Cake', description: 'The owner of Sugarcube Corner, where Pinkie Pie lives and works. Married to Mr. Cake.', image: 'https://i.imgur.com/d4Jw84S.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'cake_family' },
  { name: 'Mr. Cake', description: 'The owner of Sugarcube Corner, where Pinkie Pie lives and works. Married to Mrs. Cake.', image: 'https://i.imgur.com/jN0rqoW.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'cake_family' },
  { name: 'Pound Cake', description: 'The pegasus twin foal of Mr. and Mrs. Cake, notable for his magical abilities as a baby.', image: 'https://i.imgur.com/c2SIsUm.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'cake_family' },
  { name: 'Pumpkin Cake', description: 'The unicorn twin foal of Mr. and Mrs. Cake, notable for her magical abilities as a baby.', image: 'https://i.imgur.com/7NnJoZx.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'cake_family' },
  { name: 'Snips', description: 'A young unicorn colt, often seen with Snails and occasionally causing mischief.', image: 'https://i.imgur.com/pe39x71.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Snails', description: 'A young earth pony colt, often seen with Snips and occasionally causing mischief.', image: 'https://i.imgur.com/42pO6u5.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Chancellor Neighsay', description: 'A strict unicorn who oversees the Equestria Education Association (EEA) and initially opposes Twilight\'s School of Friendship.', image: 'https://i.imgur.com/tlGZMGs.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: null },
  { name: 'Dr. Hooves', description: 'An earth pony with an hourglass cutie mark, often associated with time-related activities and a fan-favorite due to his resemblance to Doctor Who.', image: 'https://i.imgur.com/8Ms7nda.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'hooves_family' },
  { name: 'Photo Finish', description: 'A fashion photographer with a dramatic personality who discovers Fluttershy\'s modeling potential.', image: 'https://i.imgur.com/3dozGO0.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'manehattan', family_group: null },
  { name: 'Sapphire Shores', description: 'A famous pop star known as the "Pony of Pop" who commissions outfits from Rarity.', image: 'https://i.imgur.com/XeRHcBT.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'manehattan', family_group: null },
  { name: 'Lightning Dust', description: 'A reckless pegasus and former Wonderbolt trainee who was expelled for her dangerous behavior.', image: 'https://i.imgur.com/pejheVV.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'cloudsdale', family_group: null },
  { name: 'Pipsqueak', description: 'A young colt with a distinctive accent, introduced during Nightmare Night, who later becomes a fan of Princess Luna.', image: 'https://i.imgur.com/5dfPwvE.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Suri Polomare', description: 'A manipulative fashion designer and rival to Rarity who attempts to steal her designs.', image: 'https://i.imgur.com/lwF1LBy.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'manehattan', family_group: null },
  { name: 'Gabby', description: 'A cheerful griffon who becomes friends with the Cutie Mark Crusaders and aspires to earn a cutie mark.', image: 'https://i.imgur.com/qlBDlsf.png', pony_type: 'griffon', is_canon: 1, rarity: 'BASIC', background: 'griffonstone', family_group: null },
  { name: 'Braeburn', description: 'Applejack\'s cousin from Appleloosa, enthusiastic about his town\'s apple-based culture.', image: 'https://i.imgur.com/J1vAdDd.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'appleloosa', family_group: 'apple_family' },
  { name: 'Bulk Biceps', description: 'A muscular pegasus with a loud personality and brief Wonderbolt trainee.', image: 'https://i.imgur.com/8mdNfC0.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Mr. Shy', description: 'Fluttershy\'s reserved father who lives in Cloudsdale and supports her love for animals.', image: 'https://i.imgur.com/HxPjoAQ.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'cloudsdale', family_group: 'shy_family' },
  { name: 'Mrs. Shy', description: 'Fluttershy\'s reserved mother who lives in Cloudsdale and supports her daughter\'s passion.', image: 'https://i.imgur.com/Xohee32.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'cloudsdale', family_group: 'shy_family' },
  { name: 'Creamy Caramel', description: 'A bat with an unknown history, probably looking for a new home in the forest.', image: 'Creamy Caramel.png', pony_type: 'batpony', is_canon: 0, rarity: 'ADMIN', background: 'unknown', family_group: null },
  { name: 'Zephyr Breeze', description: 'Fluttershy\'s carefree younger brother who aspires to be a mane therapist.', image: 'https://i.imgur.com/lntvL4i.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'cloudsdale', family_group: 'shy_family' },
  { name: 'Rainbow Stars', description: 'Rainbow Stars is the placeholder name of a female background unicorn pony who first appears in Brotherhooves Social', image: 'https://i.imgur.com/ksUXEUv.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Sugar Belle', description: 'An earth pony baker from Starlight\'s village, who later becomes Big McIntosh\'s love interest.', image: 'https://i.imgur.com/KsylPw8.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'our_town', family_group: null },
  { name: 'Perfect Pace', description: 'A timekeeper from Canterlot who ensures all royal events run precisely on schedule. His cutie mark of an hourglass represents his talent for timing.', image: 'https://i.imgur.com/LJO8fAB.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: null },
  { name: 'Candy Mane', description: 'A cheerful earth pony with a pink and white striped mane. Her cutie mark of pony silhouettes represents her talent for bringing ponies together.', image: 'https://i.imgur.com/Y5ufW5p.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Thunderlane', description: 'A pegasus stallion who works on weather patrol and is often seen with other background ponies.', image: 'https://i.imgur.com/QXrpC7H.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'thunderlane_family' },
  { name: 'Cloudchaser', description: 'A pegasus mare who works on the weather team and is known for her speed in the clouds.', image: 'https://i.imgur.com/TzWbVmA.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Flitter', description: 'A pegasus mare and Cloudchaser\'s friend who also works on weather management.', image: 'https://i.imgur.com/NUkDPbD.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Caramel', description: 'A male earth pony with a brown coat and blonde mane, often seen in background scenes.', image: 'https://i.imgur.com/GXJ4KnT.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Sea Swirl', description: 'A unicorn mare with an aqua-colored coat and purple mane, often seen near water.', image: 'https://i.imgur.com/GSX5xQM.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Amethyst Star', description: 'A unicorn mare with a purple coat and darker mane, seen in various background scenes.', image: 'https://i.imgur.com/SFuToix.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Cherry Berry', description: 'An earth pony mare with a pink coat and red mane, often seen in Ponyville.', image: 'https://i.imgur.com/B87mxYY.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Daisy', description: 'An earth pony who works at the flower shop alongside Roseluck and Lily Valley.', image: 'https://i.imgur.com/btX7ThW.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  
  { name: 'Flutter Breezie', description: 'A small and gentle breezie who loves flowers and helps pollinate the magical gardens of the breezie realm.', image: 'https://i.imgur.com/FlutterBreezie.png', pony_type: 'breezie', is_canon: 1, rarity: 'BASIC', background: 'breezie_realm', family_group: 'breezie_colony' },
  { name: 'Zippy Breezie', description: 'A fast-flying breezie messenger who carries important news between the breezie colonies.', image: 'https://i.imgur.com/ZippyBreezie.png', pony_type: 'breezie', is_canon: 1, rarity: 'BASIC', background: 'breezie_realm', family_group: 'breezie_colony' },
  
  { name: 'Lily Valley', description: 'An earth pony florist who works with Daisy and Roseluck at the flower shop.', image: 'https://i.imgur.com/9XSgZM8.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Noteworthy', description: 'A male earth pony with musical talent, often seen performing or at musical events.', image: 'https://i.imgur.com/yxi0kWC.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Shoeshine', description: 'An earth pony mare with cleaning-related cutie mark, works in various service jobs.', image: 'https://i.imgur.com/2nbXe3F.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Trouble Shoes', description: 'A clumsy earth pony from Appleloosa with a talent for rodeo, whose bad luck turns into a unique strength.', image: 'https://i.imgur.com/D1GTJc9.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'appleloosa', family_group: null },
  { name: 'Vapor Trail', description: 'A pegasus mare and Wonderbolt trainee, known for her teamwork with Sky Stinger and her supportive nature.', image: 'https://i.imgur.com/QRub8oY.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'cloudsdale', family_group: null },
  { name: 'Sky Stinger', description: 'A confident pegasus and Wonderbolt trainee, who learns humility through his friendship with Vapor Trail.', image: 'https://i.imgur.com/Eq5B35g.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'cloudsdale', family_group: null },
  { name: 'Coco Crusoe', description: 'A background earth pony from Ponyville, often seen in crowd scenes and known for his simple charm.', image: 'https://i.imgur.com/oNCsOZB.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Sugarcoat', description: 'Crystal Prep student in Equestria Girls, brutally honest.', image: 'https://i.imgur.com/GTprwdu.png', pony_type: 'pegasus', is_canon: 1, rarity: 'BASIC', background: 'crystal_prep', family_group: 'shadowbolts' },
  { name: 'Sour Sweet', description: 'Crystal Prep student in Equestria Girls with a dual sweet-sour personality.', image: 'https://i.imgur.com/LEmrgRx.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'crystal_prep', family_group: 'shadowbolts' },
  { name: 'Sunny Flare', description: 'Crystal Prep student in Equestria Girls, highly competitive.', image: 'https://i.imgur.com/emphc8F.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'crystal_prep', family_group: 'shadowbolts' },
  { name: 'Lemon Zest', description: 'Crystal Prep student in Equestria Girls, music enthusiast.', image: 'https://i.imgur.com/8Ig8ooL.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'crystal_prep', family_group: 'shadowbolts' },
  { name: 'Apple Bumpkin', description: 'A background Apple family Earth pony appearing at brunches and surprise parties.', image: 'https://i.imgur.com/kGXxoCa.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Red Gala', description: 'A minor Apple family Earth pony named during family introductions.', image: 'https://i.imgur.com/MJlafjL.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Red Delicious', description: 'A background Apple family Earth pony with limited appearances at family events.', image: 'https://i.imgur.com/NYNHHYB.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Golden Delicious', description: 'An Apple family Earth pony appearing at reunions and brunches.', image: 'https://i.imgur.com/jZnV1Zw.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Caramel Apple', description: 'A minor Apple family Earth pony seen in family gatherings.', image: 'https://i.imgur.com/zHlRH7s.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Blueberry Curls', description: 'A female background Earth pony with a pale yellow coat, blue mane and tail, turquoise eyes, and a cutie mark of two pink-petaled flowers.', image: 'https://i.imgur.com/lbnjmH4.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Florina Tart', description: 'A female Earth pony and a member of the Apple family', image: 'https://i.imgur.com/7MVwnZa.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Apple Dumpling', description: 'A female Earth pony and member of the Apple family. She has a pale green coat', image: 'https://i.imgur.com/oyPbCZ8.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Aunt Orange', description: 'Aunt and Uncle Orange are the married Earth pony aunt and uncle of Applejack in the Apple family', image: 'https://i.imgur.com/f7t2IIV.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'manehattan', family_group: 'apple_family' },
  { name: 'Uncle Orange', description: 'Aunt and Uncle Orange are the married Earth pony aunt and uncle of Applejack in the Apple family', image: 'https://i.imgur.com/adnBBRY.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'manehattan', family_group: 'apple_family' },
  { name: 'Apple Cider', description: 'A female Earth pony and member of the Apple family', image: 'https://i.imgur.com/Mm4lMba.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Lavender Fritter', description: 'A female Earth pony and member of the Apple family.', image: 'https://i.imgur.com/PMNTLXd.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Apple Honey', description: 'A female Earth pony in the Apple family.', image: 'https://i.imgur.com/tLqnf8t.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'apple_family' },
  { name: 'Nurse Redheart', description: 'A dedicated nurse at Ponyville Hospital, known for her caring and efficient medical care.', image: 'https://i.imgur.com/0p7nG05.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Nurse Tenderheart', description: 'A nurse at Ponyville Hospital who shares a design similar to Nurse Redheart, assisting in patient care.', image: 'https://i.imgur.com/X4EZZt2.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Nurse Snowheart', description: 'A compassionate nurse pony appearing in medical scenes across Equestria.', image: 'https://i.imgur.com/gFQETT8.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Nurse Sweetheart', description: 'A gentle and soft-spoken nurse helping at the hospital with a focus on comforting patients.', image: 'https://i.imgur.com/g3n9h9i.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Hayseed Turnip Truck', description: 'A hardworking earth pony farmer from Ponyville with a folksy charm.', image: 'https://i.imgur.com/lxSaKtC.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Lyrica Lilac', description: 'A unicorn musician and background pony often seen at performances in Canterlot.', image: 'https://i.imgur.com/FarX4Gn.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: null },
  { name: 'Beauty Brass', description: 'An earth pony sousaphonist in the Canterlot orchestra, elegant and talented.', image: 'https://i.imgur.com/Dz1OsJA.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: null },
  { name: 'Parish Nandermane', description: 'A unicorn violinist in the Canterlot ensemble, sophisticated and precise.', image: 'https://i.imgur.com/8YlH6jU.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: null },
  { name: 'Junebug', description: 'A background pony often seen in Ponyville, known for her gardening interests.', image: 'https://i.imgur.com/KhQIJSf.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Blue Bobbin', description: 'A Rarity For You salespony, appears in "The Saddle Row Review" and "Fake It \'Til You Make It."', image: 'https://i.imgur.com/qFYtZ2k.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'manehattan', family_group: null },
  { name: 'Butternut', description: 'An acorn farmer, appears in "My Little Pony Best Gift Ever" as Oak Nut\'s wife and Pistachio\'s mother.', image: 'https://i.imgur.com/9uwTMyK.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Hoofer Steps', description: 'A dance instructor with a Russian accent, appears in "On Your Marks."', image: 'https://i.imgur.com/alXBR39.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Lighthoof', description: 'A student and cheerleader at the School of Friendship, appears in "2, 4, 6, Greaaat."', image: 'https://i.imgur.com/zX2OADs.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Shimmy Shake', description: 'A student and cheerleader at the School of Friendship, appears in "2, 4, 6, Greaaat" alongside Lighthoof, known for her energetic dance moves.', image: 'https://i.imgur.com/59u2Gei.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Aloha', description: 'Appears in "Buckball Season" trying out for the Ponyville buckball team, with a cutie mark resembling a Hawaiian shirt.', image: 'https://i.imgur.com/VaZ5G0H.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Arpeggio', description: 'One of the judges at Twilight Sparkle\'s School for Gifted Unicorns entrance exam, later appears in "Equestria Games" and other episodes.', image: 'https://i.imgur.com/DHPaGSa.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'canterlot', family_group: null },
  { name: 'Birch Bucket', description: 'Appears in "Applejack\'s \'Day\' Off" as a spa pony at the Ponyville Day Spa, with a cutie mark of a bowl pouring water.', image: 'https://i.imgur.com/7iPj00G.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Ivy Vine', description: 'A mare with a surprised expression, often seen in crowds.', image: 'https://i.imgur.com/4AjFLwG.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'equestria', family_group: null },
  { name: 'Piña Colada', description: 'A young earth pony filly with a party hat cutie mark, often seen at social events and parties in Ponyville.', image: 'https://i.imgur.com/ca4n7a1.png', pony_type: 'earth', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Tootsie Flute', description: 'A unicorn filly and student at Miss Cheerilee\'s school, known for her participation in school plays and events.', image: 'https://i.imgur.com/AFkUVMp.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Doctor Stable', description: 'A unicorn doctor at Ponyville Hospital, often seen attending to patients with a calm and professional demeanor.', image: 'https://i.imgur.com/TcBvljK.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Lemony Gem', description: 'A unicorn filly with a gem-finding talent, friend of the school fillies in Ponyville.', image: 'https://i.imgur.com/xR4ZL83.png', pony_type: 'unicorn', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: null },
  { name: 'Gummy', description: 'Pinkie Pie\'s pet alligator, known for his toothless grin and calm demeanor, often seen accompanying her in Ponyville.', image: 'https://i.imgur.com/DLA6J3U.png', pony_type: 'alligator', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'pie_family' },
  { name: 'Tank', description: 'Rainbow Dash\'s loyal pet tortoise, equipped with a magical propeller to keep up with her, known for his determination and slow but steady nature.', image: 'https://i.imgur.com/KnMUfHF.png', pony_type: 'tortoise', is_canon: 1, rarity: 'BASIC', background: 'cloudsdale', family_group: 'dash_family' },
  { name: 'Owlowiscious', description: 'Twilight Sparkle\'s wise pet owl, who assists her at night with her studies and serves as a loyal companion in the library.', image: 'https://i.imgur.com/0tCZV0j.png', pony_type: 'owl', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'sparkle_family' },
  { name: 'Winona', description: 'Applejack\'s energetic pet dog, a hardworking collie who helps herd animals and guards Sweet Apple Acres.', image: 'https://i.imgur.com/YcktZOW.png', pony_type: 'dog', is_canon: 1, rarity: 'BASIC', background: 'sweet_apple_acres', family_group: 'apple_family' },
  { name: 'Opalescence', description: 'Rarity\'s pampered pet cat, known for her finicky attitude and luxurious lifestyle at the Carousel Boutique.', image: 'https://i.imgur.com/Mh4TjWL.png', pony_type: 'cat', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'belle_family' },
  { name: 'Angel', description: 'Fluttershy\'s pet bunny, known for his sassy personality and strong bond with Fluttershy, often helping or causing mischief.', image: 'https://i.imgur.com/WMBMtsO.png', pony_type: 'bunny', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'shy_family' },
  { name: 'Harry', description: 'A friendly bear cared for by Fluttershy, often seen at her cottage helping with chores or relaxing with other animals.', image: 'https://i.imgur.com/XRv86Su.png', pony_type: 'bear', is_canon: 1, rarity: 'BASIC', background: 'ponyville', family_group: 'shy_family' },


  { name: 'Pinkamena Diane Pie', description: 'The darker side of Pinkie Pie, with straight hair and a serious demeanor. She appears when Pinkie feels abandoned by her friends.', image: 'https://i.imgur.com/vCVYcs7.png', pony_type: 'earth', is_canon: 1, rarity: 'SECRET', background: 'ponyville', family_group: 'pie_family' },
  { name: 'Screwball', description: 'An earth pony created by Discord’s chaos magic, with a propeller hat and a whimsical, chaotic personality.', image: 'https://i.imgur.com/WKNHBv0.png', pony_type: 'earth', is_canon: 1, rarity: 'SECRET', background: 'chaosville', family_group: null },
  { name: 'Blossomforth', description: 'A cheerful pegasus pony from Ponyville, known for her involvement in weather duties and a hidden adventurous side.', image: 'https://i.imgur.com/EcwJwmv.png', pony_type: 'pegasus', is_canon: 1, rarity: 'SECRET', background: 'ponyville', family_group: null },
  { name: 'Woona', description: 'A filly version of Princess Luna, beloved by fans for her cute and innocent personality, often depicted as playful and a little mischievous.', image: 'https://i.imgur.com/cJc5mws.png', pony_type: 'alicorn', is_canon: 0, rarity: 'SECRET', background: 'canterlot', family_group: 'royal_sisters' },  
  { name: 'Cewestia', description: 'A fan-created filly version of Princess Celestia, often portrayed as an adorable counterpart to Woona, embodying warmth, curiosity, and youthful grace.', image: 'https://i.imgur.com/K6KPP7M.png', pony_type: 'alicorn', is_canon: 0, rarity: 'SECRET', background: 'canterlot', family_group: 'royal_sisters' },
  { name: 'Midnight Blossom', description: 'A beloved bat pony OC, the first well-known female bat pony created by Equestria-Prevails on February 28, 2012, right after the debut of bat ponies in Luna Eclipsed. Often depicted as a loyal Lunar Guard with a sleek dark coat, fluffy tufted ears, sharp fangs, and a mysterious nocturnal aura; she frequently appears alongside Cloud Skipper in fan art and stories, embodying quiet strength and moonlit elegance.', image: 'https://i.imgur.com/PLACEHOLDER.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'SECRET', background: 'equestria', family_group: null },
  { name: 'Wind Sprint', description: 'A sporty pegasus filly and daughter of Clear Sky, passionate about flying and honoring her late father\'s legacy as a great flyer.', image: 'https://i.imgur.com/g7EoL50.png', pony_type: 'pegasus', is_canon: 1, rarity: 'SECRET', background: 'equestria', family_group: null },
  { name: 'Luster Dawn', description: 'A talented unicorn and Twilight Sparkle\'s student in the final episode, destined to continue the legacy of friendship in Equestria.', image: 'https://i.imgur.com/LIVOMEe.png', pony_type: 'unicorn', is_canon: 1, rarity: 'SECRET', background: 'canterlot', family_group: null },


  { name: 'Flawless', description: 'A legendary fan-created pony known for her striking design and mysterious aura, often considered one of the most flawless creations of the community.', image: 'https://i.imgur.com/5DAVtjE.png', pony_type: 'unicorn', is_canon: 0, rarity: 'UNIQUE', background: 'equestria', family_group: null },
  { name: 'Sadako', description: 'A hauntingly beautiful pony inspired by the enigmatic figure from the Ring, with a ghostly presence and an eerie, flowing mane that seems to flicker like static.', image: 'https://i.imgur.com/GaSXfqM.png', pony_type: 'unicorn', is_canon: 0, rarity: 'UNIQUE', background: 'equestria', family_group: null },


  { name: 'Littlepip', description: 'The Stable Dweller and protagonist of Fallout: Equestria. A determined unicorn from Stable 2 with a PipBuck on her foreleg.', image: 'https://i.imgur.com/tX2SVa7.png', pony_type: 'unicorn', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Blackjack', description: 'The Security Mare from Fallout Equestria: Project Horizons. A unicorn from Stable 99 with a tendency to find trouble.', image: 'https://i.imgur.com/i6FO7q6.png', pony_type: 'unicorn', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Nyx', description: 'A young alicorn filly who was created from the remains of Nightmare Moon\'s essence. She was taken in by Twilight Sparkle.', image: 'https://i.imgur.com/EMc2q5m.png', pony_type: 'alicorn', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Button Mash', description: 'A young colt who loves video games. Often seen playing on his portable gaming console.', image: 'https://i.imgur.com/TGxAI3m.png', pony_type: 'earth', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Steelhooves', description: 'A Steel Ranger from Fallout: Equestria. An earth pony permanently encased in power armor, hiding his ghoulified form underneath.', image: 'https://i.imgur.com/Ae65mu7.png', pony_type: 'earth', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Fluffle Puff', description: 'A very fluffy pony who communicates primarily through blowing raspberries. She has a friendship with Queen Chrysalis.', image: 'https://i.imgur.com/kGciAXA.png', pony_type: 'earth', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Snowdrop', description: 'A blind pegasus filly created by SillyFilly Studios. Known for crafting the first snowflake and inspiring winter traditions through her gentle heart and resilience.', image: 'https://i.imgur.com/WG6SlhN.png', pony_type: 'pegasus', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Fausticorn', description: 'A fan-created alicorn representing Lauren Faust, the original creator of Friendship is Magic.', image: 'https://i.imgur.com/bYiKWrJ.png', pony_type: 'alicorn', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Milky Way', description: 'A popular fan-created earth pony known for her dairy farm and wholesome personality.', image: 'https://i.imgur.com/fnr6yIX.png', pony_type: 'earth', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Velvet Remedy', description: 'A character from Fallout: Equestria, a talented singer and medic who joins Littlepip\'s group.', image: 'https://i.imgur.com/Yj8HhOW.png', pony_type: 'unicorn', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Calamity', description: 'A pegasus gunslinger from Fallout: Equestria, loyal friend to Littlepip with a cowboy attitude.', image: 'https://i.imgur.com/lLkhAqd.png', pony_type: 'pegasus', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Peachy Sprinkle', description: 'A pegasus passionate about gardening and fruit varieties, especially citrus. Shy and caring, she dreams of opening a cozy fruit-themed café and overcoming her shyness.', image: 'https://i.imgur.com/tG1vyLW.png', pony_type: 'pegasus', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Supreme Corona', description: 'Author - pinkiecake1', image: 'https://i.imgur.com/MVtenSf.png', pony_type: 'alicorn', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Brown Rose', description: 'Author - boniosuprocomic', image: 'https://i.imgur.com/9AEL8jx.gif', pony_type: 'pegasus', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Pumpkin Seed', description: 'You own oc of the one who created this bot :3', image: 'https://i.imgur.com/IyKE47K.png', pony_type: 'unicorn', is_canon: 0, rarity: 'CUSTOM' },
  { name: 'Starlight Lulamoon', description: 'A unicorn from Hazy Illusionton with starlight magic from constellations, raised by Zecora in Everfree Forest, bearing a half-moon cutie mark with stars.', image: 'https://i.imgur.com/RDEJo3h.png', pony_type: 'unicorn', is_canon: 0, rarity: 'CUSTOM' },

  { name: 'Chaos Chrysalis', description: 'A chaos-empowered variant of Queen Chrysalis from the Legion of Doom, enhanced by Grogar\'s Bewitching Bell in season 9, amplifying her shape-shifting and manipulative abilities.', image: 'https://i.imgur.com/chaoschrysalis.png', pony_type: 'changeling', is_canon: 1, rarity: 'LEGEND', background: 'changeling_hive', family_group: null },
  { name: 'Chaos Cozy Glow', description: 'A chaos-empowered variant of Cozy Glow from the Legion of Doom, enhanced by Grogar\'s Bewitching Bell in season 9, boosting her deceptive and magical prowess.', image: 'https://i.imgur.com/chaoscozyglow.png', pony_type: 'pegasus', is_canon: 1, rarity: 'LEGEND', background: 'ponyville', family_group: null },
  { name: 'Chrysalis', description: 'The reformed version of Queen Chrysalis, who has turned good and aids Equestria after redemption, embracing friendship and leading her changelings peacefully.', image: 'https://i.imgur.com/reformedchrysalis.png', pony_type: 'changeling', is_canon: 0, rarity: 'LEGEND', background: 'changeling_hive', family_group: null },

  { name: 'Smooze', description: 'A massive slime creature and friend of Discord, appearing at the Grand Galloping Gala, capable of growing and consuming objects while spreading negativity.', image: 'https://i.imgur.com/smooze.png', pony_type: 'smooze', is_canon: 1, rarity: 'MYTHIC', background: 'canterlot', family_group: null },
  { name: 'Windigo', description: 'Winter spirits that feed on hatred and fighting among ponies, bringing eternal cold and blizzards to Equestria as a result of disharmony.', image: 'https://i.imgur.com/windigo.png', pony_type: 'spirit', is_canon: 1, rarity: 'MYTHIC', background: 'equestria', family_group: null },
  { name: 'Parasprites', description: 'Small, insect-like creatures that reproduce rapidly and devour everything in sight, causing chaos in Ponyville by multiplying uncontrollably.', image: 'https://i.imgur.com/parasprites.png', pony_type: 'parasprite', is_canon: 1, rarity: 'MYTHIC', background: 'ponyville', family_group: null },

  { name: 'Bugbear', description: 'A hybrid monster with the body of a panda bear, insect antennae, wings, and a stinger, escaped from Tartarus and known for its aggressive attacks.', image: 'https://i.imgur.com/bugbear.png', pony_type: 'bugbear', is_canon: 1, rarity: 'EPIC', background: 'tartarus', family_group: null },
  { name: 'Nirik', description: 'The fiery, rage-induced form of Kirins, transforming when angered, with dark coats, blue flames, and destructive abilities tied to their emotions.', image: 'https://i.imgur.com/nirik.png', pony_type: 'kirin', is_canon: 1, rarity: 'EPIC', background: 'kirin_village', family_group: null },
  { name: 'Timberwolves', description: 'Wolf-like creatures made of wood and branches, inhabiting the Everfree Forest, capable of reforming after being destroyed and hunting in packs.', image: 'https://i.imgur.com/timberwolves.png', pony_type: 'timberwolf', is_canon: 1, rarity: 'EPIC', background: 'everfree_forest', family_group: null },
  { name: 'Orthros', description: 'A two-headed dog from Tartarus, ferocious yet trainable, with one head often more dominant, traded among ponies for its loyalty as a pet.', image: 'https://i.imgur.com/orthros.png', pony_type: 'orthros', is_canon: 1, rarity: 'EPIC', background: 'tartarus', family_group: null },
  { name: 'Cerberus', description: 'The massive three-headed dog guarding the gates of Tartarus, preventing creatures from escaping, loyal but occasionally distracted by play.', image: 'https://i.imgur.com/cerberus.png', pony_type: 'cerberus', is_canon: 1, rarity: 'EPIC', background: 'tartarus', family_group: null },
  { name: 'Chimera', description: 'A dangerous creature with tiger, goat, and snake heads, residing in the Flame Geyser Swamp, known for its predatory nature and multiple personalities.', image: 'https://i.imgur.com/chimera.png', pony_type: 'chimera', is_canon: 1, rarity: 'EPIC', background: 'flame_geyser_swamp', family_group: null },
  { name: 'Hydra', description: 'A multi-headed swamp-dwelling serpent with regenerative heads, aggressive and territorial, chasing ponies through the Froggy Bottom Bogg.', image: 'https://i.imgur.com/hydra.png', pony_type: 'hydra', is_canon: 1, rarity: 'EPIC', background: 'froggy_bottom_bogg', family_group: null },
  
  { name: 'RariFruit', description: 'A possessed version of Rarity from the Elements of Insanity GMod animations, warped by the spirit of Rubberfruit, obsessed with hats and chaotic generosity.', image: 'https://i.imgur.com/VAH8L1f.png', pony_type: 'unicorn', is_canon: 0, rarity: 'UNIQUE', background: 'mann_manor', family_group: null },
  { name: 'Fluttershout', description: 'A possessed version of Fluttershy from the Elements of Insanity GMod animations, infused with Vagineer\'s spirit, turning her kindness into violent outbursts.', image: 'https://i.imgur.com/tq1206e.png', pony_type: 'pegasus', is_canon: 0, rarity: 'UNIQUE', background: 'mann_manor', family_group: null },
  { name: 'Applepills', description: 'A possessed version of Applejack from the Elements of Insanity GMod animations, addicted to painkillers after consuming pills, gaining enhanced strength.', image: 'https://i.imgur.com/fxzfIHs.png', pony_type: 'earth', is_canon: 0, rarity: 'UNIQUE', background: 'mann_manor', family_group: null },
  { name: 'Pinkis Cupcake', description: 'A possessed version of Pinkie Pie from the Elements of Insanity GMod animations, merged with Painis Cupcake\'s spirit, craving cupcakes and causing mayhem.', image: 'https://i.imgur.com/9O1R83u.png', pony_type: 'earth', is_canon: 0, rarity: 'UNIQUE', background: 'mann_manor', family_group: null },
  { name: 'Rainbine', description: 'A possessed version of Rainbow Dash from the Elements of Insanity GMod animations, cybernetically enhanced by Scombine, becoming a mechanical shooter.', image: 'https://i.imgur.com/O7QsAHg.png', pony_type: 'pegasus', is_canon: 0, rarity: 'UNIQUE', background: 'mann_manor', family_group: null },
  { name: 'Brutalight Sparcake', description: 'A possessed version of Twilight Sparkle from the Elements of Insanity GMod animations, leader infused with Christian Brutal Sniper and Weaselcake spirits, wielding dual personalities and deadly magic.', image: 'https://i.imgur.com/Jc4Y9KO.png', pony_type: 'alicorn', is_canon: 0, rarity: 'UNIQUE', background: 'mann_manor', family_group: null },
  { name: 'Derpigun', description: 'A possessed version of Derpy Hooves from the Elements of Insanity GMod animations, infused with a gun-wielding maniac spirit, blending goofy charm with chaotic firepower.', image: 'https://i.imgur.com/Pl5bn1a.png', pony_type: 'pegasus', is_canon: 0, rarity: 'UNIQUE', background: 'mann_manor', family_group: null },

  { name: 'Pinkie Pie Bat', description: 'A non-canon bat pony version of Pinkie Pie, with bouncy energy and bat wings, throwing glow-in-the-dark parties under the moonlight.', image: 'https://i.imgur.com/OEwPPrp.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'ponyville', family_group: null },
  { name: 'Rarity Bat', description: 'A non-canon bat pony version of Rarity, with sleek bat wings and a flair for crafting dazzling, night-themed fashion designs.', image: 'https://i.imgur.com/Prz6bHU.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'ponyville', family_group: null },
  { name: 'Twilight Sparkle Bat', description: 'A non-canon bat pony version of Twilight Sparkle, combining her magical prowess with bat-like agility and a love for starry night studies.', image: 'https://i.imgur.com/jZG9vVA.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'canterlot', family_group: null },
  { name: 'Rainbow Dash Bat', description: 'A non-canon bat pony version of Rainbow Dash, soaring with bat wings and performing daring nighttime stunts with unmatched speed.', image: 'https://i.imgur.com/MmkVpPP.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'cloudsdale', family_group: null },
  { name: 'Applejack Bat', description: 'A non-canon bat pony version of Applejack, with rugged bat wings, tending orchards by moonlight with her signature honesty and strength.', image: 'https://i.imgur.com/OEwPPrp.png', pony_type: 'bat_pony', is_canon: 0, rarity: 'UNIQUE', background: 'sweet_apple_acres', family_group: 'apple_family' },

  { name: 'Sweetie Angel', description: 'Sweetie Belle transformed into a celestial being of pure innocence and light. Her angelic form radiates divine harmony, with pristine white wings and a golden halo. She brings hope and comfort to all ponies, spreading joy through her angelic melodies.', image: 'https://i.imgur.com/PYT8DBk.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EVENT' },
  { name: 'Rarity Angel', description: 'The Element of Generosity ascended to angelic grace. Rarity\'s divine form embodies celestial beauty and ultimate elegance, with shimmering wings that sparkle like starlight. Her angelic presence brings redemption and inspires others to find their inner light.', image: 'https://i.imgur.com/NqJ81Ao.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EVENT' },
  { name: 'Cozy Demon', description: 'Cozy Glow embraced by the depths of darkness and malevolent power. Her demonic transformation reflects her ruthless ambition and hunger for control, with fiery red eyes and shadowy wings. She schemes from the infernal depths to claim dominion over all.', image: 'https://i.imgur.com/nclcGih.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EVENT' },
  { name: 'Rarity Demon', description: 'The dark side of generosity corrupted into selfish greed. Rarity\'s demonic form represents vanity and materialism taken to sinister extremes, with onyx-black coat and crimson mane. Her fallen beauty masks a heart consumed by dark desires for power and possession.', image: 'https://i.imgur.com/2TTrzmz.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EVENT' },
  { name: 'Skellinore', description: 'A female skeleton pony mare summoned by Discord during his Ogres & Oubliettes game in the episode "The Break Up Break Down". She serves as a Level 18 Bone Warrior in Squizard\'s mage army, animated by chaotic magic to aid in the tabletop adventure.', image: 'https://i.imgur.com/tja7RHN.png', pony_type: 'skeleton_pony', is_canon: 1, rarity: 'EVENT', background: 'halloween_event', family_group: null },
  { name: 'Nightmare Rarity', description: 'The corrupted form of Rarity possessed by the Nightmare Forces in the IDW comic series (Issues #5-8), becoming the new host for Nightmare Moon and leading the Nightmare Mane Six in an assault on Ponyville with dark, elegant magic.', image: 'https://i.imgur.com/jlDoptz.png', pony_type: 'unicorn', is_canon: 1, rarity: 'EVENT', background: 'halloween_event', family_group: null },
  { name: 'Fluttershy Bat', description: 'Also known as Flutterbat, the vampire fruit bat-pony hybrid form of Fluttershy created by a magical mishap with vampire fruit bats in the episode "Bats!", featuring leathery bat wings, fangs, and an insatiable craving for apple juice while retaining her gentle nature.', image: 'https://i.imgur.com/k8YbpP9.png', pony_type: 'pegasus', is_canon: 1, rarity: 'EVENT', background: 'halloween_event', family_group: 'shy_family' },
  { name: 'Nocturn', description: 'A male bat pony stallion and member of Princess Luna\'s Royal Guard, serving as a nocturnal protector of Equestria. Along with his partner Echo, he pulls Luna\'s chariot and embodies the mysterious, bat-winged guardians of the night.', image: 'https://i.imgur.com/b1HJNJ2.png', pony_type: 'bat_pony', is_canon: 1, rarity: 'EVENT', background: 'halloween_event', family_group: null },
];



export const updatePonyFriendsData = async () => {
  try {

    await query('DROP TABLE IF EXISTS pony_friends');

    await createPonyFriendsTable();


    if (!Array.isArray(PONY_DATA) || PONY_DATA.length === 0) {
      console.error('[updatePonyFriendsData] PONY_DATA is empty! No ponies will be added.');
      return false;
    }


    let added = 0;
    for (const pony of PONY_DATA) {
      await query(
        'INSERT INTO pony_friends (name, description, image, pony_type, is_canon, rarity, background, family_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          pony.name,
          pony.description,
          pony.image,
          pony.pony_type,
          pony.is_canon,
          pony.rarity,
          pony.background || 'ponyville',
          pony.family_group || null
        ]
      );
      added++;
    }
    console.log(`[updatePonyFriendsData] Added ${added} ponies to database`);


    const ponyCount = await query('SELECT COUNT(*) as count FROM pony_friends');
    console.log(`Added ${Array.isArray(ponyCount) && ponyCount.length > 0 ? ponyCount[0]?.count : 0} ponies to database`);

    return true;
  } catch (error) {
    console.error('Error updating pony_friends data:', error);
    throw error;
  }
};


export const addNewPoniesToDatabase = async (newPonies) => {
  try {
    if (!Array.isArray(newPonies) || newPonies.length === 0) {
      console.log('[addNewPoniesToDatabase] No new ponies to add');
      return { added: 0, existing: 0 };
    }

    let added = 0;
    let existing = 0;

    for (const pony of newPonies) {

      const existingPony = await query(
        'SELECT id FROM pony_friends WHERE name = ?',
        [pony.name]
      );

      if (existingPony && existingPony.length > 0) {
        console.log(`[addNewPoniesToDatabase] Pony "${pony.name}" already exists, skipping`);
        existing++;
        continue;
      }


      await query(
        'INSERT INTO pony_friends (name, description, image, pony_type, is_canon, rarity, is_unique, background, family_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          pony.name,
          pony.description,
          pony.image,
          pony.pony_type,
          pony.is_canon || 1,
          pony.rarity,
          pony.is_unique || 0,
          pony.background || 'ponyville',
          pony.family_group || null
        ]
      );
      added++;
      console.log(`[addNewPoniesToDatabase] Added new pony: "${pony.name}" (${pony.rarity})`);
    }

    console.log(`[addNewPoniesToDatabase] Added ${added} new ponies, ${existing} already existed`);
    return { added, existing };
  } catch (error) {
    console.error('[addNewPoniesToDatabase] Error adding new ponies:', error);
    throw error;
  }
};

export const initFriendshipTables = async () => {
  try {
    console.log('[initFriendshipTables] Starting initialization...');


    await updateFriendshipTableStructure();
    console.log('[initFriendshipTables] Friendship table structure updated');


    await updatePonyFriendsData();
    console.log('[initFriendshipTables] Pony friends data updated');


    await createPonyProtectionTable();
    console.log('[initFriendshipTables] Pony protection table created');


    const ponyCount = await query('SELECT COUNT(*) as count FROM pony_friends');
    console.log(`[initFriendshipTables] Total pony friends: ${Array.isArray(ponyCount) && ponyCount.length > 0 ? ponyCount[0]?.count : 0}`);
    
    console.log('[initFriendshipTables] Initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing friendship tables:', error);
    throw error;
  }
};


export const getUserFriends = async (userId, onlyFavorites = false, rarityFilter = 'all') => {
  try {

    const friendships = await query('SELECT * FROM friendship WHERE user_id = ?', [userId]);


    const results = [];
    if (Array.isArray(friendships)) {
      for (const friendship of friendships) {
        const pony = await query('SELECT * FROM pony_friends WHERE id = ?', [friendship.friend_id]);
        if (Array.isArray(pony) && pony.length > 0) {
          const ponyData = {
            ...pony[0],
            id: friendship.id,
            friendship_id: friendship.id,
            friend_id: friendship.friend_id,
            is_favorite: friendship.is_favorite,
            is_profile_pony: friendship.is_profile_pony || 0,
            friendship_level: friendship.friendship_level || 1,
            created_at: friendship.created_at,
            custom_name: friendship.custom_name,
            original_name: pony[0].name
          };
          

          if (friendship.custom_name) {
            ponyData.name = friendship.custom_name;
          }
          
          results.push(ponyData);
        }
      }
    }


    let filteredResults = results;
    if (onlyFavorites) {
      filteredResults = results.filter(r => r.is_favorite === 1);
    }


    if (rarityFilter !== 'all') {
      filteredResults = filteredResults.filter(r => r.rarity === rarityFilter);
    }


    const rarityOrder = {
      'EXCLUSIVE': 0,
      'UNIQUE': 1,
      'ANGEL': 2,
      'DEMONIC': 3,
      'SECRET': 4,
      'CUSTOM': 5,
      'LEGEND': 6,
      'MYTHIC': 7,
      'EPIC': 8,
      'RARE': 9,
      'BASIC': 10,
      'EVENT': 11
    };

    filteredResults.sort((a, b) => {

      const profileDiff = (b.is_profile_pony || 0) - (a.is_profile_pony || 0);
      if (profileDiff !== 0) return profileDiff;
      

      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      

      return new Date(a.created_at) - new Date(b.created_at);
    });

    return filteredResults;
  } catch (error) {
    console.error('Error getting user friends:', error);
    return [];
  }
};


export const getFriendshipCount = async (userId) => {
  try {

    const sql = `SELECT COUNT(DISTINCT f.friend_id) as count FROM friendship f 
                 JOIN pony_friends pf ON f.friend_id = pf.id 
                 WHERE f.user_id = ? AND pf.rarity != ?`;
    const result = await query(sql, [userId, 'UNIQUE']);
    return result[0].count;
  } catch (error) {
    console.error('Error getting friendship count:', error);
    return 0;
  }
};


export const addFriend = async (userId, friendId) => {
  try {

    const existingFriendship = await query(
      'SELECT id FROM friendship WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    const isFirstTimeGetting = !Array.isArray(existingFriendship) || existingFriendship.length === 0;
    

    const randomLevel = Math.floor(Math.random() * 35) + 1;
    

    const calculateExpForLevel = (level) => {
      let totalExp = 0;
      let expForLevel = 100;
      
      for (let i = 1; i < level; i++) {
        totalExp += expForLevel;
        expForLevel += 50;
      }
      

      const randomExpInLevel = Math.floor(Math.random() * expForLevel);
      return totalExp + randomExpInLevel;
    };
    
    const randomExp = calculateExpForLevel(randomLevel);
    

    await query(
      'INSERT INTO friendship (user_id, friend_id, is_favorite, friendship_level, experience, created_at, updated_at) VALUES (?, ?, 0, ?, ?, datetime("now"), datetime("now"))',
      [userId, friendId, randomLevel, randomExp]
    );
    

    leaderboardCache.invalidateLeaderboard('ponies');
    
    return {
      success: true,
      isNew: isFirstTimeGetting,
      isDuplicate: !isFirstTimeGetting
    };
  } catch (error) {
    console.error('Error adding friend:', error);
    return {
      success: false,
      error: error.message
    };
  }
};


export const hasFriend = async (userId, friendId) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM friendship WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    return result[0].count > 0;
  } catch (error) {
    console.error('Error checking friend:', error);
    return false;
  }
};


export const getTotalPonyFriendsCount = async () => {
  try {

    const result = await query('SELECT COUNT(*) as count FROM pony_friends WHERE rarity != ? AND name NOT IN (?, ?, ?)', ['UNIQUE', 'Aryanne', 'Peachy Sprinkle', 'Pumpkin Seed']);
    return result[0].count;
  } catch (error) {
    console.error('Error getting total pony friends count:', error);
    return 0;
  }
};


export const toggleFavorite = async (userId, friendId) => {
  try {

    if (!friendId || isNaN(friendId)) {
      console.error(`[toggleFavorite] Invalid friendId: ${friendId}`);
      return { success: false, error: 'Invalid friend ID' };
    }
    
    const friendship = await query(
      'SELECT is_favorite FROM friendship WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );

    if (!Array.isArray(friendship) || friendship.length === 0) {
      return { success: false, error: 'Friendship not found' };
    }

    const newFavoriteStatus = friendship[0].is_favorite === 0 ? 1 : 0;

    await query(
      'UPDATE friendship SET is_favorite = ? WHERE user_id = ? AND friend_id = ?',
      [newFavoriteStatus, userId, friendId]
    );

    return {
      success: true,
      isFavorite: newFavoriteStatus === 1
    };
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return { success: false, error: error.message };
  }
};


export const getFavoritesCount = async (userId) => {
  try {
    const result = await query(
      'SELECT COUNT(DISTINCT friend_id) as count FROM friendship WHERE user_id = ? AND is_favorite = 1',
      [userId]
    );
    return result[0].count;
  } catch (error) {
    console.error('Error getting favorites count:', error);
    return 0;
  }
};


export const getDuplicatePonyBonus = async (userId, encounterCount) => {

  return {
    bitsBonus: 0,
    resourceBonus: 0
  };
};


export const updatePonyFriend = async (id, updates) => {
  try {
    const updateFields = Object.entries(updates)
      .map(([key, value]) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];

    await query(
      `UPDATE pony_friends SET ${updateFields} WHERE id = ?`,
      values
    );
    return true;
  } catch (error) {
    console.error('Error updating pony friend:', error);
    return false;
  }
};



export const getPonyFriendsByRarity = async (rarity, excludeIds = []) => {
  try {
    let sql = 'SELECT * FROM pony_friends WHERE rarity = ? AND name != ?';
    const params = [rarity, 'aryanne'];

    if (excludeIds.length > 0) {
      sql += ` AND id NOT IN (${excludeIds.join(',')})`;
    }


    const ponies = await query(sql, params);
    


    return Array.isArray(ponies) ? ponies : [];
  } catch (error) {
    console.error('Error getting pony friends by rarity:', error);
    return [];
  }
};


export const getLowerRarityPonyFriends = async (currentRarity, excludeIds = []) => {
  try {
    const rarityOrder = ['ADMIN', 'EXCLUSIVE', 'UNIQUE', 'SECRET', 'CUSTOM', 'LEGEND', 'MYTHIC', 'EPIC', 'RARE', 'BASIC'];
    const currentIndex = rarityOrder.indexOf(currentRarity);
    for (let i = currentIndex + 1; i < rarityOrder.length; i++) {
      const lowerRarity = rarityOrder[i];
      let ponies = await getPonyFriendsByRarity(lowerRarity, excludeIds);

      ponies = ponies.filter(pony => pony.name !== 'aryanne');

      if (ponies && ponies.length > 0) {
        return ponies;
      }
    }
    return [];
  } catch (error) {
    console.error('Error getting lower rarity pony friends:', error);
    return [];
  }
};


export const getUserFriendsByRarityCount = async (userId) => {
  try {
    const sql = `
      SELECT pf.rarity, COUNT(DISTINCT f.friend_id) as count
      FROM pony_friends pf
      JOIN friendship f ON pf.id = f.friend_id
      WHERE f.user_id = ? AND pf.rarity != ?
      GROUP BY pf.rarity
    `;

    return await query(sql, [userId, 'UNIQUE']);
  } catch (error) {
    console.error('Error getting user friends by rarity count:', error);
    return [];
  }
};


export const getTotalPonyFriendsByRarityCount = async () => {
  try {
    const sql = `
      SELECT rarity, COUNT(*) as count
      FROM pony_friends
      WHERE rarity != ? AND name NOT IN (?, ?, ?)
      GROUP BY rarity
    `;

    return await query(sql, ['UNIQUE', 'Aryanne', 'Peachy Sprinkle', 'Pumpkin Seed']);
  } catch (error) {
    console.error('Error getting total pony friends by rarity count:', error);
    return [];
  }
};


export const transferPonyByFriendshipId = async (fromUserId, toUserId, friendshipId) => {
  try {
    console.log(`[transferPonyByFriendshipId] Transferring friendship_id=${friendshipId} from ${fromUserId} to ${toUserId}`);
    

    const existingFriendship = await query(
      'SELECT * FROM friendship WHERE id = ? AND user_id = ?',
      [friendshipId, fromUserId]
    );
    
    console.log(`[transferPonyByFriendshipId] Found friendship record:`, existingFriendship);
    
    if (!Array.isArray(existingFriendship) || existingFriendship.length === 0) {
      console.log(`[transferPonyByFriendshipId] ERROR: Friendship record not found`);
      return { success: false, error: 'Friendship record not found' };
    }
    
    const friendship = existingFriendship[0];
    



    console.log(`[transferPonyByFriendshipId] Updating ownership of friendship record id=${friendshipId} to user ${toUserId}`);
    await query(
      'UPDATE friendship SET user_id = ?, is_favorite = 0, updated_at = datetime("now") WHERE id = ?',
      [toUserId, friendshipId]
    );
    
    console.log(`[transferPonyByFriendshipId] Transfer completed successfully - preserved friendship_id=${friendshipId}`);
    

    leaderboardCache.invalidateLeaderboard('ponies');
    
    return { 
      success: true, 
      preservedId: friendshipId,
      friendId: friendship.friend_id 
    };

  } catch (error) {
    console.error('Error transferring pony by friendship ID:', error);
    return { success: false, error: error.message };
  }
};


export const setPonyProtection = async (userId, protectionUntil) => {
  try {
    await query(
      'INSERT OR REPLACE INTO pony_protection (user_id, protected_until) VALUES (?, ?)',
      [userId, new Date(protectionUntil).toISOString()]
    );
    return true;
  } catch (error) {
    console.error('Error setting pony protection:', error);
    return false;
  }
};


export const isPonyProtected = async (userId) => {
  try {
    const protection = await query(
      'SELECT protected_until FROM pony_protection WHERE user_id = ?',
      [userId]
    );
    
    if (!Array.isArray(protection) || protection.length === 0) {
      return false;
    }
    
    const protectedUntil = new Date(protection[0].protected_until);
    const now = new Date();
    
    return protectedUntil > now;
  } catch (error) {
    console.error('Error checking pony protection:', error);
    return false;
  }
};


export const createPonyProtectionTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS pony_protection (
      user_id TEXT PRIMARY KEY,
      protected_until TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await query(sql);
};


export const removePonyByFriendshipId = async (userId, friendshipId) => {
  try {
    console.log(`[removePonyByFriendshipId] Removing friendship_id=${friendshipId} from user ${userId}`);
    

    const existingFriendship = await query(
      'SELECT * FROM friendship WHERE id = ? AND user_id = ?',
      [friendshipId, userId]
    );
    
    if (!Array.isArray(existingFriendship) || existingFriendship.length === 0) {
      console.log(`[removePonyByFriendshipId] ERROR: Friendship record not found`);
      return { success: false, error: 'Pony not found in your collection' };
    }
    
    const friendship = existingFriendship[0];
    

    if (friendship.is_favorite === 1) {
      console.log(`[removePonyByFriendshipId] ERROR: Cannot remove favorited pony`);
      return { success: false, error: 'Cannot remove favorited pony. Remove from favorites first.' };
    }
    

    console.log(`[removePonyByFriendshipId] Deleting friendship record id=${friendshipId}`);
    const result = await query(
      'DELETE FROM friendship WHERE id = ? AND user_id = ?',
      [friendshipId, userId]
    );
    
    console.log(`[removePonyByFriendshipId] Removal completed successfully`);
    

    leaderboardCache.invalidateLeaderboard('ponies');
    
    return { 
      success: true, 
      removedId: friendshipId,
      friendId: friendship.friend_id,
      ponyName: friendship.custom_name || 'Unknown'
    };
    
  } catch (error) {
    console.error('Error removing pony by friendship ID:', error);
    return { success: false, error: error.message };
  }
};


export const removePonyFromCollection = async (userId, friendId) => {
  try {
    console.log(`[removePonyFromCollection] Removing pony ${friendId} from user ${userId} collection`);
    

    const existingFriendship = await query(
      'SELECT id FROM friendship WHERE user_id = ? AND friend_id = ? LIMIT 1',
      [userId, friendId]
    );
    
    if (!Array.isArray(existingFriendship) || existingFriendship.length === 0) {
      console.log(`[removePonyFromCollection] ERROR: Pony not found in user collection`);
      return { success: false, error: 'Pony not found in collection' };
    }
    

    const result = await query(
      'DELETE FROM friendship WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    console.log(`[removePonyFromCollection] Successfully removed pony from collection`);
    return { success: true, removed: true };
    
  } catch (error) {
    console.error('Error removing pony from collection:', error);
    return { success: false, error: error.message };
  }
};


export const getAllFamilyGroups = async () => {
  try {
    const sql = `
      SELECT DISTINCT family_group 
      FROM pony_friends 
      WHERE family_group IS NOT NULL AND family_group != '' 
      ORDER BY family_group
    `;
    
    const families = await query(sql);
    return Array.isArray(families) ? families.map(f => f.family_group) : [];
  } catch (error) {
    console.error('Error getting all family groups:', error);
    return [];
  }
};


export const getAllPoniesWithOwnership = async (userId, filter = 'all', familyFilter = 'all') => {
  try {
    let sql = `
      SELECT 
        pf.*,
        CASE WHEN f.user_id IS NOT NULL THEN 1 ELSE 0 END as is_owned,
        COALESCE(f.is_favorite, 0) as is_favorite
      FROM pony_friends pf
      LEFT JOIN friendship f ON pf.id = f.friend_id AND f.user_id = ?
    `;
    
    const params = [userId];
    const conditions = [];
    

    if (filter !== 'all') {
      conditions.push('pf.rarity = ?');
      params.push(filter);
    }
    

    if (familyFilter !== 'all') {
      if (familyFilter === 'no_family') {
        conditions.push('(pf.family_group IS NULL OR pf.family_group = "")');
      } else {
        conditions.push('pf.family_group = ?');
        params.push(familyFilter);
      }
    }
    

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY pf.rarity, pf.name';
    
    const ponies = await query(sql, params);
    return Array.isArray(ponies) ? ponies : [];
  } catch (error) {
    console.error('Error getting all ponies with ownership:', error);
    return [];
  }
};


export const getAllPoniesForCollection = async (userId, filter = 'all', familyFilter = 'all') => {
  try {
    let sql = `
      SELECT 
        pf.*,
        CASE WHEN f.user_id IS NOT NULL THEN 1 ELSE 0 END as is_owned,
        COALESCE(MAX(f.is_favorite), 0) as is_favorite,
        COUNT(f.id) as encounter_count
      FROM pony_friends pf
      LEFT JOIN friendship f ON pf.id = f.friend_id AND f.user_id = ?
    `;
    
    const params = [userId];
    const conditions = [];
    

    conditions.push('pf.name NOT IN (?, ?, ?)');
    params.push('Aryanne', 'Peachy Sprinkle', 'Pumpkin Seed');
    

    if (filter !== 'all') {
      conditions.push('pf.rarity = ?');
      params.push(filter);
    }
    

    if (familyFilter !== 'all') {
      if (familyFilter === 'no_family') {
        conditions.push('(pf.family_group IS NULL OR pf.family_group = "")');
      } else {
        conditions.push('pf.family_group = ?');
        params.push(familyFilter);
      }
    }
    

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    

    sql += ' GROUP BY pf.id';
    sql += ' ORDER BY pf.rarity, pf.name';
    
    const ponies = await query(sql, params);
    return Array.isArray(ponies) ? ponies : [];
  } catch (error) {
    console.error('Error getting all ponies for collection:', error);
    return [];
  }
};


export const getPonyFriendByName = async (ponyName) => {
  try {

    let pony = await getRow(
      'SELECT * FROM pony_friends WHERE LOWER(name) = LOWER(?)',
      [ponyName.trim()]
    );
    

    if (!pony) {
      pony = await getRow(
        'SELECT * FROM pony_friends WHERE LOWER(name) LIKE LOWER(?)',
        [`%${ponyName.trim()}%`]
      );
    }
    
    return pony;
  } catch (error) {
    console.error('Error finding pony by name:', error);
    return null;
  }
};


export const getUserPonyByUniqueId = async (userId, uniqueId) => {
  try {
    const sql = `
      SELECT 
        f.id as friendship_id,
        f.friend_id,
        f.custom_name,
        f.friendship_level,
        f.experience,
        f.is_favorite,
        pf.name as original_name,
        pf.name,
        pf.description,
        pf.image as image_url,
        pf.pony_type,
        pf.rarity,
        pf.background,
        pf.family_group
      FROM friendship f
      LEFT JOIN pony_friends pf ON f.friend_id = pf.id
      WHERE f.user_id = ? AND f.id = ?
    `;
    
    const result = await getRow(sql, [userId, uniqueId]);
    
    if (result && result.custom_name) {

      result.name = result.custom_name;
    }
    
    return result;
  } catch (error) {
    console.error('Error getting user pony by unique ID:', error);
    throw error;
  }
};


export const updateCustomNickname = async (userId, uniqueId, customName) => {
  try {
    const sql = `
      UPDATE friendship 
      SET custom_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND id = ?
    `;
    
    const result = await query(sql, [customName, userId, uniqueId]);
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating custom nickname:', error);
    throw error;
  }
};


export const clearCustomNickname = async (userId, uniqueId) => {
  try {
    const sql = `
      UPDATE friendship 
      SET custom_name = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND id = ?
    `;
    
    const result = await query(sql, [userId, uniqueId]);
    return result.changes > 0;
  } catch (error) {
    console.error('Error clearing custom nickname:', error);
    throw error;
  }
};

export default {
  initFriendshipTables,
  createPonyFriendsTable,
  createFriendshipTable,
  updatePonyFriendsTableStructure,
  getUserFriends,
  getFriendshipCount,
  addFriend,
  hasFriend,
  getTotalPonyFriendsCount,
  toggleFavorite,
  getFavoritesCount,
  getDuplicatePonyBonus,
  updatePonyFriend,
  getPonyFriendsByRarity,
  getLowerRarityPonyFriends,
  getUserFriendsByRarityCount,
  getTotalPonyFriendsByRarityCount,
  transferPonyByFriendshipId,
  removePonyByFriendshipId,
  setPonyProtection,
  isPonyProtected,
  createPonyProtectionTable,
  getAllPoniesWithOwnership,
  getAllPoniesForCollection,
  updateFriendshipTableStructure,
  getUserPonyByUniqueId,
  updateCustomNickname,
  clearCustomNickname
}; 
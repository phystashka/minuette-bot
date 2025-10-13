
import { query, getRow, insert, update } from '../utils/database.js';
import { getResourceAmount, removeResource } from './ResourceModel.js';


export const AVAILABLE_SKINS = {
  'Appointed Rounds': [
    {
      id: 'appointed_mail',
      name: 'Mail',
      filename: 'AppointedRoundsMail.png',
      price_bits: 1200,
      price_harmony: 30,
      description: 'Professional postal service uniform for route planning and coordination'
    }
  ],
  'Sunny Delivery': [
    {
      id: 'sunny_mail',
      name: 'Mail',
      filename: 'SunnyDeliveryMail.png',
      price_bits: 1200,
      price_harmony: 30,
      description: 'Express delivery uniform for fast and reliable package service'
    }
  ],
  'Starlight Glimmer': [
    {
      id: 'starlight_student',
      name: 'Student',
      filename: 'StarlightGlimmerStudent.png',
      price_bits: 3000,
      price_harmony: 70,
      description: 'School of Friendship student uniform for magical studies'
    }
  ],
  'Coco Pommel': [
    {
      id: 'coco_school',
      name: 'School',
      filename: 'CocoPommelSchool.png',
      price_bits: 1500,
      price_harmony: 30,
      description: 'Classic school uniform perfect for studying and learning'
    }
  ],
  'Cozy Glow': [
    {
      id: 'cozy_adult',
      name: 'Adult',
      filename: 'CozyGlowAdult.png',
      price_bits: 2000,
      price_harmony: 40,
      description: 'Mature and sophisticated adult outfit for grown-up occasions'
    }
  ],
  'Fluttershy': [
    {
      id: 'fluttershy_flower_dress',
      name: 'Flower Dress',
      filename: 'FluttershyFlowerDress.png',
      price_bits: 1500,
      price_harmony: 30,
      description: 'Beautiful flower-themed dress perfect for garden parties'
    }
  ],
  'Pinkie Pie': [
    {
      id: 'pinkie_victorian_dress',
      name: 'Victorian Dress',
      filename: 'PinkiePieVictorianDress.png',
      price_bits: 3000,
      price_harmony: 60,
      description: 'Elegant Victorian-era dress with intricate lace details'
    },
    {
      id: 'pinkie_winter',
      name: 'Winter',
      filename: 'PinkiePieWinter.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Cozy winter outfit perfect for snowy weather and holiday parties'
    }
  ],
  'Rainbow Dash': [
    {
      id: 'rainbow_carnival_outfit',
      name: 'Carnival Outfit',
      filename: 'RainbowDashCarnivalOutfit.png',
      price_bits: 3000,
      price_harmony: 60,
      description: 'Colorful carnival performer outfit with dazzling accessories'
    },
    {
      id: 'rainbow_cute_girl',
      name: 'Cute Girl',
      filename: 'RainbowDashCuteGirl.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Adorable girly outfit that shows Rainbow Dash soft and cute side'
    }
  ],
  'Rarity': [
    {
      id: 'rarity_fashion',
      name: 'Fashion',
      filename: 'RrityFashion.png',
      price_bits: 3000,
      price_harmony: 60,
      description: 'High-fashion designer outfit showcasing the latest trends'
    }
  ],
  'Apple Jack': [
    {
      id: 'applejack_frozen',
      name: 'Frozen',
      filename: 'AppleJackFrozen.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Ice-cold winter outfit perfect for frozen apple harvesting'
    }
  ],
  'Berry Punch': [
    {
      id: 'berry_trixie',
      name: 'Trixie Style',
      filename: 'BerryPunchTrixie.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Magical performer outfit inspired by the Great and Powerful Trixie'
    }
  ],
  'Carrot Top': [
    {
      id: 'carrot_jacket',
      name: 'Jacket',
      filename: 'CarrotTopJacket.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Stylish jacket perfect for gardening and outdoor activities'
    }
  ],
  'Cheerilee': [
    {
      id: 'cheerilee_young',
      name: 'Young',
      filename: 'CheerileeYoung.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Youthful appearance from her school days as a student'
    }
  ],
  'Lyra Heartstrings': [
    {
      id: 'lyra_mafia',
      name: 'Mafia',
      filename: 'LyraHeartstringsMafia.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Mysterious undercover outfit for secret operations'
    },
    {
      id: 'lyra_socks',
      name: 'Socks',
      filename: 'LyraHeartstringsSocks.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Cute and cozy striped socks for casual comfort'
    }
  ],
  'Sea Swirl': [
    {
      id: 'sea_summer',
      name: 'Summer',
      filename: 'SeaSwirlSummer.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Bright summer outfit perfect for beach days and ocean adventures'
    },
    {
      id: 'sea_knight',
      name: 'Knight',
      filename: 'SeaSwirlKnight.png',
      price_pumpkins: 100,
      price_harmony: 400,
      description: 'Noble knight armor for protecting the seas and oceans'
    }
  ],
  'Sugar Belle': [
    {
      id: 'sugar_bride',
      name: 'Bride',
      filename: 'SugarBelleBride.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Beautiful wedding dress for the most special day'
    }
  ],
  'Sunset Shimmer': [
    {
      id: 'sunset_costume',
      name: 'Costume',
      filename: 'SunsetShimmerCostume.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Theatrical costume outfit for dramatic performances'
    },
    {
      id: 'sunset_fashion',
      name: 'Fashion',
      filename: 'SunsetShimmerFashion.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'High-end fashion outfit showcasing the latest trends'
    }
  ],

  'Derpy Hooves': [
    {
      id: 'derpy_mail',
      name: 'Mail',
      filename: 'DerpyHoovesMail.png',
      price_bits: 1200,
      price_harmony: 30,
      description: 'Official mail carrier uniform for delivering letters across Equestria'
    },
    {
      id: 'derpy_mad',
      name: 'Mad',
      filename: 'DerpyHoovesMad.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Angry expression outfit for when things dont go according to plan'
    },
    {
      id: 'derpy_professor',
      name: 'Professor',
      filename: 'DerpyHoovesProfessor.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Academic professor attire for teaching and scholarly pursuits'
    },
    {
      id: 'derpy_halloween',
      name: 'Halloween',
      filename: 'DerpyHoovesHalloween.png',
      price_pumpkins: 100,
      description: '🎃 Spooky Halloween costume for the clumsy mail mare',
      is_halloween: true
    }
  ],
  'Skellinore': [
    {
      id: 'skellinore_halloween',
      name: 'Halloween',
      filename: 'SkellinoreHalloween.png',
      price_pumpkins: 100,
      description: '🎃 Spooky Halloween outfit for the skeleton pony warrior',
      is_halloween: true
    }
  ],
  'Spike': [
    {
      id: 'spike_skeleton',
      name: 'Skeleton',
      filename: 'SpikeSkeleton.png',
      price_pumpkins: 100,
      description: '🎃 Bone-chilling skeleton costume for the brave dragon',
      is_halloween: true
    }
  ],
  'Sweetie Belle': [
    {
      id: 'sweetie_robot',
      name: 'Robot',
      filename: 'SweetieBelleRobot.png',
      price_pumpkins: 100,
      description: '🎃 Cardboard robot Halloween costume showing creativity and imagination',
      is_halloween: true
    },
    {
      id: 'sweetie_adult',
      name: 'Adult',
      filename: 'SweetieBelleAdult.png',
      price_bits: 3500,
      price_harmony: 55,
      description: 'Mature adult appearance showing growth into a talented unicorn'
    }
  ],
  'Trixie Lulamoon': [
    {
      id: 'trixie_vampire',
      name: 'Vampire',
      filename: 'TrixieLulamoonVampire.png',
      price_pumpkins: 100,
      description: '🎃 Mysterious vampire costume for dark magic performances',
      is_halloween: true
    },
    {
      id: 'trixie_gentlemare',
      name: 'Gentlemare',
      filename: 'TrixieLulamoonGentlemare.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Elegant gentlemare outfit for sophisticated shows'
    }
  ],
  'Twilight Sparkle': [
    {
      id: 'twilight_witch',
      name: 'Witch',
      filename: 'TwilightSparkleWitch.png',
      price_pumpkins: 100,
      description: '🎃 Magical witch costume perfect for Halloween spellcasting',
      is_halloween: true
    },
    {
      id: 'twilight_princess',
      name: 'Princess',
      filename: 'TwilightSparklePrincess.png',
      price_bits: 5000,
      price_harmony: 140,
      description: 'Royal princess attire befitting an alicorn ruler'
    },
    {
      id: 'twilight_starswirl',
      name: 'Star Swirl',
      filename: 'TwilightSparkleStarSwirl.png',
      price_pumpkins: 100,
      price_harmony: 400,
      description: 'Legendary Star Swirl the Bearded costume for magical mastery'
    }
  ],

  'Applejack': [
    {
      id: 'applejack_frozen',
      name: 'Frozen',
      filename: 'AppleJackFrozen.png',
      price_bits: 3500,
      price_harmony: 45,
      description: 'Ice-crystal outfit for winter adventures and frost resistance'
    },
    {
      id: 'applejack_lion',
      name: 'Lion',
      filename: 'AppleJackLion.png',
      price_bits: 4000,
      price_harmony: 60,
      description: 'Fierce lion costume showing courage and strength'
    }
  ],
  'Berry Punch': [
    {
      id: 'berry_trixie',
      name: 'Trixie Style',
      filename: 'BerryPunchTrixie.png',
      price_bits: 3000,
      price_harmony: 50,
      description: 'Magical performer outfit inspired by the Great and Powerful Trixie'
    }
  ],
  'Carrot Top': [
    {
      id: 'carrot_jacket',
      name: 'Jacket',
      filename: 'CarrotTopJacket.png',
      price_bits: 2500,
      price_harmony: 35,
      description: 'Stylish jacket for cool weather and garden work'
    },
    {
      id: 'carrot_demon',
      name: 'Demon',
      filename: 'CarrotTopDemon.png',
      price_pumpkins: 100,
      price_harmony: 400,
      description: 'Fiery demon costume with horns and dark magic aura'
    }
  ],
  'Coco Pommel': [
    {
      id: 'coco_school',
      name: 'School',
      filename: 'CocoPommelSchool.png',
      price_bits: 2000,
      price_harmony: 30,
      description: 'Classic school uniform for fashion design studies'
    }
  ],
  'Cozy Glow': [
    {
      id: 'cozy_adult',
      name: 'Adult',
      filename: 'CozyGlowAdult.png',
      price_bits: 4500,
      price_harmony: 80,
      description: 'Mature appearance showing growth and redemption'
    }
  ],
  'Fluttershy': [
    {
      id: 'fluttershy_flower_dress',
      name: 'Flower Dress',
      filename: 'FluttershyFlowerDress.png',
      price_bits: 3000,
      price_harmony: 50,
      description: 'Beautiful flower dress perfect for garden parties'
    }
  ],
  'Pinkie Pie': [
    {
      id: 'pinkie_victorian',
      name: 'Victorian Dress',
      filename: 'PinkiePieVictorianDress.png',
      price_bits: 4000,
      price_harmony: 70,
      description: 'Elegant Victorian-era dress for formal occasions'
    },
    {
      id: 'pinkie_winter',
      name: 'Winter',
      filename: 'PinkiePieWinter.png',
      price_bits: 2500,
      price_harmony: 40,
      description: 'Cozy winter outfit for snow parties and cold weather fun'
    },
    {
      id: 'pinkie_cock',
      name: 'Cock',
      filename: 'PinkiePieCock.png',
      price_pumpkins: 100,
      price_harmony: 400,
      description: 'Colorful rooster costume for barnyard party celebrations'
    }
  ],
  'Rainbow Dash': [
    {
      id: 'rainbow_carnival',
      name: 'Carnival Outfit',
      filename: 'RainbowDashCarnivalOutfit.png',
      price_bits: 3500,
      price_harmony: 60,
      description: 'Colorful carnival costume for aerial shows and festivals'
    },
    {
      id: 'rainbow_cute_girl',
      name: 'Cute Girl',
      filename: 'RainbowDashCuteGirl.png',
      price_bits: 3000,
      price_harmony: 45,
      description: 'Adorable girly outfit showing Rainbow Dash\'s softer side'
    },
    {
      id: 'rainbow_night',
      name: 'Night',
      filename: 'RainbowDashNight.png',
      price_pumpkins: 100,
      price_harmony: 400,
      description: 'Mysterious night outfit for stealth flying and moonlight training'
    }
  ],
  'Rarity': [
    {
      id: 'rarity_fashion',
      name: 'Fashion',
      filename: 'RrityFashion.png',
      price_bits: 4500,
      price_harmony: 85,
      description: 'High-fashion designer outfit showcasing ultimate elegance'
    }
  ],
  'Starlight Glimmer': [
    {
      id: 'starlight_student',
      name: 'Student',
      filename: 'StarlightGlimmerStudent.png',
      price_bits: 2500,
      price_harmony: 40,
      description: 'Student outfit for learning friendship and magic at Twilight\'s school'
    }
  ],
  'Zecora': [
    {
      id: 'zecora_spider',
      name: 'Spider Costume',
      filename: 'ZecoraSpiderCostume.png',
      price_pumpkins: 100,
      price_harmony: 400,
      description: 'Spooky spider costume perfect for Nightmare Night celebrations'
    }
  ],
  'Dinky Doo': [
    {
      id: 'dinky_costume',
      name: 'Costume',
      filename: 'DinkyDooCostume.png',
      price_pumpkins: 100,
      price_harmony: 400,
      description: 'Adorable Halloween costume for trick-or-treating adventures'
    }
  ],
  'Sunshower Raindrops': [
    {
      id: 'sunshower_viking',
      name: 'Viking',
      filename: 'SunshowerRaindropsViking.png',
      price_pumpkins: 100,
      price_harmony: 400,
      description: 'Fierce viking warrior outfit for aerial combat training'
    }
  ]
};


export const createUserSkinsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_skins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      pony_name TEXT NOT NULL,
      skin_id TEXT NOT NULL,
      equipped INTEGER NOT NULL DEFAULT 0,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, pony_name, skin_id)
    )
  `;
  
  await query(sql);
  

  await query('CREATE INDEX IF NOT EXISTS idx_user_skins_user_id ON user_skins (user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_user_skins_pony ON user_skins (user_id, pony_name)');
  await query('CREATE INDEX IF NOT EXISTS idx_user_skins_equipped ON user_skins (user_id, pony_name, equipped)');
  
  console.log('User skins table created/verified successfully');
};


try {
  createUserSkinsTable();
} catch (error) {
  console.error('Error initializing user skins table:', error);
}


export const getUserSkins = async (userId, ponyName) => {
  try {
    const userSkins = await query(
      'SELECT skin_id, equipped FROM user_skins WHERE user_id = ? AND pony_name = ?',
      [userId, ponyName]
    );
    
    const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
    
    return availableSkinsForPony
      .filter(skin => {



        return !skin.hidden || userSkins.some(us => us.skin_id === skin.id);
      })
      .map(skin => ({
        ...skin,
        owned: userSkins.some(us => us.skin_id === skin.id),
        equipped: userSkins.some(us => us.skin_id === skin.id && us.equipped === 1)
      }));
  } catch (error) {
    console.error('Error getting user skins:', error);
    return [];
  }
};


export const getEquippedSkin = async (userId, ponyName) => {
  try {
    const equipped = await getRow(
      'SELECT skin_id FROM user_skins WHERE user_id = ? AND pony_name = ? AND equipped = 1',
      [userId, ponyName]
    );
    
    if (!equipped) return null;
    
    const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
    return availableSkinsForPony.find(skin => skin.id === equipped.skin_id) || null;
  } catch (error) {
    console.error('Error getting equipped skin:', error);
    return null;
  }
};


export const purchaseSkin = async (userId, ponyName, skinId, paymentType = 'bits') => {
  try {
    const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
    const skin = availableSkinsForPony.find(s => s.id === skinId);
    
    if (!skin) {
      return { success: false, reason: 'skin_not_found' };
    }
    

    const existing = await getRow(
      'SELECT id FROM user_skins WHERE user_id = ? AND pony_name = ? AND skin_id = ?',
      [userId, ponyName, skinId]
    );
    
    if (existing) {
      return { success: false, reason: 'already_owned' };
    }


    let price = 0;
    let currency = paymentType;
    
    if (paymentType === 'free') {
      price = 0;
    } else if (paymentType === 'pumpkins' || skin.price_pumpkins) {
      price = skin.price_pumpkins || 100;
      currency = 'pumpkins';
      

      const userPumpkins = await getResourceAmount(userId, 'pumpkins');
      if (userPumpkins < price) {
        return { success: false, reason: 'insufficient_pumpkins', required: price, available: userPumpkins };
      }
      

      await removeResource(userId, 'pumpkins', price);
    } else if (paymentType === 'harmony') {
      price = skin.price_harmony;
    } else {
      price = skin.price_bits;
    }
    

    await insert('user_skins', {
      user_id: userId,
      pony_name: ponyName,
      skin_id: skinId,
      equipped: 0
    });
    
    return { 
      success: true, 
      skin: skin,
      price: price,
      currency: currency
    };
  } catch (error) {
    console.error('Error purchasing skin:', error);
    return { success: false, reason: 'database_error' };
  }
};


export const equipSkin = async (userId, ponyName, skinId) => {
  try {

    await query(
      'UPDATE user_skins SET equipped = 0 WHERE user_id = ? AND pony_name = ?',
      [userId, ponyName]
    );
    

    if (skinId && skinId !== 'default') {
      const result = await query(
        'UPDATE user_skins SET equipped = 1 WHERE user_id = ? AND pony_name = ? AND skin_id = ?',
        [userId, ponyName, skinId]
      );
      
      if (result.changes === 0) {
        return { success: false, reason: 'skin_not_owned' };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error equipping skin:', error);
    return { success: false, reason: 'database_error' };
  }
};


export const hasAvailableSkins = (ponyName) => {
  return AVAILABLE_SKINS.hasOwnProperty(ponyName) && AVAILABLE_SKINS[ponyName].length > 0;
};


export const getSkinImagePath = (ponyName, skinId = null) => {
  if (!skinId || skinId === 'default') {
    return null;
  }
  
  const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
  const skin = availableSkinsForPony.find(s => s.id === skinId);
  
  if (!skin) return null;
  
  return `./src/public/skins/${skin.filename}`;
};


export const formatSkinTitle = (ponyName, skinId = null) => {
  if (!skinId || skinId === 'default') {
    return ponyName;
  }
  
  const availableSkinsForPony = AVAILABLE_SKINS[ponyName] || [];
  const skin = availableSkinsForPony.find(s => s.id === skinId);
  
  if (!skin) return ponyName;
  
  return `${ponyName} ${skin.name}`;
};


export const getRandomSkin = () => {
  const allSkins = [];
  

  for (const [ponyName, skins] of Object.entries(AVAILABLE_SKINS)) {
    for (const skin of skins) {
      allSkins.push({
        ponyName: ponyName,
        skinId: skin.id,
        skin: skin
      });
    }
  }
  

  if (allSkins.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * allSkins.length);
  return allSkins[randomIndex];
};

export default {
  createUserSkinsTable,
  getUserSkins,
  getEquippedSkin,
  purchaseSkin,
  equipSkin,
  hasAvailableSkins,
  getSkinImagePath,
  formatSkinTitle,
  getRandomSkin,
  AVAILABLE_SKINS
};
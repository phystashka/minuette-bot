import { getRow } from './database.js';


export const CUTIE_MARKS = {

  'Princess Celestia': '<:PrincessCelestia:1422627397559390320>',
  'Princess Luna': '<:PrincessLuna:1422627408170717294>',
  'Princess Cadance': '<:PrincessCadance:1422627384913559593>',
  'Flurry Heart': '<:FlurryHeart:1422627229510406207>',
  'Daybreaker': '<:Daybreaker:1422627208056279070>',
  'Nightmare Moon': '<:NightmareMoon:1422627341334479021>',
  'King Sombra': '<:KingSombra:1422627274498379861>',
  'Queen Chrysalis': '<:Equality:1422633778416713871>',
  'Lord Tirek': '<:Equality:1422633778416713871>',
  'The Storm King': '<:Equality:1422633778416713871>',
  'Ember': '<:Equality:1422633778416713871>',
  'Cozy Glow': '<:CozyGlow:1422627196043919452>',
  'Tempest Shadow': '<:TempestShadow:1422627556686958753>',
  'Queen Novo': '<:Equality:1422633778416713871>',
  'Princess Skystar': '<:Equality:1422633778416713871>',
  'Grogar': '<:Equality:1422633778416713871>',
  'Star Swirl the Bearded': '<:StarSwirltheBearded:1422627502588821736>',
  'Mistmane': '<:Mistmane:1422627325023097024>',
  'Prince Rutherford': '<:Equality:1422633778416713871>',
  'Ahuizotl': '<:Equality:1422633778416713871>',
  'Grubber': '<:Equality:1422633778416713871>',
  'Opaline Arcana': '<:OpalineArcana:1422627350763536495>',
  'Aryanne': '<:Aryanne:1422627166738186380>',


  'Twilight Sparkle': '<:TwilightSparkle:1422627567352938496>',
  'Rainbow Dash': '<:RainbowDash:1422627433730805760>',
  'Pinkie Pie': '<:PinkiePie:1422627358866804847>',
  'Rarity': '<:Rarity:1422627442044047470>',
  'Applejack': '<:Applejack:1422627140817653792>',
  'Fluttershy': '<:Fluttershy:1422627242449834065>',
  'Spike': '<:Equality:1422633778416713871>',
  'Starlight Glimmer': '<:StarlightGlimmer:1422627515167543316>',
  'Discord': '<:Equality:1422633778416713871>',
  'Shining Armor': '<:ShiningArmor:1422627474256302191>',
  'Sunset Shimmer': '<:SunsetShimmer:1422627546607911072>',
  'Rockhoof': '<:Rockhoof:1422627454085890210>',
  'Flash Magnus': '<:FlashMagnus:1422627217636331582>',
  'Meadowbrook': '<:Meadowbrook:1422627316798062682>',
  'Somnambula': '<:Somnambula:1422627486277177505>',
  'Maud Pie': '<:MaudPie:1422627307272540281>',
  'Limestone Pie': '<:LimestonePie:1422627287391539250>',
  'Marble Pie': '<:MarblePie:1422627297437024416>',
  'Radiant Hope': '<:RadiantHope:1422627422418767963>',
  'Sunny Starscout': '<:SunnyStarscout:1422627536600436776>',
  'Izzy Moonbow': '<:IzzyMoonbow:1422627264507547760>',
  'Hitch Trailblazer': '<:HitchTrailblazer:1422627252792856706>',
  'Pipp Petals': '<:PippPetals:1422627366647238706>',
  'Zipp Storm': '<:ZippStorm:1422627579109838948>',
  'Babs Seed': '<:BabsSeed:1422627177060372542>',
  'Gallus': '<:Equality:1422633778416713871>',
  'Silverstream': '<:Equality:1422633778416713871>',
  'Smolder': '<:Equality:1422633778416713871>',
  'Yona': '<:Equality:1422633778416713871>',
  'Sandbar': '<:Sandbar:1422627462860509194>',
  'Ocellus': '<:Equality:1422633778416713871>',
  'Capper': '<:Equality:1422633778416713871>',
  'Captain Celaeno': '<:Equality:1422633778416713871>',
  'Sunburst': '<:Sunburst:1422627525896568984>',
  'Terramar': '<:Equality:1422633778416713871>',
  'Misty Brightdawn': '<:MistyBrightdawn:1422627333122035773>',
  'Cloudpuff': '<:Equality:1422633778416713871>',
  'Copper Top': '<:CopperTop:1422627184249671762>',



  'Applejack Blood 🩸': '<:Applejack:1422627140817653792>',
  'Big McIntosh Blood 🩸': '<:Equality:1422633778416713871>',
  'Smolder Blood 🩸': '<:Equality:1422633778416713871>',
  'Fluttershy Blood 🩸': '<:Fluttershy:1422627242449834065>',
  'Gallus Blood 🩸': '<:Equality:1422633778416713871>',
  'Pinkie Pie Blood 🩸': '<:PinkiePie:1422627358866804847>',
  'Princess Celestia Blood 🩸': '<:PrincessCelestia:1422627397559390320>',
  'Rainbow Dash Blood 🩸': '<:RainbowDash:1422627433730805760>',
  'Rarity Blood 🩸': '<:Rarity:1422627442044047470>',
  'Sandbar Blood 🩸': '<:Sandbar:1422627462860509194>',
  'Twilight Sparkle Blood 🩸': '<:TwilightSparkle:1422627567352938496>',


  'Allura': '<:Allura:1426914275422896198>',
  'Apple Bloom': '<:AppleBloom:1426914286357184593>',
  'Bon Bon': '<:BonBon:1426914302425563210>',
  'Braeburn': '<:Braeburn:1426914312290828288>',
  'Bulk Biceps': '<:BulkBiceps:1426914322831114351>',
  'Cheerilee': '<:Cheerilee:1426914332922478733>',
  'Derpy Hooves': '<:DerpyHooves:1426914342808453183>',
  'Dr. Hooves': '<:DrHooves:1426914352178401362>',
  'Lightning Dust': '<:LightningDust:1426914368595038310>',
  'Lyra Heartstrings': '<:LyraHeartstrings:1426914402845720677>',
  'Mr. Cake': '<:MrCake:1426914469992337408>',
  'Mr. Shy': '<:MrShy:1426914548484673557>',
  'Mrs. Cake': '<:MrsCake:1426914567442661487>',
  'Mrs. Shy': '<:MrsShy:1426914596148477963>',
  'Nurse Redheart': '<:NurseRedheart:1426914615484485752>',
  'Octavia Melody': '<:OctaviaMelody:1426914625768915115>',
  'Perfect Pace': '<:PerfectPace:1426914635541512212>',
  'Photo Finish': '<:PhotoFinish:1426914650573901955>',
  'Pound Cake': '<:PoundCake:1426915658641309838>',
  'Pumpkin Cake': '<:PumpkinCake:1426914669762838561>',
  'Rainbow Stars': '<:RainbowStars:1426914682895335534>',
  'Sapphire Shores': '<:SapphireShores:1426914693066264627>',
  'Scootaloo': '<:Scootaloo:1426914703317270549>',
  'Snails': '<:Snails:1426914712116920340>',
  'Snips': '<:Snips:1426914721843515474>',
  'Sugar Belle': '<:SugarBelle:1426914730190045215>',
  'Suri Polomare': '<:SuriPolomare:1426914741212676229>',
  'Sweetie Belle': '<:SweetieBelle:1426914749467328562>',
  'Trixie Lulamoon': '<:TrixieLulamoon:1426914757167943811>',
  'Twilight Velvet': '<:TwilightVelvet:1426914768022798538>',
  'Vinyl Scratch': '<:VinylScratc:1426914776700948591>',
  'Windy Whistles': '<:WindyWhistles:1426914786469220514>',
  'Zephyr Breeze': '<:ZephyrBreeze:1426914794434334820>',
  'Pinkamena Diane Pie': '<:PinkiePie:1422627358866804847>',
  'Philomena': '<:Equality:1422633778416713871>',
  'Alice': '<:Equality:1422633778416713871>',
  'Bori': '<:Equality:1422633778416713871>',
  'Aurora': '<:Equality:1422633778416713871>',
  'Clear Sky': '<:ClearSky:1426917208302424086>',
  'Queen Haven': '<:QueenHaven:1426917615007301662>',
  'Pear Butter': '<:PearButter:1426918230693384222>',
  'Minuette': '<:Minuette:1426918194483953786>',


  'Mean Twilight Sparkle': '<:TwilightSparkle:1422627567352938496>',
  'Mean Rainbow Dash': '<:MeanRainbowDash:1426914447984955462>',
  'Mean Pinkie Pie': '<:MeanPinkiePie:1426914435745710311>',
  'Mean Rarity': '<:MeanRarity:1426914458797609021>',
  'Mean Applejack': '<:MeanApplejack:1426914415386693803>',
  'Mean Fluttershy': '<:MeanFluttershy:1426914425218138142>'
};


async function getOriginalPonyName(friendId) {
  try {
    const pony = await getRow('SELECT name FROM pony_friends WHERE id = ?', [friendId]);
    return pony ? pony.name : null;
  } catch (error) {
    console.error('Error getting original pony name:', error);
    return null;
  }
}


export async function getCutieMarkForPony(ponyNameOrId, friendshipLevel, friendId = null) {

  if (friendshipLevel < 30) {
    return null;
  }

  let originalName = null;


  if (typeof ponyNameOrId === 'object' && ponyNameOrId.friend_id) {

    originalName = await getOriginalPonyName(ponyNameOrId.friend_id);
  } else if (typeof ponyNameOrId === 'number') {

    originalName = await getOriginalPonyName(ponyNameOrId);
  } else if (friendId) {

    originalName = await getOriginalPonyName(friendId);
  } else {

    originalName = ponyNameOrId;
  }

  if (!originalName) {
    return null;
  }


  const cutieMark = CUTIE_MARKS[originalName];
  

  if (!cutieMark || cutieMark === 'none') {
    return null;
  }

  return cutieMark;
}


export function getCutieMarkForPonySync(originalName, friendshipLevel) {

  if (friendshipLevel < 30) {
    return null;
  }


  const cutieMark = CUTIE_MARKS[originalName];
  

  if (!cutieMark || cutieMark === 'none') {
    return null;
  }

  return cutieMark;
}


export function getCutieMarkFromPonyObject(pony) {

  const friendshipLevel = pony.friendship_level || 1;
  if (friendshipLevel < 30) {
    return null;
  }


  const originalName = pony.original_name || pony.name;
  

  const cutieMark = CUTIE_MARKS[originalName];
  

  if (!cutieMark || cutieMark === 'none') {
    return null;
  }

  return cutieMark;
}


export function getAllPoniesWithCutieMarks() {
  const result = {};
  
  for (const [ponyName, cutieMark] of Object.entries(CUTIE_MARKS)) {
    if (cutieMark && cutieMark !== 'none') {
      result[ponyName] = cutieMark;
    }
  }
  
  return result;
}


export function addCutieMark(ponyName, cutieMark) {
  CUTIE_MARKS[ponyName] = cutieMark;
}


export function removeCutieMark(ponyName) {
  CUTIE_MARKS[ponyName] = 'none';
}

export function getCutieMarkForCollection(ponyName) {

  const cutieMark = CUTIE_MARKS[ponyName];
  

  if (!cutieMark || cutieMark === 'none') {
    return null;
  }

  return cutieMark;
}
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';
import path from 'path';
import fs from 'fs';

export async function loadImageWithProxy(imageUrl) {

  const fallbackUrls = [
    imageUrl,
    `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`,
    `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}`,
    imageUrl.replace('i.imgur.com', 'imgur.com'),
  ];

  for (const url of fallbackUrls) {
    try {

      const image = await loadImage(url);
      if (url !== imageUrl) {

      }
      return image;
    } catch (error) {

      continue;
    }
  }
  
  throw new Error(`All fallback URLs failed for image: ${imageUrl}`);
}


export async function createPonyWithBackground(ponyImageUrl, backgroundName) {
  try {

    if (!ponyImageUrl || typeof ponyImageUrl !== 'string') {
      throw new Error(`Invalid pony image URL: ${ponyImageUrl}`);
    }


    

    const width = 512;
    const height = 512;
    

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    

    const backgroundPath = path.join(process.cwd(), 'src', 'public', 'backgrounds', `${backgroundName}.png`);
    

    if (!fs.existsSync(backgroundPath)) {
      console.warn(`Background not found: ${backgroundPath}, using ponyville as default`);
      const defaultPath = path.join(process.cwd(), 'src', 'public', 'backgrounds', 'ponyville.png');
      if (!fs.existsSync(defaultPath)) {
        throw new Error('Default background (ponyville.png) not found');
      }
    }
    

    const backgroundImage = await loadImage(fs.existsSync(backgroundPath) ? backgroundPath : 
      path.join(process.cwd(), 'src', 'public', 'backgrounds', 'ponyville.png'));
    

    ctx.drawImage(backgroundImage, 0, 0, width, height);
    

    let ponyImage;
    try {

      if (ponyImageUrl) {
        const url = new URL(ponyImageUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error(`Unsupported protocol: ${url.protocol}`);
        }
      }
      
      ponyImage = await loadImageWithProxy(ponyImageUrl);
    } catch (imageError) {
      console.error(`Failed to load pony image from URL: ${ponyImageUrl}`);
      console.error(`Image loading error:`, imageError.message);
      throw new Error(`Failed to load pony image: ${imageError.message}`);
    }
    

    const maxPonyWidth = width * 0.893025;
    const maxPonyHeight = height * 0.9918625;
    

    let ponyWidth = ponyImage.width;
    let ponyHeight = ponyImage.height;
    

    if (ponyWidth > maxPonyWidth) {
      const scale = maxPonyWidth / ponyWidth;
      ponyWidth = maxPonyWidth;
      ponyHeight = ponyHeight * scale;
    }
    
    if (ponyHeight > maxPonyHeight) {
      const scale = maxPonyHeight / ponyHeight;
      ponyHeight = maxPonyHeight;
      ponyWidth = ponyWidth * scale;
    }
    

    const ponyX = (width - ponyWidth) / 2;
    const ponyY = (height - ponyHeight) / 2;
    

    ctx.drawImage(ponyImage, ponyX, ponyY, ponyWidth, ponyHeight);
    

    const buffer = canvas.toBuffer('image/png');
    

    const attachment = new AttachmentBuilder(buffer, { 
      name: `pony_with_background_${Date.now()}.png`,
      description: 'Pony with background'
    });
    
    return attachment;
    
  } catch (error) {
    console.error('Error creating pony with background:', error);
    console.error('Pony URL:', ponyImageUrl);
    console.error('Background name:', backgroundName);
    throw error;
  }
}


export function getBackgroundFileName(backgroundValue) {

  const backgroundMap = {
    'ponyville': 'ponyville',
    'canterlot': 'canterlot',
    'crystal_empire': 'crystal_empire',
    'cloudsdale': 'cloudsdale',
    'sweet_apple_acres': 'sweet_apple_acres',
    'everfree_forest': 'everfree_forest',
    'manehattan': 'manehattan',
    'appleloosa': 'appleloosa',
    'dragon_lands': 'dragon_lands',
    'changeling_hive': 'changeling_hive',
    'griffonstone': 'griffonstone',
    'yakyakistan': 'yakyakistan',
    'rock_farm': 'rock_farm',
    'pear_orchard': 'pear_orchard',
    'our_town': 'our_town',
    'kirin_village': 'kirin_village',
    'klugetown': 'klugetown',
    'airship': 'airship',
    'bridlewood': 'bridlewood',
    'maretime_bay': 'maretime_bay',
    'zephyr_heights': 'zephyr_heights',
    'crystal_prep': 'crystal_prep',
    'equestria_girls': 'equestria_girls',
    'chaosville': 'chaosville',
    'jungle': 'jungle',
    'equestria': 'equestria',
    'blood_moon_event': 'blood_moon_event',
    'halloween_event': 'halloween_event'
  };
  
  return backgroundMap[backgroundValue] || 'ponyville';
}


export async function createVenturePonyImage(ponyData) {
  const backgroundFileName = getBackgroundFileName(ponyData.background || 'ponyville');
  return await createPonyWithBackground(ponyData.image, backgroundFileName);
}


export async function createEmbedWithBackground(ponyData, embedData) {
  let ponyWithBackground;
  try {
    ponyWithBackground = await createVenturePonyImage(ponyData);
  } catch (error) {
    console.error('Error creating pony with background:', error);
    console.error('Pony data:', JSON.stringify(ponyData, null, 2));
    ponyWithBackground = null;
  }
  
  const result = {
    embed: {
      ...embedData,
      image: ponyWithBackground ? `attachment://${ponyWithBackground.name}` : (ponyData.image || null)
    },
    files: ponyWithBackground ? [ponyWithBackground] : [],
    attachment: ponyWithBackground
  };
  
  return result;
}

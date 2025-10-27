import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PONIES_IMAGE_DIR = path.join(__dirname, '..', 'ponies');

const SERVER_PORT = process.env.WEBHOOK_PORT || 3000;
const SERVER_HOST = process.env.HOST || 'localhost';

function createSafeFilename(filename) {
  return filename
    .replace(/[^\w\s\-\.]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}


export function isUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return false;
  return imagePath.startsWith('http://') || imagePath.startsWith('https://');
}


function fixImageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/^h+ttps:/, 'https:').replace(/^h+ttp:/, 'http:');
}


export function localImageExists(filename) {
  if (!filename) {
    console.log(`[localImageExists] No filename provided`);
    return false;
  }
  
  const fullPath = path.join(PONIES_IMAGE_DIR, filename);
  console.log(`[localImageExists] Checking: ${fullPath}`);
  
  try {
    const exists = fs.existsSync(fullPath);
    console.log(`[localImageExists] File "${filename}" exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error(`[localImageExists] Error checking local image existence: ${filename}`, error);
    return false;
  }
}

function generateLocalImageUrl(filename) {
  const encodedFilename = encodeURIComponent(filename);
  return `http://${SERVER_HOST}:${SERVER_PORT}/ponies/${encodedFilename}`;
}


export function resolveImagePath(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') {
    console.log(`[resolveImagePath] Invalid imagePath: ${imagePath}`);
    return null;
  }
  
  console.log(`[resolveImagePath] Processing: "${imagePath}"`);


  if (isUrl(imagePath)) {
    return fixImageUrl(imagePath);
  }


  console.log(`[resolveImagePath] Checking local file: "${imagePath}"`);
  console.log(`[resolveImagePath] Directory: ${PONIES_IMAGE_DIR}`);
  
  if (localImageExists(imagePath)) {
    const localPath = getLocalImagePath(imagePath);
    console.log(`[resolveImagePath] Local file found, returning attachment path: ${localPath}`);
    return `attachment://${imagePath}`;
  }

  if (!imagePath.toLowerCase().endsWith('.png') && !imagePath.toLowerCase().endsWith('.jpg') && !imagePath.toLowerCase().endsWith('.jpeg')) {
    const withPngExtension = `${imagePath}.png`;
    console.log(`[resolveImagePath] Trying with .png extension: "${withPngExtension}"`);
    if (localImageExists(withPngExtension)) {
      const localPath = getLocalImagePath(withPngExtension);
      console.log(`[resolveImagePath] Local file with .png found, returning attachment path: ${localPath}`);
      return `attachment://${withPngExtension}`;
    }
  }

  console.warn(`[resolveImagePath] Image not found: "${imagePath}" (checked both as URL and local file)`);
  console.log(`[resolveImagePath] Available files:`, getAvailableLocalImages());
  return null;
}


export function resolveImageForDiscord(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') {
    return null;
  }


  if (isUrl(imagePath)) {
    return {
      type: 'url',
      path: fixImageUrl(imagePath)
    };
  }


  if (localImageExists(imagePath)) {
    const localPath = path.join(PONIES_IMAGE_DIR, imagePath);
    return {
      type: 'file',
      path: localPath,
      filename: imagePath
    };
  }


  if (!imagePath.toLowerCase().endsWith('.png') && !imagePath.toLowerCase().endsWith('.jpg') && !imagePath.toLowerCase().endsWith('.jpeg')) {
    const withPngExtension = `${imagePath}.png`;
    if (localImageExists(withPngExtension)) {
      const localPath = path.join(PONIES_IMAGE_DIR, withPngExtension);
      return {
        type: 'file',
        path: localPath,
        filename: withPngExtension
      };
    }
  }

  return null;
}

export function getLocalImagePath(filename) {
  if (!filename || !localImageExists(filename)) {
    return null;
  }
  return path.join(PONIES_IMAGE_DIR, filename);
}


export function getAvailableLocalImages() {
  try {
    if (!fs.existsSync(PONIES_IMAGE_DIR)) {
      return [];
    }
    
    return fs.readdirSync(PONIES_IMAGE_DIR).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    });
  } catch (error) {
    console.error('Error reading ponies directory:', error);
    return [];
  }
}

export function getImageInfo(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') {
    return { type: 'none', url: null, attachmentPath: null, filename: null };
  }

  console.log(`[getImageInfo] Processing: "${imagePath}"`);

  let filename = imagePath;
  let fullPath = getLocalImagePath(filename);

  if (!fullPath && !filename.toLowerCase().endsWith('.png') && !filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
    filename = `${imagePath}.png`;
    fullPath = getLocalImagePath(filename);
  }

  if (fullPath) {
    console.log(`[getImageInfo] Local file found: ${fullPath}`);
    const safeFilename = createSafeFilename(filename);
    return { 
      type: 'attachment', 
      url: `attachment://${safeFilename}`, 
      attachmentPath: fullPath, 
      filename: safeFilename,
      originalFilename: filename
    };
  }

  console.warn(`[getImageInfo] Image not found: "${imagePath}"`);
  return { type: 'none', url: null, attachmentPath: null, filename: null };
}

try {
  if (!fs.existsSync(PONIES_IMAGE_DIR)) {
    fs.mkdirSync(PONIES_IMAGE_DIR, { recursive: true });
    console.log(`Created ponies images directory: ${PONIES_IMAGE_DIR}`);
  }
} catch (error) {
  console.error('Error creating ponies directory:', error);
}
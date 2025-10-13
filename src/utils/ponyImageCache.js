import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const TEMP_IMAGES_DIR = path.join(__dirname, '../../temp_pony_images');
const CACHE_EXPIRY = 30 * 60 * 1000;


const fileCacheMap = new Map();


async function ensureTempDirectory() {
  try {
    await fs.access(TEMP_IMAGES_DIR);
  } catch {
    await fs.mkdir(TEMP_IMAGES_DIR, { recursive: true });
    console.log('Created temp images directory:', TEMP_IMAGES_DIR);
  }
}


async function cleanupExpiredFiles() {
  try {
    const files = await fs.readdir(TEMP_IMAGES_DIR);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(TEMP_IMAGES_DIR, file);
      const cacheTime = fileCacheMap.get(file);
      
      if (cacheTime && (now - cacheTime) > CACHE_EXPIRY) {
        try {
          await fs.unlink(filePath);
          fileCacheMap.delete(file);
          console.log('Cleaned up expired pony image:', file);
        } catch (error) {
          console.error('Error cleaning up file:', file, error);
        }
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}


function downloadImage(imageUrl, ponyId) {
  return new Promise((resolve, reject) => {
    try {

      const urlParts = imageUrl.split('.');
      const extension = urlParts[urlParts.length - 1].split('?')[0] || 'jpg';
      

      const fileName = `pony_${ponyId}_${Date.now()}.${extension}`;
      const filePath = path.join(TEMP_IMAGES_DIR, fileName);
      

      const client = imageUrl.startsWith('https:') ? https : http;
      
      const request = client.get(imageUrl, (response) => {

        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            console.log('Following redirect to:', redirectUrl);
            resolve(downloadImage(redirectUrl, ponyId));
            return;
          }
        }
        

        if (response.statusCode !== 200) {

          if (response.statusCode === 429 || response.statusCode >= 500) {
            console.warn(`Temporary error ${response.statusCode} for image ${imageUrl}, will use fallback`);
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          }
          return;
        }
        

        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
          reject(new Error(`Invalid content type: ${contentType}`));
          return;
        }
        

        const fileStream = createWriteStream(filePath);
        

        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();

          fileCacheMap.set(fileName, Date.now());
          console.log('Downloaded pony image:', fileName);
          resolve(filePath);
        });
        
        fileStream.on('error', (error) => {

          fs.unlink(filePath).catch(() => {});
          reject(error);
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      

      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
      
    } catch (error) {
      reject(error);
    }
  });
}


export async function getCachedPonyImage(imageUrl, ponyId) {
  try {

    await ensureTempDirectory();
    

    const lastCleanup = getCachedPonyImage.lastCleanup || 0;
    if (Date.now() - lastCleanup > 5 * 60 * 1000) {
      cleanupExpiredFiles();
      getCachedPonyImage.lastCleanup = Date.now();
    }
    

    const files = await fs.readdir(TEMP_IMAGES_DIR);
    const existingFile = files.find(file => file.includes(`pony_${ponyId}_`));
    
    if (existingFile) {
      const existingPath = path.join(TEMP_IMAGES_DIR, existingFile);
      const cacheTime = fileCacheMap.get(existingFile);
      

      if (cacheTime && (Date.now() - cacheTime) <= CACHE_EXPIRY) {
        console.log('Using cached pony image:', existingFile);
        return existingPath;
      } else {

        try {
          await fs.unlink(existingPath);
          fileCacheMap.delete(existingFile);
        } catch (error) {
          console.error('Error removing expired file:', error);
        }
      }
    }
    

    console.log('🔄 Downloading pony image from:', imageUrl);
    const downloadedPath = await downloadImage(imageUrl, ponyId);
    console.log('✅ Successfully downloaded pony image:', path.basename(downloadedPath));
    return downloadedPath;
    
  } catch (error) {
    console.error('Error getting cached pony image:', error);

    return null;
  }
}


export async function removeTempPonyImage(filePath) {
  try {
    if (filePath && filePath.includes('temp_pony_images')) {
      const fileName = path.basename(filePath);
      await fs.unlink(filePath);
      fileCacheMap.delete(fileName);
      console.log('Removed temp pony image:', fileName);
    }
  } catch (error) {
    console.error('Error removing temp pony image:', error);
  }
}

export async function clearAllTempImages() {
  try {
    const files = await fs.readdir(TEMP_IMAGES_DIR);
    
    for (const file of files) {
      const filePath = path.join(TEMP_IMAGES_DIR, file);
      await fs.unlink(filePath);
    }
    
    fileCacheMap.clear();
    console.log('Cleared all temp pony images');
  } catch (error) {
    console.error('Error clearing temp images:', error);
  }
}
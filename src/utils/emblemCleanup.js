import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const cleanupMissingEmblems = async () => {
  try {

    

    const clansWithEmblems = await query('SELECT id, emblem_filename FROM clans WHERE emblem_filename IS NOT NULL');
    
    if (clansWithEmblems.length === 0) {

      return;
    }
    
    const emblemDir = path.join(__dirname, '..', 'public', 'clan_emblems');
    let cleanedCount = 0;
    
    for (const clan of clansWithEmblems) {
      const emblemPath = path.join(emblemDir, clan.emblem_filename);
      
      if (!fs.existsSync(emblemPath)) {

        

        await query('UPDATE clans SET emblem_filename = NULL WHERE id = ?', [clan.id]);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {

    } else {

    }
    
  } catch (error) {
    console.error('❌ Error during emblem cleanup:', error);
  }
};

export const ensureEmblemDirectory = () => {
  const emblemDir = path.join(__dirname, '..', 'public', 'clan_emblems');
  
  if (!fs.existsSync(emblemDir)) {
    try {
      fs.mkdirSync(emblemDir, { recursive: true });

    } catch (error) {
      console.error('❌ Failed to create clan_emblems directory:', error);
    }
  }
};

import { GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleFontManager {
  constructor() {
    this.initialized = false;
    this.fontFamily = 'Unbounded';
    this.fallbackFonts = ['Arial', 'Helvetica', 'sans-serif'];
  }

  async initialize() {
    if (this.initialized) return true;

    try {

      const fontPath = path.join(__dirname, '..', '..', 'Unbounded-Blond.ttf');
      
      if (!fs.existsSync(fontPath)) {
        console.warn(`⚠ Font file not found: ${fontPath}`);
        return false;
      }

      const resolvedPath = path.resolve(fontPath);


      try {
        GlobalFonts.registerFromPath(resolvedPath, this.fontFamily);
        console.log(`✓ Font "${this.fontFamily}" registered successfully`);
      } catch (error) {
        console.warn('⚠ Font registration failed:', error.message);
        return false;
      }


      const registeredFonts = GlobalFonts.families;
      const isRegistered = registeredFonts.some(font => 
        font.family === this.fontFamily
      );

      if (isRegistered) {
        console.log('✓ Font verification successful');
        this.initialized = true;
        return true;
      } else {
        console.warn('⚠ Font verification failed, using fallback fonts');
        return false;
      }

    } catch (error) {
      console.error('❌ Font initialization error:', error);
      return false;
    }
  }

  getFontString(size) {
    const fonts = [this.fontFamily, ...this.fallbackFonts];
    return `${size}px ${fonts.map(f => `"${f}"`).join(', ')}`;
  }

  async setFont(ctx, size) {
    await this.initialize();
    ctx.font = this.getFontString(size);
  }

  getAvailableFonts() {
    try {
      return GlobalFonts.families.map(font => font.family);
    } catch (error) {
      console.error('Error getting available fonts:', error);
      return [];
    }
  }

  isFontAvailable() {
    try {
      const fonts = this.getAvailableFonts();
      return fonts.some(font => font === this.fontFamily);
    } catch (error) {
      return false;
    }
  }
}


export const simpleFontManager = new SimpleFontManager();


export async function setSafeFont(ctx, size) {
  await simpleFontManager.setFont(ctx, size);
}
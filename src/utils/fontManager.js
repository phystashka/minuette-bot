import { GlobalFonts } from '@napi-rs/canvas';
import * as fontkit from 'fontkit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FontManager {
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
        console.warn(`Font file not found: ${fontPath}`);
        return false;
      }

      const resolvedPath = path.resolve(fontPath);


      try {
        GlobalFonts.registerFromPath(resolvedPath, this.fontFamily);

      } catch (error) {
        console.warn('GlobalFonts registration failed:', error);
      }


      try {
        const font = fontkit.openSync(resolvedPath);

      } catch (error) {
        console.warn('Fontkit validation failed:', error);
      }


      const registeredFonts = GlobalFonts.families;
      const isRegistered = registeredFonts.some(font => 
        font.family === this.fontFamily
      );

      if (isRegistered) {

        this.initialized = true;
        return true;
      } else {
        console.warn('⚠ Font verification failed, using fallback fonts');
        return false;
      }

    } catch (error) {
      console.error('Font initialization error:', error);
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
    return GlobalFonts.families.map(font => font.family);
  }
}


export const fontManager = new FontManager();


export async function setSafeFont(ctx, size) {
  await fontManager.setFont(ctx, size);
}

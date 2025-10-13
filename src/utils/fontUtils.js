import { GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let fontInitialized = false;
const FONT_NAME = 'Alkia';
const FAMILY_FONT_NAME = 'Tellural-Alt';


function initFont() {
  if (fontInitialized) return;

  try {

    const fontPath = path.join(__dirname, '..', '..', 'Alkia.ttf');
    if (fs.existsSync(fontPath)) {
      GlobalFonts.registerFromPath(fontPath, FONT_NAME);

    } else {
      console.warn('⚠ Alkia font file not found');
    }


    const familyFontPath = path.join(__dirname, '..', '..', 'Tellural-Alt.ttf');
    if (fs.existsSync(familyFontPath)) {
      GlobalFonts.registerFromPath(familyFontPath, FAMILY_FONT_NAME);

    } else {
      console.warn('⚠ Tellural-Alt font file not found');
    }
    
    fontInitialized = true;
  } catch (error) {
    console.error('❌ Font registration failed:', error.message);
  }
}


initFont();


export const initFonts = initFont;


export function setFont(ctx, size, backgroundId = null, isFamily = false) {
  let fontName = FONT_NAME;
  

  if (isFamily) {
    fontName = FAMILY_FONT_NAME;
  }
  

  ctx.font = `${size}px "${fontName}", "Arial", "Helvetica", sans-serif`;
}


export function isFontAvailable() {
  try {
    const fonts = GlobalFonts.families;
    return fonts.some(font => font.family === FONT_NAME);
  } catch (error) {
    return false;
  }
}


export function getFontString(size, backgroundId = null) {
  let fontName = FONT_NAME;
  
  return `${size}px "${fontName}", "Arial", "Helvetica", sans-serif`;
}


export const setSafeFont = setFont;

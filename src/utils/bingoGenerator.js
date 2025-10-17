import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BINGO_FOLDER = path.join(__dirname, '../bingo');
const CELL_SIZE = 200; 
const GRID_SIZE = 5;
const CANVAS_WIDTH = CELL_SIZE * GRID_SIZE;
const CANVAS_HEIGHT = CELL_SIZE * GRID_SIZE;
const BORDER_WIDTH = 3; 

export const getAllBingoPonies = async () => {
  try {
    const files = await fs.readdir(BINGO_FOLDER);
    return files
      .filter(file => file.match(/\.(png|jpg|jpeg)$/i))
      .map(file => path.parse(file).name);
  } catch (error) {
    console.error('Error reading bingo folder:', error);
    return [];
  }
};

export const generateRandomBingoGrid = async () => {
  const allPonies = await getAllBingoPonies();
  
  if (allPonies.length < 25) {
    throw new Error('Not enough pony images in bingo folder (need at least 25)');
  }
  
  const shuffled = [...allPonies].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 25);
};

export const createBingoImage = async (gridData, completedPositions = []) => {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#F4A460'; 
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const position = row * GRID_SIZE + col;
      const ponyName = gridData[position];
      const isCompleted = completedPositions.includes(position);
      
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = BORDER_WIDTH;
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      
      try {
        const imagePath = await findPonyImage(ponyName);
        if (imagePath) {
          const image = await loadImage(imagePath);
          
          const scale = Math.min(
            (CELL_SIZE - 10) / image.width,
            (CELL_SIZE - 10) / image.height
          );
          const scaledWidth = image.width * scale;
          const scaledHeight = image.height * scale;
          const offsetX = (CELL_SIZE - scaledWidth) / 2;
          const offsetY = (CELL_SIZE - scaledHeight) / 2;
          
          ctx.drawImage(
            image,
            x + offsetX,
            y + offsetY,
            scaledWidth,
            scaledHeight
          );
          
          if (isCompleted) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 8; 
            ctx.beginPath();
            ctx.moveTo(x + 10, y + 10);
            ctx.lineTo(x + CELL_SIZE - 10, y + CELL_SIZE - 10);
            ctx.stroke();
          }
        }
      } catch (error) {
        console.error(`Error loading image for ${ponyName}:`, error);

        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(x + 5, y + 5, CELL_SIZE - 10, CELL_SIZE - 10);
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ponyName, x + CELL_SIZE/2, y + CELL_SIZE/2);
      }
    }
  }
  
  return canvas.toBuffer('image/png');
};

const findPonyImage = async (ponyName) => {
  const extensions = ['.png', '.jpg', '.jpeg'];
  
  for (const ext of extensions) {
    const imagePath = path.join(BINGO_FOLDER, ponyName + ext);
    try {
      await fs.access(imagePath);
      return imagePath;
    } catch {
      continue;
    }
  }
  
  return null;
};

export const createBingoImageWithHeader = async (gridData, completedPositions = []) => {
  const gridBuffer = await createBingoImage(gridData, completedPositions);
  const gridImage = await loadImage(gridBuffer);
  
  const headerHeight = 50;
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT + headerHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#F4A460';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT + headerHeight);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 50px Arial';
  ctx.textAlign = 'center';
  const letters = ['B', 'I', 'N', 'G', 'O'];
  for (let i = 0; i < letters.length; i++) {
    const x = (i + 0.5) * CELL_SIZE;
    const y = 40;
    ctx.fillText(letters[i], x, y);
  }

  ctx.drawImage(gridImage, 0, headerHeight);
  
  return canvas.toBuffer('image/png');
};
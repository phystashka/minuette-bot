import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ClanMapRenderer {
  constructor() {
    this.mapImagePath = path.join(__dirname, '..', 'clanmap', 'map.jpeg');
    this.width = 1001;
    this.height = 406;
  }

  async renderClanMap(clanName, currentLevel, experience) {
    try {
      try {
        await fs.access(this.mapImagePath);
      } catch (error) {
        console.log('Map image not found, creating placeholder...');
        return await this.createPlaceholderMap(clanName, currentLevel, experience);
      }

      const canvas = createCanvas(this.width, this.height);
      const ctx = canvas.getContext('2d');

      const mapImage = await loadImage(this.mapImagePath);
      
      ctx.drawImage(mapImage, 0, 0, this.width, this.height);

      await this.drawPath(ctx, currentLevel);

      await this.drawClanPosition(ctx, clanName, currentLevel, experience);

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error rendering clan map:', error);
      return await this.createPlaceholderMap(clanName, currentLevel, experience);
    }
  }

  async drawPath(ctx, currentLevel) {
    const pathPoints = this.generatePathPoints();
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = 6;
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
      ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    ctx.stroke();
    
    ctx.setLineDash([]);

    for (let i = 0; i < pathPoints.length; i++) {
      const level = i + 1;
      const point = pathPoints[i];
      
      const isCurrentLevel = level === currentLevel;
      const radius = 10;
      
      if (level < currentLevel) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#7F8C8D';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (level === currentLevel) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#95A5A6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = level === currentLevel ? '#E74C3C' : (level < currentLevel ? '#2C3E50' : '#34495E');
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillText(level.toString(), point.x, point.y);
    }
  }

  generatePathPoints() {
    const points = [];
    const margin = 50;
    const usableWidth = this.width - 2 * margin;
    const usableHeight = this.height - 2 * margin;
    
    for (let i = 0; i < 13; i++) {
      const progress = i / 12;
      
      let x = margin + (usableWidth * progress);
      let y = margin + (usableHeight * progress);
      
      const waveFrequency = 3;
      const waveAmplitude = 30;
      x += Math.sin(progress * Math.PI * waveFrequency) * waveAmplitude;
      y += Math.cos(progress * Math.PI * waveFrequency) * waveAmplitude * 0.3;
      
      x = Math.max(margin, Math.min(this.width - margin, x));
      y = Math.max(margin, Math.min(this.height - margin, y));
      
      points.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    return points;
  }

  async drawClanPosition(ctx, clanName, currentLevel, experience) {
    
    /* Закомментированный код таблички:
    const pathPoints = this.generatePathPoints();
    const currentPoint = pathPoints[Math.min(currentLevel - 1, pathPoints.length - 1)];
    
    const flagWidth = 80;
    const flagHeight = 25;
    const flagX = currentPoint.x + 15;
    const flagY = currentPoint.y - 35;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 1;
    
    ctx.fillRect(flagX, flagY, flagWidth, flagHeight);
    ctx.strokeRect(flagX, flagY, flagWidth, flagHeight);
    
    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    ctx.beginPath();
    ctx.moveTo(currentPoint.x, currentPoint.y);
    ctx.lineTo(flagX, flagY + flagHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#2C3E50';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let displayName = clanName;
    if (displayName.length > 12) {
      displayName = displayName.substring(0, 11) + '...';
    }
    ctx.fillText(displayName, flagX + flagWidth / 2, flagY + flagHeight / 2 - 3);
    
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '7px Arial';
    ctx.fillText(`Level ${currentLevel}`, flagX + flagWidth / 2, flagY + flagHeight / 2 + 6);
    */
  }

  async createPlaceholderMap(clanName, currentLevel, experience) {
    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#F4E4BC');
    gradient.addColorStop(0.3, '#E6D3A3');
    gradient.addColorStop(0.6, '#D2B48C');
    gradient.addColorStop(0.8, '#DEB887');
    gradient.addColorStop(1, '#CD853F');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 30 + 10;
      
      ctx.fillStyle = `rgba(139, 69, 19, ${0.05 + Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, this.width - 20, this.height - 20);
    
    ctx.strokeStyle = '#A0522D';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, this.width - 30, this.height - 30);
    
    ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.4);
    for (let x = 0; x < this.width; x += 30) {
      const y = this.height * 0.4 + Math.sin(x * 0.01) * 40 + Math.cos(x * 0.005) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();
    
    await this.drawPath(ctx, currentLevel);
    await this.drawClanPosition(ctx, clanName, currentLevel, experience);
    
    const scrollGradient = ctx.createLinearGradient(0, 0, 0, 70);
    scrollGradient.addColorStop(0, '#F4E4BC');
    scrollGradient.addColorStop(0.5, '#E6D3A3');
    scrollGradient.addColorStop(1, '#D2B48C');
    
    ctx.fillStyle = scrollGradient;
    ctx.fillRect(50, 10, this.width - 100, 50);
    
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 10, this.width - 100, 50);
    
    ctx.fillStyle = '#8B4513';
    ctx.font = 'bold 20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚓ ${clanName} - Treasure Map ⚓`, this.width / 2, 35);
    
    return canvas.toBuffer('image/png');
  }

  drawCloud(ctx, x, y) {
    const gradient = ctx.createRadialGradient(x + 25, y, 0, x + 25, y, 50);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.arc(x + 22, y, 22, 0, Math.PI * 2);
    ctx.arc(x + 45, y, 18, 0, Math.PI * 2);
    ctx.arc(x + 22, y - 12, 14, 0, Math.PI * 2);
    ctx.arc(x + 35, y - 8, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default ClanMapRenderer;
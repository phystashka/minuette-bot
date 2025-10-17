const bingoImageCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; 

export const getBingoImageFromCache = (userId, gridData, completedPositions) => {
  const cacheKey = generateCacheKey(userId, gridData, completedPositions);
  const cached = bingoImageCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.imageBuffer;
  }
  
  return null;
};

export const setBingoImageCache = (userId, gridData, completedPositions, imageBuffer) => {
  const cacheKey = generateCacheKey(userId, gridData, completedPositions);
  bingoImageCache.set(cacheKey, {
    imageBuffer,
    timestamp: Date.now()
  });

  if (bingoImageCache.size % 50 === 0) {
    cleanExpiredCache();
  }
};

export const invalidateBingoCache = (userId) => {
  for (const [key] of bingoImageCache) {
    if (key.startsWith(`${userId}_`)) {
      bingoImageCache.delete(key);
    }
  }
};

const generateCacheKey = (userId, gridData, completedPositions) => {
  const gridHash = JSON.stringify(gridData);
  const completedHash = JSON.stringify(completedPositions.sort());
  return `${userId}_${Buffer.from(gridHash).toString('base64').substring(0, 10)}_${Buffer.from(completedHash).toString('base64').substring(0, 10)}`;
};

const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of bingoImageCache) {
    if (now - value.timestamp >= CACHE_TTL) {
      bingoImageCache.delete(key);
    }
  }
};

export const clearAllBingoCache = () => {
  bingoImageCache.clear();
};
import fs from 'fs';
const MAP_PATH = './temp_pony_images/dm_map.json';

export function loadDMMap() {
  try {
    if (fs.existsSync(MAP_PATH)) {
      const raw = fs.readFileSync(MAP_PATH, 'utf8');
      return new Map(JSON.parse(raw));
    }
  } catch {}
  return new Map();
}

export function saveDMMap(map) {
  try {
    fs.writeFileSync(MAP_PATH, JSON.stringify(Array.from(map.entries())), 'utf8');
  } catch {}
}

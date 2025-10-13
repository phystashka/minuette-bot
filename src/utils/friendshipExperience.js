export function getRequiredExperience(level) {
  if (level <= 1) return 0;
  return Math.ceil(50 * Math.pow(level, 1.2));
}


export function getTotalExperienceForLevel(level) {
  let totalExp = 0;
  for (let i = 2; i <= level; i++) {
    totalExp += getRequiredExperience(i);
  }
  return totalExp;
}

export function calculateLevelFromExperience(totalExp) {
  if (totalExp < 0) return { level: 1, currentExp: 0, expToNext: getRequiredExperience(2), progress: 0 };
  
  let currentLevel = 1;
  let expUsed = 0;
  

  while (currentLevel < 100) {
    const expNeeded = getRequiredExperience(currentLevel + 1);
    if (expUsed + expNeeded > totalExp) {
      break;
    }
    expUsed += expNeeded;
    currentLevel++;
  }
  

  const currentLevelExp = totalExp - expUsed;
  const expToNext = currentLevel >= 100 ? 0 : getRequiredExperience(currentLevel + 1);
  const progress = expToNext > 0 ? (currentLevelExp / expToNext) * 100 : 100;
  
  return {
    level: currentLevel,
    currentExp: currentLevelExp,
    expToNext: expToNext,
    progress: Math.min(progress, 100)
  };
}


export function addExperience(currentTotalExp, expToAdd = 1) {
  const oldStats = calculateLevelFromExperience(currentTotalExp);
  const newTotalExp = currentTotalExp + expToAdd;
  const newStats = calculateLevelFromExperience(newTotalExp);
  
  return {
    oldLevel: oldStats.level,
    newLevel: newStats.level,
    newTotalExp: newTotalExp,
    leveledUp: newStats.level > oldStats.level,
    ...newStats
  };
}


export function validateExperience(experience) {
  const exp = parseInt(experience) || 0;
  return Math.max(0, exp);
}



export const LEVEL_MILESTONES = {
  2: 119,
  3: 182,
  6: 360,
  11: 690,
  21: 1287,
  31: 1943,
  41: 2640,
  51: 3371,
  61: 4131,
  71: 4916,
  81: 5724,
  91: 6551,
  100: 7323
};


export function getExperienceInfo() {
  return {
    expPerMessage: "15+ (depends on rebirth level)",
    maxLevel: 100,
    totalExpForMaxLevel: getTotalExperienceForLevel(100),
    cutieMark: 30,
    description: "Ponies gain experience per message based on rebirth bonuses. Higher rebirth = more exp but also higher level requirements."
  };
}
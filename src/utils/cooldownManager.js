import { ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';

const userCooldowns = new Map();


const DEFAULT_COOLDOWN = 10 * 1000;


export function checkCooldown(userId, commandName, customCooldown = DEFAULT_COOLDOWN) {
  const now = Date.now();
  
  if (!userCooldowns.has(userId)) {
    return { canUse: true, timeLeft: 0 };
  }
  
  const userCommands = userCooldowns.get(userId);
  
  if (!userCommands[commandName]) {
    return { canUse: true, timeLeft: 0 };
  }
  
  const lastUsed = userCommands[commandName];
  const timeLeft = (lastUsed + customCooldown) - now;
  
  if (timeLeft <= 0) {
    return { canUse: true, timeLeft: 0 };
  }
  
  return { canUse: false, timeLeft };
}


export function setCooldown(userId, commandName) {
  const now = Date.now();
  
  if (!userCooldowns.has(userId)) {
    userCooldowns.set(userId, {});
  }
  
  const userCommands = userCooldowns.get(userId);
  userCommands[commandName] = now;
}


export function createCooldownContainer(timeLeft) {
  const secondsLeft = Math.ceil(timeLeft / 1000);
  
  const cooldownText = new TextDisplayBuilder()
    .setContent(`**⏰ Wait a bit!**\n\nPlease wait **${secondsLeft} seconds** before using the next command.`);
  
  const container = new ContainerBuilder()
    .addTextDisplayComponents(cooldownText);
  
  return container;
}


export function cleanupCooldowns() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  
  for (const [userId, userCommands] of userCooldowns.entries()) {
    let hasValidCooldowns = false;
    
    for (const [commandName, timestamp] of Object.entries(userCommands)) {

      if (now - timestamp > maxAge) {
        delete userCommands[commandName];
      } else {
        hasValidCooldowns = true;
      }
    }
    

    if (!hasValidCooldowns) {
      userCooldowns.delete(userId);
    }
  }
}


setInterval(cleanupCooldowns, 30 * 60 * 1000);

export default {
  checkCooldown,
  setCooldown,
  createCooldownContainer,
  cleanupCooldowns,
  DEFAULT_COOLDOWN
};
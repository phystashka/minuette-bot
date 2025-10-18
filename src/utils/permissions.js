
import { config } from '../config/config.js';


export function isAllowedTester(userId) {
  return config.allowedTesters.includes(userId);
}


export function isOwner(userId) {
  return userId === config.ownerId;
}


export function canUseTesting(userId) {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return isAllowedTester(userId);
}
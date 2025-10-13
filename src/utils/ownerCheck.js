import { createEmbed } from './components.js';

export function isOwner(userId) {
  return userId === process.env.OWNER_ID;
}

export function createUnauthorizedEmbed() {
  return createEmbed({
    title: 'Access Denied - Tick Tock!',
    description: "Oh my! I can't let you wind that clock! Only my owner has the special key for these timepieces! *adjusts glasses nervously*",
    color: 'error'
  });
} 
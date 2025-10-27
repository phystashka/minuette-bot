/**
 * Message triggers system for automatic bot responses
 * Handles special keyword triggers and command redirects
 */

export const triggers = [
  {
    // Command redirect: /venture -> /adventure
    trigger: '/venture',
    response: 'Looking for the `/venture` command? It has been renamed to `/adventure`',
    exactMatch: true,
    caseSensitive: false
  },
  // Add more triggers here as needed
  // Example:
  // {
  //   trigger: 'hello bot',
  //   response: 'Hello there! 👋',
  //   exactMatch: false,
  //   caseSensitive: false
  // }
];

/**
 * Check if a message matches any triggers and return appropriate response
 * @param {string} messageContent - The message content to check
 * @returns {string|null} - Response message or null if no trigger matches
 */
export function checkMessageTriggers(messageContent) {
  if (!messageContent || typeof messageContent !== 'string') {
    return null;
  }

  const content = messageContent.trim();
  
  for (const trigger of triggers) {
    let matches = false;
    
    if (trigger.exactMatch) {
      // Exact match comparison
      const triggerText = trigger.caseSensitive ? trigger.trigger : trigger.trigger.toLowerCase();
      const messageText = trigger.caseSensitive ? content : content.toLowerCase();
      matches = messageText === triggerText;
    } else {
      // Partial match (contains)
      const triggerText = trigger.caseSensitive ? trigger.trigger : trigger.trigger.toLowerCase();
      const messageText = trigger.caseSensitive ? content : content.toLowerCase();
      matches = messageText.includes(triggerText);
    }
    
    if (matches) {
      return trigger.response;
    }
  }
  
  return null;
}

/**
 * Add a new trigger to the system
 * @param {Object} newTrigger - Trigger object with trigger, response, exactMatch, caseSensitive properties
 */
export function addTrigger(newTrigger) {
  if (!newTrigger.trigger || !newTrigger.response) {
    throw new Error('Trigger must have both trigger and response properties');
  }
  
  // Set default values
  newTrigger.exactMatch = newTrigger.exactMatch !== undefined ? newTrigger.exactMatch : false;
  newTrigger.caseSensitive = newTrigger.caseSensitive !== undefined ? newTrigger.caseSensitive : false;
  
  triggers.push(newTrigger);
}

/**
 * Remove a trigger by its trigger text
 * @param {string} triggerText - The trigger text to remove
 * @returns {boolean} - True if trigger was found and removed
 */
export function removeTrigger(triggerText) {
  const index = triggers.findIndex(t => t.trigger === triggerText);
  if (index !== -1) {
    triggers.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Get all current triggers
 * @returns {Array} - Array of all triggers
 */
export function getAllTriggers() {
  return [...triggers]; // Return a copy to prevent external modification
}
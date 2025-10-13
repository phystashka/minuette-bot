


export function clearUserProfileCache(userId) {
  if (global.imageCache) {
    const keysToDelete = [];
    for (const [key, value] of global.imageCache.entries()) {
      try {
        const data = JSON.parse(Buffer.from(key, 'base64').toString());
        if (data.userId === userId) {
          keysToDelete.push(key);
        }
      } catch (error) {

      }
    }
    keysToDelete.forEach(key => global.imageCache.delete(key));
    console.log(`Cleared ${keysToDelete.length} profile cache entries for user ${userId}`);
  }
}


export function clearMultipleUsersProfileCache(userIds) {
  if (Array.isArray(userIds)) {
    userIds.forEach(userId => clearUserProfileCache(userId));
  }
}
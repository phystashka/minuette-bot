/**
 * Получает guild ID с учетом исключений для специальных пользователей
 * @param {Object} interaction - Discord interaction объект
 * @returns {string|null} Guild ID или null для исключенных пользователей
 */
export function getGuildId(interaction) {
  const EXEMPT_USERS = ['1372601851781972038'];
  
  if (EXEMPT_USERS.includes(interaction.user.id)) {
    return null;
  }
  
  return interaction.guild?.id;
}

/**
 * Проверяет, является ли пользователь исключением из проверки guild
 * @param {string} userId - ID пользователя
 * @returns {boolean} True если пользователь исключение
 */
export function isGuildExempt(userId) {
  const EXEMPT_USERS = ['1372601851781972038'];
  return EXEMPT_USERS.includes(userId);
}

import { t } from './localization.js';
export const errors = {
  COMMAND_ERROR: async (guildId) => await t('validator.command_error', guildId),
  PERMISSION_ERROR: async (guildId) => await t('validator.permission_error', guildId),
  USER_INPUT_ERROR: async (guildId) => await t('validator.user_input_error', guildId),
  MISSING_ARGS: async (guildId) => await t('validator.missing_args', guildId),
  API_ERROR: async (guildId) => await t('validator.api_error', guildId),
  DATABASE_ERROR: async (guildId) => await t('validator.database_error', guildId),
  COOLDOWN_ERROR: async (guildId) => await t('validator.cooldown_error', guildId),
  USER_NOT_FOUND: async (guildId) => await t('validator.user_not_found', guildId),
  CANNOT_MODERATE: async (guildId) => await t('validator.cannot_moderate', guildId),
  SELF_MODERATE: async (guildId) => await t('validator.self_moderate', guildId),
  BOT_MODERATE: async (guildId) => await t('validator.bot_moderate', guildId),
  NOT_TIMED_OUT: async (guildId) => await t('validator.not_timed_out', guildId),
  ALREADY_BANNED: async (guildId) => await t('validator.already_banned', guildId),
  NOT_ORIGINAL_USER: async (guildId) => await t('validator.not_original_user', guildId),
  NSFW_CONTENT: async (guildId) => await t('validator.nsfw_content', guildId),
  NSFW_CHANNEL_REQUIRED: async (guildId) => await t('validator.nsfw_channel_required', guildId)
};

export const permissions = {
  ADMIN: "Administrator",
  MANAGE_SERVER: "ManageGuild",
  MANAGE_CHANNELS: "ManageChannels",
  MANAGE_MESSAGES: "ManageMessages",
  MANAGE_ROLES: "ManageRoles",
  KICK_MEMBERS: "KickMembers",
  BAN_MEMBERS: "BanMembers",
  MODERATE_MEMBERS: "ModerateMembers"
};

export const checks = {
  hasPermission: (member, permission) => member.permissions.has(permission),
  isOwner: (userId, ownerId) => userId === ownerId,
  isValidUrl: (string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  },
  isInVoiceChannel: (member) => member.voice.channel !== null,
  isInSameVoiceChannel: (member, botMember) => member.voice.channelId === botMember.voice.channelId,
  isPositiveNumber: (number) => !isNaN(number) && number > 0,
  
  isMemberModeratable: (member) => member.moderatable,
  isSelf: (memberId, userId) => memberId === userId,
  isBot: (memberId, botId) => memberId === botId,
  isTimedOut: (member) => member.communicationDisabledUntil && member.communicationDisabledUntil > new Date(),
  isOriginalUser: (interactionUserId, originalUserId) => interactionUserId === originalUserId,
  
  isNsfwChannel: (channel) => channel && channel.nsfw === true
};

export const moderation = {
  canBanMember: async (interaction, targetMember, guildId) => {
    if (!targetMember) {
      return { 
        result: false, 
        error: await errors.USER_NOT_FOUND(guildId)
      };
    }
    
    if (!targetMember.bannable) {
      return { 
        result: false, 
        error: await errors.CANNOT_MODERATE(guildId)
      };
    }
    
    if (targetMember.id === interaction.user.id) {
      return { 
        result: false, 
        error: await errors.SELF_MODERATE(guildId)
      };
    }
    
    if (targetMember.id === interaction.client.user.id) {
      return { 
        result: false, 
        error: await errors.BOT_MODERATE(guildId)
      };
    }
    
    return { result: true };
  },

  canTimeoutMember: async (interaction, targetMember, guildId) => {
    if (!targetMember) {
      return { 
        result: false, 
        error: await errors.USER_NOT_FOUND(guildId)
      };
    }
    
    if (!targetMember.moderatable) {
      return { 
        result: false, 
        error: await errors.CANNOT_MODERATE(guildId)
      };
    }
    
    if (targetMember.id === interaction.user.id) {
      return { 
        result: false, 
        error: await errors.SELF_MODERATE(guildId)
      };
    }
    
    if (targetMember.id === interaction.client.user.id) {
      return { 
        result: false, 
        error: await errors.BOT_MODERATE(guildId)
      };
    }
    
    return { result: true };
  },
  
  canRemoveTimeout: async (interaction, targetMember, guildId) => {
    if (!targetMember) {
      return { 
        result: false, 
        error: await errors.USER_NOT_FOUND(guildId)
      };
    }
    
    if (!targetMember.moderatable) {
      return { 
        result: false, 
        error: await errors.CANNOT_MODERATE(guildId)
      };
    }
    
    if (!targetMember.communicationDisabledUntil) {
      return { 
        result: false, 
        error: await errors.NOT_TIMED_OUT(guildId)
      };
    }
    
    return { result: true };
  },
  
  canWarnMember: async (interaction, targetMember, guildId) => {
    if (!targetMember) {
      return { 
        result: false, 
        error: await errors.USER_NOT_FOUND(guildId)
      };
    }
    
    if (targetMember.id === interaction.user.id) {
      return { 
        result: false, 
        error: await errors.SELF_MODERATE(guildId)
      };
    }
    
    if (targetMember.id === interaction.client.user.id) {
      return { 
        result: false, 
        error: await errors.BOT_MODERATE(guildId)
      };
    }
    
    return { result: true };
  },
  
  parseDuration: (duration) => {
    const value = duration.slice(0, -1);
    const unit = duration.slice(-1);
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000; 
    }
  },

  formatDuration: async (ms, guildId) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ${days > 1 ? 'days' : 'day'}`;
    }
    if (hours > 0) {
      return `${hours} ${hours > 1 ? 'hours' : 'hour'}`;
    }
    if (minutes > 0) {
      return `${minutes} ${minutes > 1 ? 'minutes' : 'minute'}`;
    }
    return `${seconds} ${seconds > 1 ? 'seconds' : 'second'}`;
  },

  getTimeLeft: (endTime) => {
    const now = new Date();
    
    const endTimeMs = endTime instanceof Date ? endTime.getTime() : Number(endTime);
    
    const diff = endTimeMs - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
  }
};

export const responses = {
  greetings: async (guildId) => [
    await t('response.greetings.1', guildId),
    await t('response.greetings.2', guildId),
    await t('response.greetings.3', guildId),
    await t('response.greetings.4', guildId),
    await t('response.greetings.5', guildId)
  ],
  farewells: async (guildId) => [
    await t('response.farewells.1', guildId),
    await t('response.farewells.2', guildId),
    await t('response.farewells.3', guildId),
    await t('response.farewells.4', guildId),
    await t('response.farewells.5', guildId)
  ],
  confused: async (guildId) => [
    await t('response.confused.1', guildId),
    await t('response.confused.2', guildId),
    await t('response.confused.3', guildId),
    await t('response.confused.4', guildId),
    await t('response.confused.5', guildId)
  ]
}; 
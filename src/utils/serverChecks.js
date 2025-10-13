
import { PermissionsBitField } from 'discord.js';
import { t } from './localization.js';

export const setupTexts = {
  welcome: async (guildId) => await t('setup.welcome', guildId),
  
  everyoneChecks: {
    title: async (guildId) => await t('setup.everyone_checks_title', guildId),
    description: async (guildId) => await t('setup.everyone_checks_description', guildId),
    loading: async (guildId) => await t('setup.everyone_checks_loading', guildId),
    success: async (guildId) => await t('setup.everyone_checks_success', guildId),
    noIssues: async (guildId) => await t('setup.everyone_checks_no_issues', guildId),
    fixed: async (guildId) => await t('setup.everyone_checks_fixed', guildId),
    cantFix: async (guildId) => await t('setup.everyone_checks_cant_fix', guildId)
  },
  
  permissionChecks: {
    title: async (guildId) => await t('setup.permission_checks_title', guildId),
    description: async (guildId) => await t('setup.permission_checks_description', guildId),
    loading: async (guildId) => await t('setup.permission_checks_loading', guildId),
    success: async (guildId) => await t('setup.permission_checks_success', guildId),
    safe: async (guildId) => await t('setup.permission_checks_safe', guildId),
    summary: async (guildId) => await t('setup.permission_checks_summary', guildId)
  }
};

export const permissionRiskLevels = {
  high: [
    PermissionsBitField.Flags.Administrator,
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.ManageWebhooks,
    PermissionsBitField.Flags.ManageChannels
  ],
  medium: [
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.ManageThreads,
    PermissionsBitField.Flags.ManageEmojisAndStickers,
    PermissionsBitField.Flags.ManageNicknames,
    PermissionsBitField.Flags.MentionEveryone
  ],
  low: [
    PermissionsBitField.Flags.MuteMembers,
    PermissionsBitField.Flags.DeafenMembers,
    PermissionsBitField.Flags.MoveMembers,
    PermissionsBitField.Flags.ManageEvents
  ]
};

export const checkEveryoneMentionPermissions = (guild) => {
  const roles = guild.roles.cache.filter(role => 
    !role.managed && 
    (role.permissions.has(PermissionsBitField.Flags.MentionEveryone) && 
     !role.permissions.has(PermissionsBitField.Flags.Administrator) || 
     role.permissions.has(PermissionsBitField.Flags.MentionEveryone, false))
  );
  
  return {
    hasIssues: roles.size > 0,
    roles: roles.map(role => ({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      mentionable: role.mentionable,
      position: role.position,
      isEveryone: role.id === guild.id
    }))
  };
};

export const fixEveryoneMentionPermissions = async (guild) => {
  const result = checkEveryoneMentionPermissions(guild);
  
  if (!result.hasIssues) return { success: true, fixed: 0 };
  
  const botMember = guild.members.cache.get(guild.client.user.id);
  
  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return { success: false, reason: "MISSING_PERMISSIONS" };
  }
  
  let fixed = 0;
  let cantFix = 0;
  
  for (const roleData of result.roles) {
    const role = guild.roles.cache.get(roleData.id);
    
    if (!role) continue;
    
    if (role.position >= botMember.roles.highest.position && role.id !== guild.id) {
      cantFix++;
      continue;
    }
    
    try {
      const newPermissions = new PermissionsBitField(role.permissions).remove(PermissionsBitField.Flags.MentionEveryone);
      await role.setPermissions(newPermissions);
      fixed++;
    } catch (error) {
      cantFix++;
      continue;
    }
  }
  
  return { 
    success: true, 
    fixed,
    cantFix,
    reason: cantFix > 0 ? "SOME_ROLES_TOO_HIGH" : null
  };
};

export const auditRolePermissions = (guild) => {
  const roles = guild.roles.cache.filter(role => !role.managed).sort((a, b) => b.position - a.position);
  const botMember = guild.members.cache.get(guild.client.user.id);
  const botHighestRole = botMember.roles.highest;
  
  const roleAudit = roles.map(role => {
    const permissions = role.permissions;
    
    if (permissions.has(PermissionsBitField.Flags.Administrator)) {
      return {
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        isHigherThanBot: role.position > botHighestRole.position,
        permissions: permissions.toArray(),
        highRiskPerms: [PermissionsBitField.Flags.Administrator],
        mediumRiskPerms: [],
        lowRiskPerms: [],
        riskLevel: "high",
        isAdmin: true,
        isEveryone: role.id === guild.id
      };
    }
    
    const highRiskPerms = permissionRiskLevels.high.filter(
      perm => permissions.has(perm, false)
    );
    
    const mediumRiskPerms = permissionRiskLevels.medium.filter(
      perm => permissions.has(perm, false)
    );
    
    const lowRiskPerms = permissionRiskLevels.low.filter(
      perm => permissions.has(perm, false)
    );
    
    let riskLevel = "none";
    if (highRiskPerms.length > 0) riskLevel = "high";
    else if (mediumRiskPerms.length > 0) riskLevel = "medium";
    else if (lowRiskPerms.length > 0) riskLevel = "low";
    
    return {
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position,
      isHigherThanBot: role.position > botHighestRole.position,
      permissions: permissions.toArray(),
      highRiskPerms,
      mediumRiskPerms,
      lowRiskPerms,
      riskLevel,
      isAdmin: false,
      isEveryone: role.id === guild.id,
      hasManageWebhooks: permissions.has(PermissionsBitField.Flags.ManageWebhooks, false)
    };
  });
  
  const summary = {
    total: roles.size,
    highRisk: roleAudit.filter(r => r.riskLevel === "high").length,
    mediumRisk: roleAudit.filter(r => r.riskLevel === "medium").length,
    lowRisk: roleAudit.filter(r => r.riskLevel === "low").length,
    noRisk: roleAudit.filter(r => r.riskLevel === "none").length,
    rolesHigherThanBot: roleAudit.filter(r => r.isHigherThanBot).length
  };
  
  return { roles: roleAudit, summary };
}; 
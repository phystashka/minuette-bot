import { 
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getPony, addBits, removeBits } from '../../utils/pony/index.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { addHarmony, removeHarmony } from '../../models/HarmonyModel.js';
import { t } from '../../utils/localization.js';
import { getGuildLanguage } from '../../models/GuildModel.js';
import { getProtectedBits } from './balance.js';

const COOLDOWN_TIME = 3 * 60 * 60 * 1000;
const BITS_PERCENTAGE = 0.15;

const userCooldowns = new Map();

async function getRandomMessage(key, guildId, placeholders = {}) {
  const guildLanguage = await getGuildLanguage(guildId);
  const messages = await import('../../utils/localization.js').then(m => m.translations[guildLanguage || 'en'][key] || m.translations['en'][key]);
  if (Array.isArray(messages)) {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    let result = randomMessage;
    for (const [placeholder, value] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(`{${placeholder}}`, 'g'), value);
    }
    return result;
  }
  return messages;
}

function createErrorContainer(title, description) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`❌ **${title}**`);
  container.addTextDisplayComponents(titleText);
  
  const descText = new TextDisplayBuilder()
    .setContent(description);
  container.addTextDisplayComponents(descText);
  
  return container;
}

function createCooldownContainer(title, description) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`⏰ **${title}**`);
  container.addTextDisplayComponents(titleText);
  
  const descText = new TextDisplayBuilder()
    .setContent(description);
  container.addTextDisplayComponents(descText);
  
  return container;
}

function createSuccessContainer(title, message, stealAmount) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`**${title}**`);
  container.addTextDisplayComponents(titleText);
  
  const descText = new TextDisplayBuilder()
    .setContent(message);
  container.addTextDisplayComponents(descText);
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const resultText = new TextDisplayBuilder()
    .setContent(`**+${stealAmount} bits** <:bits:1429131029628588153>\n<:harmony:1416514347789844541> **-10 harmony**`);
  container.addTextDisplayComponents(resultText);
  
  return container;
}


function createFailureContainer(title, message, penaltyAmount) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`**${title}**`);
  container.addTextDisplayComponents(titleText);
  
  const descText = new TextDisplayBuilder()
    .setContent(message);
  container.addTextDisplayComponents(descText);
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const resultText = new TextDisplayBuilder()
    .setContent(`**-${penaltyAmount} bits** <:bits:1429131029628588153>\n<:harmony:1416514347789844541> **-5 harmony**`);
  container.addTextDisplayComponents(resultText);
  
  return container;
}

export const data = new SlashCommandBuilder()
  .setName('crime')
  .setDescription('Try to steal bits from another player (50/50 chance)')
  .setDescriptionLocalizations({
    'ru': 'Попытайтесь украсть биты у другого игрока (шанс 50/50)'
  })
  .setDMPermission(false)
  .addUserOption(option =>
    option
      .setName('target')
      .setDescription('The member you want to steal bits from')
      .setDescriptionLocalizations({
        'ru': 'Игрок, у которого вы хотите украсть биты'
      })
      .setRequired(true)
  );

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const targetUser = interaction.options.getUser('target');
    const targetId = targetUser.id;
    const guildId = interaction.guild?.id;
    
    if (userId === targetId) {
      const container = createErrorContainer(
        await t('error.title', guildId),
        await t('crime.self_target', guildId)
      );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (userCooldowns.has(userId)) {
      const cooldownExpiration = userCooldowns.get(userId);
      const timeLeft = cooldownExpiration - Date.now();
      
      if (timeLeft > 0) {
        const hours = Math.ceil(timeLeft / 3600000);
        
        const container = createCooldownContainer(
          await t('crime.title', guildId),
          await t('crime.cooldown', guildId, { hours })
        );
        
        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
      }
    }
    
    const userPony = await getPony(userId);
    const targetPony = await getPony(targetId);

    if (!userPony) {
      const container = createErrorContainer(
        await t('equestria.no_pony_title', guildId),
        await t('equestria.no_pony_description', guildId)
      );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    if (!targetPony) {
      const container = createErrorContainer(
        await t('error.title', guildId),
        await t('crime.no_target_pony', guildId)
      );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (targetPony.bits <= 0) {
      const container = createErrorContainer(
        await t('error.title', guildId),
        await t('crime.no_target_bits', guildId, { target: targetUser.username })
      );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const protectedBits = getProtectedBits(targetId);
    if (protectedBits > 0) {
      const container = createErrorContainer(
        'Bits Protected',
        `🛡️ ${targetUser.username}'s bits are protected from theft! They recently withdrew money from the bank.`
      );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (userPony.bits <= 0) {
      const container = createErrorContainer(
        await t('error.title', guildId),
        await t('crime.no_user_bits', guildId)
      );
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    const stealAmount = Math.floor(targetPony.bits * BITS_PERCENTAGE);
    const penaltyAmount = Math.floor(userPony.bits * BITS_PERCENTAGE);
    
    const isSuccess = Math.random() < 0.5;

    if (isSuccess) {
      await addBits(userId, stealAmount);
      await removeBits(targetId, stealAmount);
      await removeHarmony(userId, 10, 'Successful crime');

      try {
        const { addQuestProgress } = await import('../../utils/questUtils.js');
        await addQuestProgress(userId, 'crime_success');
        await addQuestProgress(userId, 'earn_bits', stealAmount);
      } catch (questError) {
        console.debug('Quest progress error:', questError.message);
      }

      const successMessage = await getRandomMessage('crime.success_messages', guildId, {
        target: targetUser.username,
        amount: stealAmount
      });
      
      const container = createSuccessContainer(
        await t('crime.success', guildId),
        successMessage,
        stealAmount.toLocaleString()
      );
      
      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      await removeBits(userId, penaltyAmount);
      await removeHarmony(userId, 5, 'Failed crime attempt');
      
      const failMessage = await getRandomMessage('crime.fail_messages', guildId, {
        target: targetUser.username,
        amount: penaltyAmount
      });
      
      const container = createFailureContainer(
        await t('crime.failure', guildId),
        failMessage,
        penaltyAmount.toLocaleString()
      );
      
      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    userCooldowns.set(userId, Date.now() + COOLDOWN_TIME);
    
  } catch (error) {
    console.error('Error in crime command:', error);
    
    const container = createErrorContainer(
      await t('error.title', interaction.guild?.id),
      await t('error.generic', interaction.guild?.id)
    );
    
    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }
} 
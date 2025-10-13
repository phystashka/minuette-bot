import { 
  SlashCommandBuilder
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getPony, addBits, removeBits } from '../../utils/pony/index.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { addHarmony, removeHarmony } from '../../models/HarmonyModel.js';
import { t } from '../../utils/localization.js';
import { getGuildLanguage } from '../../models/GuildModel.js';

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
      .setDescription('The player you want to steal bits from')
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
      return interaction.reply({
        embeds: [
          createEmbed({
            title: await t('error.title', guildId),
            description: await t('crime.self_target', guildId),
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    }

    if (userCooldowns.has(userId)) {
      const cooldownExpiration = userCooldowns.get(userId);
      const timeLeft = cooldownExpiration - Date.now();
      
      if (timeLeft > 0) {
        const hours = Math.ceil(timeLeft / 3600000);
        
        return interaction.reply({
          embeds: [
            createEmbed({
              title: await t('crime.title', guildId),
              description: await t('crime.cooldown', guildId, { hours }),
              user: interaction.user
            })
          ],
          ephemeral: true
        });
      }
    }
    const userPony = await getPony(userId);
    const targetPony = await getPony(targetId);

    if (!userPony) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: await t('equestria.no_pony_title', guildId),
            description: await t('equestria.no_pony_description', guildId),
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    }
    
    if (!targetPony) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: await t('error.title', guildId),
            description: await t('crime.no_target_pony', guildId),
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    }

    if (targetPony.bits <= 0) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: await t('error.title', guildId),
            description: await t('crime.no_target_bits', guildId, { target: targetUser.username }),
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    }

    if (userPony.bits <= 0) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: await t('error.title', guildId),
            description: await t('crime.no_user_bits', guildId),
            user: interaction.user
          })
        ],
        ephemeral: true
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
      
      const successEmbed = createEmbed({
        title: await t('crime.success', guildId),
        description: `${successMessage}\n\n> **+${stealAmount} bits**\n> <:harmony:1416514347789844541> **-10 harmony**`,
        user: interaction.user
      });
      
      await interaction.reply({
        content: `${targetUser}`,
        embeds: [successEmbed]
      });
    } else {
      await removeBits(userId, penaltyAmount);
      
      await removeHarmony(userId, 5, 'Failed crime attempt');
      
      const failMessage = await getRandomMessage('crime.fail_messages', guildId, {
        target: targetUser.username,
        amount: penaltyAmount
      });
      
      const failEmbed = createEmbed({
        title: await t('crime.failure', guildId),
        description: `${failMessage}\n\n> **-${penaltyAmount} bits**\n> <:harmony:1416514347789844541> **-5 harmony**`,
        user: interaction.user
      });
      
      await interaction.reply({
        content: `${targetUser}`,
        embeds: [failEmbed]
      });
    }
    
    userCooldowns.set(userId, Date.now() + COOLDOWN_TIME);
    
  } catch (error) {
    console.error('Error in crime command:', error);
    
    return interaction.reply({
      embeds: [
        createEmbed({
          title: await t('error.title', interaction.guild?.id),
          description: await t('error.generic', interaction.guild?.id),
          user: interaction.user
        })
      ],
      ephemeral: true
    });
  }
} 
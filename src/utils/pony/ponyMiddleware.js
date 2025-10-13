import { getPony } from './ponyUtils.js';
import { createEmbed } from '../components.js';
import { t } from '../localization.js';

export async function requirePony(interaction, next) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;
    const pony = await getPony(userId);
    
    if (!pony) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: await t('equestria.no_pony_title', guildId),
            description: await t('equestria.no_pony_description', guildId),
            color: 0xED4245
          })
        ],
        ephemeral: true
      });
    }
    
    interaction.pony = pony;
    
    if (typeof next === 'function') {
      return next();
    }
    
    return true;
  } catch (error) {
    console.error('Error in pony middleware:', error);
    
    return interaction.reply({
      embeds: [
        createEmbed({
          title: '❌ Error',
          description: `An error occurred while checking your pony: ${error.message}`,
          color: 0xED4245
        })
      ],
      ephemeral: true
    });
  }
} 
import { getPony } from './ponyUtils.js';
import { createEmbed } from '../components.js';
import { t } from '../localization.js';
import { getGuildId } from '../guildUtils.js';
import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';

export function createNoPonyContainer(title, description) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent(`**${title}**`);
  container.addTextDisplayComponents(titleText);
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const descText = new TextDisplayBuilder()
    .setContent(description);
  container.addTextDisplayComponents(descText);
  
  const separator2 = new SeparatorBuilder();
  container.addSeparatorComponents(separator2);
  
  const guideText = new TextDisplayBuilder()
    .setContent('**🎯 How to get started:**\nUse `/equestria` to create your own pony and begin your magical journey in Equestria!');
  container.addTextDisplayComponents(guideText);
  
  return container;
}

export async function requirePony(interaction, next) {
  try {
    const userId = interaction.user.id;
    const guildId = getGuildId(interaction);
    const pony = await getPony(userId);
    
    if (!pony) {
      const title = await t('equestria.no_pony_title', guildId);
      const description = await t('equestria.no_pony_description', guildId);
      
      const cleanTitle = title.replace('❌ ', '');
      
      const container = createNoPonyContainer(cleanTitle, description);
      
      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
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
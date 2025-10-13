import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { setGuildLanguage, getGuildLanguage } from '../../models/GuildModel.js';

export const data = new SlashCommandBuilder()
  .setName('language')
  .setDescription('Change the bot language for this server')
  .setDescriptionLocalizations({
    'ru': 'Изменить язык бота для этого сервера'
  })
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName('lang')
      .setDescription('Select language')
      .setDescriptionLocalizations({
        'ru': 'Выберите язык'
      })
      .setRequired(true)
      .addChoices(
        { name: 'English', value: 'en' },
        { name: 'Русский', value: 'ru' }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  try {

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const embed = createEmbed({
        title: 'Language Settings',
        description: 'You need "Manage Server" permission to change the bot language.',
        color: 0x03168f,
        user: interaction.user
      });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const newLanguage = interaction.options.getString('lang');
    const guildId = interaction.guild.id;
    

    const currentLanguage = await getGuildLanguage(guildId);
    
    if (currentLanguage === newLanguage) {
      const messages = {
        en: `Language is already set to English.`,
        ru: `Язык уже установлен на русский.`
      };
      
      const embed = createEmbed({
        title: 'Language Settings',
        description: messages[newLanguage],
        color: 0x03168f,
        user: interaction.user
      });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    

    try {
      const success = await setGuildLanguage(guildId, newLanguage);
      
      if (success) {
        const messages = {
          en: `Bot language has been changed to English for this server.`,
          ru: `Язык бота изменен на русский для этого сервера.`
        };
        
        const embed = createEmbed({
          title: 'Language Settings',
          description: messages[newLanguage],
          color: 0x03168f,
          user: interaction.user
        });
        
        return interaction.reply({ embeds: [embed] });
      } else {
        console.error('setGuildLanguage returned false for guild:', guildId);
        const embed = createEmbed({
          title: 'Language Settings',
          description: 'An error occurred while changing the language.',
          color: 0xff0000,
          user: interaction.user
        });
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error('Error setting guild language:', error);
      const embed = createEmbed({
        title: 'Language Settings',
        description: `Error: ${error.message || 'Unknown error occurred'}`,
        color: 0xff0000,
        user: interaction.user
      });
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
  } catch (error) {
    console.error('Error in language command:', error);
    
    const embed = createEmbed({
      title: 'Language Settings',
      description: 'An error occurred while executing the command.',
      color: 0x03168f,
      user: interaction.user
    });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export const guildOnly = true;
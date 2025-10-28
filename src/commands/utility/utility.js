import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('utility')
  .setDescription('Utility commands for various helpful features')
  .setDMPermission(true)
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2])
  .addSubcommand(subcommand =>
    subcommand
      .setName('alerts')
      .setDescription('Manage notifications for specific pony spawns')
      .addStringOption(option =>
        option
          .setName('action')
          .setDescription('Action to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Add Alert', value: 'add' },
            { name: 'Remove Alert', value: 'remove' },
            { name: 'List Alerts', value: 'list' }
          )
      )
      .addStringOption(option =>
        option
          .setName('pony_name')
          .setDescription('Name of the pony (required for add/remove)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('derpibooru')
      .setDescription('Search for art on Derpibooru')
      .addStringOption(option =>
        option
          .setName('query')
          .setDescription('Tags for search (e.g., rainbow dash, fluttershy)')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Number of images to show (1-10)')
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('min_score')
          .setDescription('Minimum score for images')
          .setMinValue(0)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('manebooru')
      .setDescription('Search for art on Manebooru')
      .addStringOption(option =>
        option
          .setName('query')
          .setDescription('Tags for search (e.g., rainbow dash, fluttershy)')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Number of images to show (1-10)')
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('min_score')
          .setDescription('Minimum score for images')
          .setMinValue(0)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('danbooru')
      .setDescription('Search for art on Danbooru')
      .addStringOption(option =>
        option
          .setName('query')
          .setDescription('Tags for search (e.g., rainbow dash, fluttershy)')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Number of images to show (1-10)')
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('min_score')
          .setDescription('Minimum score for images')
          .setMinValue(0)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('furbooru')
      .setDescription('Search for art on Furbooru')
      .addStringOption(option =>
        option
          .setName('query')
          .setDescription('Tags for search (e.g., rainbow dash, fluttershy)')
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Number of images to show (1-10)')
          .setMinValue(1)
          .setMaxValue(10)
          .setRequired(false)
      )
      .addIntegerOption(option =>
        option
          .setName('min_score')
          .setDescription('Minimum score for images')
          .setMinValue(0)
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('filter')
      .setDescription('Apply various filters to an image!')
      .addStringOption(option =>
        option
          .setName('filter_type')
          .setDescription('Choose a filter to apply')
          .setRequired(true)
          .addChoices(
            { name: 'Blur', value: 'blur' },
            { name: 'Greyscale', value: 'greyscale' },
            { name: 'Sepia', value: 'sepia' },
            { name: 'Invert', value: 'invert' },
            { name: 'Triggered', value: 'triggered' },
            { name: 'Wasted', value: 'wasted' },
            { name: 'Jail', value: 'jail' },
            { name: 'Rainbow', value: 'rainbow' }
          )
      )
      .addAttachmentOption(option =>
        option
          .setName('image')
          .setDescription('Image to apply filter to')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('8ball')
      .setDescription('Ask the Magic 8-Ball of Harmony a question!')
      .addStringOption(option =>
        option
          .setName('question')
          .setDescription('Your question for the magic 8-ball')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('uwuify')
      .setDescription('Transform your text into cute uwu speak!')
      .addStringOption(option =>
        option
          .setName('text')
          .setDescription('Text to uwuify (supports Russian and English)')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('mane6quiz')
      .setDescription('Take a quiz about the Mane 6 characters!')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('ship')
      .setDescription('Ship two users and see their compatibility!')
      .addUserOption(option =>
        option
          .setName('user1')
          .setDescription('First user to ship')
          .setRequired(true)
      )
      .addUserOption(option =>
        option
          .setName('user2')
          .setDescription('Second user to ship')
          .setRequired(true)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  try {
    switch (subcommand) {
      case 'alerts':
        const { execute: alertsExecute } = await import('./utility_alerts.js');
        return await alertsExecute(interaction);
        
      case 'derpibooru':
        const { execute: derpibooruExecute } = await import('./utility_derpibooru.js');
        return await derpibooruExecute(interaction);
        
      case 'manebooru':
        const { execute: manebooruExecute } = await import('./utility_manebooru.js');
        return await manebooruExecute(interaction);
        
      case 'danbooru':
        const { execute: danbooruExecute } = await import('./utility_danbooru.js');
        return await danbooruExecute(interaction);
        
      case 'furbooru':
        const { execute: furbooruExecute } = await import('./utility_furbooru.js');
        return await furbooruExecute(interaction);
        
      case 'filter':
        const { execute: filterExecute } = await import('./utility_filter.js');
        return await filterExecute(interaction);
        
      case '8ball':
        const { execute: eightballExecute } = await import('./utility_8ball.js');
        return await eightballExecute(interaction);
        
      case 'uwuify':
        const { execute: uwuifyExecute } = await import('./utility_uwuify.js');
        return await uwuifyExecute(interaction);
        
      case 'mane6quiz':
        const { execute: mane6quizExecute } = await import('./utility_mane6quiz.js');
        return await mane6quizExecute(interaction);
        
      case 'ship':
        const { execute: shipExecute } = await import('./utility_ship.js');
        return await shipExecute(interaction);
        
      default:
        await interaction.reply({
          content: 'Unknown utility subcommand.',
          ephemeral: true
        });
    }
  } catch (error) {
    console.error(`Error executing utility subcommand ${subcommand}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while executing the utility command.',
        ephemeral: true
      });
    }
  }
}
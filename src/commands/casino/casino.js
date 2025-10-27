import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('casino')
  .setDescription('Casino games to test your luck')
  .setDMPermission(true)
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2])
  .addSubcommand(subcommand =>
    subcommand
      .setName('coinflip')
      .setDescription('Play coinflip with another player')
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Amount of chips to bet')
          .setRequired(true)
          .setMinValue(5)
          .setMaxValue(10000)
      )
      .addUserOption(option =>
        option
          .setName('opponent')
          .setDescription('Player to challenge')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('slots')
      .setDescription('Play slot machine')
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Amount of chips to bet')
          .setRequired(true)
          .setMinValue(15)
          .setMaxValue(10000)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('dice')
      .setDescription('Play dice betting game')
      .addIntegerOption(option =>
        option
          .setName('amount')
          .setDescription('Amount of chips to bet')
          .setRequired(true)
          .setMinValue(5)
          .setMaxValue(1000)
      )
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Bet type')
          .setRequired(true)
          .addChoices(
            { name: 'Over', value: 'over' },
            { name: 'Under', value: 'under' }
          )
      )
      .addIntegerOption(option =>
        option
          .setName('number')
          .setDescription('Number to bet on (1-100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  try {
    switch (subcommand) {
      case 'coinflip':
        const { execute: coinflipExecute } = await import('./casino_coinflip.js');
        return await coinflipExecute(interaction);
        
      case 'slots':
        const { execute: slotsExecute } = await import('./casino_slots.js');
        return await slotsExecute(interaction);
        
      case 'dice':
        const diceCommand = await import('./casino_dice.js');
        return await diceCommand.default.execute(interaction);
        
      default:
        await interaction.reply({
          content: 'Unknown casino game.',
          ephemeral: true
        });
    }
  } catch (error) {
    console.error(`Error executing casino subcommand ${subcommand}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while starting the casino game.',
        ephemeral: true
      });
    }
  }
}
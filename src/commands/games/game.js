import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('game')
  .setDescription('Play games with other users')
  .setDMPermission(true)
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2])
  .addSubcommand(subcommand =>
    subcommand
      .setName('rps')
      .setDescription('Challenge someone to a rock-paper-scissors game')
      .addUserOption(option =>
        option
          .setName('opponent')
          .setDescription('The user you want to challenge')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('bet')
          .setDescription('Amount of bits to bet')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(10000)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('tictactoe')
      .setDescription('Play Tic Tac Toe with another user')
      .addUserOption(option =>
        option
          .setName('opponent')
          .setDescription('User you want to play against')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('bet')
          .setDescription('Amount of bits to bet (optional)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(10000)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('connect4')
      .setDescription('Play Connect 4 with another user')
      .addUserOption(option =>
        option
          .setName('opponent')
          .setDescription('User you want to play against')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('bet')
          .setDescription('Amount of bits to bet (optional)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(10000)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  try {
    switch (subcommand) {
      case 'rps':
        const { execute: rpsExecute } = await import('./game_rps.js');
        return await rpsExecute(interaction);
        
      case 'tictactoe':
        const { execute: tictactoeExecute } = await import('./game_tictactoe.js');
        return await tictactoeExecute(interaction);
        
      case 'connect4':
        const { execute: connect4Execute } = await import('./game_connect4.js');
        return await connect4Execute(interaction);
        
      default:
        await interaction.reply({
          content: 'Unknown game.',
          ephemeral: true
        });
    }
  } catch (error) {
    console.error(`Error executing game subcommand ${subcommand}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while starting the game.',
        ephemeral: true
      });
    }
  }
}
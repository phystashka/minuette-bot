import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Event commands for seasonal activities')
  .setDMPermission(false)
  .addSubcommand(subcommand =>
    subcommand
      .setName('bloodmoon')
      .setDescription('Check the current Blood Moon event status')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('decorate')
      .setDescription('Decorate Ponyville for Nightmare Night!')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('knock')
      .setDescription('Knock on someone\'s door for Halloween trick-or-treat')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('User to knock on their door')
          .setRequired(true)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  try {
    switch (subcommand) {
      case 'bloodmoon':
        const { execute: bloodmoonExecute } = await import('./event_bloodmoon.js');
        return await bloodmoonExecute(interaction);
        
      case 'decorate':
        const { execute: decorateExecute } = await import('./event_decorate.js');
        return await decorateExecute(interaction);
        
      case 'knock':
        const { execute: knockExecute } = await import('./event_knock.js');
        return await knockExecute(interaction);
        
      default:
        await interaction.reply({
          content: 'Unknown event subcommand.',
          ephemeral: true
        });
    }
  } catch (error) {
    console.error(`Error executing event subcommand ${subcommand}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while executing the event command.',
        ephemeral: true
      });
    }
  }
}
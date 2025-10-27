import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('premium')
  .setDescription('Premium related commands')
  .setDMPermission(false)
  .addSubcommand(subcommand =>
    subcommand
      .setName('shop')
      .setDescription('Premium bundles shop - view exclusive content available for diamonds')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('emoji')
      .setDescription('Manage your custom emoji for leaderboards (Donators only)')
      .addStringOption(option =>
        option
          .setName('action')
          .setDescription('Action to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Set emoji', value: 'set' },
            { name: 'Remove emoji', value: 'remove' },
            { name: 'View current emoji', value: 'view' }
          )
      )
      .addStringOption(option =>
        option
          .setName('emoji')
          .setDescription('The emoji to set (required for set action)')
          .setRequired(false)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  try {
    switch (subcommand) {
      case 'shop':
        const { execute: shopExecute } = await import('./premium_shop.js');
        return await shopExecute(interaction);
        
      case 'emoji':
        const { executeEmoji } = await import('./premium_emoji.js');
        return await executeEmoji(interaction);
        
      default:
        await interaction.reply({
          content: 'Unknown subcommand.',
          ephemeral: true
        });
    }
  } catch (error) {
    console.error(`Error executing premium subcommand ${subcommand}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
  }
}
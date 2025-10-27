import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('card')
  .setDescription('Card related commands')
  .setDMPermission(true)
  .setIntegrationTypes([0, 1])
  .setContexts([0, 1, 2])
  .addSubcommand(subcommand =>
    subcommand
      .setName('album')
      .setDescription('View your card collection album')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User whose album to view')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('shop')
      .setDescription('Browse and purchase cards with Magic Coins')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('spark')
      .setDescription('Open card packs to collect rare cards')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  try {
    switch (subcommand) {
      case 'album':
        const { execute: albumExecute } = await import('./card_album.js');
        return await albumExecute(interaction);
        
      case 'shop':
        const { executeShop } = await import('./card_shop.js');
        return await executeShop(interaction);
        
      case 'spark':
        const { execute: sparkExecute } = await import('./card_spark.js');
        return await sparkExecute(interaction);
        
      default:
        await interaction.reply({
          content: 'Unknown subcommand.',
          ephemeral: true
        });
    }
  } catch (error) {
    console.error(`Error executing card subcommand ${subcommand}:`, error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true
      });
    }
  }
}
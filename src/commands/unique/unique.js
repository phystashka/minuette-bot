import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unique')
    .setDescription('Manage and view unique ponies')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all unique ponies and their upgrades')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('equip')
        .setDescription('Quickly equip a unique pony as your profile pony')
        .addStringOption(option =>
          option
            .setName('pony_name')
            .setDescription('Name of the unique pony to equip')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'list':
          return await this.executeList(interaction);
          
        case 'equip':
          return await this.executeEquip(interaction);
          
        default:
          await interaction.reply({
            content: 'Unknown unique subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error(`Error executing unique subcommand ${subcommand}:`, error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while executing the unique command.',
          ephemeral: true
        });
      }
    }
  },

  async executeList(interaction) {
    try {
      const { execute: listExecute } = await import('./unique_list.js');
      return await listExecute(interaction);
    } catch (error) {
      console.error('Error in unique list:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while loading unique ponies.',
          ephemeral: true
        });
      }
    }
  },

  async executeEquip(interaction) {
    try {
      const { execute: equipExecute } = await import('./unique_equip.js');
      return await equipExecute(interaction);
    } catch (error) {
      console.error('Error in unique equip:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while equipping unique pony.',
          ephemeral: true
        });
      }
    }
  }
};
import { SlashCommandBuilder } from 'discord.js';

const TRANSFERABLE_RESOURCES = [
  { name: 'bits', label: 'Bits' },
  { name: 'wood', label: 'Wood' },
  { name: 'stone', label: 'Stone' },
  { name: 'tools', label: 'Tools' },
  { name: 'apples', label: 'Apples' },
  { name: 'eggs', label: 'Eggs' },
  { name: 'milk', label: 'Milk' },
  { name: 'expansion_plans', label: 'Expansion Plans' },
  { name: 'pumpkins', label: 'Pumpkins' },
  { name: 'candies', label: 'Candies' },
  { name: 'keys', label: 'Keys' },
  { name: 'forest_herbs', label: 'Forest Herbs' },
  { name: 'bone_dust', label: 'Bone Dust' },
  { name: 'moonstone_shard', label: 'Moonstone Shard' },
  { name: 'chips', label: 'Chips' }
];

export default {
  data: new SlashCommandBuilder()
    .setName('friend')
    .setDescription('Manage your friends list')
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Send a friend request to another user')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user you want to add as a friend')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View your friends list')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('Give resources or bits to a friend')
        .addUserOption(option =>
          option
            .setName('friend')
            .setDescription('The friend to give resources to')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('resource')
            .setDescription('The resource or bits to give')
            .setRequired(true)
            .addChoices(
              ...TRANSFERABLE_RESOURCES.map(resource => ({
                name: resource.label,
                value: resource.name
              }))
            )
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Amount to give (1-100,000)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100000)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('take')
        .setDescription('Take resources or bits from a friend')
        .addUserOption(option =>
          option
            .setName('friend')
            .setDescription('The friend to take resources from')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('resource')
            .setDescription('The resource or bits to take')
            .setRequired(true)
            .addChoices(
              ...TRANSFERABLE_RESOURCES.map(resource => ({
                name: resource.label,
                value: resource.name
              }))
            )
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Amount to take (1-100,000)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100000)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    try {
      switch (subcommand) {
        case 'add':
          return await this.executeAdd(interaction);
          
        case 'list':
          return await this.executeList(interaction);
          
        case 'give':
          return await this.executeGive(interaction);
          
        case 'take':
          return await this.executeTake(interaction);
          
        default:
          await interaction.reply({
            content: 'Unknown friend subcommand.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error(`Error executing friend subcommand ${subcommand}:`, error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while executing the friend command.',
          ephemeral: true
        });
      }
    }
  },

  async executeAdd(interaction) {
    try {
      const { execute: addExecute } = await import('./friend_add.js');
      return await addExecute(interaction);
    } catch (error) {
      console.error('Error in friend add:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while sending friend request.',
          ephemeral: true
        });
      }
    }
  },

  async executeList(interaction) {
    try {
      const { execute: listExecute } = await import('./friend_list.js');
      return await listExecute(interaction);
    } catch (error) {
      console.error('Error in friend list:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while loading friends list.',
          ephemeral: true
        });
      }
    }
  },

  async executeGive(interaction) {
    try {
      const { handleGiveCommand } = await import('./friend_give.js');
      return await handleGiveCommand(interaction);
    } catch (error) {
      console.error('Error in friend give:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while giving resources to friend.',
          ephemeral: true
        });
      }
    }
  },

  async executeTake(interaction) {
    try {
      const { handleTakeCommand } = await import('./friend_take.js');
      return await handleTakeCommand(interaction);
    } catch (error) {
      console.error('Error in friend take:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while taking resources from friend.',
          ephemeral: true
        });
      }
    }
  }
};
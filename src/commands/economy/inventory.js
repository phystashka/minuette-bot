import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} from 'discord.js';
import { getPonyByUserId } from '../../models/PonyModel.js';
import ResourceModel, { getResourceAmount, getResourcesByUserId } from '../../models/ResourceModel.js';
import { getHarmony } from '../../models/HarmonyModel.js';
import { createEmbed } from '../../utils/components.js';
import { t } from '../../utils/localization.js';

export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('View your resource inventory')
  .setDescriptionLocalizations({
    'ru': 'Просмотр вашего инвентаря ресурсов'
  })
  .setDMPermission(false)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to view inventory for')
      .setDescriptionLocalizations({
        'ru': 'Пользователь для просмотра инвентаря'
      })
      .setRequired(false));

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isOwnInventory = targetUser.id === interaction.user.id;

  try {
    const user = await getPonyByUserId(targetUser.id);
    if (!user) {
      await interaction.reply({
        content: await t('errors.user_not_found', interaction.guild?.id),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const bankBalance = user.bank_balance || 0;
    const harmony = await getHarmony(targetUser.id);
    const userResources = await getResourcesByUserId(targetUser.id);

    const wood = (await getResourceAmount(targetUser.id, 'wood')) || 0;
    const stone = (await getResourceAmount(targetUser.id, 'stone')) || 0;
    const tools = (await getResourceAmount(targetUser.id, 'tools')) || 0;
    const apples = (await getResourceAmount(targetUser.id, 'apples')) || 0;
    const eggs = (await getResourceAmount(targetUser.id, 'eggs')) || 0;
    const milk = (await getResourceAmount(targetUser.id, 'milk')) || 0;
    const expansion_plans = (await getResourceAmount(targetUser.id, 'expansion_plans')) || 0;
    const pumpkins = (await getResourceAmount(targetUser.id, 'pumpkins')) || 0;
    const candies = (await getResourceAmount(targetUser.id, 'candies')) || 0;
    const forestHerbs = (await getResourceAmount(targetUser.id, 'forest_herbs')) || 0;
    const boneDust = (await getResourceAmount(targetUser.id, 'bone_dust')) || 0;
    const moonstoneShard = (await getResourceAmount(targetUser.id, 'moonstone_shard')) || 0;
    const chips = (await getResourceAmount(targetUser.id, 'chips')) || 0;
    const sparks = (await getResourceAmount(targetUser.id, 'sparks')) || 0;

    await showInventoryCategory(interaction, targetUser, 'currency', {
      bits: user.bits || 0,
      bankBalance,
      harmony,
      magic_coins: userResources?.magic_coins || 0,
      chips,
      sparks,
      wood, stone, tools, apples, eggs, milk, expansion_plans,
      pumpkins, candies, forestHerbs, boneDust, moonstoneShard
    });

  } catch (error) {
    console.error('Error in inventory command:', error);
    await interaction.reply({
      content: await t('errors.generic', interaction.guild?.id),
      flags: MessageFlags.Ephemeral
    });
  }
}

async function showInventoryCategory(interaction, targetUser, category, resources) {
  const headerText = new TextDisplayBuilder()
    .setContent(`📦 **${targetUser.username}'s Inventory**\n-# View all your resources and currency`);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(headerText)
    .addSeparatorComponents(separator);

  if (category === 'currency' || category === 'all') {
    const currencyTitle = new TextDisplayBuilder()
      .setContent('**Currency & Economy**');
    
    const currencyContent = new TextDisplayBuilder()
      .setContent(`<:bits:1411354539935666197> **Cash:** \`${resources.bits.toLocaleString()}\`\n<:bits:1411354539935666197> **Bank:** \`${resources.bankBalance.toLocaleString()}\`\n<:chips:1431269385405993010> **Chips:** \`${resources.chips.toLocaleString()}\`\n<:Sparkl:1431337628900528138> **Sparks:** \`${resources.sparks.toLocaleString()}\`\n<:harmony:1416514347789844541> **Harmony:** \`${resources.harmony.toLocaleString()}\`\n<:magic_coin:1431797469666217985> **Magic Coins:** \`${resources.magic_coins.toLocaleString()}\``);
    
    container.addTextDisplayComponents(currencyTitle);
    container.addTextDisplayComponents(currencyContent);
    container.addSeparatorComponents(separator);
  }

  if (category === 'materials' || category === 'all') {
    const materialsTitle = new TextDisplayBuilder()
      .setContent('**Building Materials**');
    
    const materialsContent = new TextDisplayBuilder()
      .setContent(`<:wooden:1426514988134301787> **Wood:** \`${resources.wood.toLocaleString()}\`\n<:stones:1426514985865056326> **Stone:** \`${resources.stone.toLocaleString()}\`\n<:tool:1426514983159599135> **Tools:** \`${resources.tools.toLocaleString()}\`\n<:cartography:1418286057585250438> **Plans:** \`${resources.expansion_plans.toLocaleString()}\``);
    
    container.addTextDisplayComponents(materialsTitle);
    container.addTextDisplayComponents(materialsContent);
    container.addSeparatorComponents(separator);
  }

  if (category === 'food' || category === 'all') {
    const foodTitle = new TextDisplayBuilder()
      .setContent('**Food & Farm Products**');
    
    const foodContent = new TextDisplayBuilder()
      .setContent(`🍎 **Apples:** \`${resources.apples.toLocaleString()}\`\n🥚 **Eggs:** \`${resources.eggs.toLocaleString()}\`\n🥛 **Milk:** \`${resources.milk.toLocaleString()}\`\n🎃 **Pumpkins:** \`${resources.pumpkins.toLocaleString()}\`\n🍬 **Candies:** \`${resources.candies.toLocaleString()}\``);
    
    container.addTextDisplayComponents(foodTitle);
    container.addTextDisplayComponents(foodContent);
    container.addSeparatorComponents(separator);
  }

  if (category === 'magic' || category === 'all') {
    const magicTitle = new TextDisplayBuilder()
      .setContent('**Magical Materials**');
    
    const magicContent = new TextDisplayBuilder()
      .setContent(`<:flowers:1420011704825417768> **Forest Herbs:** \`${resources.forestHerbs.toLocaleString()}\`\n<:bones:1420011720440680539> **Bone Dust:** \`${resources.boneDust.toLocaleString()}\`\n🌙 **Moonstone Shard:** \`${resources.moonstoneShard.toLocaleString()}\``);
    
    container.addTextDisplayComponents(magicTitle);
    container.addTextDisplayComponents(magicContent);
    container.addSeparatorComponents(separator);
  }

  const createCategoryButtons = (activeCategory) => {
    return new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`inventory_currency_${targetUser.id}`)
          .setLabel('Currency')
          .setStyle(activeCategory === 'currency' ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`inventory_materials_${targetUser.id}`)
          .setLabel('Materials')
          .setStyle(activeCategory === 'materials' ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`inventory_food_${targetUser.id}`)
          .setLabel('Food')
          .setStyle(activeCategory === 'food' ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`inventory_magic_${targetUser.id}`)
          .setLabel('Magic')
          .setStyle(activeCategory === 'magic' ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`inventory_all_${targetUser.id}`)
          .setLabel('All')
          .setStyle(activeCategory === 'all' ? ButtonStyle.Success : ButtonStyle.Primary)
      );
  };

  container.addActionRowComponents(createCategoryButtons(category));

  const isFirstReply = !interaction.replied && !interaction.deferred;
  
  if (isFirstReply) {
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  } else {
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  }
}

export async function handleInventoryInteraction(interaction) {
  try {
    if (!interaction.customId.startsWith('inventory_')) return false;

    const parts = interaction.customId.split('_');
    const category = parts[1]; 
    const targetUserId = parts[2];

    if (targetUserId !== interaction.user.id) {
      const notAuthorizedText = new TextDisplayBuilder()
        .setContent('You can only view your own inventory!');
      
      const notAuthorizedContainer = new ContainerBuilder()
        .addTextDisplayComponents(notAuthorizedText);
      
      try {
        return await interaction.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [notAuthorizedContainer],
          ephemeral: true
        });
      } catch (replyError) {
        console.log('Failed to reply to unauthorized user in inventory interaction:', replyError.code);
        return true;
      }
    }

    await interaction.deferUpdate();

    const user = await getPonyByUserId(targetUserId);
    if (!user) {
      const userNotFoundText = new TextDisplayBuilder()
        .setContent('❌ **User Not Found**\n-# The specified user could not be found in the database.');
      
      const userNotFoundContainer = new ContainerBuilder()
        .addTextDisplayComponents(userNotFoundText);
      
      try {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [userNotFoundContainer]
        });
      } catch (replyError) {
        console.log('Failed to reply with user not found error in inventory interaction:', replyError.code);
      }
      return true;
    }

    const targetUser = await interaction.client.users.fetch(targetUserId);

    const bankBalance = user.bank_balance || 0;
    const harmony = await getHarmony(targetUserId);
    const userResources = await getResourcesByUserId(targetUserId);

    const resources = {
      bits: user.bits || 0,
      bankBalance,
      harmony,
      magic_coins: userResources?.magic_coins || 0,
      chips: (await getResourceAmount(targetUserId, 'chips')) || 0,
      sparks: (await getResourceAmount(targetUserId, 'sparks')) || 0,
      wood: (await getResourceAmount(targetUserId, 'wood')) || 0,
      stone: (await getResourceAmount(targetUserId, 'stone')) || 0,
      tools: (await getResourceAmount(targetUserId, 'tools')) || 0,
      apples: (await getResourceAmount(targetUserId, 'apples')) || 0,
      eggs: (await getResourceAmount(targetUserId, 'eggs')) || 0,
      milk: (await getResourceAmount(targetUserId, 'milk')) || 0,
      expansion_plans: (await getResourceAmount(targetUserId, 'expansion_plans')) || 0,
      pumpkins: (await getResourceAmount(targetUserId, 'pumpkins')) || 0,
      candies: (await getResourceAmount(targetUserId, 'candies')) || 0,
      forestHerbs: (await getResourceAmount(targetUserId, 'forest_herbs')) || 0,
      boneDust: (await getResourceAmount(targetUserId, 'bone_dust')) || 0,
      moonstoneShard: (await getResourceAmount(targetUserId, 'moonstone_shard')) || 0
    };

    await showInventoryCategory(interaction, targetUser, category, resources);
    return true;

  } catch (error) {
    console.error('Error in inventory interaction:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('⚠️ **Error**\n-# An error occurred while updating inventory view.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    if (interaction.isRepliable()) {
      try {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [errorContainer]
        });
      } catch (replyError) {
        console.log('Failed to reply with error message in inventory interaction:', replyError.code);
      }
    }
    return true;
  }
}

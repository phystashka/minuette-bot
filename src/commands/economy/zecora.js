import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { addResource, getResourceAmount, removeResource } from '../../models/ResourceModel.js';
import { addBits, removeBits, getPonyByUserId } from '../../models/PonyModel.js';
import { readFileSync } from 'fs';
import { join } from 'path';

export const data = new SlashCommandBuilder()
  .setName('zecora')
  .setDescription('Visit Zecora\'s mystical hut to brew magical potions')
  .setDMPermission(false);


const INGREDIENT_PRICES = {
  forest_herbs: 3000,
  bone_dust: 3500,
  moonstone_shard: 7000
};


const INGREDIENT_POTIONS = {
  forest_herbs: [
    {
      id: 'battle',
      name: 'Battle Potion',
      description: 'Increases battle damage by 45% for 4 hours',
      duration: 4 * 60 * 60 * 1000,
      emoji: '⚔️'
    },
    {
      id: 'resource', 
      name: 'Resource Potion',
      description: 'Increases resource rewards from cases and timely by 45% for 3 hours',
      duration: 3 * 60 * 60 * 1000,
      emoji: '💎'
    }
  ],
  bone_dust: [
    {
      id: 'luck',
      name: 'Luck Potion', 
      description: 'Increases venture success by 10% and case skin chance for 3 hours',
      duration: 3 * 60 * 60 * 1000,
      emoji: '🍀'
    }
  ],
  moonstone_shard: [
    {
      id: 'discovery',
      name: 'Discovery Potion',
      description: 'Increases chance to find new ponies: +40% common-epic, +15% mythic-legendary, +10% secret-custom for 2 hours',
      duration: 2 * 60 * 60 * 1000,
      emoji: '🔍'
    },
    {
      id: 'nightmare',
      name: 'Nightmare Night Potion',
      description: 'Increases Halloween event pony encounter chance by 30% for 2 hours',
      duration: 2 * 60 * 60 * 1000,
      emoji: '🎃'
    }
  ]
};

export async function execute(interaction) {
  try {
    await interaction.deferReply();
    
    const userId = interaction.user.id;
    

    await showIntroStage(interaction, userId);
    
  } catch (error) {
    console.error('Error in zecora command:', error);
    
    const errorEmbed = createEmbed({
      title: '❌ Error',
      description: 'An error occurred while visiting Zecora\'s hut.',
      color: 0xFF0000
    });
    
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

async function showIntroStage(interaction, userId) {
  const embed = createEmbed({
    title: '🏠 Zecora\'s Mystical Hut',
    description: `*The moon is high, the night is deep,*\n*in bubbling cauldrons secrets creep.*\n*Tell me, traveler, what do you seek?*\n\n**- Zecora**`,
    color: 0x4B0082
  });
  

  const imagePath = join(process.cwd(), 'src', 'public', 'zecora', 'stage1.png');
  let imageFiles = [];
  try {
    const imageBuffer = readFileSync(imagePath);
    imageFiles = [new AttachmentBuilder(imageBuffer, { name: 'stage1.png' })];
    embed.setThumbnail('attachment://stage1.png');
  } catch (error) {
    console.log('Zecora stage1 image not found');
  }
  

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`zecora_brew_${userId}`)
        .setLabel('Brew a potion')
        .setEmoji('🧪')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`zecora_ingredients_${userId}`)
        .setLabel('Ingredients')
        .setEmoji('🌿')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`zecora_leave_${userId}`)
        .setLabel('Leave quietly')
        .setEmoji('🚪')
        .setStyle(ButtonStyle.Danger)
    );
  
  await interaction.editReply({
    embeds: [embed],
    components: [buttons],
    files: imageFiles
  });
}

export async function handleZecoraButton(interaction) {
  try {
    await interaction.deferUpdate();
    
    const customIdParts = interaction.customId.split('_');
    const action = customIdParts[0];
    const type = customIdParts[1];
    const originalUserId = customIdParts[customIdParts.length - 1];
    
    if (interaction.user.id !== originalUserId) {
      return interaction.followUp({
        content: 'Only the command user can interact with Zecora!',
        ephemeral: true
      });
    }
    
    const userId = interaction.user.id;
    
    switch (type) {
      case 'brew':
        await showBrewStage(interaction, userId);
        break;
      case 'ingredients':
        await showIngredientsStage(interaction, userId);
        break;
      case 'leave':
        await showLeaveStage(interaction, userId);
        break;
      case 'buy':
        await handleIngredientPurchase(interaction, userId);
        break;
      case 'craft':
        await handlePotionCrafting(interaction, userId);
        break;
      case 'back':
        await showIntroStage(interaction, userId);
        break;
    }
    
  } catch (error) {
    console.error('Error handling Zecora button:', error);
    
    const errorEmbed = createEmbed({
      title: '❌ Error',
      description: 'An error occurred in Zecora\'s hut.',
      color: 0xFF0000
    });
    
    await interaction.editReply({ embeds: [errorEmbed], components: [] });
  }
}

async function showBrewStage(interaction, userId) {
  const embed = createEmbed({
    title: '🧪 Brewing Station',
    description: `*To shape the brew both strong and right,*\n*choose your path beneath the night.*\n*Leaf, bone, or crystal rare…*\n*decide, and magic fills the air.*\n\n**- Zecora**`,
    color: 0x4B0082
  });
  

  const imagePath = join(process.cwd(), 'src', 'public', 'zecora', 'craftstage.png');
  let imageFiles = [];
  try {
    const imageBuffer = readFileSync(imagePath);
    imageFiles = [new AttachmentBuilder(imageBuffer, { name: 'craftstage.png' })];
    embed.setThumbnail('attachment://craftstage.png');
  } catch (error) {
    console.log('Zecora craftstage image not found');
  }
  

  const forestHerbs = await getResourceAmount(userId, 'forest_herbs');
  const boneDust = await getResourceAmount(userId, 'bone_dust');
  const moonstoneShard = await getResourceAmount(userId, 'moonstone_shard');
  
  embed.addFields(
    { name: '🎒 Your Ingredients', value: `<:flowers:1420011704825417768> Forest Herbs: ${forestHerbs}\n<:bones:1420011720440680539> Bone Dust: ${boneDust}\n🌙 Moonstone Shard: ${moonstoneShard}`, inline: false }
  );
  

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`zecora_craft_forest_${userId}`)
        .setLabel(`Forest Herbs (${forestHerbs})`)
        .setEmoji('<:flowers:1420011704825417768>')
        .setStyle(ButtonStyle.Success)
        .setDisabled(forestHerbs === 0),
      new ButtonBuilder()
        .setCustomId(`zecora_craft_bone_${userId}`)
        .setLabel(`Bone Dust (${boneDust})`)
        .setEmoji('<:bones:1420011720440680539>')
        .setStyle(ButtonStyle.Success)
        .setDisabled(boneDust === 0),
      new ButtonBuilder()
        .setCustomId(`zecora_craft_moonstone_${userId}`)
        .setLabel(`Moonstone Shard (${moonstoneShard})`)
        .setEmoji('🌙')
        .setStyle(ButtonStyle.Success)
        .setDisabled(moonstoneShard === 0)
    );
  
  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`zecora_back_main_${userId}`)
        .setLabel('Back')
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.editReply({
    embeds: [embed],
    components: [buttons, backButton],
    files: imageFiles
  });
}

async function showIngredientsStage(interaction, userId) {
  const embed = createEmbed({
    title: '🌿 Ingredient Shop',
    description: `*The brew requires rare supplies,*\n*each with power, each a prize.*\n*Choose your tool, your fate to claim,*\n*for none of them are quite the same.*\n\n**- Zecora**`,
    color: 0x4B0082
  });
  

  const imagePath = join(process.cwd(), 'src', 'public', 'zecora', 'shopstage.png');
  let imageFiles = [];
  try {
    const imageBuffer = readFileSync(imagePath);
    imageFiles = [new AttachmentBuilder(imageBuffer, { name: 'shopstage.png' })];
    embed.setThumbnail('attachment://shopstage.png');
  } catch (error) {
    console.log('Zecora shopstage image not found');
  }
  

  const pony = await getPonyByUserId(userId);
  const userBits = pony?.bits || 0;
  
  embed.addFields(
    { name: '💰 Your Bits', value: `<:bits:1411354539935666197> ${userBits.toLocaleString()}`, inline: true },
    { name: '🛒 Ingredient Prices', value: `<:flowers:1420011704825417768> Forest Herbs: ${INGREDIENT_PRICES.forest_herbs.toLocaleString()} bits\n<:bones:1420011720440680539> Bone Dust: ${INGREDIENT_PRICES.bone_dust.toLocaleString()} bits\n🌙 Moonstone Shard: ${INGREDIENT_PRICES.moonstone_shard.toLocaleString()} bits`, inline: false }
  );
  

  const buttons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`zecora_buy_forest_${userId}`)
        .setLabel(`Forest Herbs (${INGREDIENT_PRICES.forest_herbs.toLocaleString()})`)
        .setEmoji('<:flowers:1420011704825417768>')
        .setStyle(ButtonStyle.Success)
        .setDisabled(userBits < INGREDIENT_PRICES.forest_herbs),
      new ButtonBuilder()
        .setCustomId(`zecora_buy_bone_${userId}`)
        .setLabel(`Bone Dust (${INGREDIENT_PRICES.bone_dust.toLocaleString()})`)
        .setEmoji('<:bones:1420011720440680539>')
        .setStyle(ButtonStyle.Success)
        .setDisabled(userBits < INGREDIENT_PRICES.bone_dust),
      new ButtonBuilder()
        .setCustomId(`zecora_buy_moonstone_${userId}`)
        .setLabel(`Moonstone Shard (${INGREDIENT_PRICES.moonstone_shard.toLocaleString()})`)
        .setEmoji('🌙')
        .setStyle(ButtonStyle.Success)
        .setDisabled(userBits < INGREDIENT_PRICES.moonstone_shard)
    );
  
  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`zecora_back_main_${userId}`)
        .setLabel('Back')
        .setEmoji('⬅️')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.editReply({
    embeds: [embed],
    components: [buttons, backButton],
    files: imageFiles
  });
}

async function showLeaveStage(interaction, userId) {
  const embed = createEmbed({
    title: '🚪 Leaving Zecora\'s Hut',
    description: `*The cauldron cools, the night grows still,*\n*return again if so you will.*\n\n**- Zecora**`,
    color: 0x4B0082
  });
  

  const imagePath = join(process.cwd(), 'src', 'public', 'zecora', 'leavestage.png');
  let imageFiles = [];
  try {
    const imageBuffer = readFileSync(imagePath);
    imageFiles = [new AttachmentBuilder(imageBuffer, { name: 'leavestage.png' })];
    embed.setThumbnail('attachment://leavestage.png');
  } catch (error) {
    console.log('Zecora leavestage image not found');
  }
  
  await interaction.editReply({
    embeds: [embed],
    components: [],
    files: imageFiles
  });
}

async function handleIngredientPurchase(interaction, userId) {
  const customIdParts = interaction.customId.split('_');
  const ingredient = customIdParts[2];
  let price = 0;
  let ingredientKey = '';
  
  switch (ingredient) {
    case 'forest':
      price = INGREDIENT_PRICES.forest_herbs;
      ingredientKey = 'forest_herbs';
      break;
    case 'bone':
      price = INGREDIENT_PRICES.bone_dust;
      ingredientKey = 'bone_dust';
      break;
    case 'moonstone':
      price = INGREDIENT_PRICES.moonstone_shard;
      ingredientKey = 'moonstone_shard';
      break;
  }
  

  const pony = await getPonyByUserId(userId);
  const userBits = pony?.bits || 0;
  
  if (userBits < price) {
    return interaction.followUp({
      content: `❌ You don't have enough bits! You need ${price.toLocaleString()} bits but only have ${userBits.toLocaleString()}.`,
      ephemeral: true
    });
  }
  

  console.log(`[ZECORA] Removing ${price} bits from user ${userId}`);
  await removeBits(userId, price);
  console.log(`[ZECORA] Adding 1 ${ingredientKey} to user ${userId}`);
  await addResource(userId, ingredientKey, 1);
  console.log(`[ZECORA] Purchase completed successfully`);
  

  let ingredientInfo = '';
  switch (ingredient) {
    case 'forest':
      ingredientInfo = '*Leaves of the forest, gentle and wise, grant you strength and growth in disguise.*';
      break;
    case 'bone':
      ingredientInfo = '*Dust of the bone, grim and sly, will twist the odds where fortune lies.*';
      break;
    case 'moonstone':
      ingredientInfo = '*A shard of the moon, rare and pure, awakens gifts none else can secure.*';
      break;
  }
  
  const embed = createEmbed({
    title: '✅ Ingredient Purchased',
    description: `${ingredientInfo}\n\n**- Zecora**\n\nYou have successfully purchased the ingredient for ${price.toLocaleString()} bits!`,
    color: 0x00FF00
  });
  
  await interaction.followUp({
    embeds: [embed],
    ephemeral: true
  });
  

  setTimeout(() => {
    showIngredientsStage(interaction, userId);
  }, 1500);
}

async function handlePotionCrafting(interaction, userId) {
  const customIdParts = interaction.customId.split('_');
  const ingredient = customIdParts[2];
  let ingredientKey = '';
  
  switch (ingredient) {
    case 'forest':
      ingredientKey = 'forest_herbs';
      break;
    case 'bone':
      ingredientKey = 'bone_dust';
      break;
    case 'moonstone':
      ingredientKey = 'moonstone_shard';
      break;
  }
  

  const ingredientAmount = await getResourceAmount(userId, ingredientKey);
  if (ingredientAmount === 0) {
    return interaction.followUp({
      content: '❌ You don\'t have this ingredient!',
      ephemeral: true
    });
  }
  

  await removeResource(userId, ingredientKey, 1);
  

  const possiblePotions = INGREDIENT_POTIONS[ingredientKey];
  const selectedPotion = possiblePotions[Math.floor(Math.random() * possiblePotions.length)];
  

  await applyPotionEffect(userId, selectedPotion);
  

  const endings = [
    "The potion glows within its glass — a power gained, your trials surpassed.",
    "The herbs ignite, the cauldron sings, and strength flows out from hidden things.",
    "The dust dissolves, the smoke turns pale, and fortune smiles upon your trail.",
    "The shard dissolves with silver light, a secret gift now bound to night."
  ];
  
  const randomEnding = endings[Math.floor(Math.random() * endings.length)];
  
  const embed = createEmbed({
    title: '🧪 Potion Brewed Successfully!',
    description: `*${randomEnding}*\n\n**- Zecora**\n\n${selectedPotion.emoji} **${selectedPotion.name}** has been crafted and applied!\n\n${selectedPotion.description}`,
    color: 0x9932CC
  });
  
  await interaction.followUp({
    embeds: [embed],
    ephemeral: true
  });
  

  await showBrewStage(interaction, userId);
}

async function applyPotionEffect(userId, potion) {
  const expiresAt = new Date(Date.now() + potion.duration);
  

  const { activatePotion } = await import('../../models/ResourceModel.js');
  await activatePotion(userId, potion.id, potion.duration);
}

export const guildOnly = false;
export const category = 'economy';
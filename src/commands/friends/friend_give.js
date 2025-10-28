import { 
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} from 'discord.js';
import { getPony, addBits, removeBits } from '../../utils/pony/index.js';
import { getResourcesByUserId, addResource, getResourceAmount, updateResources } from '../../models/ResourceModel.js';
import { areFriends } from '../../models/FriendsModel.js';

function createErrorContainer(message) {
  const container = new ContainerBuilder();
  
  const errorText = new TextDisplayBuilder()
    .setContent(`**❌ Error**\n-# ${message}`);
  container.addTextDisplayComponents(errorText);
  
  return container;
}

function createSuccessContainer(message) {
  const container = new ContainerBuilder();
  
  const successText = new TextDisplayBuilder()
    .setContent(`**✅ Success**\n${message}`);
  container.addTextDisplayComponents(successText);
  
  return container;
}

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

function getResourceEmoji(resourceType) {
  const emojiMap = {
    'bits': '<:bits:1411354539935666197>',
    'wood': '<:wooden:1426514988134301787>',
    'stone': '<:stones:1426514985865056326>',
    'tools': '<:tool:1426514983159599135>',
    'apples': '🍎',
    'eggs': '🥚',
    'milk': '🥛',
    'expansion_plans': '<:cartography:1418286057585250438>',
    'pumpkins': '🎃',
    'candies': '🍬',
    'keys': '<a:goldkey:1426332679103709314>',
    'forest_herbs': '<:flowers:1420011704825417768>',
    'bone_dust': '<:bones:1420011720440680539>',
    'moonstone_shard': '🌙',
    'chips': '<:chips:1431269385405993010>'
  };
  return emojiMap[resourceType] || '';
}

export async function handleGiveCommand(interaction) {
  await interaction.deferReply();
  
  const userId = interaction.user.id;
  const targetUser = interaction.options.getUser('friend');
  const targetId = targetUser.id;
  const resourceType = interaction.options.getString('resource');
  const amount = interaction.options.getInteger('amount');

  const userPony = await getPony(userId);
  if (!userPony) {
    const noPonyContainer = createErrorContainer('You need to create a pony first with `/equestria`!');
    return await interaction.editReply({
      content: '',
      components: [noPonyContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }

  const targetPony = await getPony(targetId);
  if (!targetPony) {
    const noTargetPonyContainer = createErrorContainer(`${targetUser.username} needs to create a pony first with \`/equestria\`!`);
    return await interaction.editReply({
      content: '',
      components: [noTargetPonyContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }

  const friendship = await areFriends(userId, targetId);
  if (!friendship) {
    const notFriendsContainer = createErrorContainer(`You are not friends with ${targetUser.username}! Use \`/friend add\` to send a friend request first.`);
    return await interaction.editReply({
      content: '',
      components: [notFriendsContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }

  if (userId === targetId) {
    const selfGiveContainer = createErrorContainer('You cannot give resources to yourself!');
    return await interaction.editReply({
      content: '',
      components: [selfGiveContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }

  const resourceInfo = TRANSFERABLE_RESOURCES.find(r => r.name === resourceType);
  if (!resourceInfo) {
    const invalidResourceContainer = createErrorContainer('Invalid resource type selected.');
    return await interaction.editReply({
      content: '',
      components: [invalidResourceContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }

  let userAmount = 0;
  if (resourceType === 'bits') {
    userAmount = userPony.bits || 0;
  } else {
    userAmount = await getResourceAmount(userId, resourceType);
  }
  
  if (userAmount < amount) {
    const insufficientContainer = createErrorContainer(`You don't have enough ${resourceInfo.label}! You have ${userAmount.toLocaleString()}, but need ${amount.toLocaleString()}.`);
    return await interaction.editReply({
      content: '',
      components: [insufficientContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
  

  try {
    if (resourceType === 'bits') {

      const removeSuccess = await removeBits(userId, amount);
      if (!removeSuccess) {
        throw new Error('Failed to remove bits from sender');
      }
      
      const addSuccess = await addBits(targetId, amount);
      if (!addSuccess) {

        await addBits(userId, amount);
        throw new Error('Failed to add bits to recipient');
      }
    } else {

      const userResources = await getResourcesByUserId(userId);
      const currentAmount = userResources[resourceType] || 0;
      
      if (currentAmount < amount) {
        throw new Error('Insufficient resources');
      }
      
      const removeData = {};
      removeData[resourceType] = currentAmount - amount;
      
      const removeSuccess = await updateResources(userId, removeData);
      
      if (!removeSuccess) {
        throw new Error('Failed to remove resource from sender');
      }

      const addSuccess = await addResource(targetId, resourceType, amount);
      if (!addSuccess) {

        const rollbackData = {};
        rollbackData[resourceType] = currentAmount;
        await updateResources(userId, rollbackData);
        throw new Error('Failed to add resource to recipient');
      }
    }
    
    const resourceEmoji = getResourceEmoji(resourceType);
    const successContainer = createSuccessContainer(
      `You successfully gave **${amount.toLocaleString()} ${resourceEmoji} ${resourceInfo.label}** to **${targetUser.username}**!`
    );
    
    await interaction.editReply({
      content: '',
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2
    });

    try {
      const notificationContainer = new ContainerBuilder();
      
      const titleText = new TextDisplayBuilder()
        .setContent(`**Items Received**`);
      notificationContainer.addTextDisplayComponents(titleText);
      
      const separator = new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small);
      notificationContainer.addSeparatorComponents(separator);
      
      const giftText = new TextDisplayBuilder()
        .setContent(`**${interaction.user.username}** gave you **${amount.toLocaleString()} ${resourceEmoji} ${resourceInfo.label}**!`);
      notificationContainer.addTextDisplayComponents(giftText);
      
      const benefitText = new TextDisplayBuilder()
        .setContent(`*Friend transfers are instant and free - no confirmation needed!*`);
      notificationContainer.addTextDisplayComponents(benefitText);
      
      await targetUser.send({
        content: '',
        components: [notificationContainer],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (dmError) {
      console.debug('Could not send DM notification to recipient:', dmError);
    }
    
  } catch (transferError) {
    console.error('Transfer error:', transferError);
    
    const transferErrorContainer = createErrorContainer('Failed to complete the transfer. Please try again.');
    await interaction.editReply({
      content: '',
      components: [transferErrorContainer],
      flags: MessageFlags.IsComponentsV2
    });
  }
}
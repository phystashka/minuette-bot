import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ComponentType
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getCases, addCases, removeCases, updateResources, getResourcesByUserId, getPumpkinBaskets, removePumpkinBaskets, hasActivePotion, getKeys, removeKeys } from '../../models/ResourceModel.js';
import { addBits } from '../../utils/pony/index.js';
import { addHarmony, getHarmony } from '../../models/HarmonyModel.js';
import { getRandomSkin, purchaseSkin } from '../../models/SkinModel.js';
import { addFriend } from '../../models/FriendshipModel.js';
import { grantDonatorBackground, purchaseBackground } from '../../models/ProfileBackgroundModel.js';
import { query, getRow } from '../../utils/database.js';
import { t } from '../../utils/localization.js';

export const data = new SlashCommandBuilder()
  .setName('case')
  .setDescription('Open loot cases or check your case status')
  .setDescriptionLocalizations({
    'ru': 'Откройте футляры с добычей или проверьте статус футляров'
  })
  .setDMPermission(false);

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const userCases = await getCases(userId);
    const userKeys = await getKeys(userId);

    let statusText = `<:case:1417301084291993712> **Cases:** \`${userCases}\`\n<a:goldkey:1426332679103709314> **Keys:** \`${userKeys}\``;
    
    if (userCases === 0 && userKeys === 0) {
      statusText += `\n\n*Get cases and keys by finding them in adventures \`/venture\` or autospawn*`;
    } else if (userCases === 0) {
      statusText += `\n\n*Get cases by finding them in adventures \`/venture\` or autospawn*`;
    } else if (userKeys === 0) {
      statusText += `\n\n*Get keys by finding them in adventures \`/venture\` or autospawn*`;
      statusText += `\n\n**⚠️ You need a key to open cases!**`;
    }

    const mainText = new TextDisplayBuilder()
      .setContent('**Your Loot Collection**\n-# Open cases to get amazing rewards!');

    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);

    const openCaseButton = new ButtonBuilder()
      .setCustomId(`open_case_${userId}`)
      .setLabel('Open Case')
      .setEmoji('<:case:1417301084291993712>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(userCases === 0 || userKeys === 0);

    const statusSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(statusText)
      )
      .setButtonAccessory(openCaseButton);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(mainText)
      .addSeparatorComponents(separator)
      .addSectionComponents(statusSection)
      .addSeparatorComponents(separator);

    const response = await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });

    const collector = response.createMessageComponentCollector({
      time: 300000,
      componentType: ComponentType.Button
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        if (!buttonInteraction.isRepliable()) {
          console.log('Interaction expired for unauthorized user');
          return;
        }
        
        const notYoursText = new TextDisplayBuilder()
          .setContent('This case opening is not for you!');
        
        const notYoursContainer = new ContainerBuilder()
          .addTextDisplayComponents(notYoursText);
        
        try {
          return await buttonInteraction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [notYoursContainer],
            ephemeral: true
          });
        } catch (replyError) {
          console.log('Failed to reply to unauthorized user (interaction expired):', replyError.code);
          return;
        }
      }

      if (buttonInteraction.customId === `open_case_${userId}`) {
        await handleCaseOpeningV2(buttonInteraction, userId, guildId);
      }
    });

    collector.on('end', () => {
      const disabledButton = new ButtonBuilder()
        .setCustomId(`open_case_${userId}`)
        .setLabel('Open Case')
        .setEmoji('<:case:1417301084291993712>')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const disabledSection = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(statusText)
        )
        .setButtonAccessory(disabledButton);

      const disabledContainer = new ContainerBuilder()
        .addTextDisplayComponents(mainText)
        .addSeparatorComponents(separator)
        .addSectionComponents(disabledSection)
        .addSeparatorComponents(separator);

      interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [disabledContainer]
      }).catch(() => {});
    });
    
  } catch (error) {
    console.error('Error in case command:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent(await t('error.generic', interaction.guild?.id));
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    return interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [errorContainer],
      ephemeral: true
    });
  }
}
async function handleCaseOpeningV2(interaction, userId, guildId) {
  try {
    if (!interaction || !interaction.isRepliable()) {
      console.log('Interaction is no longer valid');
      return;
    }

    const userCases = await getCases(userId);
    const userKeys = await getKeys(userId);
    
    if (userCases === 0) {
      const noCasesText = new TextDisplayBuilder()
        .setContent(`You have no cases to open!`);
      
      const noCasesContainer = new ContainerBuilder()
        .addTextDisplayComponents(noCasesText);
      
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [noCasesContainer]
      });
    }
    
    if (userKeys === 0) {
      const noKeysText = new TextDisplayBuilder()
        .setContent(`You need a key to open cases! <a:goldkey:1426332679103709314>`);
      
      const noKeysContainer = new ContainerBuilder()
        .addTextDisplayComponents(noKeysText);
      
      return interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [noKeysContainer]
      });
    }

    try {
      await interaction.deferUpdate();
    } catch (deferError) {
      console.log('Failed to defer interaction (expired):', deferError.code);
      return;
    }
    
    const caseSuccess = await removeCases(userId, 1);
    const keySuccess = await removeKeys(userId, 1);
    
    if (!caseSuccess || !keySuccess) {
      const errorText = new TextDisplayBuilder()
        .setContent('Failed to open case. Please try again.');
      
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
      
      return interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    }

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(userId, 'open_cases');
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    let rewards = [];
    const prizesCount = Math.random() < 0.6 ? 2 : 3;
    
    for (let i = 0; i < prizesCount; i++) {
      const randomValue = Math.random();
      let rewardText = '';
      
      if (randomValue < 0.015) {
        const randomSkinData = getRandomSkin();
        
        if (randomSkinData) {
          const result = await purchaseSkin(userId, randomSkinData.ponyName, randomSkinData.skinId, 'free');
          
          if (result.success) {
            rewardText = `<:clothes:1417925457021505760> **${randomSkinData.skin.name}** for **${randomSkinData.ponyName}**`;
          } else {
            const harmonyAmount = Math.floor(Math.random() * 7) + 1;
            await addHarmony(userId, harmonyAmount);
            rewardText = `<:harmony:1416514347789844541> \`${harmonyAmount} ${await t('currency.harmony', guildId)}\``;
          }
        } else {
          const harmonyAmount = Math.floor(Math.random() * 7) + 1;
          await addHarmony(userId, harmonyAmount);
          rewardText = `<:harmony:1416514347789844541> \`${harmonyAmount} ${await t('currency.harmony', guildId)}\``;
        }
      }
      else if (randomValue < 0.165) {
        const { addBits } = await import('../../utils/pony/index.js');
        const bitsAmount = Math.floor(Math.random() * 51) + 100;
        await addBits(userId, bitsAmount);
        rewardText = `<:bits:1429131029628588153> \`${bitsAmount} Bits\``;
      }
      else if (randomValue < 0.465) {
        const harmonyAmount = Math.floor(Math.random() * 7) + 1;
        await addHarmony(userId, harmonyAmount);
        rewardText = `<:harmony:1416514347789844541> \`${harmonyAmount} ${await t('currency.harmony', guildId)}\``;
      }
      else if (randomValue < 0.715) {
        const resources = ['wood', 'stone', 'tools'];
        const selectedResource = resources[Math.floor(Math.random() * resources.length)];
        let amount = Math.floor(Math.random() * (90 - 30 + 1)) + 30;
        
        const hasResourcePotion = await hasActivePotion(userId, 'resource');
        if (hasResourcePotion) {
          amount = Math.floor(amount * 1.45);
        }
        
        const currentResources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0, expansion_plans: 0 };
        currentResources[selectedResource] = (currentResources[selectedResource] || 0) + amount;
        
        await updateResources(userId, currentResources);
        
        const resourceEmojis = {
          wood: '<:wooden:1426514988134301787>',
          stone: '<:stones:1426514985865056326>', 
          tools: '<:tool:1426514983159599135>'
        };
        
        const resourceNames = {
          wood: 'Wood',
          stone: 'Stone', 
          tools: 'Tools'
        };
        
        const potionBonus = hasResourcePotion ? ' 🧪(+45% from potion!)' : '';
        rewardText = `${resourceEmojis[selectedResource]} \`${amount} ${resourceNames[selectedResource]}\`${potionBonus}`;
      }
      else if (randomValue < 0.915) {
        const amount = Math.floor(Math.random() * 3) + 1;
        
        const currentResources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0, expansion_plans: 0 };
        currentResources.expansion_plans = (currentResources.expansion_plans || 0) + amount;
        
        await updateResources(userId, currentResources);
        
        rewardText = `<:cartography:1418286057585250438> \`${amount} Expansion Plan${amount > 1 ? 's' : ''}\``;
      }
      else if (randomValue < 0.965) {
        const amount = 1;
        const currentResources = await getResourcesByUserId(userId) || {};
        currentResources.forest_herbs = (currentResources.forest_herbs || 0) + amount;
        await updateResources(userId, currentResources);
        rewardText = `<:flowers:1420011704825417768> \`${amount} Forest Herbs\``;
      }
      else if (randomValue < 0.985) {
        const amount = 1;
        const currentResources = await getResourcesByUserId(userId) || {};
        currentResources.bone_dust = (currentResources.bone_dust || 0) + amount;
        await updateResources(userId, currentResources);
        rewardText = `<:bones:1420011720440680539> \`${amount} Bone Dust\``;
      }
      else if (randomValue < 0.995) {
        const amount = 1;
        const currentResources = await getResourcesByUserId(userId) || {};
        currentResources.moonstone_shard = (currentResources.moonstone_shard || 0) + amount;
        await updateResources(userId, currentResources);
        rewardText = `🌙 \`${amount} Moonstone Shard\``;
      }
      else {
        rewardText = `🍪 You got a Cookie! (unfortunately you can't do anything with it, sorry)`;
      }
      
      rewards.push(rewardText);
    }
    
    const rewardText = rewards.join('\n');
    const remainingCases = await getCases(userId);
    const remainingKeys = await getKeys(userId);
    
    const resultText = new TextDisplayBuilder()
      .setContent('**Case Opened Successfully!**\n-# Here are your amazing rewards!');
    
    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);
    
    const rewardsText = new TextDisplayBuilder()
      .setContent(`${await t('case.opened', guildId)}\n\n**${await t('case.received', guildId)}**\n${rewardText}`);
    
    const resultContainer = new ContainerBuilder()
      .addTextDisplayComponents(resultText)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(rewardsText);

    if (remainingCases > 0 && remainingKeys > 0) {
      const openAgainButton = new ButtonBuilder()
        .setCustomId(`open_case_${userId}`)
        .setLabel(await t('case.open_again', guildId))
        .setEmoji('<:case:1417301084291993712>')
        .setStyle(ButtonStyle.Secondary);
      
      const statusSection = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Cases left:** \`${remainingCases}\` | **Keys:** \`${remainingKeys}\``)
        )
        .setButtonAccessory(openAgainButton);
      
      resultContainer
        .addSeparatorComponents(separator)
        .addSectionComponents(statusSection);
    }
    
    resultContainer.addSeparatorComponents(separator);
    
    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [resultContainer]
    });
    
  } catch (error) {
    console.error('Error handling case opening:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent(await t('case.error_opening_case', guildId));
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [errorContainer]
    });
  }
}

export async function handleCaseButton(interaction) {
  try {
    if (!interaction || !interaction.isRepliable()) {
      console.log('Interaction is no longer valid in handleCaseButton');
      return;
    }

    const [, , originalUserId] = interaction.customId.split('_');
    const guildId = interaction.guild?.id;
    
    if (interaction.user.id !== originalUserId) {
      const notAuthorizedText = new TextDisplayBuilder()
        .setContent(await t('case.only_user_can_open', guildId));
      
      const notAuthorizedContainer = new ContainerBuilder()
        .addTextDisplayComponents(notAuthorizedText);
      
      try {
        return await interaction.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [notAuthorizedContainer],
          ephemeral: true
        });
      } catch (replyError) {
        console.log('Failed to reply to unauthorized user in handleCaseButton (interaction expired):', replyError.code);
        return;
      }
    }
    
    const userId = interaction.user.id;
    const userCases = await getCases(userId);
    const userKeys = await getKeys(userId);
    
    if (userCases === 0) {
      const noCasesText = new TextDisplayBuilder()
        .setContent('You have no cases to open!');
      
      const noCasesContainer = new ContainerBuilder()
        .addTextDisplayComponents(noCasesText);
      
      try {
        return await interaction.update({ 
          flags: MessageFlags.IsComponentsV2,
          components: [noCasesContainer]
        });
      } catch (updateError) {
        console.log('Failed to update interaction (expired):', updateError.code);
        return;
      }
    }
    
    if (userKeys === 0) {
      const noKeysText = new TextDisplayBuilder()
        .setContent('You need a key to open cases! <a:goldkey:1426332679103709314>');
      
      const noKeysContainer = new ContainerBuilder()
        .addTextDisplayComponents(noKeysText);
      
      try {
        return await interaction.update({ 
          flags: MessageFlags.IsComponentsV2,
          components: [noKeysContainer]
        });
      } catch (updateError) {
        console.log('Failed to update interaction (expired):', updateError.code);
        return;
      }
    }

    try {
      await interaction.deferUpdate();
    } catch (deferError) {
      console.log('Failed to defer interaction (expired):', deferError.code);
      return;
    }
    
    const caseSuccess = await removeCases(userId, 1);
    const keySuccess = await removeKeys(userId, 1);
    
    if (!caseSuccess || !keySuccess) {
      const errorText = new TextDisplayBuilder()
        .setContent('Failed to open case. Please try again.');
      
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
      
      try {
        return await interaction.editReply({ 
          flags: MessageFlags.IsComponentsV2,
          components: [errorContainer]
        });
      } catch (editError) {
        console.log('Failed to edit reply (interaction expired):', editError.code);
        return;
      }
    }
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(userId, 'open_cases');
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    let rewards = [];
    

    const prizesCount = Math.random() < 0.6 ? 2 : 3;
    
    for (let i = 0; i < prizesCount; i++) {
      const randomValue = Math.random();
      let rewardText = '';
      

      if (randomValue < 0.015) {
        const randomSkinData = getRandomSkin();
        
        if (randomSkinData) {
          const result = await purchaseSkin(userId, randomSkinData.ponyName, randomSkinData.skinId, 'free');
          
          if (result.success) {
            rewardText = `<:clothes:1417925457021505760> **${randomSkinData.skin.name}** for **${randomSkinData.ponyName}**`;
          } else {

            const harmonyAmount = Math.floor(Math.random() * 7) + 1;
            await addHarmony(userId, harmonyAmount);
            rewardText = `<:harmony:1416514347789844541> \`${harmonyAmount} ${await t('currency.harmony', guildId)}\``;
          }
        } else {

          const harmonyAmount = Math.floor(Math.random() * 7) + 1;
          await addHarmony(userId, harmonyAmount);
          rewardText = `<:harmony:1416514347789844541> \`${harmonyAmount} ${await t('currency.harmony', guildId)}\``;
        }
      }

      else if (randomValue < 0.165) {
        const { addBits } = await import('../../utils/pony/index.js');
        const bitsAmount = Math.floor(Math.random() * 51) + 100;
        await addBits(userId, bitsAmount);
        rewardText = `<:bits:1429131029628588153> \`${bitsAmount} Bits\``;
      }

      else if (randomValue < 0.465) {
        const harmonyAmount = Math.floor(Math.random() * 7) + 1;
        await addHarmony(userId, harmonyAmount);
        rewardText = `<:harmony:1416514347789844541> \`${harmonyAmount} ${await t('currency.harmony', guildId)}\``;
      }

      else if (randomValue < 0.715) {
        const resources = ['wood', 'stone', 'tools'];
        const selectedResource = resources[Math.floor(Math.random() * resources.length)];
        let amount = Math.floor(Math.random() * (90 - 30 + 1)) + 30;
        

        const hasResourcePotion = await hasActivePotion(userId, 'resource');
        if (hasResourcePotion) {
          amount = Math.floor(amount * 1.45);
        }
        
        const currentResources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0, expansion_plans: 0 };
        currentResources[selectedResource] = (currentResources[selectedResource] || 0) + amount;
        
        await updateResources(userId, currentResources);
        
        const resourceEmojis = {
          wood: '<:wooden:1426514988134301787>',
          stone: '<:stones:1426514985865056326>', 
          tools: '<:tool:1426514983159599135>'
        };
        
        const resourceNames = {
          wood: 'Wood',
          stone: 'Stone', 
          tools: 'Tools'
        };
        
        const potionBonus = hasResourcePotion ? ' 🧪(+45% from potion!)' : '';
        rewardText = `${resourceEmojis[selectedResource]} \`${amount} ${resourceNames[selectedResource]}\`${potionBonus}`;
      }

      else if (randomValue < 0.915) {
        const amount = Math.floor(Math.random() * 3) + 1;
        

        const currentResources = await getResourcesByUserId(userId) || { wood: 0, stone: 0, tools: 0, expansion_plans: 0 };
        currentResources.expansion_plans = (currentResources.expansion_plans || 0) + amount;
        
        await updateResources(userId, currentResources);
        
        rewardText = `<:cartography:1418286057585250438> \`${amount} Expansion Plan${amount > 1 ? 's' : ''}\``;
      }

      else if (randomValue < 0.965) {
        const amount = 1;
        const currentResources = await getResourcesByUserId(userId) || {};
        currentResources.forest_herbs = (currentResources.forest_herbs || 0) + amount;
        await updateResources(userId, currentResources);
        rewardText = `<:flowers:1420011704825417768> \`${amount} Forest Herbs\``;
      }

      else if (randomValue < 0.985) {
        const amount = 1;
        const currentResources = await getResourcesByUserId(userId) || {};
        currentResources.bone_dust = (currentResources.bone_dust || 0) + amount;
        await updateResources(userId, currentResources);
        rewardText = `<:bones:1420011720440680539> \`${amount} Bone Dust\``;
      }

      else if (randomValue < 0.995) {
        const amount = 1;
        const currentResources = await getResourcesByUserId(userId) || {};
        currentResources.moonstone_shard = (currentResources.moonstone_shard || 0) + amount;
        await updateResources(userId, currentResources);
        rewardText = `🌙 \`${amount} Moonstone Shard\``;
      }

      else {
        rewardText = `🍪 You got a Cookie! (unfortunately you can't do anything with it, sorry)`;
      }
      
      rewards.push(rewardText);
    }
    
    const rewardText = rewards.join('\n');
    
    const remainingCases = await getCases(userId);
    const remainingKeys = await getKeys(userId);

    const resultText = new TextDisplayBuilder()
      .setContent('**Case Opened Successfully!**\n-# Here are your amazing rewards!');
    
    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);
    
    const rewardsText = new TextDisplayBuilder()
      .setContent(`${await t('case.opened', guildId)}\n\n**${await t('case.received', guildId)}**\n${rewardText}`);
    
    const resultContainer = new ContainerBuilder()
      .addTextDisplayComponents(resultText)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(rewardsText);
    
    if (remainingCases > 0 && remainingKeys > 0) {
      const openAgainButton = new ButtonBuilder()
        .setCustomId(`open_case_${userId}`)
        .setLabel(await t('case.open_again', guildId))
        .setStyle(ButtonStyle.Secondary);
      
      const statusSection = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Cases left:** \`${remainingCases}\` | **Keys:** \`${remainingKeys}\``)
        )
        .setButtonAccessory(openAgainButton);
      
      resultContainer
        .addSeparatorComponents(separator)
        .addSectionComponents(statusSection);
    }
    
    resultContainer.addSeparatorComponents(separator);
    
    try {
      return await interaction.editReply({ 
        flags: MessageFlags.IsComponentsV2,
        components: [resultContainer]
      });
    } catch (editError) {
      console.log('Failed to edit reply (interaction expired):', editError.code);
      return;
    }
    
  } catch (error) {
    console.error('Error handling case button:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent(await t('case.error_opening_case', interaction.guild?.id));
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    try {
      return await interaction.editReply({ 
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer]
      });
    } catch (editError) {
      console.log('Failed to edit reply with error (interaction expired):', editError.code);
      return;
    }
  }
}

export const guildOnly = false;
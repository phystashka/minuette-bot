import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
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

    

    let description = `${interaction.user}\n\n<:case:1417301084291993712> **Cases:** \`${userCases}\`\n<a:goldkey:1426332679103709314> **Keys:** \`${userKeys}\``;
    

    if (userCases === 0 && userKeys === 0) {
      description += `\n\n*Get cases and keys by finding them in adventures \`/venture\` or autospawn*`;
    } else if (userCases === 0) {
      description += `\n\n*Get cases by finding them in adventures \`/venture\` or autospawn*`;
    } else if (userKeys === 0) {
      description += `\n\n*Get keys by finding them in adventures \`/venture\` or autospawn*`;
      description += `\n\n**⚠️ You need a key to open cases!**`;
    }

    const embed = createEmbed({
      title: 'Your Loot Collection',
      description: description,
      color: 0x03168f,
      user: interaction.user
    });
    
    const buttons = [];
    

    const openCaseButton = new ButtonBuilder()
      .setCustomId(`open_case_${userId}`)
      .setLabel('Open Case')
      .setEmoji('<:case:1417301084291993712>')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(userCases === 0 || userKeys === 0);
    
    buttons.push(openCaseButton);
    
    const row = new ActionRowBuilder().addComponents(buttons);
    
    return interaction.reply({ 
      embeds: [embed], 
      components: [row] 
    });
    
  } catch (error) {
    console.error('Error in case command:', error);
    
    const embed = createEmbed({
      title: await t('case.title', interaction.guild?.id),
      description: await t('error.generic', interaction.guild?.id),
      color: 0x03168f,
      user: interaction.user
    });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export async function handleCaseButton(interaction) {
  try {
    const [, , originalUserId] = interaction.customId.split('_');
    const guildId = interaction.guild?.id;
    
    if (interaction.user.id !== originalUserId) {
      return interaction.reply({
        content: await t('case.only_user_can_open', guildId),
        ephemeral: true
      });
    }
    
    const userId = interaction.user.id;
    const userCases = await getCases(userId);
    const userKeys = await getKeys(userId);
    
    if (userCases === 0) {
      const embed = createEmbed({
        title: 'Case Opening',
        description: `${interaction.user} You have no cases to open!`,
        color: 0x03168f,
        user: interaction.user
      });
      
      return interaction.update({ 
        embeds: [embed], 
        components: [] 
      });
    }
    
    if (userKeys === 0) {
      const embed = createEmbed({
        title: 'Case Opening',
        description: `${interaction.user} You need a key to open cases! <a:goldkey:1426332679103709314>`,
        color: 0xFF6B35,
        user: interaction.user
      });
      
      return interaction.update({ 
        embeds: [embed], 
        components: [] 
      });
    }

    await interaction.deferUpdate();
    
    const caseSuccess = await removeCases(userId, 1);
    const keySuccess = await removeKeys(userId, 1);
    
    if (!caseSuccess || !keySuccess) {
      const embed = createEmbed({
        title: 'Case Opening Error',
        description: 'Failed to open case. Please try again.',
        color: 0xFF0000,
        user: interaction.user
      });
      
      return interaction.editReply({ 
        embeds: [embed], 
        components: [] 
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
        rewardText = `<:bits:1411354539935666197> \`${bitsAmount} Bits\``;
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
    
    const embed = createEmbed({
      title: await t('case.title', guildId),
      description: `${interaction.user} ${await t('case.opened', guildId)}\n${await t('case.received', guildId)} ${rewardText}`,
      color: 0x03168f,
      user: interaction.user
    });
    
    const components = [];
    
    if (remainingCases > 0) {
      const openAgainButton = new ButtonBuilder()
        .setCustomId(`open_case_${userId}`)
        .setLabel(await t('case.open_again', guildId))
        .setStyle(ButtonStyle.Secondary);
      
      const row = new ActionRowBuilder()
        .addComponents(openAgainButton);
      
      components.push(row);
      
      embed.setFooter({ text: `${await t('case.cases_left', guildId)} ${remainingCases}` });
    }
    
    return interaction.editReply({ 
      embeds: [embed], 
      components: components 
    });
    
  } catch (error) {
    console.error('Error handling case button:', error);
    
    const embed = createEmbed({
      title: await t('case.title', interaction.guild?.id),
      description: await t('case.error_opening_case', interaction.guild?.id),
      color: 0x03168f,
      user: interaction.user
    });
    
    return interaction.editReply({ 
      embeds: [embed], 
      components: [] 
    });
  }
}

export const guildOnly = false;
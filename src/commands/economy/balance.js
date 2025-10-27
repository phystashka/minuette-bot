import { 
  SlashCommandBuilder,
  ButtonBuilder, 
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} from 'discord.js';
import { getPonyByUserId, depositToBank, withdrawFromBank } from '../../models/PonyModel.js';
import { getDiamonds, getResourcesByUserId } from '../../models/ResourceModel.js';
import { getHarmony } from '../../models/HarmonyModel.js';
import { createEmbed } from '../../utils/components.js';
import { t } from '../../utils/localization.js';

const protectedBitsStore = new Map();
const PROTECTION_DURATION = 5 * 60 * 1000;

export function setProtectedBits(userId, amount) {
  const expiresAt = Date.now() + PROTECTION_DURATION;
  protectedBitsStore.set(userId, { amount, expiresAt });
  
  setTimeout(() => {
    protectedBitsStore.delete(userId);
  }, PROTECTION_DURATION);
}

export function getProtectedBits(userId) {
  const protection = protectedBitsStore.get(userId);
  if (!protection) return 0;
  
  if (Date.now() > protection.expiresAt) {
    protectedBitsStore.delete(userId);
    return 0;
  }
  
  return protection.amount;
}

export function hasProtectedBits(userId) {
  return getProtectedBits(userId) > 0;
}

const createBankWithAmountSelection = async (pony, user, guildId, diamonds, harmony, resources, action) => {
  const headerText = new TextDisplayBuilder()
    .setContent(`**${user.username}'s Balance**\n-# Your financial overview and currency status`);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const balanceContent = new TextDisplayBuilder()
    .setContent(`<:bits:1429131029628588153> **Cash:** \`${pony.bits.toLocaleString()} bits\`\n<:bits:1429131029628588153> **Bank:** \`${(pony.bank_balance || 0).toLocaleString()} bits\`\n<a:diamond:1423629073984524298> **Diamonds:** \`${diamonds.toLocaleString()} diamonds\`\n<:harmony:1416514347789844541> **Harmony:** \`${harmony.toLocaleString()} harmony\`\n<:magic_coin:1431797469666217985> **Magic Coins:** \`${(resources?.magic_coins || 0).toLocaleString()} magic coins\``);

  const instructionText = new TextDisplayBuilder()
    .setContent(action === 'deposit' 
      ? '**Select Deposit Amount**\n-# Choose how many bits to deposit into your bank'
      : '**Select Withdraw Amount**\n-# Choose how many bits to withdraw from your bank');

  const amount100Button = new ButtonBuilder()
    .setCustomId(`bank_${action}_100`)
    .setLabel('100 bits')
    .setStyle(ButtonStyle.Secondary);

  const amount500Button = new ButtonBuilder()
    .setCustomId(`bank_${action}_500`)
    .setLabel('500 bits')
    .setStyle(ButtonStyle.Secondary);

  const amount1000Button = new ButtonBuilder()
    .setCustomId(`bank_${action}_1000`)
    .setLabel('1000 bits')
    .setStyle(ButtonStyle.Secondary);

  const amount5000Button = new ButtonBuilder()
    .setCustomId(`bank_${action}_5000`)
    .setLabel('5000 bits')
    .setStyle(ButtonStyle.Secondary);

  const amountAllButton = new ButtonBuilder()
    .setCustomId(`bank_${action}_all`)
    .setLabel('All bits')
    .setStyle(ButtonStyle.Secondary);

  const amountSection1 = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**Quick Amounts**')
    )
    .setButtonAccessory(amount100Button);

  const amountSection2 = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Small amount for testing')
    )
    .setButtonAccessory(amount500Button);

  const amountSection3 = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Medium amount for regular transactions')
    )
    .setButtonAccessory(amount1000Button);

  const amountSection4 = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Large amount for big transactions')
    )
    .setButtonAccessory(amount5000Button);

  const amountSection5 = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Transfer everything you have')
    )
    .setButtonAccessory(amountAllButton);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(headerText)
    .addSeparatorComponents(separator)
    .addTextDisplayComponents(balanceContent)
    .addSeparatorComponents(separator)
    .addTextDisplayComponents(instructionText)
    .addSeparatorComponents(separator)
    .addSectionComponents(amountSection1)
    .addSectionComponents(amountSection2)
    .addSectionComponents(amountSection3)
    .addSectionComponents(amountSection4)
    .addSectionComponents(amountSection5);

  return container;
};

const createBankComponentsV2 = async (pony, user, guildId, diamonds, harmony, resources) => {
  const headerText = new TextDisplayBuilder()
    .setContent(`**${user.username}'s Balance**\n-# Your financial overview and currency status`);

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const balanceContent = new TextDisplayBuilder()
    .setContent(`<:bits:1429131029628588153> **Cash:** \`${pony.bits.toLocaleString()} bits\`\n<:bits:1429131029628588153> **Bank:** \`${(pony.bank_balance || 0).toLocaleString()} bits\`\n<a:diamond:1423629073984524298> **Diamonds:** \`${diamonds.toLocaleString()} diamonds\`\n<:harmony:1416514347789844541> **Harmony:** \`${harmony.toLocaleString()} harmony\`\n<:magic_coin:1431797469666217985> **Magic Coins:** \`${(resources?.magic_coins || 0).toLocaleString()} magic coins\``);

  const depositButton = new ButtonBuilder()
    .setCustomId('bank_deposit')
    .setLabel('Deposit')
    .setStyle(ButtonStyle.Secondary);

  const withdrawButton = new ButtonBuilder()
    .setCustomId('bank_withdraw')
    .setLabel('Withdraw')
    .setStyle(ButtonStyle.Secondary);

  const depositSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**Bank Operations**'),
      new TextDisplayBuilder().setContent('Deposit bits into your bank for safekeeping')
    )
    .setButtonAccessory(depositButton);

  const withdrawSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('Withdraw bits from your bank when needed')
    )
    .setButtonAccessory(withdrawButton);

  const container = new ContainerBuilder()
    .addTextDisplayComponents(headerText)
    .addSeparatorComponents(separator)
    .addTextDisplayComponents(balanceContent)
    .addSeparatorComponents(separator)
    .addSectionComponents(depositSection)
    .addSectionComponents(withdrawSection);

  return container;
};

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Your cash and bank balance')
  .setDMPermission(false);

export async function execute(interaction) {
  try {
    console.log('[BANK-CMD] Bank command executed by', interaction.user.tag);
    const pony = await getPonyByUserId(interaction.user.id);
    const guildId = interaction.guild?.id;
    
    if (!pony) {
      const noPonyText = new TextDisplayBuilder()
        .setContent('You need to create a pony first! Use `/equestria` to get started.');
      
      const noPonyContainer = new ContainerBuilder()
        .addTextDisplayComponents(noPonyText);
      
      return await interaction.reply({ 
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [noPonyContainer]
      });
    }

    const diamonds = await getDiamonds(interaction.user.id);
    const harmony = await getHarmony(interaction.user.id);
    const resources = await getResourcesByUserId(interaction.user.id);

    console.log('[BANK-CMD] Found pony:', pony);
    const container = await createBankComponentsV2(pony, interaction.user, guildId, diamonds, harmony, resources);

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  } catch (error) {
    console.error('[BANK-CMD] Error in bank command:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred while fetching your balance.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [errorContainer]
    });
  }
}

export async function handleButton(interaction) {
  try {
    console.log('[BANK-BTN] Button interaction received');
    console.log('[BANK-BTN] Custom ID:', interaction.customId);
    console.log('[BANK-BTN] User:', interaction.user.tag);

    const message = await interaction.message;
    const guildId = interaction.guild?.id;
    if (message.interaction && message.interaction.user.id !== interaction.user.id) {
      console.log('[BANK-BTN] Access denied - wrong user');
      
      const accessDeniedText = new TextDisplayBuilder()
        .setContent('Only the pony who opened this bank account can use these buttons!');
      
      const accessDeniedContainer = new ContainerBuilder()
        .addTextDisplayComponents(accessDeniedText);
      
      try {
        return await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [accessDeniedContainer]
        });
      } catch (replyError) {
        console.log('Failed to reply to unauthorized user in bank interaction:', replyError.code);
        return;
      }
    }

    const parts = interaction.customId.split('_');
    console.log('[BANK-BTN] CustomId parts:', parts);

    const [context, ...restParts] = parts;
    if (context !== 'bank') {
      console.log('[BANK-BTN] Not a bank button, ignoring');
      return;
    }

    const pony = await getPonyByUserId(interaction.user.id);
    if (!pony) {
      console.log('[BANK-BTN] Pony not found');
      
      const ponyNotFoundText = new TextDisplayBuilder()
        .setContent('You need to create a pony first! Use `/equestria` to get started.');
      
      const ponyNotFoundContainer = new ContainerBuilder()
        .addTextDisplayComponents(ponyNotFoundText);
      
      return await interaction.reply({ 
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [ponyNotFoundContainer]
      });
    }

    console.log('[BANK-BTN] Current pony state:', pony);

    if (restParts.length === 1) {
      const action = restParts[0];

      if (action === 'deposit' || action === 'withdraw') {
        console.log('[BANK-BTN] Showing amount selection for:', action);

        const diamonds = await getDiamonds(interaction.user.id);
        const harmony = await getHarmony(interaction.user.id);
        const resources = await getResourcesByUserId(interaction.user.id);
        
        const container = await createBankWithAmountSelection(pony, interaction.user, guildId, diamonds, harmony, resources, action);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
        });
        return;
      }
    } else if (restParts.length === 2) {
      const [action, amount] = restParts;
      
      if ((action === 'deposit' || action === 'withdraw') && amount) {
        console.log('[BANK-BTN] Processing amount transaction');
        console.log('[BANK-BTN] Action:', action, 'Amount:', amount);

        const isDeposit = action === 'deposit';
        let amountToMove = parseInt(amount);

        if (amount === 'all') {
          amountToMove = isDeposit ? pony.bits : (pony.bank_balance || 0);
          console.log('[BANK-BTN] Using ALL amount:', amountToMove);
        }

        console.log('[BANK-BTN] Amount to move:', amountToMove);

        if (amountToMove <= 0) {
          console.log('[BANK-BTN] Invalid amount - showing regular balance');
          
          const diamonds = await getDiamonds(interaction.user.id);
          const harmony = await getHarmony(interaction.user.id);
          const resources = await getResourcesByUserId(interaction.user.id);
          const container = await createBankComponentsV2(pony, interaction.user, guildId, diamonds, harmony, resources);
          
          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            content: null
          });
          return;
        }

        if (isDeposit && amountToMove > pony.bits) {
          console.log('[BANK-BTN] Insufficient cash for deposit');
          
          const insufficientText = new TextDisplayBuilder()
            .setContent(`You don't have enough cash! You have ${pony.bits.toLocaleString()} bits but need ${amountToMove.toLocaleString()} bits.`);
          
          const insufficientContainer = new ContainerBuilder()
            .addTextDisplayComponents(insufficientText);
          
          return await interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [insufficientContainer]
          });
        }

        if (!isDeposit && amountToMove > (pony.bank_balance || 0)) {
          console.log('[BANK-BTN] Insufficient bank balance for withdrawal');
          
          const insufficientText = new TextDisplayBuilder()
            .setContent(`You don't have enough bits in your bank! You have ${(pony.bank_balance || 0).toLocaleString()} bits but need ${amountToMove.toLocaleString()} bits.`);
          
          const insufficientContainer = new ContainerBuilder()
            .addTextDisplayComponents(insufficientText);
          
          return await interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [insufficientContainer]
          });
        }

        if (isDeposit) {
          await depositToBank(interaction.user.id, amountToMove);
          console.log('[BANK-BTN] Deposited', amountToMove, 'bits');
        } else {
          await withdrawFromBank(interaction.user.id, amountToMove);
          console.log('[BANK-BTN] Withdrew', amountToMove, 'bits');
          
          const updatedPony = await getPonyByUserId(interaction.user.id);
          const totalCashBits = updatedPony.bits;
          setProtectedBits(interaction.user.id, totalCashBits);
          console.log('[BANK-BTN] Protected', totalCashBits, 'bits from theft for 5 minutes');
        }

        const updatedPony = await getPonyByUserId(interaction.user.id);
        console.log('[BANK-BTN] After transaction - Cash:', updatedPony.bits, 'Bank:', updatedPony.bank_balance || 0);

        const diamonds = await getDiamonds(interaction.user.id);
        const harmony = await getHarmony(interaction.user.id);
        const resources = await getResourcesByUserId(interaction.user.id);

        const container = await createBankComponentsV2(updatedPony, interaction.user, guildId, diamonds, harmony, resources);
        
        const successText = new TextDisplayBuilder()
          .setContent(isDeposit
            ? `**Deposit Successful**\n-# Deposited ${amountToMove.toLocaleString()} bits into your bank`
            : `**Withdrawal Successful**\n-# Withdrew ${amountToMove.toLocaleString()} bits from your bank`);
        
        const successSeparator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);

        container.addSeparatorComponents(successSeparator);
        container.addTextDisplayComponents(successText);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
          content: null
        });
        return;
      }
    } else if (restParts.length === 3) {
      const [action, type, amount] = restParts;
      
      if (type === 'amount') {
        console.log('[BANK-BTN] Processing amount transaction');
        console.log('[BANK-BTN] Action:', action, 'Amount:', amount);

        const isDeposit = action === 'deposit';
        let amountToMove = parseInt(amount);

        if (amount === 'all') {
          amountToMove = isDeposit ? pony.bits : (pony.bank_balance || 0);
          console.log('[BANK-BTN] Using ALL amount:', amountToMove);
        }

        if (amountToMove <= 0) {
          console.log('[BANK-BTN] Invalid amount - showing regular balance:', amountToMove);
          
          const diamonds = await getDiamonds(interaction.user.id);
          const harmony = await getHarmony(interaction.user.id);
          const resources = await getResourcesByUserId(interaction.user.id);
          const container = await createBankComponentsV2(pony, interaction.user, guildId, diamonds, harmony, resources);
          
          return await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            content: null
          });
        }

        console.log(`[BANK-BTN] Attempting to ${isDeposit ? 'deposit' : 'withdraw'} ${amountToMove} bits for user ${interaction.user.id}`);
        console.log('[BANK-BTN] Before transaction - Cash:', pony.bits, 'Bank:', pony.bank_balance || 0);

        const success = isDeposit
          ? await depositToBank(interaction.user.id, amountToMove)
          : await withdrawFromBank(interaction.user.id, amountToMove);

        console.log('[BANK-BTN] Transaction result:', success);

        if (!success) {
          const errorMessage = isDeposit
            ? `You don't have enough cash! You have ${pony.bits.toLocaleString()} bits but need ${amountToMove.toLocaleString()} bits.`
            : `You don't have enough bits in your bank! You have ${(pony.bank_balance || 0).toLocaleString()} bits but need ${amountToMove.toLocaleString()} bits.`;

          console.log('[BANK-BTN] Transaction failed:', errorMessage);
          
          const failureText = new TextDisplayBuilder()
            .setContent(errorMessage);
          
          const failureContainer = new ContainerBuilder()
            .addTextDisplayComponents(failureText);
            
          return await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [failureContainer]
          });
        }

        if (!isDeposit) {
          const updatedPony = await getPonyByUserId(interaction.user.id);
          const totalCashBits = updatedPony.bits;
          setProtectedBits(interaction.user.id, totalCashBits);
          console.log('[BANK-BTN] Protected', totalCashBits, 'bits from theft for 5 minutes');
        }

        const updatedPony = await getPonyByUserId(interaction.user.id);
        console.log('[BANK-BTN] After transaction - Cash:', updatedPony.bits, 'Bank:', updatedPony.bank_balance || 0);

        const diamonds = await getDiamonds(interaction.user.id);
        const harmony = await getHarmony(interaction.user.id);
        const resources = await getResourcesByUserId(interaction.user.id);

        const container = await createBankComponentsV2(updatedPony, interaction.user, guildId, diamonds, harmony, resources);
        
        const successText = new TextDisplayBuilder()
          .setContent(isDeposit
            ? `**Deposit Successful**\n-# Deposited ${amountToMove.toLocaleString()} bits into your bank`
            : `**Withdrawal Successful**\n-# Withdrew ${amountToMove.toLocaleString()} bits from your bank`);
        
        const successSeparator = new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small);

        container.addSeparatorComponents(successSeparator);
        container.addTextDisplayComponents(successText);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
          content: null
        });
        return;
      }
    }

    console.log('[BANK-BTN] Unknown button format:', parts);
    
  } catch (error) {
    console.error('[BANK-BTN] Error in bank button handler:', error);
    console.error('[BANK-BTN] Stack trace:', error.stack);
    
    const errorText = new TextDisplayBuilder()
      .setContent('An error occurred while processing your bank transaction.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    try {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorContainer]
      });
    } catch (replyError) {
      console.error('[BANK-BTN] Failed to send error reply:', replyError);
      try {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [errorContainer]
        });
      } catch (updateError) {
        console.error('[BANK-BTN] Failed to update with error:', updateError);
      }
    }
  }
}

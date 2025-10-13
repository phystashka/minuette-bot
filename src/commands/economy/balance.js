import { SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getPonyByUserId, depositToBank, withdrawFromBank } from '../../models/PonyModel.js';
import { getDiamonds } from '../../models/ResourceModel.js';
import { getHarmony } from '../../models/HarmonyModel.js';
import { createEmbed } from '../../utils/components.js';
import { t } from '../../utils/localization.js';

const createBankEmbed = async (pony, user, guildId, diamonds, harmony) => {
  return createEmbed({
    title: `${await t('balance.your_balance', guildId)} — ${user.username}`,
    fields: [
      { name: `> <:bits:1411354539935666197> ${await t('balance.cash', guildId)} ${await t('balance.bits', guildId)}`, value: `\`\`\`${pony.bits} ${await t('currency.bits', guildId)}\`\`\``, inline: true },
      { name: `> <:bits:1411354539935666197> ${await t('balance.bank', guildId)} ${await t('balance.bits', guildId)}`, value: `\`\`\`${pony.bank_balance || 0} ${await t('currency.bits', guildId)}\`\`\``, inline: true },
      { name: `> <a:diamond:1423629073984524298> Diamonds`, value: `\`\`\`${diamonds} diamonds\`\`\``, inline: true },
      { name: `> <:harmony:1416514347789844541> Harmony`, value: `\`\`\`${harmony} harmony\`\`\``, inline: true }
    ],
    user: user,
    color: 0x03168f
  });
};

const createAmountButtons = async (customId, guildId, disabled = false) => {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`${customId}_100`)
        .setLabel(`100 ${await t('currency.bits', guildId)}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`${customId}_500`)
        .setLabel(`500 ${await t('currency.bits', guildId)}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`${customId}_1000`)
        .setLabel(`1000 ${await t('currency.bits', guildId)}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`${customId}_5000`)
        .setLabel(`5000 ${await t('currency.bits', guildId)}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`${customId}_all`)
        .setLabel(`${await t('balance.all', guildId)} ${await t('currency.bits', guildId)}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    );
};

const createActionButtons = async (guildId) => {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('bank_deposit')
        .setLabel(await t('balance.deposit', guildId))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('bank_withdraw')
        .setLabel(await t('balance.withdraw', guildId))
        .setStyle(ButtonStyle.Secondary)
    );
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
      return await interaction.reply({ 
        content: await t('balance.need_pony', guildId), 
        ephemeral: true 
      });
    }


    const diamonds = await getDiamonds(interaction.user.id);
    const harmony = await getHarmony(interaction.user.id);

    console.log('[BANK-CMD] Found pony:', pony);
    const embed = await createBankEmbed(pony, interaction.user, guildId, diamonds, harmony);
    const actionRow = await createActionButtons(guildId);

    await interaction.reply({
      embeds: [embed],
      components: [actionRow]
    });
  } catch (error) {
    console.error('[BANK-CMD] Error in bank command:', error);
    await interaction.reply({
      embeds: [
        createEmbed({
          title: await t('balance.title', interaction.guild?.id),
          description: await t('error.generic', interaction.guild?.id),
          user: interaction.user,
          color: 0x03168f
        })
      ],
      ephemeral: true
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
      return await interaction.reply({
        content: await t('balance.button_access_denied', guildId),
        ephemeral: true
      });
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
      return await interaction.reply({ 
        content: await t('balance.pony_not_found', guildId), 
        ephemeral: true 
      });
    }

    console.log('[BANK-BTN] Current pony state:', pony);

    if (restParts.length === 1) {
      const action = restParts[0];

      if (action === 'deposit' || action === 'withdraw') {
        console.log('[BANK-BTN] Showing amount selection for:', action);
        const amountRow = await createAmountButtons(`bank_${action}_amount`, guildId);
        

        const diamonds = await getDiamonds(interaction.user.id);
        const harmony = await getHarmony(interaction.user.id);
        
        const embed = await createBankEmbed(pony, interaction.user, guildId, diamonds, harmony);
        
        embed.setDescription(action === 'deposit' 
          ? await t('balance.select_deposit_amount', guildId)
          : await t('balance.select_withdraw_amount', guildId));

        await interaction.update({
          embeds: [embed],
          components: [amountRow],
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
          console.log('[BANK-BTN] Invalid amount:', amountToMove);
          return await interaction.update({
            content: await t('balance.cannot_move_zero', guildId),
            components: [await createActionButtons(guildId)]
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
            ? await t('balance.insufficient_cash', guildId, { current: pony.bits, required: amountToMove })
            : await t('balance.insufficient_bank', guildId, { current: pony.bank_balance || 0, required: amountToMove });

          console.log('[BANK-BTN] Transaction failed:', errorMessage);
          return await interaction.update({
            embeds: [createEmbed({
              title: await t('balance.insufficient_funds', guildId),
              description: errorMessage,
              user: interaction.user
            })],
            components: [await createActionButtons(guildId)]
          });
        }

        const updatedPony = await getPonyByUserId(interaction.user.id);
        console.log('[BANK-BTN] After transaction - Cash:', updatedPony.bits, 'Bank:', updatedPony.bank_balance || 0);


        const diamonds = await getDiamonds(interaction.user.id);
        const harmony = await getHarmony(interaction.user.id);

        const embed = await createBankEmbed(updatedPony, interaction.user, guildId, diamonds, harmony);
        embed.setDescription(isDeposit
          ? await t('balance.deposit_success', guildId, { amount: amountToMove })
          : await t('balance.withdraw_success', guildId, { amount: amountToMove }));

        await interaction.update({
          embeds: [embed],
          components: [await createActionButtons(guildId)],
          content: null
        });
        return;
      }
    }

    console.log('[BANK-BTN] Unknown button format:', parts);
    
  } catch (error) {
    console.error('[BANK-BTN] Error in bank button handler:', error);
    console.error('[BANK-BTN] Stack trace:', error.stack);
    try {
      await interaction.reply({
        embeds: [
          createEmbed({
            title: await t('error.title', guildId),
            description: await t('error.generic', guildId),
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    } catch (replyError) {
      console.error('[BANK-BTN] Failed to send error reply:', replyError);
      try {
        await interaction.update({
          embeds: [
            createEmbed({
              title: await t('error.title', guildId),
              description: await t('error.generic', guildId),
              user: interaction.user
            })
          ],
          components: [],
        });
      } catch (updateError) {
        console.error('[BANK-BTN] Failed to update with error:', updateError);
      }
    }
  }
}
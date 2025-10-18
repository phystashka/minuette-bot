import { Events, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } from 'discord.js';
import { addDiamonds } from '../models/ResourceModel.js';

function createSuccessContainer(skuName, diamondsAmount, newTotal) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent('**Purchase Successful**');
  container.addTextDisplayComponents(titleText);
  
  const thanksText = new TextDisplayBuilder()
    .setContent(`Thank you for your purchase of **${skuName}**!`);
  container.addTextDisplayComponents(thanksText);
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const receivedText = new TextDisplayBuilder()
    .setContent(`**You received:** <a:diamond:1423629073984524298> **${diamondsAmount} Diamonds**`);
  container.addTextDisplayComponents(receivedText);
  
  const totalText = new TextDisplayBuilder()
    .setContent(`**Your total balance:** <a:diamond:1423629073984524298> **${newTotal} Diamonds**`);
  container.addTextDisplayComponents(totalText);
  
  const readyText = new TextDisplayBuilder()
    .setContent('Your diamonds have been added to your account and are ready to use!');
  container.addTextDisplayComponents(readyText);
  
  const separator2 = new SeparatorBuilder();
  container.addSeparatorComponents(separator2);
  
  const footerText = new TextDisplayBuilder()
    .setContent('Thank you for supporting the bot!');
  container.addTextDisplayComponents(footerText);
  
  return container;
}

function createErrorContainer(skuName, transactionId) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent('**Purchase Processing Issue**');
  container.addTextDisplayComponents(titleText);
  
  const issueText = new TextDisplayBuilder()
    .setContent(`We received your purchase of **${skuName}** but encountered an issue adding the diamonds to your account.`);
  container.addTextDisplayComponents(issueText);
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  const supportText = new TextDisplayBuilder()
    .setContent(`**Transaction ID:** \`${transactionId}\``);
  container.addTextDisplayComponents(supportText);
  
  const contactText = new TextDisplayBuilder()
    .setContent('Please contact support with this transaction ID. We will resolve this as soon as possible!');
  container.addTextDisplayComponents(contactText);
  
  return container;
}

const STORE_SKUS = {
  '1429064053002600609': {
    name: 'Mayor Mare',
    diamonds: 150,
    description: 'Premium purchase - 150 gems'
  },
  '1429147263833211040': {
    name: 'Test Purchase',
    diamonds: 1,
    description: 'Test item - 1 diamond'
  },
  '1429151551695487048': {
    name: 'Diamond Pack Small',
    diamonds: 150,
    description: 'Small diamond pack - 150 diamonds'
  },
  '1429152704281706566': {
    name: 'Diamond Pack Medium',
    diamonds: 500,
    description: 'Medium diamond pack - 500 diamonds'
  },
  '1429153155203203112': {
    name: 'Diamond Pack Large',
    diamonds: 750,
    description: 'Large diamond pack - 750 diamonds'
  },
  '1429153529087529121': {
    name: 'Diamond Pack Mega',
    diamonds: 5000,
    description: 'Mega diamond pack - 5000 diamonds'
  }
};

export const name = Events.EntitlementCreate;

export async function execute(entitlement) {
  try {
    console.log('[STORE] New entitlement created:', {
      id: entitlement.id,
      skuId: entitlement.skuId,
      userId: entitlement.userId,
      guildId: entitlement.guildId,
      type: entitlement.type
    });
    
    const skuConfig = STORE_SKUS[entitlement.skuId];
    if (!skuConfig) {
      console.log(`[STORE] Unknown SKU ID: ${entitlement.skuId}`);
      return;
    }
    
    const userId = entitlement.userId;
    const diamondsAmount = skuConfig.diamonds;
    
    console.log(`[STORE] Processing purchase: ${skuConfig.name} - ${diamondsAmount} diamonds for user ${userId}`);
    
    try {
      const newTotal = await addDiamonds(userId, diamondsAmount);
      console.log(`[STORE] Successfully added ${diamondsAmount} diamonds to user ${userId}. New total: ${newTotal}`);
      
      try {
        const user = await entitlement.client.users.fetch(userId);
        if (user) {
          const dmChannel = await user.createDM();
          const successContainer = createSuccessContainer(skuConfig.name, diamondsAmount, newTotal);
          
          await dmChannel.send({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2
          });
          console.log(`[STORE] Sent confirmation DM to user ${userId}`);
        }
      } catch (dmError) {
        console.log(`[STORE] Could not send DM to user ${userId}:`, dmError.message);
      }
      
      const timestamp = new Date().toISOString();
      console.log(`[STORE AUDIT] ${timestamp} - User ${userId} purchased ${skuConfig.name} (SKU: ${entitlement.skuId}) - Received ${diamondsAmount} diamonds`);
      
    } catch (error) {
      console.error(`[STORE] Error adding diamonds to user ${userId}:`, error);
      
      try {
        const user = await entitlement.client.users.fetch(userId);
        if (user) {
          const dmChannel = await user.createDM();
          const errorContainer = createErrorContainer(skuConfig.name, entitlement.id);
          
          await dmChannel.send({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
          });
        }
      } catch (notifyError) {
        console.error(`[STORE] Could not notify user ${userId} of processing issue:`, notifyError);
      }
    }
    
  } catch (error) {
    console.error('[STORE] Error processing entitlement:', error);
  }
}
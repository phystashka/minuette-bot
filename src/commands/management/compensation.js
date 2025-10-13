import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { addBits, removeBits } from '../../utils/pony/index.js';
import { addResource, removeResource, getResourceAmount, addCases, removeCases, addDiamonds, removeDiamonds } from '../../models/ResourceModel.js';
import { addGifts, removeGifts } from '../../models/ResourceModel.js';
import { successEmbed, errorEmbed, createEmbed } from '../../utils/components.js';
import { addHarmony, removeHarmony } from '../../models/HarmonyModel.js';

export const data = new SlashCommandBuilder()
  .setName('compensation')
  .setDescription('Add or remove various resources from a user (Private admin command)')
  .setDMPermission(false)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Target user')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('action')
      .setDescription('Add or remove resources')
      .setRequired(true)
      .addChoices(
        { name: 'Add', value: 'add' },
        { name: 'Remove', value: 'remove' }
      ))
  .addIntegerOption(option =>
    option.setName('wood')
      .setDescription('Wood resource amount')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('stone')
      .setDescription('Stone resource amount')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('tools')
      .setDescription('Tools resource amount')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('bits')
      .setDescription('Bits amount')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('harmony')
      .setDescription('Harmony amount')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('expansion_plans')
      .setDescription('Expansion plans resource amount')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('cases')
      .setDescription('Cases amount')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('gifts')
      .setDescription('Gifts amount')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('pumpkins')
      .setDescription('Pumpkins amount (Halloween resource)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('candies')
      .setDescription('Candies amount (Halloween resource)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('keys')
      .setDescription('Keys amount (for opening cases)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('apples')
      .setDescription('Apples amount (farm resource)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('eggs')
      .setDescription('Eggs amount (farm resource)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('milk')
      .setDescription('Milk amount (farm resource)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('forest_herbs')
      .setDescription('Forest Herbs amount (potion ingredient)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('bone_dust')
      .setDescription('Bone Dust amount (potion ingredient)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('moonstone_shard')
      .setDescription('Moonstone Shard amount (potion ingredient)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('diamonds')
      .setDescription('Diamonds amount (premium currency)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for the compensation')
      .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);


export const guildOnly = true;
export const guildId = '1415332959728304170';
const authorizedUserId = '1372601851781972038';

export async function execute(interaction) {
  try {

    if (interaction.user.id !== authorizedUserId) {
      const embed = errorEmbed('You are not authorized to use this command.', 'Access Denied');
      return interaction.reply({ embeds: [embed], flags: 64 });
    }


    if (interaction.guild.id !== '1415332959728304170') {
      const embed = errorEmbed('This command can only be used in the designated server.', 'Wrong Server');
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    const targetUser = interaction.options.getUser('user');
    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    const resources = {
      wood: interaction.options.getInteger('wood'),
      stone: interaction.options.getInteger('stone'),
      tools: interaction.options.getInteger('tools'),
      bits: interaction.options.getInteger('bits'),
      harmony: interaction.options.getInteger('harmony'),
      expansion_plans: interaction.options.getInteger('expansion_plans'),
      cases: interaction.options.getInteger('cases'),
      gifts: interaction.options.getInteger('gifts'),
      pumpkins: interaction.options.getInteger('pumpkins'),
      candies: interaction.options.getInteger('candies'),
      keys: interaction.options.getInteger('keys'),
      apples: interaction.options.getInteger('apples'),
      eggs: interaction.options.getInteger('eggs'),
      milk: interaction.options.getInteger('milk'),
      forest_herbs: interaction.options.getInteger('forest_herbs'),
      bone_dust: interaction.options.getInteger('bone_dust'),
      moonstone_shard: interaction.options.getInteger('moonstone_shard'),
      diamonds: interaction.options.getInteger('diamonds')
    };


    const hasAnyResource = Object.values(resources).some(value => value !== null && value > 0);
    if (!hasAnyResource) {
      const embed = errorEmbed('Please specify at least one resource with a positive amount.', 'No Resources Specified');
      return interaction.reply({ embeds: [embed], flags: 64 });
    }


    const results = [];
    const dmMessages = [];
    
    try {

      if (resources.wood) {
        if (action === 'add') {
          await addResource(targetUser.id, 'wood', resources.wood);
          results.push(`✅ Added ${resources.wood} wood`);
          dmMessages.push(`+ ${resources.wood} <:wooden:1426514988134301787> Wood`);
        } else {
          const removed = await removeResource(targetUser.id, 'wood', resources.wood);
          if (removed) {
            results.push(`✅ Removed ${resources.wood} wood`);
            dmMessages.push(`- ${resources.wood} <:wooden:1426514988134301787> Wood`);
          } else {
            results.push(`❌ Failed to remove ${resources.wood} wood (insufficient resources)`);
          }
        }
      }

      if (resources.stone) {
        if (action === 'add') {
          await addResource(targetUser.id, 'stone', resources.stone);
          results.push(`✅ Added ${resources.stone} stone`);
          dmMessages.push(`+ ${resources.stone} <:stones:1426514985865056326> Stone`);
        } else {
          const removed = await removeResource(targetUser.id, 'stone', resources.stone);
          if (removed) {
            results.push(`✅ Removed ${resources.stone} stone`);
            dmMessages.push(`- ${resources.stone} <:stones:1426514985865056326> Stone`);
          } else {
            results.push(`❌ Failed to remove ${resources.stone} stone (insufficient resources)`);
          }
        }
      }

      if (resources.tools) {
        if (action === 'add') {
          await addResource(targetUser.id, 'tools', resources.tools);
          results.push(`✅ Added ${resources.tools} tools`);
          dmMessages.push(`+ ${resources.tools} <:tool:1426514983159599135> Tools`);
        } else {
          const removed = await removeResource(targetUser.id, 'tools', resources.tools);
          if (removed) {
            results.push(`✅ Removed ${resources.tools} tools`);
            dmMessages.push(`- ${resources.tools} <:tool:1426514983159599135> Tools`);
          } else {
            results.push(`❌ Failed to remove ${resources.tools} tools (insufficient resources)`);
          }
        }
      }

      if (resources.expansion_plans) {
        if (action === 'add') {
          await addResource(targetUser.id, 'expansion_plans', resources.expansion_plans);
          results.push(`✅ Added ${resources.expansion_plans} expansion plans`);
          dmMessages.push(`+ ${resources.expansion_plans} <:cartography:1418286057585250438> Expansion Plans`);
        } else {
          const removed = await removeResource(targetUser.id, 'expansion_plans', resources.expansion_plans);
          if (removed) {
            results.push(`✅ Removed ${resources.expansion_plans} expansion plans`);
            dmMessages.push(`- ${resources.expansion_plans} <:cartography:1418286057585250438> Expansion Plans`);
          } else {
            results.push(`❌ Failed to remove ${resources.expansion_plans} expansion plans (insufficient resources)`);
          }
        }
      }

      if (resources.bits) {
        if (action === 'add') {
          try {
            const success = await addBits(targetUser.id, resources.bits);
            console.log(`[COMPENSATION] addBits result for ${targetUser.id}: ${success}`);
            if (success) {
              results.push(`✅ Added ${resources.bits} bits`);
              dmMessages.push(`+ ${resources.bits} <:bits:1411354539935666197> Bits`);
            } else {
              results.push(`❌ Failed to add ${resources.bits} bits`);
            }
          } catch (error) {
            console.error(`[COMPENSATION] Error adding bits: ${error.message}`);
            results.push(`❌ Failed to add ${resources.bits} bits (error: ${error.message})`);
          }
        } else {
          try {
            const success = await removeBits(targetUser.id, resources.bits);
            console.log(`[COMPENSATION] removeBits result for ${targetUser.id}: ${success}`);
            if (success) {
              results.push(`✅ Removed ${resources.bits} bits`);
              dmMessages.push(`- ${resources.bits} <:bits:1411354539935666197> Bits`);
            } else {
              results.push(`❌ Failed to remove ${resources.bits} bits (insufficient bits)`);
            }
          } catch (error) {
            console.error(`[COMPENSATION] Error removing bits: ${error.message}`);
            results.push(`❌ Failed to remove ${resources.bits} bits (error: ${error.message})`);
          }
        }
      }

      if (resources.harmony) {
        if (action === 'add') {
          await addHarmony(targetUser.id, resources.harmony);
          results.push(`✅ Added ${resources.harmony} harmony`);
          dmMessages.push(`+ ${resources.harmony} <:harmony:1416514347789844541> Harmony`);
        } else {
          const removed = await removeHarmony(targetUser.id, resources.harmony);
          if (removed) {
            results.push(`✅ Removed ${resources.harmony} harmony`);
            dmMessages.push(`- ${resources.harmony} <:harmony:1416514347789844541> Harmony`);
          } else {
            results.push(`❌ Failed to remove ${resources.harmony} harmony (insufficient harmony)`);
          }
        }
      }

      if (resources.diamonds) {
        if (action === 'add') {
          await addDiamonds(targetUser.id, resources.diamonds);
          results.push(`✅ Added ${resources.diamonds} diamonds`);
          dmMessages.push(`+ ${resources.diamonds} <a:diamond:1423629073984524298> Diamonds`);
        } else {
          const removed = await removeDiamonds(targetUser.id, resources.diamonds);
          if (removed) {
            results.push(`✅ Removed ${resources.diamonds} diamonds`);
            dmMessages.push(`- ${resources.diamonds} <a:diamond:1423629073984524298> Diamonds`);
          } else {
            results.push(`❌ Failed to remove ${resources.diamonds} diamonds (insufficient diamonds)`);
          }
        }
      }

      if (resources.cases) {
        if (action === 'add') {
          await addCases(targetUser.id, resources.cases);
          results.push(`✅ Added ${resources.cases} cases`);
          dmMessages.push(`+ ${resources.cases} <:case:1417301084291993712> Cases`);
        } else {
          const removed = await removeCases(targetUser.id, resources.cases);
          if (removed) {
            results.push(`✅ Removed ${resources.cases} cases`);
            dmMessages.push(`- ${resources.cases} <:case:1417301084291993712> Cases`);
          } else {
            results.push(`❌ Failed to remove ${resources.cases} cases (insufficient cases)`);
          }
        }
      }

      if (resources.gifts) {
        if (action === 'add') {
          await addGifts(targetUser.id, resources.gifts);
          results.push(`✅ Added ${resources.gifts} gifts`);
          dmMessages.push(`+ ${resources.gifts} <:giftdonate:1418946982030082170> Gifts`);
        } else {
          const removed = await removeGifts(targetUser.id, resources.gifts);
          if (removed) {
            results.push(`✅ Removed ${resources.gifts} gifts`);
            dmMessages.push(`- ${resources.gifts} <:giftdonate:1418946982030082170> Gifts`);
          } else {
            results.push(`❌ Failed to remove ${resources.gifts} gifts (insufficient gifts)`);
          }
        }
      }

      if (resources.pumpkins) {
        if (action === 'add') {
          await addResource(targetUser.id, 'pumpkins', resources.pumpkins);
          results.push(`✅ Added ${resources.pumpkins} pumpkins`);
          dmMessages.push(`+ ${resources.pumpkins} 🎃 Pumpkins`);
        } else {
          const removed = await removeResource(targetUser.id, 'pumpkins', resources.pumpkins);
          if (removed) {
            results.push(`✅ Removed ${resources.pumpkins} pumpkins`);
            dmMessages.push(`- ${resources.pumpkins} 🎃 Pumpkins`);
          } else {
            results.push(`❌ Failed to remove ${resources.pumpkins} pumpkins (insufficient pumpkins)`);
          }
        }
      }

      if (resources.candies) {
        if (action === 'add') {
          await addResource(targetUser.id, 'candies', resources.candies);
          results.push(`✅ Added ${resources.candies} candies`);
          dmMessages.push(`+ ${resources.candies} 🍬 Candies`);
        } else {
          const removed = await removeResource(targetUser.id, 'candies', resources.candies);
          if (removed) {
            results.push(`✅ Removed ${resources.candies} candies`);
            dmMessages.push(`- ${resources.candies} 🍬 Candies`);
          } else {
            results.push(`❌ Failed to remove ${resources.candies} candies (insufficient candies)`);
          }
        }
      }

      if (resources.keys) {
        if (action === 'add') {
          await addResource(targetUser.id, 'keys', resources.keys);
          results.push(`✅ Added ${resources.keys} keys`);
          dmMessages.push(`+ ${resources.keys} <a:goldkey:1426332679103709314> Keys`);
        } else {
          const removed = await removeResource(targetUser.id, 'keys', resources.keys);
          if (removed) {
            results.push(`✅ Removed ${resources.keys} keys`);
            dmMessages.push(`- ${resources.keys} <a:goldkey:1426332679103709314> Keys`);
          } else {
            results.push(`❌ Failed to remove ${resources.keys} keys (insufficient keys)`);
          }
        }
      }

      if (resources.apples) {
        if (action === 'add') {
          await addResource(targetUser.id, 'apples', resources.apples);
          results.push(`✅ Added ${resources.apples} apples`);
          dmMessages.push(`+ ${resources.apples} 🍎 Apples`);
        } else {
          const removed = await removeResource(targetUser.id, 'apples', resources.apples);
          if (removed) {
            results.push(`✅ Removed ${resources.apples} apples`);
            dmMessages.push(`- ${resources.apples} 🍎 Apples`);
          } else {
            results.push(`❌ Failed to remove ${resources.apples} apples (insufficient apples)`);
          }
        }
      }

      if (resources.eggs) {
        if (action === 'add') {
          await addResource(targetUser.id, 'eggs', resources.eggs);
          results.push(`✅ Added ${resources.eggs} eggs`);
          dmMessages.push(`+ ${resources.eggs} 🥚 Eggs`);
        } else {
          const removed = await removeResource(targetUser.id, 'eggs', resources.eggs);
          if (removed) {
            results.push(`✅ Removed ${resources.eggs} eggs`);
            dmMessages.push(`- ${resources.eggs} 🥚 Eggs`);
          } else {
            results.push(`❌ Failed to remove ${resources.eggs} eggs (insufficient eggs)`);
          }
        }
      }

      if (resources.milk) {
        if (action === 'add') {
          await addResource(targetUser.id, 'milk', resources.milk);
          results.push(`✅ Added ${resources.milk} milk`);
          dmMessages.push(`+ ${resources.milk} 🥛 Milk`);
        } else {
          const removed = await removeResource(targetUser.id, 'milk', resources.milk);
          if (removed) {
            results.push(`✅ Removed ${resources.milk} milk`);
            dmMessages.push(`- ${resources.milk} 🥛 Milk`);
          } else {
            results.push(`❌ Failed to remove ${resources.milk} milk (insufficient milk)`);
          }
        }
      }

      if (resources.forest_herbs) {
        if (action === 'add') {
          await addResource(targetUser.id, 'forest_herbs', resources.forest_herbs);
          results.push(`✅ Added ${resources.forest_herbs} forest herbs`);
          dmMessages.push(`+ ${resources.forest_herbs} 🌿 Forest Herbs`);
        } else {
          const removed = await removeResource(targetUser.id, 'forest_herbs', resources.forest_herbs);
          if (removed) {
            results.push(`✅ Removed ${resources.forest_herbs} forest herbs`);
            dmMessages.push(`- ${resources.forest_herbs} 🌿 Forest Herbs`);
          } else {
            results.push(`❌ Failed to remove ${resources.forest_herbs} forest herbs (insufficient forest herbs)`);
          }
        }
      }

      if (resources.bone_dust) {
        if (action === 'add') {
          await addResource(targetUser.id, 'bone_dust', resources.bone_dust);
          results.push(`✅ Added ${resources.bone_dust} bone dust`);
          dmMessages.push(`+ ${resources.bone_dust} 🦴 Bone Dust`);
        } else {
          const removed = await removeResource(targetUser.id, 'bone_dust', resources.bone_dust);
          if (removed) {
            results.push(`✅ Removed ${resources.bone_dust} bone dust`);
            dmMessages.push(`- ${resources.bone_dust} 🦴 Bone Dust`);
          } else {
            results.push(`❌ Failed to remove ${resources.bone_dust} bone dust (insufficient bone dust)`);
          }
        }
      }

      if (resources.moonstone_shard) {
        if (action === 'add') {
          await addResource(targetUser.id, 'moonstone_shard', resources.moonstone_shard);
          results.push(`✅ Added ${resources.moonstone_shard} moonstone shards`);
          dmMessages.push(`+ ${resources.moonstone_shard} 🌙 Moonstone Shards`);
        } else {
          const removed = await removeResource(targetUser.id, 'moonstone_shard', resources.moonstone_shard);
          if (removed) {
            results.push(`✅ Removed ${resources.moonstone_shard} moonstone shards`);
            dmMessages.push(`- ${resources.moonstone_shard} 🌙 Moonstone Shards`);
          } else {
            results.push(`❌ Failed to remove ${resources.moonstone_shard} moonstone shards (insufficient moonstone shards)`);
          }
        }
      }

    } catch (error) {
      console.error('Error processing compensation:', error);
      const embed = errorEmbed(`Failed to process compensation: ${error.message}`, 'Processing Error');
      return interaction.reply({ embeds: [embed], flags: 64 });
    }


    const actionText = action === 'add' ? 'Added' : 'Removed';
    const actionEmoji = action === 'add' ? '➕' : '➖';
    
    const embed = createEmbed({
      title: `${actionEmoji} Compensation ${actionText}`,
      description: `**Target:** ${targetUser.displayName || targetUser.username}\n**Action:** ${actionText} resources\n\n**Results:**\n${results.join('\n')}\n\n**Reason:** ${reason}`,
      color: 0x03168f,
      user: interaction.user,
      timestamp: true
    });

    await interaction.reply({ embeds: [embed], flags: 64 });


    if (dmMessages.length > 0) {
      try {
        const dmEmbed = createEmbed({
          title: `${actionEmoji} Resources ${actionText}`,
          description: `**Changes to your resources:**\n\n${dmMessages.join('\n')}\n\n**Reason:** ${reason}`,
          color: 0x03168f,
          timestamp: true
        });

        const { sendDMWithDelete } = await import('../../utils/components.js');
        await sendDMWithDelete(targetUser, { embeds: [dmEmbed] });
        console.log(`✅ DM sent to user ${targetUser.id}`);
      } catch (dmError) {
        console.log(`❌ Could not send DM to user ${targetUser.id}: ${dmError.message}`);
      }
    }

  } catch (error) {
    console.error('Error in compensation command:', error);
    const embed = errorEmbed(`An unexpected error occurred: ${error.message}`, 'Command Error');
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], flags: 64 });
    } else {
      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
}
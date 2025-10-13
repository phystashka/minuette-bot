import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getPonyByUserId } from '../../models/PonyModel.js';
import ResourceModel, { getResourceAmount } from '../../models/ResourceModel.js';
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


    const fields = [];
    

    fields.push(
      { 
        name: `> <:bits:1411354539935666197> Cash`, 
        value: `\`\`\`${(user.bits || 0).toLocaleString()}\`\`\``, 
        inline: true 
      },
      { 
        name: `> <:bits:1411354539935666197> Bank`, 
        value: `\`\`\`${bankBalance.toLocaleString()}\`\`\``, 
        inline: true 
      },
      { 
        name: `> <:harmony:1416514347789844541> Harmony`, 
        value: `\`\`\`${harmony.toLocaleString()}\`\`\``, 
        inline: true 
      }
    );


    fields.push({ name: `> <:wooden:1426514988134301787> Wood`, value: `\`\`\`${wood.toLocaleString()}\`\`\``, inline: true });
    fields.push({ name: `> <:stones:1426514985865056326> Stone`, value: `\`\`\`${stone.toLocaleString()}\`\`\``, inline: true });
    fields.push({ name: `> <:tool:1426514983159599135> Tools`, value: `\`\`\`${tools.toLocaleString()}\`\`\``, inline: true });


    fields.push({ name: `> 🍎 Apples`, value: `\`\`\`${apples.toLocaleString()}\`\`\``, inline: true });
    fields.push({ name: `> 🥚 Eggs`, value: `\`\`\`${eggs.toLocaleString()}\`\`\``, inline: true });
    fields.push({ name: `> 🥛 Milk`, value: `\`\`\`${milk.toLocaleString()}\`\`\``, inline: true });
    fields.push({ name: `> <:cartography:1418286057585250438> Plans`, value: `\`\`\`${expansion_plans.toLocaleString()}\`\`\``, inline: true });


    fields.push({ name: `> 🎃 Pumpkins`, value: `\`\`\`${pumpkins.toLocaleString()}\`\`\``, inline: true });
    fields.push({ name: `> 🍬 Candies`, value: `\`\`\`${candies.toLocaleString()}\`\`\``, inline: true });


    fields.push({ name: `> <:flowers:1420011704825417768> Forest Herbs`, value: `\`\`\`${forestHerbs.toLocaleString()}\`\`\``, inline: true });
    fields.push({ name: `> <:bones:1420011720440680539> Bone Dust`, value: `\`\`\`${boneDust.toLocaleString()}\`\`\``, inline: true });
    fields.push({ name: `> 🌙 Moonstone Shard`, value: `\`\`\`${moonstoneShard.toLocaleString()}\`\`\``, inline: true });


    const embed = createEmbed({
      title: `${await t('inventory.your_inventory', interaction.guild?.id)} — ${targetUser.username}`,
      fields: fields,
      user: targetUser,
      color: 0x03168f
    });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in inventory command:', error);
    await interaction.reply({
      content: await t('errors.generic', interaction.guild?.id),
      flags: MessageFlags.Ephemeral
    });
  }
}
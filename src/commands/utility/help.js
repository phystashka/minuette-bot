import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all available commands')
  .setDMPermission(false);

export async function execute(interaction) {
  const embed = createEmbed({
    title: '📋 Economy Commands',
    description: `Here are all available commands:
\`/venture\` - Go on a venture with your ponies
\`/marry\` - Marry your partner (members only)
\`/adopt\` - Adopt your child (members only)
\`/balance\` - Check your bits balance
\`/battle\` - Battle other ponies
\`/case\` - Open cases for rewards
\`/crime\` - Commit crimes for bits
\`/decorate\` - Decorate your profile
\`/equestria\` - Explore Equestria
\`/farm\` - Manage your farm
\`/feed\` - Feed your ponies to level them up
\`/friendship\` - Your pony collection
\`/inventory\` - View your inventory
\`/knock\` - Knock on doors for treats
\`/leaders\` - View leaderboards
\`/myponies\` - View your ponies and their details
\`/profile\` - View your profile
\`/timely\` - Claim your daily rewards
\`/trade\` - Trade items with other users
\`/transfer_bits\` - Transfer items with other users
\`/zecora_hut\` - Visit Zecora for potions and advice
\`/fav_add\` - Mark a pony as favorite (Donators only)
\`/fav_remove\` - Remove a pony from favorites (Donators only)
\`/pony_alerts\` - Manage pony alerts
\`/blood_moon\` - View Blood Moon event status
\`/rebirth\` - Rebirth for special rewards
\`/breed\` - Breed ponies for new offspring
\`/bingo\` - Play pony bingo for rewards
\`/donate_shop\` - Support the bot development
🗝️ \`/set_spawn\` - Set the spawn channel for ponies (Admin only)
🗝️ \`/remove_spawn\` - Remove the spawn channel (Admin only)
👑 \`/emoji\` - Set your custom emoji for leaderboards (Donators only)
👑 \`/nickname\` - Set or clear custom nicknames for your ponies (Donators only)
👑 \`/nickclear\` - Clear a custom nickname from one of your ponies (Donators only)

-# This bot is a fan-made project. It is not affiliated with or endorsed by Hasbro and is created for entertainment purposes only. All rights to My Little Pony belong to © Hasbro.`,
    color: 0x03168f
  });

  const funEmbed = createEmbed({
    title: '🎨 Fun Commands',
    description: `Here are the fun/creative commands:
\`/ship\` - Ship two users and see their compatibility with a custom image!
\`/filter\` - Apply various filters to images (blur, sepia, demotivator, etc.)
\`/derpibooru\` - Search for pony images on Derpibooru
\`/filter\` - Apply fun filters to images (e.g., blur, sepia)
\`/tictactoe\` - Play Tic Tac Toe with another user
\`/rockpaperscissors\` - Play Rock Paper Scissors with another user`,
    color: 0xff69b4
  });

  const clanEmbed = createEmbed({
    title: '🏰 Clan Commands',
    description: `Clan system commands (requires server membership):
\`/clan\` - View or create your clan with interactive interface
\`/clan_invite [user]\` - Invite a user to your clan
\`/clan_vice [user]\` - Assign a user as vice leader (Owner only)
\`/clan_viceremove [user]\` - Remove vice leader role (Owner only)  
\`/clan_kick [user]\` - Kick a member from your clan (Owner/Vice only)
\`/clan_emblem [image]\` - Set or change your clan emblem (Owner only)`,
    color: 0x7289DA
  });

  const rarityEmbed = createEmbed({
    title: 'Pony Rarities',
    description: `<:B1:1410754066811981894><:A1:1410754103918858261><:S1:1410754129235673148><:I1:1410754153206251540><:C1:1410754186471145533> Common ponies - 70% in /venture, 40% in autospawn
<:R1:1410892381171089448><:A1:1410892395721261108><:R2:1410892414603890819><:E1:1410892426159198309> Uncommon ponies - 20% in /venture, 35% in autospawn
<:E2:1410893187949662219><:P2:1410893200511471656><:I2:1410893211886424125><:C2:1410893223794049135> Rare ponies - 4% in /venture, 18% in autospawn
<:M2:1410894084544921752><:Y1:1410894082913472532><:T1:1410894075787477072><:H11:1410894074109755402><:I3:1410894072406868070><:C3:1410894070976479282> Very rare ponies - 1.?% in /venture, ?.?% in autospawn
<:L4:1410895642615611453><:E4:1410895641042747434><:G4:1410895638991999057><:E5:1410895637523861504><:N4:1410895635405606933><:D4:1410895645040054374> Legendary ponies - 0.?% in /venture, 0.?% in autospawn
<:C5:1410900991703781539><:U5:1410900989774659695><:S5:1410900998964252712><:T5:1410900997366087750><:O5:1410900995600552046><:M5:1410900993910112266> Fan-created OC ponies not from G4/G5 shows - 0.?% in /venture, 0.??% in autospawn
<:S6:1410901772180131840><:E6:1410901770695081984><:C6:1410901769067692114><:R6:1410901767629307995><:E61:1410901765854990396><:T6:1410901764164816898> Secret ponies - 0.??% in /venture, 0.??% in autospawn
<:E2:1417857423829500004><:V1:1417857422420217897><:E1:1417857420029595691><:N1:1417857418804854834><:T1:1417857417391378432> Special event ponies during holidays - 0.??% in /venture, 0.??% in autospawn. Each has an icon showing their event (🎃 Halloween, 😈 Angel/Demon, etc.)
<:U2:1418945904546938910><:N2:1418945902470631484><:I1:1418945900570480690><:Q1:1418945898679107614><:U2:1418945904546938910><:E3:1418945906115346452> Premium ponies available only in /donate_shop for real money. Cannot be obtained through /venture or autospawn.
<:E1:1425524316858224822><:X2:1425524310570696815><:C3:1425524308997963857><:L4:1425524306833834185><:U5:1425524304845475840><:S6:1425524303470002319><:I7:1425524323002876015><:V8:1425524320985153586><:E9:1425524318732812461> One-of-a-kind ponies with no duplicates possible. Currently only available for purchase with real money. Cannot be obtained through /venture or autospawn.`,
    color: 0xFF69B4
  });


  const navigationButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('show_main_commands')
        .setLabel('Main Commands')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('show_fun_commands')
        .setLabel('Fun Commands')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('show_clan_commands')
        .setLabel('Clan Commands')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('show_rarity_info')
        .setLabel('Rarity Info')
        .setStyle(ButtonStyle.Danger)
    );




  const response = await interaction.reply({ 
    content: '**Use `/vote` for free rewards!** • 💬 **Need help? DM the bot!** • 🔗 **Discord:** https://discord.gg/ponies',
    embeds: [embed], 
    components: [navigationButtons] 
  });


  const collector = response.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'This help menu is not for you!', ephemeral: true });
    }

    if (i.customId === 'show_main_commands') {
      await i.update({
        content: '**Use `/vote` for free rewards!** • 💬 **Need help? DM the bot!** • 🔗 **Discord:** https://discord.gg/ponies',
        embeds: [embed],
        components: [navigationButtons]
      });
    } else if (i.customId === 'show_fun_commands') {
      await i.update({
        content: '**Use `/vote` for free rewards!** • 💬 **Need help? DM the bot!** • 🔗 **Discord:** https://discord.gg/ponies',
        embeds: [funEmbed],
        components: [navigationButtons]
      });
    } else if (i.customId === 'show_clan_commands') {
      await i.update({
        content: '**Use `/vote` for free rewards!** • 💬 **Need help? DM the bot!** • 🔗 **Discord:** https://discord.gg/ponies',
        embeds: [clanEmbed],
        components: [navigationButtons]
      });
    } else if (i.customId === 'show_rarity_info') {
      await i.update({
        content: '**Use `/vote` for free rewards!** • 💬 **Need help? DM the bot!** • 🔗 **Discord:** https://discord.gg/ponies',
        embeds: [rarityEmbed],
        components: [navigationButtons]
      });
    }
  });

  collector.on('end', () => {

    const disabledNavigationButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('show_main_commands')
          .setLabel('📋 Main Commands')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('show_fun_commands')
          .setLabel('🎨 Fun Commands')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('show_clan_commands')
          .setLabel('🏰 Clan Commands')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('show_rarity_info')
          .setLabel('💎 Rarity Info')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

    interaction.editReply({
      components: [disabledNavigationButtons]
    }).catch(() => {});
  });
}
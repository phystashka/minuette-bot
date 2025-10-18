import {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ContainerBuilder,
  SectionBuilder
} from 'discord.js';
import { execute as caseExecute } from '../economy/case.js';
import { execute as ventureExecute } from '../economy/venture.js';
import { execute as breedExecute } from '../economy/breed.js';
import { execute as friendshipExecute } from '../economy/friendship.js';
import { execute as myponiesExecute } from '../economy/myponies.js';
import { execute as profileExecute } from '../economy/profile.js';
import { execute as leadersExecute } from '../economy/leaders.js';
import { execute as balanceExecute } from '../economy/balance.js';
import { execute as inventoryExecute } from '../economy/inventory.js';
import { execute as zecoraHuntExecute } from '../economy/zecora_hut.js';
import { execute as rebirthExecute } from '../economy/rebirth.js';
import { execute as bingoExecute } from '../economy/bingo.js';
import { execute as derpibooruExecute } from '../utility/derpibooru.js';

const createMockOptions = (defaults = {}) => ({
  getString: (key) => defaults[key] || null,
  getBoolean: (key) => defaults[key] || false,
  getInteger: (key) => defaults[key] || null,
  getUser: (key) => defaults[key] || null,
  getChannel: (key) => defaults[key] || null
});

const createCommandWrapper = (executeFunction, defaultOptions = {}) => {
  return async (interaction) => {
    const wrappedInteraction = {
      ...interaction,
      options: createMockOptions(defaultOptions)
    };
    
    return executeFunction(wrappedInteraction);
  };
};

const missingCommandHandler = async (interaction, commandName) => {
  return interaction.reply({
    content: `The ${commandName} command is currently not available through help buttons.`,
    ephemeral: true
  });
};

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all available commands')
  .setDMPermission(false);

export async function execute(interaction) {
  const categoryButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('collections')
        .setLabel('Collections')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('statistics')
        .setLabel('Statistics')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('features')
        .setLabel('Features')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('utility')
        .setLabel('Utility')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('admin')
        .setLabel('Admin')
        .setStyle(ButtonStyle.Primary)
    );

  const mainText = new TextDisplayBuilder()
    .setContent('**Minuette Help**\n-# Not all commands are included here, but some of the most important ones are.');

  const separator = new SeparatorBuilder()
    .setDivider(true)
    .setSpacing(SeparatorSpacingSize.Small);

  const collectionsCommands = [
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Venture**\nGo on a venture to find new ponies')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('venture')
          .setLabel('/venture')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Breed**\nBreed your ponies to get rarer ones')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('breed')
          .setLabel('/breed')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Friendship**\nCollect your own pony collection and learn more about different ponies')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('friendship')
          .setLabel('/friendship')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**My Ponies**\nYour ponies that you\'ve already made friends with')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('myponies')
          .setLabel('/myponies')
          .setStyle(ButtonStyle.Secondary)
      )
  ];


  const statisticsCommands = [
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Profile**\nYour profile with information')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('profile')
          .setLabel('/profile')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Leaders**\nThe list of leaders in different categories')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('leaders')
          .setLabel('/leaders')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Balance**\nYour balance of bits, diamonds, and harmony')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('balance')
          .setLabel('/balance')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Inventory**\nA list of all your resources')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('inventory')
          .setLabel('/inventory')
          .setStyle(ButtonStyle.Secondary)
      )
  ];

  const featuresCommands = [
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Trade**\nTrade your ponies for others\nUsage: `/trade [user]`')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('trade_info')
          .setLabel('How to use')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Case**\nCheck your case collection and open them')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('case')
          .setLabel('/case')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Zecora Hut**\nA store of potions and herbs')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('zecora_hut')
          .setLabel('/zecora_hut')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Rebirth**\nReborn whenever necessary and get bonuses')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('rebirth')
          .setLabel('/rebirth')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Bingo**\nParticipate in the bingo collection and earn rewards')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('bingo')
          .setLabel('/bingo')
          .setStyle(ButtonStyle.Secondary)
      )
  ];


  const utilityCommands = [
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Derpibooru**\nSearch for pony images on Derpibooru')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('derpibooru')
          .setLabel('/derpibooru')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Filter**\nApply various filters to images (blur, sepia, demotivator, etc.)\nUsage: `/filter filter_type:`')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('filter_info')
          .setLabel('How to use')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Ship**\nShip two users and see their compatibility\nUsage: `/ship user1: user2:`')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('ship_info')
          .setLabel('How to use')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Tic Tac Toe**\nPlay Tic Tac Toe with another user\nUsage: `/tictactoe opponent:`')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('tictactoe_info_')
          .setLabel('How to use')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Rock Paper Scissors**\nPlay Rock Paper Scissors with another user\nUsage: `/rockpaperscissors opponent:`')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('rps_info')
          .setLabel('How to use')
          .setStyle(ButtonStyle.Secondary)
      )
  ];

  const adminCommands = [
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Set Spawn**\nSet the spawn channel for ponies\nUsage: `/set_spawn [channel]`')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('set_spawn_info')
          .setLabel('How to use')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Remove Spawn**\nRemove the spawn channel\nUsage: `/remove_spawn [channel]`')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('remove_spawn_info')
          .setLabel('How to use')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**Set Blood Notify**\nSet the channel for Blood Moon Event\nUsage: `/set_blood_notify [channel]`')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('set_blood_notify_info')
          .setLabel('How to use')
          .setStyle(ButtonStyle.Secondary)
      )
  ];

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(mainText)
    .addSeparatorComponents(separator)
    .addActionRowComponents(categoryButtons)
    .addSeparatorComponents(separator)
    .addSectionComponents(...collectionsCommands);

  const response = await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      container
    ]
  });

  const collector = response.createMessageComponentCollector({ time: 300000 });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'This help menu is not for you!', ephemeral: true });
    }

    const createMainText = () => {
      return new TextDisplayBuilder()
        .setContent('**Command Center**\n-# Not all commands are included here, but some of the most important ones are.');
    };

    const createActiveCategoryButtons = (activeId) => {
      return new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('collections')
            .setLabel('Collections')
            .setStyle(activeId === 'collections' ? ButtonStyle.Success : ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('statistics')
            .setLabel('Statistics')
            .setStyle(activeId === 'statistics' ? ButtonStyle.Success : ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('features')
            .setLabel('Features')
            .setStyle(activeId === 'features' ? ButtonStyle.Success : ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('utility')
            .setLabel('Utility')
            .setStyle(activeId === 'utility' ? ButtonStyle.Success : ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('admin')
            .setLabel('Admin')
            .setStyle(activeId === 'admin' ? ButtonStyle.Success : ButtonStyle.Primary)
        );
    };

    let currentContainer;

    if (i.customId === 'collections') {
      currentContainer = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(createMainText())
        .addSeparatorComponents(separator)
        .addActionRowComponents(createActiveCategoryButtons('collections'))
        .addSeparatorComponents(separator)
        .addSectionComponents(...collectionsCommands);

    } else if (i.customId === 'statistics') {
      currentContainer = new ContainerBuilder()
        .setAccentColor(0x57F287)
        .addTextDisplayComponents(createMainText())
        .addSeparatorComponents(separator)
        .addActionRowComponents(createActiveCategoryButtons('statistics'))
        .addSeparatorComponents(separator)
        .addSectionComponents(...statisticsCommands);

    } else if (i.customId === 'features') {
      currentContainer = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(createMainText())
        .addSeparatorComponents(separator)
        .addActionRowComponents(createActiveCategoryButtons('features'))
        .addSeparatorComponents(separator)
        .addSectionComponents(...featuresCommands);

    } else if (i.customId === 'utility') {
      currentContainer = new ContainerBuilder()
        .setAccentColor(0xED4245)
        .addTextDisplayComponents(createMainText())
        .addSeparatorComponents(separator)
        .addActionRowComponents(createActiveCategoryButtons('utility'))
        .addSeparatorComponents(separator)
        .addSectionComponents(...utilityCommands);

    } else if (i.customId === 'admin') {
      currentContainer = new ContainerBuilder()
        .setAccentColor(0x9266CC)
        .addTextDisplayComponents(createMainText())
        .addSeparatorComponents(separator)
        .addActionRowComponents(createActiveCategoryButtons('admin'))
        .addSeparatorComponents(separator)
        .addSectionComponents(...adminCommands);

    } else {
      if (i.customId === 'case') {
        try {
          const wrappedExecute = createCommandWrapper(caseExecute, {});
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing case command:', error);
          return i.reply({
            content: 'There was an error executing the case command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'venture') {
        try {
          const wrappedExecute = createCommandWrapper(ventureExecute, {});
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing venture command:', error);
          return i.reply({
            content: 'There was an error executing the venture command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'breed') {
        try {
          const wrappedExecute = createCommandWrapper(breedExecute, {});
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing breed command:', error);
          return i.reply({
            content: 'There was an error executing the breed command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'adopt') {
        try {
          await adoptExecute(i);
          return;
        } catch (error) {
          console.error('Error executing adopt command:', error);
          return i.reply({
            content: 'There was an error executing the adopt command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'artifacts') {
        try {
          await artifactsExecute(i);
          return;
        } catch (error) {
          console.error('Error executing artifacts command:', error);
          return i.reply({
            content: 'There was an error executing the artifacts command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'myponies') {
        try {
          const wrappedExecute = createCommandWrapper(myponiesExecute, {
            filter: 'all',
            search: '',
            sort: 'id',
            favorites_only: false
          });
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing myponies command:', error);
          return i.reply({
            content: 'There was an error executing the myponies command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'leaders') {
        try {
          const wrappedExecute = createCommandWrapper(leadersExecute, {
            category: 'bits'
          });
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing leaders command:', error);
          return i.reply({
            content: 'There was an error executing the leaders command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'balance') {
        try {
          const wrappedExecute = createCommandWrapper(balanceExecute, {
            action: 'view'
          });
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing balance command:', error);
          return i.reply({
            content: 'There was an error executing the balance command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'inventory') {
        try {
          const wrappedExecute = createCommandWrapper(inventoryExecute, {
            category: 'all'
          });
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing inventory command:', error);
          return i.reply({
            content: 'There was an error executing the inventory command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'zecora_hut') {
        try {
          const wrappedExecute = createCommandWrapper(zecoraHuntExecute, {});
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing zecora_hut command:', error);
          return i.reply({
            content: 'There was an error executing the zecora_hut command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'derpibooru') {
        try {
          const wrappedExecute = createCommandWrapper(derpibooruExecute, {
            search_query: 'safe, pony'
          });
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing derpibooru command:', error);
          return i.reply({
            content: 'There was an error executing the derpibooru command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'profile') {
        try {
          const wrappedExecute = createCommandWrapper(profileExecute, {});
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing profile command:', error);
          return i.reply({
            content: 'There was an error executing the profile command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'vote') {
        try {
          await voteExecute(i);
          return;
        } catch (error) {
          console.error('Error executing vote command:', error);
          return i.reply({
            content: 'There was an error executing the vote command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'leaderboard') {
        try {
          await leaderboardExecute(i);
          return;
        } catch (error) {
          console.error('Error executing leaderboard command:', error);
          return i.reply({
            content: 'There was an error executing the leaderboard command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'clan') {
        try {
          await clanExecute(i);
          return;
        } catch (error) {
          console.error('Error executing clan command:', error);
          return i.reply({
            content: 'There was an error executing the clan command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'daily') {
        try {
          await dailyExecute(i);
          return;
        } catch (error) {
          console.error('Error executing daily command:', error);
          return i.reply({
            content: 'There was an error executing the daily command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'bloodmoon') {
        try {
          await bloodmoonExecute(i);
          return;
        } catch (error) {
          console.error('Error executing bloodmoon command:', error);
          return i.reply({
            content: 'There was an error executing the bloodmoon command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'bingo') {
        try {
          const wrappedExecute = createCommandWrapper(bingoExecute, {});
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing bingo command:', error);
          return i.reply({
            content: 'There was an error executing the bingo command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'farm') {
        try {
          await farmExecute(i);
          return;
        } catch (error) {
          console.error('Error executing farm command:', error);
          return i.reply({
            content: 'There was an error executing the farm command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'work') {
        try {
          await workExecute(i);
          return;
        } catch (error) {
          console.error('Error executing work command:', error);
          return i.reply({
            content: 'There was an error executing the work command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'harvest') {
        try {
          await harvestExecute(i);
          return;
        } catch (error) {
          console.error('Error executing harvest command:', error);
          return i.reply({
            content: 'There was an error executing the harvest command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'rarity') {
        try {
          await rarityExecute(i);
          return;
        } catch (error) {
          console.error('Error executing rarity command:', error);
          return i.reply({
            content: 'There was an error executing the rarity command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'friendship') {
        try {
          const wrappedExecute = createCommandWrapper(friendshipExecute, {});
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing friendship command:', error);
          return i.reply({
            content: 'There was an error executing the friendship command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'minigame') {
        try {
          await minigameExecute(i);
          return;
        } catch (error) {
          console.error('Error executing minigame command:', error);
          return i.reply({
            content: 'There was an error executing the minigame command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'rebirth') {
        try {
          const wrappedExecute = createCommandWrapper(rebirthExecute, {});
          await wrappedExecute(i);
          return;
        } catch (error) {
          console.error('Error executing rebirth command:', error);
          return i.reply({
            content: 'There was an error executing the rebirth command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'quest') {
        try {
          await questExecute(i);
          return;
        } catch (error) {
          console.error('Error executing quest command:', error);
          return i.reply({
            content: 'There was an error executing the quest command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'notification') {
        try {
          await notificationExecute(i);
          return;
        } catch (error) {
          console.error('Error executing notification command:', error);
          return i.reply({
            content: 'There was an error executing the notification command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'announce') {
        try {
          await announceExecute(i);
          return;
        } catch (error) {
          console.error('Error executing announce command:', error);
          return i.reply({
            content: 'There was an error executing the announce command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'warn') {
        try {
          await warnExecute(i);
          return;
        } catch (error) {
          console.error('Error executing warn command:', error);
          return i.reply({
            content: 'There was an error executing the warn command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'ban') {
        try {
          await banExecute(i);
          return;
        } catch (error) {
          console.error('Error executing ban command:', error);
          return i.reply({
            content: 'There was an error executing the ban command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'kick') {
        try {
          await kickExecute(i);
          return;
        } catch (error) {
          console.error('Error executing kick command:', error);
          return i.reply({
            content: 'There was an error executing the kick command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'spawn') {
        try {
          await spawnExecute(i);
          return;
        } catch (error) {
          console.error('Error executing spawn command:', error);
          return i.reply({
            content: 'There was an error executing the spawn command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'shutdown') {
        try {
          await shutdownExecute(i);
          return;
        } catch (error) {
          console.error('Error executing shutdown command:', error);
          return i.reply({
            content: 'There was an error executing the shutdown command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'clear') {
        try {
          await clearExecute(i);
          return;
        } catch (error) {
          console.error('Error executing clear command:', error);
          return i.reply({
            content: 'There was an error executing the clear command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'ponymigration') {
        try {
          await ponymigrationExecute(i);
          return;
        } catch (error) {
          console.error('Error executing ponymigration command:', error);
          return i.reply({
            content: 'There was an error executing the ponymigration command.',
            ephemeral: true
          });
        }
      } else if (i.customId === 'debug') {
        try {
          await debugExecute(i);
          return;
        } catch (error) {
          console.error('Error executing debug command:', error);
          return i.reply({
            content: 'There was an error executing the debug command.',
            ephemeral: true
          });
        }
      }
      return;
    }

    await i.update({
      flags: MessageFlags.IsComponentsV2,
      components: [
        currentContainer
      ]
    });
  });

  collector.on('end', () => {
    const disabledCategoryButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('collections')
          .setLabel('Collections')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('statistics')
          .setLabel('Statistics')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('features')
          .setLabel('Features')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('utility')
          .setLabel('Utility')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('admin')
          .setLabel('Admin')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );

    interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        container,
        disabledCategoryButtons
      ]
    }).catch(() => {});
  });
}
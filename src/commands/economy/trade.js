import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { requirePony } from '../../utils/pony/ponyMiddleware.js';
import { getUserFriends } from '../../models/FriendshipModel.js';
import { query, getRow } from '../../utils/database.js';
import { getCutieMarkFromPonyObject } from '../../utils/cutiemarksManager.js';


const RARITY_EMOJIS = {
  BASIC: '<:B1:1410754066811981894><:A1:1410754103918858261><:S1:1410754129235673148><:I1:1410754153206251540><:C1:1410754186471145533>',
  RARE: '<:R1:1410892381171089448><:A1:1410892395721261108><:R2:1410892414603890819><:E1:1410892426159198309>',
  EPIC: '<:E2:1410893187949662219><:P2:1410893200511471656><:I2:1410893211886424125><:C2:1410893223794049135>',
  MYTHIC: '<:M2:1410894084544921752><:Y1:1410894082913472532><:T1:1410894075787477072><:H11:1410894074109755402><:I3:1410894072406868070><:C3:1410894070976479282>',
  LEGEND: '<:L4:1410895642615611453><:E4:1410895641042747434><:G4:1410895638991999057><:E5:1410895637523861504><:N4:1410895635405606933><:D4:1410895645040054374>',
  LEGENDARY: '<:L4:1410895642615611453><:E4:1410895641042747434><:G4:1410895638991999057><:E5:1410895637523861504><:N4:1410895635405606933><:D4:1410895645040054374>',
  CUSTOM: '<:C5:1410900991703781539><:U5:1410900989774659695><:S5:1410900998964252712><:T5:1410900997366087750><:O5:1410900995600552046><:M5:1410900993910112266>',
  SECRET: '<:S6:1410901772180131840><:E6:1410901770695081984><:C6:1410901769067692114><:R6:1410901767629307995><:E61:1410901765854990396><:T6:1410901764164816898>',
  EVENT: '<:E2:1417857423829500004><:V1:1417857422420217897><:E1:1417857420029595691><:N1:1417857418804854834><:T1:1417857417391378432>',
  UNIQUE: '<:U2:1418945904546938910><:N2:1418945902470631484><:I1:1418945900570480690><:Q1:1418945898679107614><:U2:1418945904546938910><:E3:1418945906115346452>',
  EXCLUSIVE: '<:E1:1425524316858224822><:X2:1425524310570696815><:C3:1425524308997963857><:L4:1425524306833834185><:U5:1425524304845475840><:S6:1425524303470002319><:I7:1425524323002876015><:V8:1425524320985153586><:E9:1425524318732812461>'
};


const RARITY_FALLBACK = {
  BASIC: '⚪',
  RARE: '💎', 
  EPIC: '🔮',
  MYTHIC: '✨',
  LEGEND: '🌟',
  LEGENDARY: '🌟',
  CUSTOM: '🎨',
  SECRET: '🤫',
  EVENT: '🎃',
  UNIQUE: '⭐',
  EXCLUSIVE: '💖'
};


function getRarityEmoji(rarity) {
  return RARITY_EMOJIS[rarity] || RARITY_FALLBACK[rarity] || '❓';
}


function getPonyTypeEmoji(ponyType) {
  const typeEmojis = {
    unicorn: '🦄',
    pegasus: '🕊️',
    'earth pony': '🐴',
    'earth': '🌱',
    'unicorn': '🦄',
    'pegasus': '🕊️',
    'alicorn': '👑',
    'zebra': '🦓',
    'changeling': '🐛',
    'hippogriff': '🦅',
    'crystal': '💎',
    'batpony': '🦇',
    'bat_pony': '🦇',
    'seapony': '🌊',
    'dragon': '🐉',
    'yak': '🐃',
    'griffon': '🦅',
    'skeleton_pony': '💀',
    'skeleton': '💀'
  };


  const fallbackEmojis = {
    unicorn: '🦄',
    pegasus: '🕊️',
    'earth pony': '🐴',
    earth: '🐴',
    alicorn: '🦄',
    bat: '🦇',
    changeling: '🐛',
    crystal: '💎',
    hippogriff: '🦅',
    kirin: '🔥',
    seapony: '🐠',
    zebra: '🦓',
    dragon: '🐉',
    griffon: '🦅',
    yak: '🐂',
    cat: '🐱',
    parrot: '🦜',
    dog: '🐕',
    minotaur: '🐂',
    siren: '🧜‍♀️'
  };

  return typeEmojis[ponyType] || fallbackEmojis[ponyType] || '❓';
}


function getPonyTypeEmojiWithEvent(ponyType, rarity, ponyName = '') {
  const baseEmoji = getPonyTypeEmoji(ponyType);
  if (rarity === 'EVENT') {

    const oldEventPonies = ['Sweetie Angel', 'Rarity Angel', 'Cozy Demon', 'Rarity Demon'];
    if (oldEventPonies.includes(ponyName)) {
      return `${baseEmoji}😈`;
    }

    return `${baseEmoji}🎃`;
  }
  return baseEmoji;
}

export const data = new SlashCommandBuilder()
  .setName('trade')
  .setDescription('Trade ponies with another player')
  .setDescriptionLocalizations({
    'ru': 'Обменяться пони с другим игроком'
  })
  .setDMPermission(false)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The player you want to trade with')
      .setDescriptionLocalizations({
        'ru': 'Игрок, с которым вы хотите торговать'
      })
      .setRequired(true));


const activeTrades = new Map();


const tradeCooldowns = new Map();
const TRADE_COOLDOWN = 5 * 60 * 1000;
const TRADE_TIMEOUT = 5 * 60 * 1000;

export async function execute(interaction) {
  try {
    const targetUser = interaction.options.getUser('user');
    const initiator = interaction.user;


    if (targetUser.bot) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Error',
          description: 'You cannot trade with bots.',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (targetUser.id === initiator.id) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Error',
          description: 'You cannot trade with yourself.',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const now = Date.now();
    const cooldownExpires = tradeCooldowns.get(initiator.id);
    
    if (cooldownExpires && now < cooldownExpires) {
      const timeLeft = Math.ceil((cooldownExpires - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Cooldown',
          description: `You can trade again in ${minutes}m ${seconds}s.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const initiatorPony = await requirePony(interaction);
    if (!initiatorPony) return;

    const targetPonyData = await getRow('SELECT * FROM ponies WHERE user_id = ?', [targetUser.id]);
    if (!targetPonyData) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Error',
          description: `${targetUser.username} doesn't have a pony profile yet.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const tradeKey = [initiator.id, targetUser.id].sort().join('-');
    if (activeTrades.has(tradeKey)) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Error',
          description: `There is already an active trade between you and ${targetUser.username}.`,
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const tradeData = {
      initiator: {
        id: initiator.id,
        username: initiator.username,
        ponies: [],
        confirmed: false
      },
      target: {
        id: targetUser.id,
        username: targetUser.username,
        ponies: [],
        confirmed: false
      },
      createdAt: Date.now()
    };

    activeTrades.set(tradeKey, tradeData);


    tradeCooldowns.set(initiator.id, now + TRADE_COOLDOWN);


    setTimeout(async () => {
      if (activeTrades.has(tradeKey)) {
        const trade = activeTrades.get(tradeKey);
        trade.expired = true;

        

        try {
          const expiredEmbed = createEmbed({
            title: '⏰ Trade Expired',
            description: `This trade has expired after 5 minutes of inactivity.\n\n**Initiator:** <@${trade.initiator.id}>\n**Target:** <@${trade.target.id}>`,
            color: 0x95a5a6
          });
          
          await trade.message.edit({
            embeds: [expiredEmbed],
            components: []
          });
        } catch (error) {
          console.error('Error updating expired trade embed:', error);
        }
        

        setTimeout(() => {
          activeTrades.delete(tradeKey);
        }, 60000);
      }
    }, TRADE_TIMEOUT);


    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`trade_accept_${tradeKey}`)
        .setLabel('Accept Trade')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`trade_decline_${tradeKey}`)
        .setLabel('Decline Trade')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.reply({
      content: `${targetUser}`,
      embeds: [createEmbed({
        title: 'Trade Request',
        description: `${initiator.username} wants to trade ponies with you! Please accept or decline.`,
        color: 0x03168f,
        user: interaction.user
      })],
      components: [confirmRow]
    });
    

    tradeData.message = message;






  } catch (error) {
    console.error('Error in trade command:', error);
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while processing the trade.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function createTradeEmbed(tradeData) {
  const formatPonyList = (ponies) => {
    if (ponies.length === 0) {
      return 'No ponies added';
    }
    
    return ponies.map(p => {
      const rarityEmoji = getRarityEmoji(p.rarity);
      const uniqueId = p.friendship_id;
      const friendshipLevel = p.friendship_level || 1;
      

      const cutieMark = getCutieMarkFromPonyObject(p);
      const cutieMarkDisplay = cutieMark ? `${cutieMark} ` : '';
      
      return `\`${uniqueId}\` ${rarityEmoji} ${cutieMarkDisplay}**${p.name}**　•　Friend LvL ${friendshipLevel}`;
    }).join('\n');
  };

  const initiatorPonies = formatPonyList(tradeData.initiator.ponies);
  const targetPonies = formatPonyList(tradeData.target.ponies);

  const embed = new EmbedBuilder()
    .setTitle(`Trade — ${tradeData.initiator.username} & ${tradeData.target.username}`)
    .setColor(0x03168f)
    .addFields(
      {
        name: `${tradeData.initiator.username} ${tradeData.initiator.confirmed ? '✅' : ''}`,
        value: initiatorPonies,
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: true
      },
      {
        name: `${tradeData.target.username} ${tradeData.target.confirmed ? '✅' : ''}`,
        value: targetPonies,
        inline: true
      }
    )
    .setFooter({ text: 'Both players must confirm to complete the trade' });

  return embed;
}


function createTradeComponents(tradeData) {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('trade_manage')
        .setLabel('Manage Trade')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('trade_confirm')
        .setLabel('Confirm Trade')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('trade_cancel')
        .setLabel('Cancel Trade')
        .setStyle(ButtonStyle.Danger)
    );

  return [row1];
}


export { activeTrades, createTradeEmbed, createTradeComponents };


export async function handleTradeButton(interaction) {
  try {
    const customId = interaction.customId;
    const userId = interaction.user.id;


    if (customId.startsWith('trade_accept_') || customId.startsWith('trade_decline_')) {
      const tradeKey = customId.split('_')[2];
      const tradeData = activeTrades.get(tradeKey);

      if (!tradeData) {
        return interaction.reply({
          embeds: [createEmbed({
            title: 'Trade Error',
            description: 'This trade is no longer active.',
            color: 0x03168f,
            user: interaction.user
          })],
          ephemeral: true
        });
      }
      

      if (tradeData.expired) {
        return interaction.reply({
          embeds: [createEmbed({
            title: '⏰ Trade Expired',
            description: 'This trade has already expired.',
            color: 0x95a5a6,
            user: interaction.user
          })],
          ephemeral: true
        });
      }


      if (userId !== tradeData.target.id) {
        return interaction.reply({
          embeds: [createEmbed({
            title: 'Trade Error',
            description: 'Only the invited player can accept or decline this trade.',
            color: 0x03168f,
            user: interaction.user
          })],
          ephemeral: true
        });
      }

      if (customId.startsWith('trade_decline_')) {

        activeTrades.delete(tradeKey);
        tradeCooldowns.delete(tradeData.initiator.id);
        return interaction.update({
          content: `Trade declined by ${interaction.user.username}.`,
          components: []
        });
      }

      if (customId.startsWith('trade_accept_')) {

        const embed = await createTradeEmbed(tradeData);
        const components = createTradeComponents(tradeData);

        return interaction.update({
          content: `Trade accepted! Both players can now manage their ponies and confirm when ready.`,
          embeds: [embed],
          components: components
        });
      }
    }


    let tradeKey = null;
    let tradeData = null;

    for (const [key, data] of activeTrades.entries()) {
      if (data.initiator.id === userId || data.target.id === userId) {
        tradeKey = key;
        tradeData = data;
        break;
      }
    }

    if (!tradeData) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Error',
          description: 'This trade is no longer active.',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
    

    if (tradeData.expired) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '⏰ Trade Expired',
          description: 'This trade has already expired.',
          color: 0x95a5a6,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const isInitiator = userId === tradeData.initiator.id;
    const isTarget = userId === tradeData.target.id;

    if (!isInitiator && !isTarget) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Error',
          description: 'You are not part of this trade.',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    if (customId === 'trade_manage') {

      const isInitiator = userId === tradeData.initiator.id;
      const playerData = isInitiator ? tradeData.initiator : tradeData.target;
      
      const modal = new ModalBuilder()
        .setCustomId(`trade_manage_pony_${userId}`)
        .setTitle('Manage Your Trade');

      const actionInput = new TextInputBuilder()
        .setCustomId('action')
        .setLabel('Action (add/remove)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Type "add" to add pony or "remove" to remove pony')
        .setRequired(true);

      const ponyIdInput = new TextInputBuilder()
        .setCustomId('pony_id')
        .setLabel('Pony Friendship ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter the unique friendship ID of your pony')
        .setRequired(true);

      const row1 = new ActionRowBuilder().addComponents(actionInput);
      const row2 = new ActionRowBuilder().addComponents(ponyIdInput);
      modal.addComponents(row1, row2);

      return await interaction.showModal(modal);
    }

    if (customId === 'trade_confirm') {

      const playerData = isInitiator ? tradeData.initiator : tradeData.target;
      playerData.confirmed = !playerData.confirmed;


      if (!playerData.confirmed) {
        const otherPlayer = isInitiator ? tradeData.target : tradeData.initiator;
        otherPlayer.confirmed = false;
      }


      if (tradeData.initiator.confirmed && tradeData.target.confirmed) {
        return await executeTrade(interaction, tradeKey, tradeData);
      }


      const embed = await createTradeEmbed(tradeData);
      const components = createTradeComponents(tradeData);

      return await interaction.update({
        embeds: [embed],
        components: components
      });
    }

    if (customId === 'trade_cancel') {

      activeTrades.delete(tradeKey);

      return await interaction.update({
        embeds: [createEmbed({
          title: 'Trade Cancelled',
          description: 'The trade has been cancelled.',
          color: 0x03168f,
          user: interaction.user
        })],
        components: []
      });
    }

  } catch (error) {
    console.error('Error in handleTradeButton:', error);
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while processing the trade.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


export async function handleTradeModal(interaction) {
  try {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    

    let tradeKey = null;
    let tradeData = null;

    for (const [key, data] of activeTrades.entries()) {
      if (data.initiator.id === userId || data.target.id === userId) {
        tradeKey = key;
        tradeData = data;
        break;
      }
    }

    if (!tradeData) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Error',
          description: 'This trade is no longer active.',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }
    

    if (tradeData.expired) {
      return interaction.reply({
        embeds: [createEmbed({
          title: '⏰ Trade Expired',
          description: 'This trade has already expired.',
          color: 0x95a5a6,
          user: interaction.user
        })],
        ephemeral: true
      });
    }

    const isInitiator = userId === tradeData.initiator.id;
    const playerData = isInitiator ? tradeData.initiator : tradeData.target;

    if (customId.startsWith('trade_manage_pony_')) {
      const action = interaction.fields.getTextInputValue('action').trim().toLowerCase();
      const ponyId = interaction.fields.getTextInputValue('pony_id').trim();

      if (action === 'add') {

        if (playerData.ponies.length >= 4) {
          return interaction.reply({
            embeds: [createEmbed({
              title: 'Trade Error',
              description: 'You can only trade up to 4 ponies at once.',
              color: 0x03168f,
              user: interaction.user
            })],
            ephemeral: true
          });
        }


        const friendshipId = parseInt(ponyId);
        if (isNaN(friendshipId)) {
          return interaction.reply({
            embeds: [createEmbed({
              title: 'Trade Error',
              description: 'Invalid friendship ID. Please enter a valid number.',
              color: 0x03168f,
              user: interaction.user
            })],
            ephemeral: true
          });
        }


        const userFriends = await getUserFriends(userId);
        

        const pony = userFriends.find(p => p.friendship_id === friendshipId);
        
        if (!pony) {
          return interaction.reply({
            embeds: [createEmbed({
              title: 'Trade Error',
              description: `You don't have a pony with friendship ID "${friendshipId}".`,
              color: 0x03168f,
              user: interaction.user
            })],
            ephemeral: true
          });
        }


        if (playerData.ponies.some(tp => tp.friendship_id === friendshipId)) {
          return interaction.reply({
            embeds: [createEmbed({
              title: 'Trade Error',
              description: `Pony "${pony.name}" (ID: ${friendshipId}) is already in the trade.`,
              color: 0x03168f,
              user: interaction.user
            })],
            ephemeral: true
          });
        }


        playerData.ponies.push({
          friendship_id: pony.friendship_id,
          friend_id: pony.friend_id,
          name: pony.name,
          original_name: pony.original_name,
          custom_name: pony.custom_name,
          rarity: pony.rarity,
          friendship_level: pony.friendship_level || 1,
          pony_type: pony.pony_type,
          race: pony.race
        });

      } else if (action === 'remove') {

        const friendshipId = parseInt(ponyId);
        if (isNaN(friendshipId)) {
          return interaction.reply({
            embeds: [createEmbed({
              title: 'Trade Error',
              description: 'Invalid friendship ID. Please enter a valid number.',
              color: 0x03168f,
              user: interaction.user
            })],
            ephemeral: true
          });
        }

        const ponyIndex = playerData.ponies.findIndex(p => p.friendship_id === friendshipId);

        if (ponyIndex === -1) {
          return interaction.reply({
            embeds: [createEmbed({
              title: 'Trade Error',
              description: `Pony with friendship ID "${friendshipId}" is not in your trade offer.`,
              color: 0x03168f,
              user: interaction.user
            })],
            ephemeral: true
          });
        }


        const removedPony = playerData.ponies.splice(ponyIndex, 1)[0];
        
        return interaction.reply({
          embeds: [createEmbed({
            title: 'Pony Removed',
            description: `Removed "${removedPony.name}" (ID: ${friendshipId}) from your trade offer.`,
            color: 0x03168f,
            user: interaction.user
          })],
          ephemeral: true
        });

      } else {
        return interaction.reply({
          embeds: [createEmbed({
            title: 'Trade Error',
            description: 'Invalid action. Use "add" to add a pony or "remove" to remove a pony.',
            color: 0x03168f,
            user: interaction.user
          })],
          ephemeral: true
        });
      }


      tradeData.initiator.confirmed = false;
      tradeData.target.confirmed = false;
    }


    const embed = await createTradeEmbed(tradeData);
    const components = createTradeComponents(tradeData);

    return await interaction.update({
      embeds: [embed],
      components: components
    });

  } catch (error) {
    console.error('Error in handleTradeModal:', error);
    return interaction.reply({
      embeds: [createEmbed({
        title: 'Error',
        description: 'An error occurred while processing the trade.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}


async function executeTrade(interaction, tradeKey, tradeData) {
  try {

    if (tradeData.initiator.ponies.length === 0 && tradeData.target.ponies.length === 0) {
      return interaction.reply({
        embeds: [createEmbed({
          title: 'Trade Error',
          description: 'Both players must offer at least one pony to complete the trade.',
          color: 0x03168f,
          user: interaction.user
        })],
        ephemeral: true
      });
    }


    const initiatorId = tradeData.initiator.id;
    const targetId = tradeData.target.id;


    const { transferPonyByFriendshipId } = await import('../../models/FriendshipModel.js');






    for (const pony of tradeData.initiator.ponies) {

      await transferPonyByFriendshipId(initiatorId, targetId, pony.friendship_id);
    }


    for (const pony of tradeData.target.ponies) {

      await transferPonyByFriendshipId(targetId, initiatorId, pony.friendship_id);
    }


    activeTrades.delete(tradeKey);
    

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(initiatorId, 'trade_success');
      await addQuestProgress(targetId, 'trade_success');
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }


    return await interaction.update({
      content: '',
      embeds: [createEmbed({
        title: `Trade — ${tradeData.initiator.username} & ${tradeData.target.username}`,
        description: 'Trade completed successfully!',
        color: 0x03168f,
        user: interaction.user
      })],
      components: []
    });

  } catch (error) {
    console.error('Error executing trade:', error);
    

    activeTrades.delete(tradeKey);
    if (tradeData && tradeData.initiator) {
      tradeCooldowns.delete(tradeData.initiator.id);
    }

    return interaction.reply({
      embeds: [createEmbed({
        title: 'Trade Error',
        description: 'An error occurred while completing the trade. Please try again.',
        color: 0x03168f,
        user: interaction.user
      })],
      ephemeral: true
    });
  }
}

import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { formatVoiceTime } from '../../utils/timeUtils.js';
import { sequelize } from '../../utils/database.js';
import { t } from '../../utils/localization.js';
import { leaderboardCache } from '../../utils/leaderboardCache.js';
import { getDonatorEmoji } from '../../models/DonatorModel.js';

export const data = new SlashCommandBuilder()
  .setName('leaders')
  .setDescription('View the top users in different categories')
  .setDescriptionLocalizations({
    'ru': 'Посмотреть топ пользователей в разных категориях'
  })
  .setDMPermission(false);

export async function execute(interaction) {
  try {

    if (interaction.user.id === '259347882052812800') {
      leaderboardCache.clearAllCache();
    }
    
    const isButton = interaction.isButton?.() || false;
    

    if (isButton && !interaction.replied && !interaction.deferred) {
      await interaction.deferUpdate();
    }
    
    if (interaction.replied && !isButton) {
      console.log('Interaction already replied');
      return;
    }
    
    let replyMethod = isButton ? 'editReply' : 'reply';
    
    const guildId = interaction.guild.id;

    let filter = 'bits';
    let page = 1;
    
    if (isButton) {
      const customId = interaction.customId;
      const parts = customId.split('_');
      if (parts[0] === 'leaders' && parts[1] === 'next') {
        filter = parts[2];
        page = parseInt(parts[3]) + 1;
      } else if (parts[0] === 'leaders' && parts[1] === 'prev') {
        filter = parts[2];
        page = parseInt(parts[3]) - 1;
      } else if (parts[0] === 'leaders' && parts[1] === 'filter') {
        filter = parts[2];
        page = 1;
      }
    }
    
    const perPage = 10;
    
    let leaderboardData;
    let userRank = null;
    
    try {

      leaderboardData = await leaderboardCache.getLeaderboard(filter, guildId, page, perPage);
      

      if (leaderboardData.totalCount > 0) {
        userRank = await leaderboardCache.getUserRank(interaction.user.id, filter);
      }
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      const errorEmbed = createEmbed({
        title: '❌ Error',
        description: 'Failed to load leaderboard data. Please try again later.',
        color: 0xff0000,
        user: interaction.user
      });
      
      return await interaction[replyMethod]({ 
        embeds: [errorEmbed], 
        components: []
      });
    }
    
    const { data: topData, totalCount, type } = leaderboardData;
    

    let title = '';
    let description = '';
    
    switch (type) {
      case 'bits':
        title = await t('leaders.title_bits', guildId);
        description = await t('leaders.desc_bits', guildId);
        break;
      case 'voice':
        title = 'Voice Global Stats';
        description = await t('leaders.desc_voice', guildId);
        break;
      case 'ponies':
        title = await t('leaders.title_ponies', guildId);
        description = await t('leaders.desc_ponies', guildId);
        break;
      case 'farm':
        title = 'Farm Global Stats';
        description = 'Top farm levels globally';
        break;
      case 'rebirth':
        title = '<:rebirth:1426523946064281611> Rebirth Global Stats';
        description = 'Top players by rebirth level globally';
        break;
      case 'clans':
        title = '🏰 Clans Global Stats';
        description = 'Top clans by level globally';
        break;
    }
    
    if (totalCount === 0) {
      let description;
      if (filter === 'clans') {
        description = "No clans have been created yet!";
      } else {
        description = await t('leaders.no_data', guildId);
      }
      
      const responseEmbed = createEmbed({
        title: title,
        description: description,
        color: 0x03168f,
        user: interaction.user
      });
      
      if (!interaction.replied && !interaction.deferred) {
        return await interaction[replyMethod]({ 
          embeds: [responseEmbed], 
          components: []
        });
      }
      return;
    }
    
    const totalPages = Math.ceil(totalCount / perPage);
    
    if (page > totalPages) {
      const responseEmbed = createEmbed({
        title: 'Invalid Page',
        description: `There are only ${totalPages} pages available!\n\nChoose a page between 1 and ${totalPages}.`,
        color: 0x03168f,
        user: interaction.user
      });
      
      return await interaction[replyMethod]({ 
        embeds: [responseEmbed], 
        components: []
      });
    }

    let leaderboardText = '';
    const offset = (page - 1) * perPage;
    
    for (let i = 0; i < topData.length; i++) {
      const rank = offset + i + 1;
      const entry = topData[i];
      
      let username = '';
      let value = '';
      
      if (filter === 'clans') {

        const user = await interaction.client.users.fetch(entry.owner_id).catch(() => null);
        const ownerName = user ? user.username : 'Unknown User';
        

        if (entry.owner_id === '259347882052812800' || entry.owner_id === '1217948886317138064') {
          username = `**${entry.name}** (${ownerName} <:wrench:1416148210455543829>)`;
        } else {
          const donatorEmoji = await getDonatorEmoji(entry.owner_id);
          if (donatorEmoji) {
            username = `**${entry.name}** (${donatorEmoji} ${ownerName})`;
          } else {
            username = `**${entry.name}** (${ownerName})`;
          }
        }
        
        value = `🏆 Level ${entry.level} (👥 ${entry.member_count} members)`;
      } else {

        const user = await interaction.client.users.fetch(entry.user_id).catch(() => null);
        username = user ? user.username : 'Unknown User';
        

        if (entry.user_id === '259347882052812800' || entry.user_id === '1217948886317138064') {

          username = `<:wrench:1416148210455543829> ${username}`;
          

          const donatorEmoji = await getDonatorEmoji(entry.user_id);
          if (donatorEmoji) {
            username = `<:wrench:1416148210455543829>${donatorEmoji} ${user ? user.username : 'Unknown User'}`;
          }
        } else {

          const donatorEmoji = await getDonatorEmoji(entry.user_id);
          if (donatorEmoji) {
            username = `${donatorEmoji} ${username}`;
          }
        }
        
        switch (filter) {
          case 'bits':
            value = `${entry.total_bits.toLocaleString()} ${await t('currency.bits', guildId)}`;
            break;
          case 'voice':
            value = formatVoiceTime(entry.total_voice_time || entry.voice_time);
            break;
          case 'ponies':
            const ponyCountText = await t('leaders.pony_count', guildId);
            value = `${entry.pony_count} ${ponyCountText.toLowerCase()}`;
            break;
          case 'farm':
            value = `Level ${entry.farm_level}`;
            break;
          case 'rebirth':
            value = `<:rebirth:1426523946064281611> Level ${entry.rebirth_level || 0}`;
            break;
        }
      }
      
      let rankDisplay = '';
      if (rank === 1) rankDisplay = '🥇';
      else if (rank === 2) rankDisplay = '🥈';
      else if (rank === 3) rankDisplay = '🥉';
      else rankDisplay = `${rank}.`;
      
      leaderboardText += `${rankDisplay} ${username} - ${value}\n`;
    }


    let userValue = null;
    if (userRank && userRank > 0) {
      if (filter === 'bits') {

        const userBits = await sequelize.query(`
          SELECT (p.bits + COALESCE(ba.balance, 0)) as total_bits 
          FROM ponies p 
          LEFT JOIN bank_accounts ba ON p.user_id = ba.user_id 
          WHERE p.user_id = :userId
        `, {
          replacements: { userId: interaction.user.id },
          type: sequelize.QueryTypes.SELECT
        });
        if (userBits.length > 0) {
          userValue = userBits[0].total_bits.toLocaleString() + ' bits';
        }
      } else if (filter === 'voice') {
        const userVoice = await sequelize.query(`
          SELECT SUM(voice_time) as total_voice_time 
          FROM user_stats 
          WHERE user_id = :userId
        `, {
          replacements: { userId: interaction.user.id },
          type: sequelize.QueryTypes.SELECT
        });
        if (userVoice.length > 0 && userVoice[0].total_voice_time) {
          userValue = formatVoiceTime(userVoice[0].total_voice_time);
        }
      } else if (filter === 'ponies') {
        const userPonies = await sequelize.query(`
          SELECT COUNT(*) as pony_count 
          FROM friendship 
          WHERE user_id = :userId
        `, {
          replacements: { userId: interaction.user.id },
          type: sequelize.QueryTypes.SELECT
        });
        if (userPonies.length > 0) {
          const ponyCountText = await t('leaders.pony_count', guildId);
          userValue = `${userPonies[0].pony_count} ${ponyCountText.toLowerCase()}`;
        }
      } else if (filter === 'farm') {
        const userFarm = await sequelize.query(`
          SELECT level as farm_level 
          FROM user_farms 
          WHERE user_id = :userId
        `, {
          replacements: { userId: interaction.user.id },
          type: sequelize.QueryTypes.SELECT
        });
        if (userFarm.length > 0) {
          userValue = `Level ${userFarm[0].farm_level}`;
        }
      } else if (filter === 'rebirth') {
        const userRebirth = await sequelize.query(`
          SELECT rebirth_level 
          FROM rebirth 
          WHERE user_id = :userId
        `, {
          replacements: { userId: interaction.user.id },
          type: sequelize.QueryTypes.SELECT
        });
        if (userRebirth.length > 0) {
          userValue = `<:rebirth:1426523946064281611> Level ${userRebirth[0].rebirth_level || 0}`;
        }
      } else if (filter === 'clans') {
        const userClan = await sequelize.query(`
          SELECT name, member_count, level 
          FROM clans 
          WHERE owner_id = :userId
        `, {
          replacements: { userId: interaction.user.id },
          type: sequelize.QueryTypes.SELECT
        });
        if (userClan.length > 0) {
          userValue = `${userClan[0].name} - Level ${userClan[0].level} (${userClan[0].member_count} members)`;
        }
      }
    }
    
    let userPositionText = '';
    if (userRank && userRank > 0 && userValue) {
      const positionText = await t('leaders.position', guildId);
      userPositionText = `${positionText}: #${userRank} - ${userValue}`;
    } else {
      if (filter === 'clans') {
        userPositionText = "You haven't created or joined a clan yet!";
      } else {
        userPositionText = await t('leaders.no_data', guildId);
      }
    }
    
    const embed = createEmbed({
      title: title,
      description: `${leaderboardText}\n${userPositionText}\n\n${await t('leaders.page_info', guildId, { current: page, total: totalPages })}`,
      color: 0x03168f,
      user: interaction.user
    });

    const filterRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`leaders_filter_bits`)
          .setLabel(await t('leaders.button_bits', guildId))
          .setStyle(filter === 'bits' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`leaders_filter_voice`)
          .setLabel(await t('leaders.button_voice', guildId))
          .setStyle(filter === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`leaders_filter_ponies`)
          .setLabel(await t('leaders.button_ponies', guildId))
          .setStyle(filter === 'ponies' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`leaders_filter_clans`)
          .setLabel('Clans')
          .setStyle(filter === 'clans' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

    const filterRow2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`leaders_filter_farm`)
          .setLabel('Farm Level')
          .setStyle(filter === 'farm' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`leaders_filter_rebirth`)
          .setLabel('Rebirth')
          .setEmoji('<:rebirth:1426523946064281611>')
          .setStyle(filter === 'rebirth' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

    const components = [filterRow, filterRow2];

    if (totalPages > 1) {
      const navigationRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`leaders_prev_${filter}_${page}`)
            .setLabel(await t('leaders.previous', guildId))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`leaders_next_${filter}_${page}`)
            .setLabel(await t('leaders.next', guildId))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages)
        );
      
      components.push(navigationRow);
    }

    return await interaction[replyMethod]({ 
      embeds: [embed], 
      components: components
    });

  } catch (error) {
    console.error('Error in leaders command:', error);

    if (interaction.replied || (interaction.deferred && interaction.isButton?.())) {
      console.log('Cannot reply to interaction - already handled');
      return;
    }
    
    const isButton = interaction.isButton?.() || false;
    const replyMethod = isButton ? 'editReply' : 'reply';
    
    const errorEmbed = createEmbed({
      title: await t('error.title', interaction.guild?.id),
      description: await t('error.generic', interaction.guild?.id),
      color: 0xff0000,
      user: interaction.user
    });

    try {
      return await interaction[replyMethod]({ 
        embeds: [errorEmbed], 
        components: []
      });
    } catch (replyError) {
      console.error('Failed to send error response:', replyError);
    }
  }
}

export const category = 'economy';
export const guildOnly = true;
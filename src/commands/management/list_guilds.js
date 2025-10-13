import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/components.js';
import { config } from '../../config/config.js';

export const data = new SlashCommandBuilder()
  .setName('list_guilds')
  .setDescription('List all guilds/servers where the bot is present (Bot owner only)')
  .setDMPermission(false)
  .addIntegerOption(option =>
    option.setName('page')
      .setDescription('Page number to display (default: 1)')
      .setRequired(false)
      .setMinValue(1))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);


export const guildOnly = true;
export const guildId = '1415332959728304170';

export async function execute(interaction) {
  try {
    const page = interaction.options.getInteger('page') || 1;
    

    const authorizedUserId = '259347882052812800';
    if (interaction.user.id !== authorizedUserId) {
      const embed = errorEmbed('You are not authorized to use this command.', 'Access Denied');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    if (interaction.guild.id !== '1415332959728304170') {
      const embed = errorEmbed('This command can only be used in the designated server.', 'Wrong Server');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const guilds = interaction.client.guilds.cache;
    const totalGuilds = guilds.size;
    
    if (totalGuilds === 0) {
      const embed = errorEmbed('The bot is not in any guilds.', 'No Guilds Found');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const guildsPerPage = 5;
    const totalPages = Math.ceil(totalGuilds / guildsPerPage);
    
    if (page > totalPages) {
      const embed = errorEmbed(`Page ${page} does not exist. Total pages: ${totalPages}`, 'Invalid Page');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }


    const guildArray = Array.from(guilds.values());
    const startIndex = (page - 1) * guildsPerPage;
    const endIndex = startIndex + guildsPerPage;
    const currentPageGuilds = guildArray.slice(startIndex, endIndex);


    const embed = new EmbedBuilder()
      .setTitle('📋 Bot Guild List')
      .setDescription(`Showing guilds ${startIndex + 1}-${Math.min(endIndex, totalGuilds)} of ${totalGuilds}`)
      .setColor(config.colors.info || 0x7CC9F9)
      .setTimestamp()
      .setFooter({ 
        text: `Page ${page}/${totalPages} • Use /leave_guild to leave a specific guild`,
        iconURL: interaction.client.user.displayAvatarURL()
      });


    const fields = [];
    let currentField = '';
    let fieldCount = 1;
    
    for (let i = 0; i < currentPageGuilds.length; i++) {
      const guild = currentPageGuilds[i];
      const guildNumber = startIndex + i + 1;
      
      const guildEntry = `**${guildNumber}.** ${guild.name}\n` +
                        `┣ **ID:** \`${guild.id}\`\n` +
                        `┣ **Members:** ${guild.memberCount || 'Unknown'}\n` +
                        `┣ **Owner:** <@${guild.ownerId}>\n` +
                        `┗ **Joined:** <t:${Math.floor(guild.joinedTimestamp / 1000)}:R>\n\n`;
      

      if (currentField.length + guildEntry.length > 1024) {

        if (currentField) {
          fields.push({
            name: fieldCount === 1 ? 'Guild Details' : `Guild Details (continued ${fieldCount})`,
            value: currentField.trim(),
            inline: false
          });
          fieldCount++;
          currentField = '';
        }
      }
      
      currentField += guildEntry;
    }
    

    if (currentField) {
      fields.push({
        name: fieldCount === 1 ? 'Guild Details' : `Guild Details (continued ${fieldCount})`,
        value: currentField.trim(),
        inline: false
      });
    }
    

    if (fields.length > 0) {
      embed.addFields(fields);
    } else {
      embed.addFields([{
        name: 'Guild Details',
        value: 'No guilds to display',
        inline: false
      }]);
    }


    if (totalPages > 1) {
      let navigationInfo = '';
      
      if (page > 1) {
        navigationInfo += `◀️ Previous: \`/list_guilds page:${page - 1}\`\n`;
      }
      
      if (page < totalPages) {
        navigationInfo += `▶️ Next: \`/list_guilds page:${page + 1}\`\n`;
      }
      
      if (navigationInfo) {
        embed.addFields([
          {
            name: 'Navigation',
            value: navigationInfo,
            inline: false
          }
        ]);
      }
    }


    const totalMembers = guildArray.reduce((sum, guild) => sum + (guild.memberCount || 0), 0);
    embed.addFields([
      {
        name: '📊 Summary Statistics',
        value: `**Total Guilds:** ${totalGuilds}\n**Total Members:** ${totalMembers.toLocaleString()}\n**Average Members per Guild:** ${Math.round(totalMembers / totalGuilds)}`,
        inline: false
      }
    ]);

    await interaction.reply({ embeds: [embed], ephemeral: true });

  } catch (error) {
    console.error('Error in list_guilds command:', error);
    
    const embed = errorEmbed(
      'An unexpected error occurred while processing the command.',
      'Command Error'
    );
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}
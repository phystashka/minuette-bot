import { 
  SlashCommandBuilder, 
  EmbedBuilder
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('bug')
  .setDescription('Report a bug to the developers')
  .setDMPermission(false)
  .addStringOption(option =>
    option.setName('description')
      .setDescription('Describe the bug you encountered')
      .setRequired(true)
      .setMaxLength(1000))
  .addAttachmentOption(option =>
    option.setName('image')
      .setDescription('Optional: Attach a screenshot or image of the bug')
      .setRequired(false));

const BUG_CHANNEL_ID = '1417312065311473674';
const TARGET_GUILD_ID = '1369338076178026596';

export async function execute(interaction) {
  try {
    const description = interaction.options.getString('description');
    const attachment = interaction.options.getAttachment('image');


    const targetGuild = interaction.client.guilds.cache.get(TARGET_GUILD_ID);
    if (!targetGuild) {
      return interaction.reply({ content: 'Target server not found.', ephemeral: true });
    }

    const bugChannel = targetGuild.channels.cache.get(BUG_CHANNEL_ID);
    if (!bugChannel) {
      return interaction.reply({ content: 'Bug report channel not found.', ephemeral: true });
    }


    const bugEmbed = new EmbedBuilder()
      .setTitle('🐛 Bug Report')
      .setDescription(description)
      .setAuthor({ 
        name: interaction.user.tag, 
        iconURL: interaction.user.displayAvatarURL() 
      })
      .setTimestamp()
      .setColor(0xFF6B6B)
      .addFields({ 
        name: 'Reporter', 
        value: `<@${interaction.user.id}> (${interaction.user.id})`, 
        inline: true 
      });

    if (interaction.guild) {
      bugEmbed.addFields({ 
        name: 'Server', 
        value: `${interaction.guild.name} (${interaction.guild.id})`, 
        inline: true 
      });
    }


    const messageData = { embeds: [bugEmbed] };
    if (attachment) {
      messageData.files = [attachment];
    }

    await bugChannel.send(messageData);


    await interaction.reply({ 
      content: '✅ Bug report sent successfully! Thank you for helping improve the bot.', 
      ephemeral: true 
    });

  } catch (error) {
    console.error('Error in bug command:', error);
    await interaction.reply({ 
      content: 'Failed to send bug report. Please try again later.', 
      ephemeral: true 
    });
  }
}
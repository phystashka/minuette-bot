
import { EmbedBuilder } from 'discord.js';
import { channels } from '../config/channels.js';
import { config } from '../config/config.js';

export const logCommand = async (client, interaction) => {
  const logChannel = client.channels.cache.get(channels.logs.commands);
  
  if (!logChannel) return;
  
  const { user, guild, channel, commandName, options } = interaction;
  
  const userInfo = {
    id: user.id,
    tag: user.tag,
    bot: user.bot,
    system: user.system,
    flags: user.flags?.toArray() || [],
    createdAt: user.createdAt,
    avatarURL: user.displayAvatarURL({ dynamic: true, size: 256 })
  };
  
  const guildInfo = guild ? {
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    createdAt: guild.createdAt,
    partnered: guild.partnered,
    verified: guild.verified,
    features: guild.features
  } : null;
  
  const channelInfo = channel ? {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    nsfw: channel.nsfw,
    createdAt: channel.createdAt
  } : null;
  
  const optionsInfo = options?._hoistedOptions.map(option => {
    return {
      name: option.name,
      value: option.value,
      type: option.type
    };
  }) || [];
  
  const timestamp = new Date();
  
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`🧵 Command Used: /${commandName}`)
    .setDescription(`📋 A command was executed by **${user.tag}** (${user})`)
    .setThumbnail(userInfo.avatarURL)
    .addFields(
      { name: '👤 User Information', value: `🆔 \`${user.id}\`\n📝 \`${user.tag}\`\n👋 ${user}\n🕰️ Created: <t:${Math.floor(userInfo.createdAt.getTime() / 1000)}:F>`, inline: false },
      { name: '🏠 Server Information', value: guildInfo ? `🆔 \`${guildInfo.id}\`\n🏷️ \`${guildInfo.name}\`\n👥 Members: \`${guildInfo.memberCount}\`\n👑 Owner: \`${guildInfo.ownerId}\`${guildInfo.verified ? '\n✅ Verified' : ''}${guildInfo.partnered ? '\n🤝 Partnered' : ''}` : '💬 Direct Message', inline: false },
      { name: '📢 Channel Information', value: channelInfo ? `🆔 \`${channelInfo.id}\`\n🏷️ \`${channelInfo.name}\`\n📋 Type: \`${channelInfo.type}\`${channelInfo.nsfw ? '\n🔞 NSFW' : ''}` : '❓ N/A', inline: false }
    )
    .setTimestamp(timestamp)
    .setFooter({ text: `📊 Command Log | ${timestamp.toISOString()}` });
  
  if (optionsInfo.length > 0) {
    const optionsText = optionsInfo.map(opt => `🔹 \`${opt.name}\`: \`${opt.value}\``).join('\n');
    embed.addFields({ name: '⚙️ Command Options', value: optionsText, inline: false });
  }
  
  await logChannel.send({ embeds: [embed] });
};

export const logStartup = async (client) => {
  const logChannel = client.channels.cache.get(channels.logs.commands);
  
  if (!logChannel) return;
  
  const timestamp = new Date();
  const uptime = Math.floor(timestamp.getTime() / 1000);
  
  const guildsCount = client.guilds.cache.size;
  const usersCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('🦷 Minuette is Online!')
    .setDescription(`⏰ I've woken up and I'm ready to help with dental appointments and time management!`)
    .addFields(
      { name: '📊 Bot Statistics', value: `🏠 Servers: \`${guildsCount}\`\n👥 Users: \`${usersCount}\`\n⌚ Ready at: <t:${uptime}:F>`, inline: false },
      { name: '🔧 Technical Info', value: `🆔 Bot ID: \`${client.user.id}\`\n📡 API Latency: \`${Math.round(client.ws.ping)}ms\`\n📌 Version: \`1.0.0\``, inline: false }
    )
    .setTimestamp(timestamp)
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setFooter({ text: `✨ Time to brighten those smiles! | ${timestamp.toISOString()}` });
  
  await logChannel.send({ embeds: [embed] });
};

export const logCommandDeploy = async (client, commandCount) => {
  const logChannel = client.channels.cache.get(channels.logs.commands);
  
  if (!logChannel) return;
  
  const timestamp = new Date();
  
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('⚙️ Commands Deployed Successfully')
    .setDescription(`🔧 All slash commands have been registered with Discord API`)
    .addFields(
      { name: '📊 Deployment Info', value: `🧵 Commands Registered: \`${commandCount}\`\n⏱️ Deployed at: <t:${Math.floor(timestamp.getTime() / 1000)}:F>`, inline: false }
    )
    .setTimestamp(timestamp)
    .setFooter({ text: `🚀 Deployment Complete | ${timestamp.toISOString()}` });
  
  await logChannel.send({ embeds: [embed] });
}; 
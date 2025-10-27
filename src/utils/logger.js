
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

class DiscordLogger {
  constructor() {
    this.client = null;
    this.logsChannelId = '1431672815677083661';
    this.errorsChannelId = '1431672896664899724';
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    this.logQueue = [];
    this.errorQueue = [];
    this.isReady = false;
    this.isSetup = false;
  }

  setClient(client) {
    this.client = client;
    
    if (client.isReady()) {
      this.isReady = true;
      this.processQueues();
    } else {
      client.once('ready', () => {
        this.isReady = true;
        this.processQueues();
      });
    }
  }

  async processQueues() {
    if (this.logQueue.length > 0) {
      for (const log of this.logQueue) {
        await this.sendToChannel(this.logsChannelId, log.content, log.type, log.timestamp);
      }
      this.logQueue = [];
    }

    if (this.errorQueue.length > 0) {
      for (const error of this.errorQueue) {
        await this.sendToChannel(this.errorsChannelId, error.content, error.type, error.timestamp);
      }
      this.errorQueue = [];
    }
  }

  async sendToChannel(channelId, content, type = 'log', timestamp = new Date()) {
    if (!this.client || !this.isReady) {
      return;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel) return;

      let color;
      let emoji;
      switch (type) {
        case 'error':
          color = 0xFF0000;
          emoji = '❌';
          break;
        case 'warn':
          color = 0xFFA500;
          emoji = '⚠️';
          break;
        case 'info':
          color = 0x0099FF;
          emoji = 'ℹ️';
          break;
        default:
          color = 0x00FF00;
          emoji = '📝';
      }

      let description = String(content);
      if (description.length > 4000) {
        description = description.substring(0, 3900) + '\n...\n*[Message truncated]*';
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} ${type.toUpperCase()}`)
        .setDescription(`\`\`\`${description}\`\`\``)
        .setTimestamp(timestamp)
        .setFooter({ text: 'Bot Console Logger' });

      await channel.send({ embeds: [embed] });
    } catch (error) {
      this.originalConsole.error('Discord Logger Error:', error);
    }
  }

  formatLogMessage(...args) {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  setupConsoleOverride() {
    if (this.isSetup) return;
    this.isSetup = true;

    console.log = (...args) => {
      const message = this.formatLogMessage(...args);
      this.originalConsole.log(...args);
      
      if (message.includes('Shard') || message.includes('Gateway') || message.includes('WebSocket')) {
        return;
      }
      
      if (this.isReady) {
        this.sendToChannel(this.logsChannelId, message, 'log');
      } else {
        this.logQueue.push({ content: message, type: 'log', timestamp: new Date() });
      }
    };

    console.error = (...args) => {
      const message = this.formatLogMessage(...args);
      this.originalConsole.error(...args);
      
      if (this.isReady) {
        this.sendToChannel(this.errorsChannelId, message, 'error');
      } else {
        this.errorQueue.push({ content: message, type: 'error', timestamp: new Date() });
      }
    };

    console.warn = (...args) => {
      const message = this.formatLogMessage(...args);
      this.originalConsole.warn(...args);
      
      if (this.isReady) {
        this.sendToChannel(this.errorsChannelId, message, 'warn');
      } else {
        this.errorQueue.push({ content: message, type: 'warn', timestamp: new Date() });
      }
    };

    console.info = (...args) => {
      const message = this.formatLogMessage(...args);
      this.originalConsole.info(...args);
      
      if (this.isReady) {
        this.sendToChannel(this.logsChannelId, message, 'info');
      } else {
        this.logQueue.push({ content: message, type: 'info', timestamp: new Date() });
      }
    };
  }

  setupErrorHandlers() {
    process.on('uncaughtException', (error) => {
      const message = `Uncaught Exception: ${error.message}\n${error.stack}`;
      this.originalConsole.error('Uncaught Exception:', error);
      
      if (this.isReady) {
        this.sendToChannel(this.errorsChannelId, message, 'error');
      } else {
        this.errorQueue.push({ content: message, type: 'error', timestamp: new Date() });
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      const message = `Unhandled Rejection at: ${promise}\nReason: ${reason}`;
      this.originalConsole.error('Unhandled Rejection:', reason);
      
      if (this.isReady) {
        this.sendToChannel(this.errorsChannelId, message, 'error');
      } else {
        this.errorQueue.push({ content: message, type: 'error', timestamp: new Date() });
      }
    });
  }

  init(client) {
    this.setClient(client);
    this.setupConsoleOverride();
    this.setupErrorHandlers();
    
    this.originalConsole.info('Discord Global Logger initialized successfully');
  }

  async logToChannel(message, type = 'log') {
    if (this.isReady) {
      await this.sendToChannel(this.logsChannelId, message, type);
    } else {
      this.logQueue.push({ content: message, type, timestamp: new Date() });
    }
  }

  async errorToChannel(message, type = 'error') {
    if (this.isReady) {
      await this.sendToChannel(this.errorsChannelId, message, type);
    } else {
      this.errorQueue.push({ content: message, type, timestamp: new Date() });
    }
  }
}

export const globalLogger = new DiscordLogger();
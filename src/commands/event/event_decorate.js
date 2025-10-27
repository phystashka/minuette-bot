import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { query, getRow } from '../../utils/database.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { grantNightmareNightBackground, hasNightmareNightBackground } from '../../models/ProfileBackgroundModel.js';

// Decorate Ponyville for Nightmare Night - now used as a subcommand


const DECORATIONS = {
  1: {
    name: "Jack-o'-Lantern Path",
    description: "Light up the main street with glowing pumpkins",
    cost: 100,
    emoji: "🎃"
  },
  2: {
    name: "Ghostly Banners",
    description: "Hang spooky banners between the houses",
    cost: 200,
    emoji: "👻"
  },
  3: {
    name: "Cobweb Corners",
    description: "Add mysterious cobwebs to building corners",
    cost: 300,
    emoji: "🕸️"
  },
  4: {
    name: "Bat Colony Roosts",
    description: "Attract friendly bats to hang from the rooftops",
    cost: 400,
    emoji: "🦇"
  },
  5: {
    name: "Moonlight Crystals",
    description: "Install magical crystals that glow in moonlight",
    cost: 500,
    emoji: "🌙"
  },
  6: {
    name: "Spooky Sound Effects",
    description: "Add eerie sounds echoing through the streets",
    cost: 600,
    emoji: "🔊"
  },
  7: {
    name: "Fog Machine Network",
    description: "Create mysterious fog rolling through town",
    cost: 700,
    emoji: "🌫️"
  },
  8: {
    name: "Nightmare Moon Statue",
    description: "Erect a magnificent statue of the Mare in the Moon",
    cost: 800,
    emoji: "🌚"
  },
  9: {
    name: "Dark Magic Fountains",
    description: "Install fountains that flow with purple magical water",
    cost: 900,
    emoji: "⛲"
  },
  10: {
    name: "Grand Nightmare Portal",
    description: "The ultimate decoration - a portal to the realm of dreams",
    cost: 1000,
    emoji: "🌀"
  }
};


async function initDecorationTables() {

  await query(`
    CREATE TABLE IF NOT EXISTS user_ponyville_decorations (
      user_id TEXT PRIMARY KEY,
      level INTEGER DEFAULT 0,
      total_candies_spent INTEGER DEFAULT 0,
      last_upgraded TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}


initDecorationTables().catch(console.error);

export async function execute(interaction) {
  try {
    if (!interaction.guild) {
      return await interaction.reply({
        content: '❌ This command can only be used in a server!',
        ephemeral: true
      });
    }
    
    const userId = interaction.user.id;
    

    const decorationData = await getRow(
      'SELECT * FROM user_ponyville_decorations WHERE user_id = ?', 
      [userId]
    );
    
    const currentLevel = decorationData ? decorationData.level : 0;
    const totalSpent = decorationData ? decorationData.total_candies_spent : 0;
    

    const nextLevel = currentLevel + 1;
    const nextDecoration = DECORATIONS[nextLevel];
    const isMaxLevel = currentLevel >= 10;
    

    let imageName;
    if (currentLevel === 0) {
      imageName = 'base.png';
    } else if (currentLevel <= 4) {
      imageName = 'first.png';
    } else if (currentLevel <= 7) {
      imageName = 'two.png';
    } else {
      imageName = 'three.png';
    }
    

    let statusDescription = `**🎃 Your Personal Ponyville Decorations 🎃**\n\n`;
    statusDescription += `**Current Level:** ${currentLevel}/10\n`;
    statusDescription += `**Total Candies Spent:** 🍬 ${totalSpent.toLocaleString()}\n\n`;
    

    if (currentLevel > 0) {
      statusDescription += `**🎊 Completed Decorations:**\n`;
      for (let i = 1; i <= currentLevel; i++) {
        const decoration = DECORATIONS[i];
        statusDescription += `${decoration.emoji} ${decoration.name}\n`;
      }
      statusDescription += '\n';
    }
    

    if (isMaxLevel) {
      statusDescription += `**🌟 Ponyville is perfectly decorated for Nightmare Night! 🌟**\n`;
      statusDescription += `*The town sparkles with spooky magic, ready for the ultimate celebration!*`;
    } else {
      statusDescription += `**🔮 Next Decoration:**\n`;
      statusDescription += `${nextDecoration.emoji} **${nextDecoration.name}**\n`;
      statusDescription += `*${nextDecoration.description}*\n`;
      statusDescription += `**Cost:** 🍬 ${nextDecoration.cost.toLocaleString()} candies`;
    }
    

    const decorationEmbed = createEmbed({
      title: '🎃 Ponyville Nightmare Night Decorations 🎃',
      description: statusDescription,
      color: 0xFF6600,
      user: interaction.user
    });
    

    const imagePath = join(process.cwd(), 'src', 'public', 'halloween', 'ponyville', imageName);
    let imageFiles = [];
    try {
      const imageBuffer = readFileSync(imagePath);
      imageFiles = [new AttachmentBuilder(imageBuffer, { name: imageName })];
      decorationEmbed.setImage(`attachment://${imageName}`);
    } catch (error) {
      console.log(`Halloween decoration image not found: ${imageName}`);
    }
    

    const buttons = new ActionRowBuilder();
    
    if (!isMaxLevel) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`decorate.upgrade.${nextLevel}.${userId}`)
          .setLabel(`🍬 Upgrade (${nextDecoration.cost} candies)`)
          .setStyle(ButtonStyle.Primary)
      );
    }
    
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`decorate.info.${userId}`)
        .setLabel('ℹ️ Decoration Info')
        .setStyle(ButtonStyle.Secondary)
    );
    
    await interaction.reply({
      embeds: [decorationEmbed],
      components: [buttons],
      files: imageFiles
    });
    
  } catch (error) {
    console.error('Error in decorate command:', error);
    await interaction.reply({
      content: '❌ An error occurred while loading decoration status.',
      ephemeral: true
    });
  }
}


export async function handleDecorationUpgrade(interaction) {
  try {
    const [, , level, originalUserId] = interaction.customId.split('.');
    

    if (interaction.user.id !== originalUserId) {
      return await interaction.reply({
        content: '❌ Only the user who ran the command can use these buttons!',
        ephemeral: true
      });
    }
    
    const upgradeLevel = parseInt(level);
    const decoration = DECORATIONS[upgradeLevel];
    
    if (!decoration) {
      return await interaction.reply({
        content: '❌ Invalid decoration level.',
        ephemeral: true
      });
    }
    
    const userId = interaction.user.id;
    

    const userStats = await getRow('SELECT candies FROM resources WHERE user_id = ?', [userId]);
    const userCandies = userStats ? userStats.candies : 0;
    
    if (userCandies < decoration.cost) {
      return await interaction.reply({
        content: `❌ You need 🍬 ${decoration.cost.toLocaleString()} candies but only have 🍬 ${userCandies.toLocaleString()}!`,
        ephemeral: true
      });
    }
    

    const decorationData = await getRow(
      'SELECT level FROM user_ponyville_decorations WHERE user_id = ?', 
      [userId]
    );
    
    const currentLevel = decorationData ? decorationData.level : 0;
    
    if (currentLevel !== upgradeLevel - 1) {
      return await interaction.reply({
        content: '❌ This decoration is not the next available upgrade!',
        ephemeral: true
      });
    }
    

    await query(
      'UPDATE resources SET candies = candies - ? WHERE user_id = ?',
      [decoration.cost, userId]
    );
    

    await query(`
      INSERT OR REPLACE INTO user_ponyville_decorations (user_id, level, total_candies_spent, last_upgraded)
      VALUES (?, ?, COALESCE((SELECT total_candies_spent FROM user_ponyville_decorations WHERE user_id = ?), 0) + ?, CURRENT_TIMESTAMP)
    `, [userId, upgradeLevel, userId, decoration.cost]);
    

    const updatedDecorationData = await getRow(
      'SELECT * FROM user_ponyville_decorations WHERE user_id = ?', 
      [userId]
    );
    
    const newLevel = updatedDecorationData.level;
    const newTotalSpent = updatedDecorationData.total_candies_spent;
    

    const nextLevel = newLevel + 1;
    const nextDecoration = DECORATIONS[nextLevel];
    const isMaxLevel = newLevel >= 10;
    

    let imageName;
    if (newLevel === 0) {
      imageName = 'base.png';
    } else if (newLevel <= 4) {
      imageName = 'first.png';
    } else if (newLevel <= 7) {
      imageName = 'two.png';
    } else {
      imageName = 'three.png';
    }
    

    let statusDescription = `**🎃 Your Personal Ponyville Decorations**\n\n`;
    statusDescription += `**Current Level:** ${newLevel}/10\n`;
    statusDescription += `**Total Candies Spent:** 🍬 ${newTotalSpent.toLocaleString()}\n\n`;
    

    if (newLevel > 0) {
      statusDescription += `**🎊 Completed Decorations:**\n`;
      for (let i = 1; i <= newLevel; i++) {
        const completedDecoration = DECORATIONS[i];
        statusDescription += `${completedDecoration.emoji} ${completedDecoration.name}\n`;
      }
      statusDescription += '\n';
    }
    

    if (isMaxLevel) {
      statusDescription += `**🌟 Ponyville is perfectly decorated for Nightmare Night! 🌟**\n`;
      statusDescription += `*The town sparkles with spooky magic, ready for the ultimate celebration!*`;
    } else {
      statusDescription += `**🔮 Next Decoration:**\n`;
      statusDescription += `${nextDecoration.emoji} **${nextDecoration.name}**\n`;
      statusDescription += `*${nextDecoration.description}*\n`;
      statusDescription += `**Cost:** 🍬 ${nextDecoration.cost.toLocaleString()} candies`;
    }
    

    let themeRewardMessage = '';
    if (newLevel === 10) {
      const hasTheme = await hasNightmareNightBackground(userId);
      if (!hasTheme) {
        await grantNightmareNightBackground(userId);
        themeRewardMessage = `\n\n🎁 **SPECIAL REWARD!** 🎁\n` +
          `You've been granted the exclusive **"Nightmare Night"** profile theme!\n` +
          `Use \`/profile\` to activate it! 🌙✨`;
      }
    }
    

    statusDescription = `✅ **${decoration.emoji} ${decoration.name}** has been added to Ponyville!\n\n` + statusDescription + themeRewardMessage;
    

    const updatedEmbed = createEmbed({
      title: '🎃 Your Personal Ponyville Decorations 🎃',
      description: statusDescription,
      color: 0xFF6600,
      user: interaction.user
    });
    

    const imagePath = join(process.cwd(), 'src', 'public', 'halloween', 'ponyville', imageName);
    let imageFiles = [];
    try {
      const imageBuffer = readFileSync(imagePath);
      imageFiles = [new AttachmentBuilder(imageBuffer, { name: imageName })];
      updatedEmbed.setImage(`attachment://${imageName}`);
    } catch (error) {
      console.log(`Halloween decoration image not found: ${imageName}`);
    }
    

    const buttons = new ActionRowBuilder();
    
    if (!isMaxLevel) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`decorate.upgrade.${nextLevel}.${userId}`)
          .setLabel(`🍬 Upgrade (${nextDecoration.cost} candies)`)
          .setStyle(ButtonStyle.Primary)
      );
    }
    
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`decorate.info.${userId}`)
        .setLabel('ℹ️ Decoration Info')
        .setStyle(ButtonStyle.Secondary)
    );
    

    await interaction.update({
      embeds: [updatedEmbed],
      components: [buttons],
      files: imageFiles
    });
    
  } catch (error) {
    console.error('Error in decoration upgrade:', error);
    

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while upgrading decoration.',
        ephemeral: true
      });
    } else {
      await interaction.followUp({
        content: '❌ An error occurred while upgrading decoration.',
        ephemeral: true
      });
    }
  }
}


export async function handleDecorationInfo(interaction) {
  try {
    const [, , originalUserId] = interaction.customId.split('.');
    

    if (interaction.user.id !== originalUserId) {
      return await interaction.reply({
        content: '❌ Only the user who ran the command can use these buttons!',
        ephemeral: true
      });
    }
    

    let infoDescription = '**🎃 Decoration Information 🎃**\n\n';
    infoDescription += 'Spend your candies to decorate your personal Ponyville!\n\n';
    infoDescription += '**Available Decorations:**\n';
    
    for (let i = 1; i <= 10; i++) {
      const decoration = DECORATIONS[i];
      infoDescription += `${decoration.emoji} **Level ${i}:** ${decoration.name} (🍬 ${decoration.cost})\n`;
    }
    
    infoDescription += '\n**Rewards:**\n';
    infoDescription += '🌟 Reach level 10 to unlock the exclusive **Nightmare Night** profile theme!';
    
    const infoEmbed = createEmbed({
      title: '🎃 Ponyville Decorations Guide',
      description: infoDescription,
      color: 0xFF6600,
      user: interaction.user
    });
    
    await interaction.reply({
      embeds: [infoEmbed],
      ephemeral: true
    });
    
  } catch (error) {
    console.error('Error in decoration info:', error);
    

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while loading the decoration info.',
        ephemeral: true
      });
    } else {
      await interaction.followUp({
        content: '❌ An error occurred while loading the decoration info.',
        ephemeral: true
      });
    }
  }
}
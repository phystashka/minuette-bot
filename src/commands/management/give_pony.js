import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { query, getRow } from '../../utils/database.js';


async function addFriendDuplicate(userId, friendId) {
  try {

    const randomLevel = Math.floor(Math.random() * 35) + 1;
    

    const calculateExpForLevel = (level) => {
      let totalExp = 0;
      let expForLevel = 100;
      
      for (let i = 1; i < level; i++) {
        totalExp += expForLevel;
        expForLevel += 50;
      }
      

      const randomExpInLevel = Math.floor(Math.random() * expForLevel);
      return totalExp + randomExpInLevel;
    };
    
    const randomExp = calculateExpForLevel(randomLevel);
    

    await query(
      'INSERT INTO friendship (user_id, friend_id, is_favorite, friendship_level, experience, created_at, updated_at) VALUES (?, ?, 0, ?, ?, datetime("now"), datetime("now"))',
      [userId, friendId, randomLevel, randomExp]
    );
    

    const newFriendship = await getRow(
      'SELECT id FROM friendship WHERE user_id = ? AND friend_id = ? ORDER BY id DESC LIMIT 1',
      [userId, friendId]
    );
    

    const encounterResult = await getRow(
      'SELECT COUNT(*) as count FROM friendship WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    
    return {
      success: true,
      newLevel: randomLevel,
      encounterCount: encounterResult.count,
      friendshipId: newFriendship.id
    };
  } catch (error) {
    console.error('Error in addFriendDuplicate:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export const data = new SlashCommandBuilder()
  .setName('give_pony')
  .setDescription('Give a specific pony by database ID to a user (Owner only)')
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('User to give the pony to')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName('pony_id')
      .setDescription('Pony ID from pony_friends database table')
      .setRequired(true)
      .setMinValue(1)
  );


export const guildOnly = true;
export const guildId = '1415332959728304170';
const authorizedUserId = '1372601851781972038';

export async function execute(interaction) {
  const executorId = interaction.user.id;
  

  if (executorId !== authorizedUserId) {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Access Denied',
        description: 'You are not authorized to use this command.',
        color: 0xed4245
      })],
      ephemeral: true
    });
  }


  if (interaction.guild.id !== '1415332959728304170') {
    return interaction.reply({
      embeds: [createEmbed({
        title: '❌ Wrong Server',
        description: 'This command can only be used in the designated server.',
        color: 0xed4245
      })],
      ephemeral: true
    });
  }

  const targetUser = interaction.options.getUser('user');
  const ponyId = interaction.options.getInteger('pony_id');
  
  await interaction.deferReply({ ephemeral: true });

  try {

    const pony = await getRow(`
      SELECT * FROM pony_friends 
      WHERE id = ?
    `, [ponyId]);

    if (!pony) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Pony Not Found',
          description: `Pony with ID **${ponyId}** does not exist in the pony_friends database.`,
          color: 0xed4245
        })]
      });
    }


    let user = await getRow(`SELECT * FROM users WHERE user_id = ?`, [targetUser.id]);
    
    if (!user) {

      await query(`
        INSERT OR IGNORE INTO users (user_id, username) 
        VALUES (?, ?)
      `, [targetUser.id, targetUser.username]);
    }


    const result = await addFriendDuplicate(targetUser.id, pony.id);
    
    if (!result.success) {
      return interaction.editReply({
        embeds: [createEmbed({
          title: '❌ Error',
          description: `Failed to give pony to user: ${result.error}`,
          color: 0xed4245
        })]
      });
    }


    const rarityColors = {
      'COMMON': 0x95a5a6,
      'UNCOMMON': 0x2ecc71,
      'RARE': 0x3498db,
      'EPIC': 0x9b59b6,
      'LEGEND': 0xf39c12,
      'MYTHIC': 0xe91e63,
      'UNIQUE': 0xff6b6b
    };
    
    const embedColor = rarityColors[pony.rarity] || 0x95a5a6;


    await interaction.editReply({
      embeds: [createEmbed({
        title: '✅ Pony Given Successfully',
        description: `**${pony.name}** has been added to ${targetUser.username}'s collection!\n\n` +
                    `**Pony Details:**\n` +
                    `🆔 **Database ID:** ${pony.id}\n` +
                    `📛 **Name:** ${pony.name}\n` +
                    `🏷️ **Type:** ${pony.pony_type}\n` +
                    `💎 **Rarity:** ${pony.rarity}\n` +
                    `📋 **Description:** ${pony.description}\n\n` +
                    `**Friendship ID:** ${result.friendshipId}`,
        color: embedColor,
        thumbnail: pony.image
      })]
    });


    try {
      const { sendDMWithDelete } = await import('../../utils/components.js');
      await sendDMWithDelete(targetUser, {
        embeds: [createEmbed({
          title: '🎁 You received a new pony!',
          description: `**${pony.name}** has been added to your collection!\n\n` +
                      `**Pony Details:**\n` +
                      `**Name:** ${pony.name}\n` +
                      `**Type:** ${pony.pony_type}\n` +
                      `**Rarity:** ${pony.rarity}\n` +
                      `**Description:** ${pony.description}\n\n` +
                      `This pony was given to you by a bot administrator.\n` +
                      `Use \`/myponies\` to see it in your collection!`,
          color: embedColor,
          thumbnail: pony.image,
          footer: { text: `Friendship ID: ${result.friendshipId}` }
        })]
      });
      console.log(`[GIVE_PONY] DM notification sent to ${targetUser.username}`);
    } catch (dmError) {
      console.log(`[GIVE_PONY] Could not send DM to ${targetUser.username}: ${dmError.message}`);

    }


    console.log(`[GIVE_PONY] ${interaction.user.username} (${executorId}) gave pony ${pony.name} (ID: ${ponyId}) to ${targetUser.username} (${targetUser.id})`);

  } catch (error) {
    console.error('Error in give_pony command:', error);
    await interaction.editReply({
      embeds: [createEmbed({
        title: '❌ Error',
        description: 'An error occurred while giving the pony. Please try again later.',
        color: 0xed4245
      })]
    });
  }
}
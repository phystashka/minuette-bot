import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { 
  addPonyAlert, 
  removePonyAlert, 
  getUserPonyAlerts 
} from '../../models/PonyAlertModel.js';
import { getPonyFriendByName } from '../../models/FriendshipModel.js';

export const data = new SlashCommandBuilder()
  .setName('pony_alerts')
  .setDescription('Manage notifications for specific pony spawns')
  .setDMPermission(false)
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a notification for a specific pony')
      .addStringOption(option =>
        option
          .setName('pony_name')
          .setDescription('Name of the pony to get notified about')
          .setRequired(true)
          .setMaxLength(50)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a notification for a specific pony')
      .addStringOption(option =>
        option
          .setName('pony_name')
          .setDescription('Name of the pony to stop getting notified about')
          .setRequired(true)
          .setMaxLength(50)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('Show all your active pony notifications')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  try {
    switch (subcommand) {
      case 'add': {
        const ponyName = interaction.options.getString('pony_name').trim();
        

        const ponyExists = await getPonyFriendByName(ponyName);
        if (!ponyExists) {
          const embed = createEmbed()
            .setTitle('❌ Pony Not Found')
            .setDescription(`Sorry, I couldn't find a pony named **${ponyName}** in the database.\n\nPlease check the spelling and try again. Pony names are case-sensitive!`)
            .setColor('#ff6b6b');
          
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const result = await addPonyAlert(userId, ponyExists.name);
        
        if (result.success) {
          const embed = createEmbed()
            .setTitle('🔔 Alert Added!')
            .setDescription(`You will now be notified when **${ponyExists.name}** spawns in servers where you're present!\n\n> **Rarity:** ${getrarityEmoji(ponyExists.rarity)} ${ponyExists.rarity}\n\nYou can add up to 5 different pony alerts.`)
            .setColor('#7289da')
            .setThumbnail(ponyExists.image);
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          let errorMessage = '';
          if (result.reason === 'already_exists') {
            errorMessage = `You already have an alert set for **${ponyExists.name}**!`;
          } else if (result.reason === 'limit_exceeded') {
            errorMessage = 'You can only have up to **5 pony alerts** at once. Remove some alerts first using `/pony_alerts remove`.';
          } else {
            errorMessage = 'Something went wrong while adding the alert. Please try again later.';
          }

          const embed = createEmbed()
            .setTitle('❌ Cannot Add Alert')
            .setDescription(errorMessage)
            .setColor('#ff6b6b');
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        break;
      }

      case 'remove': {
        const ponyName = interaction.options.getString('pony_name').trim();
        

        const ponyExists = await getPonyFriendByName(ponyName);
        const exactName = ponyExists ? ponyExists.name : ponyName;
        
        const result = await removePonyAlert(userId, exactName);
        
        if (result.success) {
          const embed = createEmbed()
            .setTitle('🔕 Alert Removed')
            .setDescription(`You will no longer be notified when **${exactName}** spawns.`)
            .setColor('#ffa500');
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          const embed = createEmbed()
            .setTitle('❌ Alert Not Found')
            .setDescription(`You don't have an alert set for **${exactName}**.`)
            .setColor('#ff6b6b');
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        break;
      }

      case 'list': {
        const alerts = await getUserPonyAlerts(userId);
        
        if (alerts.length === 0) {
          const embed = createEmbed()
            .setTitle('🔔 Your Pony Alerts')
            .setDescription('You don\'t have any pony alerts set up yet.\n\nUse `/pony_alerts add` to create notifications for specific ponies!')
            .setColor('#7289da');
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          const alertList = alerts.map((name, index) => `${index + 1}. **${name}**`).join('\n');
          
          const embed = createEmbed()
            .setTitle('🔔 Your Pony Alerts')
            .setDescription(`You have **${alerts.length}/5** pony alerts active:\n\n${alertList}\n\nYou'll be pinged when any of these ponies spawn in servers where you're present!`)
            .setColor('#7289da')
            .setFooter({ text: 'Use /pony_alerts remove to remove specific alerts' });
          
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error in pony_alerts command:', error);
    
    const embed = createEmbed()
      .setTitle('❌ Error')
      .setDescription('Something went wrong while processing your request. Please try again later.')
      .setColor('#ff6b6b');
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}


function getrarityEmoji(rarity) {
  const emojis = {
    'BASIC': '⚪',
    'RARE': '🔵', 
    'EPIC': '🟣',
    'MYTHIC': '🟡',
    'LEGEND': '🔴',
    'CUSTOM': '🟢',
    'SECRET': '⚫',
    'EVENT': '🟠',
    'EXCLUSIVE': '💖'
  };
  
  return emojis[rarity?.toUpperCase()] || '⚪';
}

export const category = 'utility';
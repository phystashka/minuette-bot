import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { 
  addPonyAlert, 
  removePonyAlert, 
  getUserPonyAlerts 
} from '../../models/PonyAlertModel.js';
import { getPonyFriendByName } from '../../models/FriendshipModel.js';
import { resolveImageForDiscord } from '../../utils/imageResolver.js';

const RARITY_EMOJIS = {
  BASIC: '<:B1:1410754066811981894><:A1:1410754103918858261><:S1:1410754129235673148><:I1:1410754153206251540><:C1:1410754186471145533>',
  RARE: '<:R1:1410892381171089448><:A1:1410892395721261108><:R2:1410892414603890819><:E1:1410892426159198309>',
  EPIC: '<:E2:1410893187949662219><:P2:1410893200511471656><:I2:1410893211886424125><:C2:1410893223794049135>',
  MYTHIC: '<:M2:1410894084544921752><:Y1:1410894082913472532><:T1:1410894075787477072><:H11:1410894074109755402><:I3:1410894072406868070><:C3:1410894070976479282>',
  LEGEND: '<:L4:1410895642615611453><:E4:1410895641042747434><:G4:1410895638991999057><:E5:1410895637523861504><:N4:1410895635405606933><:D4:1410895645040054374>',
  CUSTOM: '<:C5:1410900991703781539><:U5:1410900989774659695><:S5:1410900998964252712><:T5:1410900997366087750><:O5:1410900995600552046><:M5:1410900993910112266>',
  SECRET: '<:S6:1410901772180131840><:E6:1410901770695081984><:C6:1410901769067692114><:R6:1410901767629307995><:E61:1410901765854990396><:T6:1410901764164816898>',
  EVENT: '<:E2:1417857423829500004><:V1:1417857422420217897><:E1:1417857420029595691><:N1:1417857418804854834><:T1:1417857417391378432>',
  UNIQUE: '<:U2:1418945904546938910><:N2:1418945902470631484><:I1:1418945900570480690><:Q1:1418945898679107614><:U2:1418945904546938910><:E3:1418945906115346452>',
  EXCLUSIVE: '<:E1:1425524316858224822><:X2:1425524310570696815><:C3:1425524308997963857><:L4:1425524306833834185><:U5:1425524304845475840><:S6:1425524303470002319><:I7:1425524323002876015><:V8:1425524320985153586><:E9:1425524318732812461>',
  ADMIN: '<:a_:1430153532287488071><:d_:1430153530018238575><:m_:1430153528143380500><:I_:1430153535961694278><:N1:1430153534212407376>'
};

// Pony alerts management - now used as a subcommand

export async function execute(interaction) {
  const action = interaction.options.getString('action');
  const ponyName = interaction.options.getString('pony_name');
  const userId = interaction.user.id;

  try {
    switch (action) {
      case 'add': {
        if (!ponyName) {
          return interaction.reply({
            embeds: [createEmbed({
              title: '❌ Missing Pony Name',
              description: 'Please specify a pony name to add alerts for.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        
        const trimmedPonyName = ponyName.trim();
        

        const ponyExists = await getPonyFriendByName(ponyName);
        if (!ponyExists) {
          const embed = createEmbed()
            .setTitle('❌ Pony Not Found')
            .setDescription(`Sorry, I couldn't find a pony named **${ponyName}** in the database.\n\nPlease check the spelling and try again. Pony names are case-sensitive!`)
            .setColor('#ff6b6b');
          
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const restrictedRarities = ['ADMIN', 'UNIQUE', 'EXCLUSIVE'];
        if (restrictedRarities.includes(ponyExists.rarity?.toUpperCase())) {
          const embed = createEmbed()
            .setTitle('🚫 Alert Restricted')
            .setDescription(`Sorry, you cannot create alerts for **${ponyExists.rarity}** rarity ponies!\n\n**Restricted rarities:**\n${getrarityEmoji('ADMIN')} Admin\n${getrarityEmoji('UNIQUE')} Unique\n${getrarityEmoji('EXCLUSIVE')} Exclusive\n\nThese special ponies don't spawn randomly, so alerts are not available for them.`)
            .setColor('#ff6b6b');
          
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const result = await addPonyAlert(userId, ponyExists.name);
        
        if (result.success) {
          const embed = createEmbed()
            .setTitle('🔔 Alert Added!')
            .setDescription(`You will now be notified when **${ponyExists.name}** spawns in servers where you're present!\n\n> **Rarity:** ${getrarityEmoji(ponyExists.rarity)}\n\nYou can add up to 5 different pony alerts.`)
            .setColor('#7289da');
          
          const messageOptions = { embeds: [embed], ephemeral: true };

          if (ponyExists.image) {
            const imageInfo = resolveImageForDiscord(ponyExists.image);
            if (imageInfo) {
              if (imageInfo.type === 'url') {
                embed.setImage(imageInfo.path);
              } else if (imageInfo.type === 'file') {
                const attachment = new AttachmentBuilder(imageInfo.path, { name: imageInfo.filename });
                messageOptions.files = [attachment];
                embed.setImage(`attachment://${imageInfo.filename}`);
              }
            }
          }
          
          await interaction.reply(messageOptions);
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
        if (!ponyName) {
          return interaction.reply({
            embeds: [createEmbed({
              title: '❌ Missing Pony Name',
              description: 'Please specify a pony name to remove alerts for.',
              color: 0xFF0000
            })],
            ephemeral: true
          });
        }
        
        const trimmedPonyName = ponyName.trim();
        

        const ponyExists = await getPonyFriendByName(trimmedPonyName);
        const exactName = ponyExists ? ponyExists.name : trimmedPonyName;
        
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
  return RARITY_EMOJIS[rarity?.toUpperCase()] || RARITY_EMOJIS.BASIC;
}

export const category = 'utility';
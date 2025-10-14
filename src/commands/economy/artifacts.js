import { 
  SlashCommandBuilder, 
  StringSelectMenuBuilder, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getPony, removeBits } from '../../utils/pony/index.js';
import { getRow, query } from '../../utils/database.js';
import { getActiveArtifact } from '../../utils/artifactManager.js';
import { startServerCharms } from '../../utils/autoSpawn.js';

export const data = new SlashCommandBuilder()
  .setName('artifacts')
  .setDescription('Ancient Equestrian magical artifacts with powerful effects')
  .setDMPermission(false);

const ARTIFACTS = {
  charm_of_binding: {
    name: 'Charm of Binding',
    description: 'Ancient amulet created by unicorns of the Dawn Era.\nIt captures magical traces of ponies and helps bind their connection effortlessly.\nHowever, its power is short-lived - after an hour it crumbles to stardust.',
    type: 'Personal, 3 hours',
    effect: 'Automatic capture of ponies of all rarities',
    cost: 20000,
    duration: 3 * 60 * 60 * 1000,
  },
  server_charms: {
    name: 'Server Charms',
    description: 'When the charm activates, the very fabric of Equestria begins to vibrate - ponies start appearing more frequently, as if the world is calling them back.',
    type: 'Server-wide, 1 hour',
    effect: 'Every 5 seconds bot randomly selects one channel from allowed list and triggers spawn event',
    cost: 10000,
    duration: 60 * 60 * 1000, 
  },
  blessing_of_fortuna: {
    name: 'Blessing of Fortuna',
    description: 'Mystical seal granted by ancient guardians of luck.\nThey say it bends chance in favor of the owner, but abuse may invoke "envy of fate".',
    type: 'Server-wide, 1 hour',
    effect: 'Increases chance of all rare ponies by 35%',
    cost: 7777,
    duration: 60 * 60 * 1000, 
  }
};

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const userPony = await getPony(userId);
    const userBits = userPony ? userPony.bits : 0;

    const spawnChannel = await getRow('SELECT channel_id FROM spawn_channels WHERE guild_id = ?', [guildId]);
    
    const embed = createEmbed({
      title: 'Ancient Equestrian Artifacts',
      description: `${interaction.user}, **Your <:bits:1411354539935666197>:** ${userBits}\n\n**Mystical relics from the depths of Equestrian history, each carrying immense magical power...**\n\n${!spawnChannel ? '⚠️ **Server-wide artifacts require an autospawn channel to be set!** Ask an admin to use `/set_spawn` first.' : ''}`,
      user: interaction.user,
      color: 0x8A2BE2
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`artifact_preview_${userId}`)
      .setPlaceholder('Select an artifact to examine')
      .addOptions([
        {
          label: `${ARTIFACTS.charm_of_binding.name} - ${ARTIFACTS.charm_of_binding.cost.toLocaleString()} bits`,
          description: 'Personal autocatch for common ponies',
          value: 'charm_of_binding'
        },
        {
          label: `${ARTIFACTS.server_charms.name} - ${ARTIFACTS.server_charms.cost.toLocaleString()} bits`,
          description: 'Increased spawn rate server-wide',
          value: 'server_charms'
        },
        {
          label: `${ARTIFACTS.blessing_of_fortuna.name} - ${ARTIFACTS.blessing_of_fortuna.cost.toLocaleString()} bits`,
          description: 'Better rare pony chances server-wide',
          value: 'blessing_of_fortuna'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return interaction.reply({ 
      embeds: [embed], 
      components: [row] 
    });

  } catch (error) {
    console.error('Error in artifacts command:', error);
    
    const embed = createEmbed({
      title: 'Ancient Artifacts',
      description: 'An error occurred while accessing the artifacts.',
      color: 0xFF0000,
      user: interaction.user
    });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

export async function handleInteraction(interaction) {
  if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

  const userId = interaction.user.id;
  const guildId = interaction.guild.id;

  try {
    if (interaction.customId.startsWith('artifact_preview_')) {
      const expectedUserId = interaction.customId.split('_').pop();
      if (userId !== expectedUserId) {
        return interaction.reply({ content: 'You cannot use someone else\'s artifact selection!', ephemeral: true });
      }
      
      const artifactType = interaction.values[0];
      const artifact = ARTIFACTS[artifactType];
      
      if (!artifact) {
        return interaction.reply({ content: 'Unknown artifact!', ephemeral: true });
      }

      const userPony = await getPony(userId);
      const userBits = userPony ? userPony.bits : 0;
      const spawnChannel = await getRow('SELECT channel_id FROM spawn_channels WHERE guild_id = ?', [guildId]);
      
      const isServerWide = artifactType !== 'charm_of_binding';
      if (isServerWide && !spawnChannel) {
        return interaction.reply({ 
          content: '⚠️ This artifact requires an autospawn channel to be configured! Ask a server admin to use `/set_spawn` first.', 
          ephemeral: true 
        });
      }

      const activeArtifact = await getActiveArtifact(userId, guildId, artifactType);
      let statusText = '';
      let embedColor = 0x8A2BE2;
      
      if (activeArtifact) {
        const timeLeft = Math.max(0, activeArtifact.expires_at - Date.now());
        const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        
        statusText = `\n\n🟢 **ACTIVE** - ${hoursLeft}h ${minutesLeft}m remaining`;
        embedColor = 0x00FF00;
      }

      const embed = createEmbed({
        title: `${artifact.name}`,
        description: `${artifact.description}\n\n**Type:** ${artifact.type}\n**Effect:** ${artifact.effect}\n**Cost:** ${artifact.cost.toLocaleString()} <:bits:1411354539935666197>${statusText}`,
        color: embedColor,
        user: interaction.user
      });

      embed.setFooter({ text: `Your bits: ${userBits.toLocaleString()} | Artifact cost: ${artifact.cost.toLocaleString()}` });

      const components = [];
      if (activeArtifact) {
        const activeButton = new ButtonBuilder()
          .setCustomId('artifact_already_active')
          .setLabel('Already Active')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🟢')
          .setDisabled(true);
        
        components.push(new ActionRowBuilder().addComponents(activeButton));
      } else if (userBits >= artifact.cost) {
        const purchaseButton = new ButtonBuilder()
          .setCustomId(`artifact_purchase_${artifactType}_${userId}`)
          .setLabel(`Purchase for ${artifact.cost.toLocaleString()} bits`)
          .setStyle(ButtonStyle.Success);
        
        components.push(new ActionRowBuilder().addComponents(purchaseButton));
      } else {
        const insufficientButton = new ButtonBuilder()
          .setCustomId('insufficient_bits')
          .setLabel(`Need ${(artifact.cost - userBits).toLocaleString()} more bits`)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true);
        
        components.push(new ActionRowBuilder().addComponents(insufficientButton));
      }

      return interaction.update({ 
        embeds: [embed], 
        components: components 
      });
    }

    if (interaction.customId.startsWith('artifact_purchase_')) {
      const parts = interaction.customId.split('_');
      const artifactType = parts.slice(2, -1).join('_');
      const targetUserId = parts[parts.length - 1];

      if (userId !== targetUserId) {
        return interaction.reply({ content: 'You cannot purchase artifacts for other users!', ephemeral: true });
      }

      await handleArtifactPurchase(interaction, artifactType, userId, guildId);
    }

  } catch (error) {
    console.error('Error handling artifact interaction:', error);
    
    const embed = createEmbed({
      title: 'Purchase Error',
      description: 'An error occurred while processing your purchase.',
      color: 0xFF0000,
      user: interaction.user
    });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleArtifactPurchase(interaction, artifactType, userId, guildId) {
  const artifact = ARTIFACTS[artifactType];
  
  if (!artifact) {
    return interaction.reply({ content: 'Invalid artifact!', ephemeral: true });
  }

  const userPony = await getPony(userId);
  const userBits = userPony ? userPony.bits : 0;
  
  if (userBits < artifact.cost) {
    return interaction.reply({ 
      content: `Insufficient bits! You need ${(artifact.cost - userBits).toLocaleString()} more bits.`, 
      ephemeral: true 
    });
  }

  const existingArtifact = await getRow(
    'SELECT * FROM active_artifacts WHERE user_id = ? AND artifact_type = ? AND expires_at > ?',
    [userId, artifactType, Date.now()]
  );

  if (existingArtifact) {
    const remainingTime = Math.ceil((existingArtifact.expires_at - Date.now()) / 1000 / 60);
    return interaction.reply({ 
      content: `You already have an active ${artifact.name}! It expires in ${remainingTime} minutes.`, 
      ephemeral: true 
    });
  }

  if (artifactType !== 'charm_of_binding') {
    const existingServerArtifact = await getRow(
      'SELECT * FROM active_artifacts WHERE guild_id = ? AND artifact_type = ? AND expires_at > ?',
      [guildId, artifactType, Date.now()]
    );

    if (existingServerArtifact) {
      const remainingTime = Math.ceil((existingServerArtifact.expires_at - Date.now()) / 1000 / 60);
      return interaction.reply({ 
        content: `This server already has an active ${artifact.name}! It expires in ${remainingTime} minutes.`, 
        ephemeral: true 
      });
    }
  }

  await removeBits(userId, artifact.cost);

  const expiresAt = Date.now() + artifact.duration;
  await query(
    'INSERT INTO active_artifacts (user_id, guild_id, artifact_type, expires_at) VALUES (?, ?, ?, ?)',
    [userId, guildId, artifactType, expiresAt]
  );

  if (artifactType === 'server_charms') {
    startServerCharms(interaction.client, guildId);
  }

  if (artifactType === 'charm_of_binding') {
    const { clearAutocatchCache } = await import('../../utils/autoSpawn.js');
    clearAutocatchCache(guildId);
  }

  const embed = createEmbed({
    title: `Artifact Activated!`,
    description: `**${artifact.name}** has been successfully activated!\n\n${artifact.description}\n\n**Duration:** ${artifact.type}\n**Effect:** ${artifact.effect}`,
    color: 0x00FF00,
    user: interaction.user
  });

  embed.setFooter({ text: `Remaining bits: ${(userBits - artifact.cost).toLocaleString()}` });

  return interaction.update({ 
    embeds: [embed], 
    components: [] 
  });
}
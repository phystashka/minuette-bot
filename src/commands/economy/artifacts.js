import { 
  SlashCommandBuilder, 
  StringSelectMenuBuilder, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getPony, removeBits } from '../../utils/pony/index.js';
import { getRow, query } from '../../utils/database.js';
import { getActiveArtifact } from '../../utils/artifactManager.js';
import { startServerCharms } from '../../utils/autoSpawn.js';
import { formatVoiceTime } from '../../utils/timeUtils.js';

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
    cost: 40000,
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

async function getUserActiveArtifacts(userId, guildId) {
  const activeArtifacts = await query(
    'SELECT * FROM active_artifacts WHERE (user_id = ? OR guild_id = ?) AND expires_at > ?',
    [userId, guildId, Date.now()]
  );
  return activeArtifacts;
}

function formatArtifactTime(expiresAt) {
  const timestamp = Math.floor(expiresAt / 1000);
  return `<t:${timestamp}:R>`; 
}

function createArtifactsMainContainer(user, userBits, spawnChannel, activeArtifacts) {
  const container = new ContainerBuilder();
  
  const headerText = new TextDisplayBuilder()
    .setContent('**Ancient Equestrian Artifacts**\n\n**Mystical relics from the depths of Equestrian history, each carrying immense magical power...**');
  
  container.addTextDisplayComponents(headerText);

  if (activeArtifacts && activeArtifacts.length > 0) {
    let statusText = '**🟢 Active Artifacts:**\n';
    activeArtifacts.forEach(artifact => {
      const artifactName = ARTIFACTS[artifact.artifact_type]?.name || artifact.artifact_type;
      const timeRemaining = formatArtifactTime(artifact.expires_at);
      statusText += `${artifactName} - expires ${timeRemaining}\n`;
    });
    
    const statusDisplay = new TextDisplayBuilder().setContent(statusText);
    container.addTextDisplayComponents(statusDisplay);
  } else {
    const noActiveText = new TextDisplayBuilder()
      .setContent('**📋 Status:** No active artifacts');
    container.addTextDisplayComponents(noActiveText);
  }
  

  if (!spawnChannel) {
    const warningText = new TextDisplayBuilder()
      .setContent('⚠️ **Server-wide artifacts require an autospawn channel to be set!** Ask an admin to use `/set_spawn` first.');
    container.addTextDisplayComponents(warningText);
  }
  
  const separator = new SeparatorBuilder();
  container.addSeparatorComponents(separator);
  
  return container;
}

function createArtifactSelectMenu(userId) {
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
  
  return new ActionRowBuilder().addComponents(selectMenu);
}

function createArtifactDetailContainer(user, artifact, userBits, activeArtifact, artifactType, userId) {
  const container = new ContainerBuilder();
  
  let statusText = '';
  if (activeArtifact) {
    const timeFormatted = formatArtifactTime(activeArtifact.expires_at);
    statusText = `\n\n🟢 **ACTIVE** - expires ${timeFormatted}`;
  }
  
  const titleText = new TextDisplayBuilder()
    .setContent(`**${artifact.name}**`);
  
  const descText = new TextDisplayBuilder()
    .setContent(`${artifact.description}\n\n**Type:** ${artifact.type}\n**Effect:** ${artifact.effect}\n**Cost:** ${artifact.cost.toLocaleString()} <:bits:1429131029628588153>${statusText}`);
  
  const footerText = new TextDisplayBuilder()
    .setContent(`-# Your bits: ${userBits.toLocaleString()} | Artifact cost: ${artifact.cost.toLocaleString()}`);
  
  container
    .addTextDisplayComponents(titleText)
    .addTextDisplayComponents(descText)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(footerText);

  const selectRow = createArtifactSelectMenu(userId);
  container.addActionRowComponents(selectRow);
  
  const backButton = new ButtonBuilder()
    .setCustomId(`artifact_back_${userId}`)
    .setEmoji('<:previous:1422550660401860738>')
    .setStyle(ButtonStyle.Secondary);
    
  const backRow = new ActionRowBuilder().addComponents(backButton);
  container.addActionRowComponents(backRow);
  
  return container;
}

function createPurchaseSuccessContainer(user, artifact, remainingBits) {
  const container = new ContainerBuilder();
  
  const titleText = new TextDisplayBuilder()
    .setContent('**🎉 Artifact Activated!**');
  
  const successText = new TextDisplayBuilder()
    .setContent(`**${artifact.name}** has been successfully activated!\n\n${artifact.description}\n\n**Duration:** ${artifact.type}\n**Effect:** ${artifact.effect}`);
  
  const footerText = new TextDisplayBuilder()
    .setContent(`-# Remaining bits: ${remainingBits.toLocaleString()}`);
  
  container
    .addTextDisplayComponents(titleText)
    .addTextDisplayComponents(successText)
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(footerText);
  
  return container;
}

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const userPony = await getPony(userId);
    const userBits = userPony ? userPony.bits : 0;

    const spawnChannel = await getRow('SELECT channel_id FROM spawn_channels WHERE guild_id = ?', [guildId]);
    const activeArtifacts = await getUserActiveArtifacts(userId, guildId);
    
    const container = createArtifactsMainContainer(interaction.user, userBits, spawnChannel, activeArtifacts);

    const selectRow = createArtifactSelectMenu(userId);
    container.addActionRowComponents(selectRow);

    return interaction.reply({ 
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

  } catch (error) {
    console.error('Error in artifacts command:', error);
    
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('**❌ Error**\n-# An error occurred while accessing the artifacts.');
    errorContainer.addTextDisplayComponents(errorText);

    return interaction.reply({ 
      components: [errorContainer], 
      ephemeral: true,
      flags: MessageFlags.IsComponentsV2
    });
  }
}

export async function handleInteraction(interaction) {
  if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

  const userId = interaction.user.id;
  const guildId = interaction.guild.id;

  try {
    if (interaction.customId.startsWith('artifact_back_')) {
      const expectedUserId = interaction.customId.split('_').pop();
      
      if (userId !== expectedUserId) {
        const errorContainer = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('You cannot use someone else\'s artifacts menu!');
        errorContainer.addTextDisplayComponents(errorText);
        
        return interaction.update({ 
          components: [errorContainer], 
          flags: MessageFlags.IsComponentsV2
        });
      }

      const userPony = await getPony(userId);
      const userBits = userPony ? userPony.bits : 0;
      const spawnChannel = await getRow('SELECT channel_id FROM spawn_channels WHERE guild_id = ?', [guildId]);
      const activeArtifacts = await getUserActiveArtifacts(userId, guildId);
      
      const container = createArtifactsMainContainer(interaction.user, userBits, spawnChannel, activeArtifacts);
      const selectRow = createArtifactSelectMenu(userId);
      container.addActionRowComponents(selectRow);
      
      return interaction.update({ 
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
    
    if (interaction.customId.startsWith('artifact_preview_')) {
      const expectedUserId = interaction.customId.split('_').pop();
      if (userId !== expectedUserId) {
        const errorContainer = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('You cannot use someone else\'s artifact selection!');
        errorContainer.addTextDisplayComponents(errorText);
        
        return interaction.reply({ 
          components: [errorContainer], 
          ephemeral: true,
          flags: MessageFlags.IsComponentsV2
        });
      }
      
      const artifactType = interaction.values[0];
      const artifact = ARTIFACTS[artifactType];
      
      if (!artifact) {
        const errorContainer = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('**❌ Unknown Artifact**\n-# The selected artifact was not found.');
        errorContainer.addTextDisplayComponents(errorText);
        
        return interaction.reply({ 
          components: [errorContainer], 
          ephemeral: true,
          flags: MessageFlags.IsComponentsV2
        });
      }

      const userPony = await getPony(userId);
      const userBits = userPony ? userPony.bits : 0;
      const spawnChannel = await getRow('SELECT channel_id FROM spawn_channels WHERE guild_id = ?', [guildId]);
      
      const isServerWide = artifactType !== 'charm_of_binding';
      if (isServerWide && !spawnChannel) {
        const errorContainer = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('**⚠️ Configuration Required**\n-# This artifact requires an autospawn channel to be configured! Ask a server admin to use `/set_spawn` first.');
        errorContainer.addTextDisplayComponents(errorText);
        
        return interaction.reply({ 
          components: [errorContainer], 
          ephemeral: true,
          flags: MessageFlags.IsComponentsV2
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

      const container = createArtifactDetailContainer(interaction.user, artifact, userBits, activeArtifact, artifactType, userId);

      if (activeArtifact) {
        const activeButton = new ButtonBuilder()
          .setCustomId('artifact_already_active')
          .setLabel('Already Active')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🟢')
          .setDisabled(true);
        
        const buttonRow = new ActionRowBuilder().addComponents(activeButton);
        container.addActionRowComponents(buttonRow);
      } else if (userBits >= artifact.cost) {
        const purchaseButton = new ButtonBuilder()
          .setCustomId(`artifact_purchase_${artifactType}_${userId}`)
          .setLabel(`Purchase for ${artifact.cost.toLocaleString()} bits`)
          .setStyle(ButtonStyle.Success);
        
        const buttonRow = new ActionRowBuilder().addComponents(purchaseButton);
        container.addActionRowComponents(buttonRow);
      } else {
        const insufficientButton = new ButtonBuilder()
          .setCustomId('insufficient_bits')
          .setLabel(`Need ${(artifact.cost - userBits).toLocaleString()} more bits`)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true);
        
        const buttonRow = new ActionRowBuilder().addComponents(insufficientButton);
        container.addActionRowComponents(buttonRow);
      }

      return interaction.update({ 
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (interaction.customId.startsWith('artifact_purchase_')) {
      const parts = interaction.customId.split('_');
      const artifactType = parts.slice(2, -1).join('_');
      const targetUserId = parts[parts.length - 1];

      if (userId !== targetUserId) {
        const errorContainer = new ContainerBuilder();
        const errorText = new TextDisplayBuilder()
          .setContent('You cannot purchase artifacts for other users!');
        errorContainer.addTextDisplayComponents(errorText);
        
        return interaction.reply({ 
          components: [errorContainer], 
          ephemeral: true,
          flags: MessageFlags.IsComponentsV2
        });
      }

      await handleArtifactPurchase(interaction, artifactType, userId, guildId);
    }

  } catch (error) {
    console.error('Error handling artifact interaction:', error);
    
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('**❌ Error**\n-# An error occurred while processing your request.');
    errorContainer.addTextDisplayComponents(errorText);

    try {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ 
          components: [errorContainer], 
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        return interaction.update({ 
          components: [errorContainer], 
          flags: MessageFlags.IsComponentsV2
        });
      }
    } catch (updateError) {
      console.error('Error updating interaction after error:', updateError);
    }
  }
}

async function handleArtifactPurchase(interaction, artifactType, userId, guildId) {
  const artifact = ARTIFACTS[artifactType];
  
  if (!artifact) {
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('**❌ Invalid Artifact**\n-# The requested artifact is not valid.');
    errorContainer.addTextDisplayComponents(errorText);
    
    return interaction.reply({ 
      components: [errorContainer], 
      ephemeral: true,
      flags: MessageFlags.IsComponentsV2
    });
  }

  const userPony = await getPony(userId);
  const userBits = userPony ? userPony.bits : 0;
  
  if (userBits < artifact.cost) {
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent(`**❌ Insufficient Bits**\n-# You need ${(artifact.cost - userBits).toLocaleString()} more bits.`);
    errorContainer.addTextDisplayComponents(errorText);
    
    return interaction.reply({ 
      components: [errorContainer], 
      ephemeral: true,
      flags: MessageFlags.IsComponentsV2
    });
  }

  const existingArtifact = await getRow(
    'SELECT * FROM active_artifacts WHERE user_id = ? AND artifact_type = ? AND expires_at > ?',
    [userId, artifactType, Date.now()]
  );

  if (existingArtifact) {
    const remainingTime = Math.ceil((existingArtifact.expires_at - Date.now()) / 1000 / 60);
    const errorContainer = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent(`**⚠️ Already Active**\n-# You already have an active ${artifact.name}! It expires in ${remainingTime} minutes.`);
    errorContainer.addTextDisplayComponents(errorText);
    
    return interaction.reply({ 
      components: [errorContainer], 
      ephemeral: true,
      flags: MessageFlags.IsComponentsV2
    });
  }

  if (artifactType !== 'charm_of_binding') {
    const existingServerArtifact = await getRow(
      'SELECT * FROM active_artifacts WHERE guild_id = ? AND artifact_type = ? AND expires_at > ?',
      [guildId, artifactType, Date.now()]
    );

    if (existingServerArtifact) {
      const remainingTime = Math.ceil((existingServerArtifact.expires_at - Date.now()) / 1000 / 60);
      const errorContainer = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent(`**⚠️ Server Already Active**\n-# This server already has an active ${artifact.name}! It expires in ${remainingTime} minutes.`);
      errorContainer.addTextDisplayComponents(errorText);
      
      return interaction.reply({ 
        components: [errorContainer], 
        ephemeral: true,
        flags: MessageFlags.IsComponentsV2
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
    console.log(`[ARTIFACTS] Charm of Binding activated for user ${userId} in guild ${guildId}`);
    const { refreshAutocatchCache } = await import('../../utils/autoSpawn.js');
    await refreshAutocatchCache(guildId);
  }

  const container = createPurchaseSuccessContainer(interaction.user, artifact, userBits - artifact.cost);

  return interaction.update({ 
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}
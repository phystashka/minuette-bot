import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { query, getRow } from '../../utils/database.js';
import { readFileSync } from 'fs';
import { join } from 'path';


const BATTLE_COOLDOWN = 90 * 60 * 1000;


const NIGHTMARE_MOON_MAX_HP = 3000000;


const MANE_SIX = {
  twilight: {
    name: 'Twilight Sparkle',
    maxHp: 4000,
    emoji: '🦄',
    attacks: {
      star_beam: { name: 'Star Beam', damage: [400, 600], description: 'Direct magical damage' },
      shield: { name: 'Shield of Friendship', damage: [200, 300], description: 'Reduces incoming damage next turn' },
      time_spark: { name: 'Time Spark', damage: [300, 800], description: 'Chance for double damage next turn' }
    }
  },
  rainbow: {
    name: 'Rainbow Dash',
    maxHp: 3500,
    emoji: '🌈',
    attacks: {
      sonic_dash: { name: 'Sonic Dash', damage: [350, 500], description: 'Fast attack with evasion boost' },
      rainbow_blitz: { name: 'Rainbow Blitz', damage: [200, 250], description: 'Series of quick strikes' },
      cloud_cover: { name: 'Cloud Cover', damage: [250, 350], description: 'Reduces boss accuracy' }
    }
  },
  pinkie: {
    name: 'Pinkie Pie',
    maxHp: 3000,
    emoji: '🎉',
    attacks: {
      party_pop: { name: 'Party Pop', damage: [100, 700], description: 'Random chaotic damage' },
      surprise_bomb: { name: 'Surprise Bomb', damage: [300, 600], description: 'Chance for critical hit' },
      cupcake_barrage: { name: 'Cupcake Barrage', damage: [150, 200], description: 'Multiple small attacks' }
    }
  },
  applejack: {
    name: 'Applejack',
    maxHp: 4500,
    emoji: '🍎',
    attacks: {
      apple_slam: { name: 'Apple Slam', damage: [500, 700], description: 'Powerful direct strike' },
      harvest_swing: { name: 'Harvest Swing', damage: [400, 550], description: 'Bonus damage if previous hit' },
      honest_strike: { name: 'Honest Strike', damage: [350, 450], description: 'Boosts team effectiveness' }
    }
  },
  rarity: {
    name: 'Rarity',
    maxHp: 3200,
    emoji: '💎',
    attacks: {
      glamour_beam: { name: 'Glamour Beam', damage: [400, 550], description: 'Reduces boss defense' },
      diamond_slice: { name: 'Diamond Slice', damage: [450, 650], description: 'High critical chance' },
      fashion_shield: { name: 'Fashion Shield', damage: [250, 350], description: 'Protects team' }
    }
  },
  fluttershy: {
    name: 'Fluttershy',
    maxHp: 2800,
    emoji: '🦋',
    evasion: 0.35,
    attacks: {
      animal_call: { name: 'Animal Call', damage: [350, 500], description: 'Calls forest friends for powerful attack' },
      gentle_breeze: { name: 'Gentle Breeze', damage: [280, 400], description: 'Soothing wind that deals steady damage' },
      healing_chirp: { name: 'Healing Chirp', damage: [250, 350], description: 'Birds heal you while attacking enemy' }
    }
  }
};


const NIGHTMARE_ATTACKS = {
  shadow_blast: { 
    name: 'Shadow Blast', 
    damage: [300, 500], 
    target: 'single', 
    image: 'attack1.png',
    description: 'Dark shadow beam'
  },
  moon_beam: { 
    name: 'Moon Beam', 
    damage: [200, 350], 
    target: 'aoe', 
    image: 'attack2.png',
    description: 'Lunar beam hitting all'
  },
  nightmare_charge: { 
    name: 'Nightmare Charge', 
    damage: [600, 900], 
    target: 'single', 
    image: 'attack3.png',
    description: 'Powerful charge attack'
  },
  dark_storm: { 
    name: 'Dark Storm', 
    damage: [250, 400], 
    target: 'aoe', 
    image: 'attack4.png',
    description: 'Dark storm covering area'
  }
};

export const data = new SlashCommandBuilder()
  .setName('battle')
  .setDescription('Fight against Nightmare Moon to save Equestria!')
  .setDMPermission(false);


async function initBattleTables() {

  await query(`
    CREATE TABLE IF NOT EXISTS nightmare_moon_hp (
      id INTEGER PRIMARY KEY,
      current_hp INTEGER NOT NULL DEFAULT ${NIGHTMARE_MOON_MAX_HP},
      max_hp INTEGER NOT NULL DEFAULT ${NIGHTMARE_MOON_MAX_HP},
      last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  

  const bossHp = await getRow('SELECT * FROM nightmare_moon_hp WHERE id = 1');
  if (!bossHp) {
    await query('INSERT INTO nightmare_moon_hp (id, current_hp, max_hp) VALUES (1, ?, ?)', 
                [NIGHTMARE_MOON_MAX_HP, NIGHTMARE_MOON_MAX_HP]);
  } else {

    if (bossHp.max_hp !== NIGHTMARE_MOON_MAX_HP) {
      const hpRatio = bossHp.current_hp / bossHp.max_hp;
      const newCurrentHp = Math.floor(NIGHTMARE_MOON_MAX_HP * hpRatio);
      await query('UPDATE nightmare_moon_hp SET max_hp = ?, current_hp = ? WHERE id = 1', 
                  [NIGHTMARE_MOON_MAX_HP, newCurrentHp]);
      console.log(`✅ Updated Nightmare Moon HP: ${bossHp.max_hp} → ${NIGHTMARE_MOON_MAX_HP}`);
    }
  }
  

  await query(`
    CREATE TABLE IF NOT EXISTS battle_cooldowns (
      user_id TEXT PRIMARY KEY,
      last_battle_timestamp INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  

  await query(`
    CREATE TABLE IF NOT EXISTS battle_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      pony_name TEXT NOT NULL,
      pony_hp INTEGER NOT NULL,
      pony_max_hp INTEGER NOT NULL,
      total_damage_dealt INTEGER DEFAULT 0,
      candies_used INTEGER DEFAULT 0,
      next_attack TEXT,
      dodge_direction TEXT,
      battle_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      effects TEXT DEFAULT '{}',
      UNIQUE(user_id)
    )
  `);
  

  try {

    await query('SELECT candies_used FROM battle_sessions LIMIT 1');
  } catch (error) {

    try {
      await query('ALTER TABLE battle_sessions ADD COLUMN candies_used INTEGER DEFAULT 0');
      console.log('✅ Added candies_used column');
    } catch (addError) {
      console.log('⚠️ Could not add candies_used column:', addError.message);
    }
  }
  
  try {

    await query('SELECT next_attack FROM battle_sessions LIMIT 1');
  } catch (error) {

    try {
      await query('ALTER TABLE battle_sessions ADD COLUMN next_attack TEXT');
      console.log('✅ Added next_attack column');
    } catch (addError) {
      console.log('⚠️ Could not add next_attack column:', addError.message);
    }
  }
  
  try {

    await query('SELECT dodge_direction FROM battle_sessions LIMIT 1');
  } catch (error) {

    try {
      await query('ALTER TABLE battle_sessions ADD COLUMN dodge_direction TEXT');
      console.log('✅ Added dodge_direction column');
    } catch (addError) {
      console.log('⚠️ Could not add dodge_direction column:', addError.message);
    }
  }
}


initBattleTables().catch(console.error);

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const now = Date.now();
    

    const cooldownRecord = await getRow('SELECT last_battle_timestamp FROM battle_cooldowns WHERE user_id = ?', [userId]);
    if (cooldownRecord) {
      const timeSinceLastBattle = now - cooldownRecord.last_battle_timestamp;
      if (timeSinceLastBattle < BATTLE_COOLDOWN) {
        const timeLeft = BATTLE_COOLDOWN - timeSinceLastBattle;
        const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutesLeft = Math.ceil((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        
        const cooldownEmbed = createEmbed({
          title: '⏰ Battle Cooldown Active',
          description: `You recently fought against the darkness!\n\nYou can battle again in **${hoursLeft}h ${minutesLeft}m**.`,
          color: 0x2C2F33,
          user: interaction.user
        });
        
        return await interaction.reply({
          embeds: [cooldownEmbed],
          flags: MessageFlags.Ephemeral
        });
      }
    }
    

    const existingSession = await getRow('SELECT * FROM battle_sessions WHERE user_id = ? AND is_active = 1', [userId]);
    if (existingSession) {
      return await interaction.reply({
        content: 'You already have an active battle! Finish your current battle first.',
        flags: MessageFlags.Ephemeral
      });
    }
    

    await startSoloBattle(interaction);
    
  } catch (error) {
    console.error('Error in battle command:', error);
    await interaction.reply({
      content: 'An error occurred while starting the battle!',
      flags: MessageFlags.Ephemeral
    });
  }
}


async function startSoloBattle(interaction) {

  const bossStatus = await getRow('SELECT * FROM nightmare_moon_hp WHERE id = 1');
  const currentBossHp = bossStatus ? bossStatus.current_hp : NIGHTMARE_MOON_MAX_HP;
  

  if (currentBossHp <= 0) {
    const victoryEmbed = createEmbed({
      title: '🌅 Equestria is Free!',
      description: `**Nightmare Moon has been defeated!**\n\n✨ Princess Celestia has been freed from eternal night!\n🌞 The sun rises once again over Equestria!\n\n*Thank you for your heroic efforts, brave pony!*`,
      color: 0xFFD700,
      user: interaction.user
    });
    
    return await interaction.update({
      embeds: [victoryEmbed],
      components: []
    });
  }
  

  const battleEmbed = createEmbed({
    title: '🌙 Solo Battle - Choose Your Pony',
    description: `**Choose your pony from the Mane 6 to fight alone!**\n\n**Nightmare Moon HP:** \`${currentBossHp.toLocaleString()} / ${NIGHTMARE_MOON_MAX_HP.toLocaleString()}\`\n\n${Object.entries(MANE_SIX).map(([key, pony]) => 
      `${pony.emoji} **${pony.name}** - ${pony.maxHp} HP`
    ).join('\n')}`,
    color: 0x2C2F33,
    user: interaction.user
  });
  

  const ponyButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('battle_select_solo_twilight')
        .setLabel('Twilight Sparkle')
        .setEmoji('🦄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('battle_select_solo_rainbow')
        .setLabel('Rainbow Dash')
        .setEmoji('🌈')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('battle_select_solo_pinkie')
        .setLabel('Pinkie Pie')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Primary)
    );
  
  const ponyButtons2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('battle_select_solo_applejack')
        .setLabel('Applejack')
        .setEmoji('🍎')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('battle_select_solo_rarity')
        .setLabel('Rarity')
        .setEmoji('💎')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('battle_select_solo_fluttershy')
        .setLabel('Fluttershy')
        .setEmoji('🦋')
        .setStyle(ButtonStyle.Primary)
    );
  

  await interaction.reply({
    embeds: [battleEmbed],
    components: [ponyButtons, ponyButtons2]
  });
}


async function startTeamBattle(interaction) {
  try {
    const teamId = `team_${interaction.user.id}_${Date.now()}`;
    
    const teamEmbed = createEmbed({
      title: '👥 Team Battle - Assemble Your Team!',
      description: `**Creating a team battle against Nightmare Moon!**\n\n**Team Leader:** ${interaction.user.displayName}\n**Team Size:** 1/3 players\n\n*Invite 2 more friends to join your team! Each player will choose a different pony.*\n\n**Team Benefits:**\n• Higher damage multiplier\n• Shared HP pool strategy\n• Turn-based combat`,
      color: 0x00FF00,
      user: interaction.user
    });
    
    const teamButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`team_join_${teamId}`)
          .setLabel('🤝 Join Team')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`team_start_${teamId}`)
          .setLabel('⚔️ Start Battle')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`team_cancel_${teamId}`)
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Secondary)
      );
    

    await interaction.update({
      content: '✅ Team battle created! Other players can now join.',
      embeds: [],
      components: []
    });
    

    await interaction.followUp({
      embeds: [teamEmbed],
      components: [teamButtons]
    });
    

    global.teamBattles = global.teamBattles || new Map();
    global.teamBattles.set(teamId, {
      leader: interaction.user.id,
      members: [interaction.user.id],
      created: Date.now(),
      channelId: interaction.channel.id
    });
    

    setTimeout(() => {
      if (global.teamBattles && global.teamBattles.has(teamId)) {
        global.teamBattles.delete(teamId);
        console.log(`Team ${teamId} auto-expired`);
      }
    }, 10 * 60 * 1000);
    
  } catch (error) {
    console.error('Error in start team battle:', error);
    await interaction.update({
      content: 'An error occurred while creating team battle!',
      embeds: [],
      components: []
    });
  }
}


export async function handleBattleSelect(interaction) {
  try {

    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply({ ephemeral: false });
    }
    
    const userId = interaction.user.id;
    const customId = interaction.customId;
    const ponyKey = customId.split('_')[3];
    const pony = MANE_SIX[ponyKey];
    
    if (!pony) {
      return await interaction.editReply({
        content: 'Invalid pony selection!',
        embeds: [],
        components: []
      });
    }
    

    const existingSession = await getRow('SELECT * FROM battle_sessions WHERE user_id = ? AND is_active = 1', [userId]);
    if (existingSession) {
      return await interaction.editReply({
        content: 'You already have an active battle! Finish your current battle first.',
        embeds: [],
        components: []
      });
    }
    

    await query('DELETE FROM battle_sessions WHERE user_id = ? AND is_active = 0', [userId]);
    

    await query(`
      INSERT OR REPLACE INTO battle_sessions (user_id, pony_name, pony_hp, pony_max_hp, total_damage_dealt, effects)
      VALUES (?, ?, ?, ?, 0, '{}')
    `, [userId, pony.name, pony.maxHp, pony.maxHp]);
    

    await query(`
      INSERT OR REPLACE INTO battle_cooldowns (user_id, last_battle_timestamp)
      VALUES (?, ?)
    `, [userId, Date.now()]);
    

    await interaction.editReply({
      content: '✅ Pony selected! Starting battle...',
      embeds: [],
      components: []
    });
    

    await showBattleInterface(interaction, ponyKey);
    
  } catch (error) {
    console.error('Error in battle select:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while selecting your pony.',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.editReply({
          content: 'An error occurred while selecting your pony.',
          embeds: [],
          components: []
        });
      }
    } catch (replyError) {
      console.error('Error handling interaction reply:', replyError);
    }
  }
}


export async function handleTeamAction(interaction) {
  try {
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const teamId = parts.slice(2).join('_');
    
    if (action === 'join') {
      await handleTeamJoin(interaction, teamId);
    } else if (action === 'start') {
      await handleTeamStart(interaction, teamId);
    } else if (action === 'cancel') {
      await handleTeamCancel(interaction, teamId);
    }
  } catch (error) {
    console.error('Error in team action:', error);
    await interaction.reply({
      content: 'An error occurred with team action!',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleTeamJoin(interaction, teamId) {
  console.log(`Team join attempt: teamId=${teamId}, userId=${interaction.user.id}`);
  
  const teamBattles = global.teamBattles || new Map();
  console.log(`Available teams:`, Array.from(teamBattles.keys()));
  
  const team = teamBattles.get(teamId);
  
  if (!team) {
    console.log(`Team ${teamId} not found`);
    return await interaction.reply({
      content: 'Team not found or expired!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  if (team.members.includes(interaction.user.id)) {
    return await interaction.reply({
      content: 'You are already in this team!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  if (team.members.length >= 3) {
    return await interaction.reply({
      content: 'Team is full!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  team.members.push(interaction.user.id);
  console.log(`User ${interaction.user.id} joined team ${teamId}. New members:`, team.members);
  
  const teamEmbed = createEmbed({
    title: '👥 Team Battle - Team Assembly',
    description: `**Team Leader:** <@${team.leader}>\n**Team Size:** ${team.members.length}/3 players\n\n**Members:**\n${team.members.map((id, i) => `${i + 1}. <@${id}>`).join('\n')}\n\n*${team.members.length < 3 ? 'Waiting for more players...' : 'Team is ready! Click Start Battle to begin!'}*`,
    color: 0x00FF00,
    user: interaction.user
  });
  
  const teamButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`team_join_${teamId}`)
        .setLabel('🤝 Join Team')
        .setStyle(ButtonStyle.Success)
        .setDisabled(team.members.length >= 3),
      new ButtonBuilder()
        .setCustomId(`team_start_${teamId}`)
        .setLabel('⚔️ Start Battle')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(team.members.length < 3),
      new ButtonBuilder()
        .setCustomId(`team_cancel_${teamId}`)
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.update({
    embeds: [teamEmbed],
    components: [teamButtons]
  });
}

async function handleTeamStart(interaction, teamId) {
  const teamBattles = global.teamBattles || new Map();
  const team = teamBattles.get(teamId);
  
  if (!team) {
    return await interaction.reply({
      content: 'Team not found or expired!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  if (interaction.user.id !== team.leader) {
    return await interaction.reply({
      content: 'Only the team leader can start the battle!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  if (team.members.length < 3) {
    return await interaction.reply({
      content: 'Need 3 players to start team battle!',
      flags: MessageFlags.Ephemeral
    });
  }
  


  const teamPonies = [];
  for (const memberId of team.members) {    

    const defaultPony = MANE_SIX.twilight;
    
    teamPonies.push({
      userId: memberId,
      pony: {
        key: 'twilight',
        name: defaultPony.name,
        hp: defaultPony.maxHp,
        maxHp: defaultPony.maxHp,
        emoji: defaultPony.emoji
      }
    });
  }
  

  const battleData = {
    team_id: teamId,
    nightmare_hp: 5000000,
    is_active: true,
    current_turn: 0,
    turn_order: team.members,
    team_ponies: teamPonies
  };
  

  global.activeBattles = global.activeBattles || new Map();
  global.activeBattles.set(teamId, battleData);
  

  const battleEmbed = createEmbed({
    title: '🌙 Team Battle vs Nightmare Moon',
    description: `**Team vs Nightmare Moon**\n\n${teamPonies.map((p, i) => `**${i + 1}. ${p.pony.emoji} ${p.pony.name}** (${p.pony.hp} HP) - <@${p.userId}>`).join('\n')}\n\n**Nightmare Moon HP:** ${battleData.nightmare_hp.toLocaleString()}\n\n**Current Turn:** <@${team.members[0]}>\n\n*Note: Currently all team members use Twilight Sparkle. Individual pony selection coming soon!*`,
    color: 0x800080,
    user: interaction.user
  });
  
  const battleButtons = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`battle_attack_${teamId}`)
        .setLabel('⚔️ Attack')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`battle_dodge_${teamId}`)
        .setLabel('🛡️ Dodge')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`battle_heal_${teamId}`)
        .setLabel('🍬 Use Candy')
        .setStyle(ButtonStyle.Success)
    );
  
  await interaction.update({
    embeds: [battleEmbed],
    components: [battleButtons]
  });
  

  teamBattles.delete(teamId);
}

async function handleTeamCancel(interaction, teamId) {
  const teamBattles = global.teamBattles || new Map();
  const team = teamBattles.get(teamId);
  
  if (!team) {
    return await interaction.reply({
      content: 'Team not found or expired!',
      flags: MessageFlags.Ephemeral
    });
  }
  

  if (interaction.user.id !== team.leader) {
    return await interaction.reply({
      content: 'Only the team leader can cancel the team battle!',
      flags: MessageFlags.Ephemeral
    });
  }
  
  teamBattles.delete(teamId);
  
  await interaction.update({
    content: '❌ Team battle cancelled by the leader.',
    embeds: [],
    components: []
  });
}


async function validateBattleSession(userId, ponyKey) {
  const session = await getRow('SELECT * FROM battle_sessions WHERE user_id = ? AND is_active = 1', [userId]);
  if (!session) {
    return { valid: false, error: 'No active battle session!' };
  }
  
  const pony = MANE_SIX[ponyKey];
  if (!pony || session.pony_name !== pony.name) {
    return { valid: false, error: 'This is not your battle! You can only control your own pony.' };
  }
  
  return { valid: true, session };
}


function createPonyDescription(pony, currentHp, maxHp) {
  const specialAbility = pony.evasion ? `\n🦋 *Natural Grace: ${Math.round(pony.evasion * 100)}% chance to evade attacks*` : '';
  return `**${pony.emoji} ${pony.name}**\nHP: \`${currentHp} / ${maxHp}\`${specialAbility}`;
}

async function showBattleInterface(interaction, ponyKey) {
  const userId = interaction.user.id;
  const pony = MANE_SIX[ponyKey];
  const session = await getRow('SELECT * FROM battle_sessions WHERE user_id = ? AND is_active = 1', [userId]);
  const bossStatus = await getRow('SELECT * FROM nightmare_moon_hp WHERE id = 1');
  
  if (!session || !bossStatus) {
    return await interaction.editReply({
      content: 'Battle session error!',
      embeds: [],
      components: []
    });
  }
  

  const nmAttacks = Object.entries(NIGHTMARE_ATTACKS);
  const nextAttackKey = session.next_attack || nmAttacks[Math.floor(Math.random() * nmAttacks.length)][0];
  const nextAttack = NIGHTMARE_ATTACKS[nextAttackKey];
  

  const attackDescriptions = Object.entries(pony.attacks)
    .map(([key, attack]) => `-# ${attack.name}: ${attack.description}`)
    .join('\n');
  

  const battleEmbed = createEmbed({
    title: `⚔️ ${pony.name} vs Nightmare Moon`,
    description: `${createPonyDescription(pony, session.pony_hp, session.pony_max_hp)}\n\n**🌙 Nightmare Moon**\nHP: \`${bossStatus.current_hp.toLocaleString()} / ${NIGHTMARE_MOON_MAX_HP.toLocaleString()}\`\n\n> *Next attack: ${nextAttack.name} - ${nextAttack.description}*\n\n*Choose your attack to strike against the darkness!*\n\n${attackDescriptions}`,
    color: 0x7289DA,
    user: interaction.user
  });
  

  const attacks = Object.entries(pony.attacks);
  const attackButtons = new ActionRowBuilder()
    .addComponents(
      attacks.map(([key, attack]) =>
        new ButtonBuilder()
          .setCustomId(`battle.attack.${ponyKey}.${key}`)
          .setLabel(attack.name)
          .setStyle(ButtonStyle.Danger)
      )
    );
  

  const utilityButtons = new ActionRowBuilder();
  
    if (utilityButtons.components.length > 0) {
      utilityButtons.addComponents(
        new ButtonBuilder()
          .setCustomId(`battle.heal.${ponyKey}`)
          .setLabel('🍬 Use Candies (+400 HP)')
          .setStyle(ButtonStyle.Secondary)
      );
    }
  const idleImagePath = join(process.cwd(), 'src', 'public', 'battle', 'idle.png');
  let files = [];
  try {
    const idleImage = readFileSync(idleImagePath);
    files = [new AttachmentBuilder(idleImage, { name: 'idle.png' })];
    battleEmbed.setImage('attachment://idle.png');
  } catch (error) {
    console.log('Idle image not found, continuing without image');
  }
  

  await query('UPDATE battle_sessions SET next_attack = ? WHERE user_id = ?', [nextAttackKey, interaction.user.id]);
  
  const components = [attackButtons];
  if (utilityButtons.components.length > 0) {
    components.push(utilityButtons);
  }
  
  await interaction.editReply({
    content: '',
    embeds: [battleEmbed],
    components: components,
    files: files
  });
}

export async function handleBattleHeal(interaction) {
  try {
    const [, , ponyKey] = interaction.customId.split('.');
    const userId = interaction.user.id;
    

    const validation = await validateBattleSession(userId, ponyKey);
    if (!validation.valid) {
      return await interaction.reply({
        content: validation.error,
        flags: MessageFlags.Ephemeral
      });
    }
    
    const session = validation.session;
    

    if (session.candies_used) {
      return await interaction.reply({
        content: 'You already used candies in this battle!',
        flags: MessageFlags.Ephemeral
      });
    }
    

    const { getResourceAmount, removeResource } = await import('../../models/ResourceModel.js');
    const candies = await getResourceAmount(userId, 'candies');
    
    console.log(`User ${userId} has ${candies} candies, needs 15`);
    
    if (candies < 15) {
      return await interaction.reply({
        content: `Not enough candies! Required: 15, you have: ${candies}`,
        flags: MessageFlags.Ephemeral
      });
    }
    

    await removeResource(userId, 'candies', 15);
    const newHp = Math.min(session.pony_max_hp, session.pony_hp + 400);
    await query('UPDATE battle_sessions SET pony_hp = ?, candies_used = 1 WHERE user_id = ?', [newHp, userId]);
    
    const pony = MANE_SIX[ponyKey];
    const healEmbed = createEmbed({
      title: '🍬 Magical Healing!',
      description: `**${pony.emoji} ${pony.name}** eats 15 candies and restores 400 HP!\n\nHP: \`${newHp} / ${session.pony_max_hp}\``,
      color: 0x00FF00,
      user: interaction.user
    });
    

    await interaction.update({
      embeds: [healEmbed],
      components: [],
      files: []
    });
    

    setTimeout(async () => {
      try {

        const currentSession = await getRow('SELECT * FROM battle_sessions WHERE user_id = ? AND is_active = 1', [userId]);
        if (!currentSession) return;
        
        const bossStatus = await getRow('SELECT * FROM nightmare_moon_hp WHERE id = 1');
        

        const nmAttacks = Object.entries(NIGHTMARE_ATTACKS);
        const nextAttackKey = nmAttacks[Math.floor(Math.random() * nmAttacks.length)][0];
        const nextAttack = NIGHTMARE_ATTACKS[nextAttackKey];
        

        const attackDescriptions = Object.entries(pony.attacks)
          .map(([key, attack]) => `-# ${attack.name}: ${attack.description}`)
          .join('\n');
        

        const battleEmbed = createEmbed({
          title: `⚔️ ${pony.name} vs Nightmare Moon`,
          description: `${createPonyDescription(pony, currentSession.pony_hp, currentSession.pony_max_hp)}\n\n**🌙 Nightmare Moon**\nHP: \`${bossStatus.current_hp.toLocaleString()} / ${NIGHTMARE_MOON_MAX_HP.toLocaleString()}\`\n\n> *Next attack: ${nextAttack.name} - ${nextAttack.description}*\n\n*Choose your attack to strike against the darkness!*\n\n${attackDescriptions}`,
          color: 0x7289DA,
          user: interaction.user
        });
        

        const idleImagePath = join(process.cwd(), 'src', 'public', 'battle', 'idle.png');
        let idleFiles = [];
        try {
          const idleImage = readFileSync(idleImagePath);
          idleFiles = [new AttachmentBuilder(idleImage, { name: 'idle.png' })];
          battleEmbed.setImage('attachment://idle.png');
        } catch (error) {
          console.log('Idle image not found, continuing without image');
        }
        

        const attacks = Object.entries(pony.attacks);
        const attackButtons = new ActionRowBuilder()
          .addComponents(
            attacks.map(([key, attack]) =>
              new ButtonBuilder()
                .setCustomId(`battle.attack.${ponyKey}.${key}`)
                .setLabel(attack.name)
                .setStyle(ButtonStyle.Danger)
            )
          );
        

        const utilityButtons = new ActionRowBuilder();

        

        await query('UPDATE battle_sessions SET next_attack = ? WHERE user_id = ?', [nextAttackKey, userId]);
        
        const components = [attackButtons];
        if (utilityButtons.components.length > 0) {
          components.push(utilityButtons);
        }
        
        await interaction.editReply({
          embeds: [battleEmbed],
          components: components,
          files: idleFiles
        });
        
      } catch (error) {
        console.error('Error continuing battle after heal:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Error in battle heal:', error);
    await interaction.reply({
      content: 'An error occurred while using candies!',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

export async function handleBattleAttack(interaction) {
  try {
    const [, , ponyKey, attackKey] = interaction.customId.split('.');
    const userId = interaction.user.id;
    
    console.log('Debug attack:', { customId: interaction.customId, ponyKey, attackKey });
    

    const validation = await validateBattleSession(userId, ponyKey);
    if (!validation.valid) {
      return await interaction.reply({
        content: validation.error,
        flags: MessageFlags.Ephemeral
      });
    }
    
    const session = validation.session;
    const pony = MANE_SIX[ponyKey];
    const attack = pony.attacks[attackKey];
    
    if (!attack) {
      return await interaction.reply({
        content: `Invalid attack: ${attackKey} for ${ponyKey}`,
        flags: MessageFlags.Ephemeral
      });
    }
    

    if (session.pony_hp <= 0) {
      return await interaction.reply({
        content: 'Your pony has been defeated!',
        flags: MessageFlags.Ephemeral
      });
    }
    

    let playerDamage = Math.floor(Math.random() * (attack.damage[1] - attack.damage[0] + 1)) + attack.damage[0];
    

    const { hasActivePotion } = await import('../../models/ResourceModel.js');
    const hasBattlePotion = await hasActivePotion(userId, 'battle');
    if (hasBattlePotion) {
      playerDamage = Math.floor(playerDamage * 1.45);
    }
    

    const bossStatus = await getRow('SELECT * FROM nightmare_moon_hp WHERE id = 1');
    const newBossHp = Math.max(0, bossStatus.current_hp - playerDamage);
    
    await query('UPDATE nightmare_moon_hp SET current_hp = ? WHERE id = 1', [newBossHp]);
    await query('UPDATE battle_sessions SET total_damage_dealt = total_damage_dealt + ?, last_action = CURRENT_TIMESTAMP WHERE user_id = ?', 
                [playerDamage, userId]);
    

    if (newBossHp <= 0) {
      const victoryEmbed = createEmbed({
        title: '🌅 VICTORY! Equestria is Saved!',
        description: `**${pony.emoji} ${pony.name} delivers the final blow!**\n\n✨ ${attack.name} deals **${playerDamage.toLocaleString()}** damage!\n🌙 Nightmare Moon: **0 / ${NIGHTMARE_MOON_MAX_HP.toLocaleString()}**\n\n**🌞 The eternal night is broken!**\n**👑 Princess Celestia is free!**\n**⭐ The stars shine bright once more!**\n\n*Thanks to the power of friendship, Equestria is saved!*`,
        color: 0xFFD700,
        user: interaction.user
      });
      

      await query('UPDATE battle_sessions SET is_active = 0 WHERE is_active = 1');
      
      return await interaction.update({
        embeds: [victoryEmbed],
        components: [],
        files: []
      });
    }
    

    const currentAttackKey = session.next_attack;
    const counterAttack = NIGHTMARE_ATTACKS[currentAttackKey] || Object.values(NIGHTMARE_ATTACKS)[0];
    

    if (counterAttack.target === 'aoe') {

      const dodgeEmbed = createEmbed({
        title: `⚡ ${counterAttack.name} incoming!`,
        description: `**🌙 Nightmare Moon** prepares a powerful attack!\n\n**${counterAttack.description}**\n\n*Choose direction to dodge! You have 5 seconds!*`,
        color: 0xFF6B35,
        user: interaction.user
      });
      
      const dodgeButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`battle.dodge.${ponyKey}.left`)
            .setLabel('⬅️')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`battle.dodge.${ponyKey}.up`)
            .setLabel('⬆️')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`battle.dodge.${ponyKey}.right`)
            .setLabel('➡️')
            .setStyle(ButtonStyle.Primary)
        );
      

      const directions = ['left', 'up', 'right'];
      const nmDirection = directions[Math.floor(Math.random() * directions.length)];
      await query('UPDATE battle_sessions SET dodge_direction = ? WHERE user_id = ?', [nmDirection, userId]);
      
      await interaction.update({
        embeds: [dodgeEmbed],
        components: [dodgeButtons],
        files: []
      });
      

      setTimeout(async () => {
        try {
          const currentSession = await getRow('SELECT * FROM battle_sessions WHERE user_id = ? AND is_active = 1', [userId]);
          if (currentSession && currentSession.dodge_direction === nmDirection && !interaction.replied && !interaction.deferred) {

            await resolveBattleAttack(interaction, ponyKey, attack, playerDamage, counterAttack, false);
          }
        } catch (error) {
          console.log('Timer battle resolve skipped:', error.message);
        }
      }, 5000);
      
      return;
    }
    

    await resolveBattleAttack(interaction, ponyKey, attack, playerDamage, counterAttack, false);
    
  } catch (error) {
    console.error('Error in battle attack:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred during battle!',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('Error replying to interaction:', replyError);
    }
  }
}

export async function handleBattleDodge(interaction) {
  try {
    const [, , ponyKey, playerDirection] = interaction.customId.split('.');
    const userId = interaction.user.id;
    

    const validation = await validateBattleSession(userId, ponyKey);
    if (!validation.valid) {
      return await interaction.reply({
        content: validation.error,
        flags: MessageFlags.Ephemeral
      });
    }
    
    const session = validation.session;
    

    const counterAttack = NIGHTMARE_ATTACKS[session.next_attack];
    const dodgeSuccess = playerDirection !== session.dodge_direction;
    

    const pony = MANE_SIX[ponyKey];
    const lastAttack = Object.values(pony.attacks)[0];
    
    await resolveBattleAttack(interaction, ponyKey, lastAttack, session.total_damage_dealt, counterAttack, dodgeSuccess);
    
  } catch (error) {
    console.error('Error in battle dodge:', error);
    await interaction.reply({
      content: 'Error while dodging!',
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

async function resolveBattleAttack(interaction, ponyKey, attack, playerDamage, counterAttack, dodgeSuccess) {
  try {

    if (interaction.replied || interaction.deferred) {
      console.log('Interaction already handled, skipping resolveBattleAttack');
      return;
    }
    
    const userId = interaction.user.id;
    const session = await getRow('SELECT * FROM battle_sessions WHERE user_id = ? AND is_active = 1', [userId]);
    const bossStatus = await getRow('SELECT * FROM nightmare_moon_hp WHERE id = 1');
    const pony = MANE_SIX[ponyKey];
    
    let counterDamage = Math.floor(Math.random() * (counterAttack.damage[1] - counterAttack.damage[0] + 1)) + counterAttack.damage[0];
    

    let fluttershyEvade = false;
    if (pony.evasion && Math.random() < pony.evasion) {
      fluttershyEvade = true;
      counterDamage = 0;
    }
    
    if (dodgeSuccess && !fluttershyEvade) {
      counterDamage = Math.floor(counterDamage * 0.5);
    }
    
    let newPonyHp = Math.max(0, session.pony_hp - counterDamage);
    await query('UPDATE battle_sessions SET pony_hp = ? WHERE user_id = ?', [newPonyHp, userId]);
    

    let resultDescription = `**${pony.emoji} ${pony.name} uses ${attack.name}!**\n⚔️ Deals **${playerDamage.toLocaleString()}** damage to Nightmare Moon!\n\n**🌙 Nightmare Moon uses ${counterAttack.name}!**\n`;
    
    if (fluttershyEvade) {
      resultDescription += `🦋 **${pony.name}'s natural grace!** Completely evades the attack! (No damage taken)\n\n`;
    } else if (counterAttack.target === 'aoe') {
      if (dodgeSuccess) {
        resultDescription += `✅ **Successful dodge!** ${pony.name} takes only **${counterDamage.toLocaleString()}** damage (50% reduction)!\n\n`;
      } else {
        resultDescription += `❌ **Failed to dodge!** ${pony.name} takes full damage **${counterDamage.toLocaleString()}**!\n\n`;
      }
    } else {
      if (counterDamage > 0) {
        resultDescription += `💥 ${pony.name} takes **${counterDamage.toLocaleString()}** damage!\n\n`;
      }
    }
    
    if (newPonyHp <= 0) {
      resultDescription += `💀 **${pony.name} has been defeated!**\n\n*Your battle ends, but the damage to Nightmare Moon remains!*\nTotal damage dealt: **${session.total_damage_dealt + playerDamage}**`;
      

      await query('UPDATE battle_sessions SET is_active = 0 WHERE user_id = ?', [userId]);
      
      const defeatEmbed = createEmbed({
        title: '💀 Battle Ended',
        description: resultDescription,
        color: 0xFF4444,
        user: interaction.user
      });
      
      return await interaction.update({
        embeds: [defeatEmbed],
        components: [],
        files: []
      });
    }
    
    resultDescription += `**Current Status:**\n${pony.emoji} ${pony.name}: \`${newPonyHp} / ${session.pony_max_hp}\`\n🌙 Nightmare Moon: \`${bossStatus.current_hp.toLocaleString()} / ${NIGHTMARE_MOON_MAX_HP.toLocaleString()}\``;
    
    const continueEmbed = createEmbed({
      title: `⚔️ Battle Continues`,
      description: resultDescription,
      color: 0x7289DA,
      user: interaction.user
    });
    

    const attacks = Object.entries(pony.attacks);
    const attackButtons = new ActionRowBuilder()
      .addComponents(
        attacks.map(([key, attackData]) =>
          new ButtonBuilder()
            .setCustomId(`battle.attack.${ponyKey}.${key}`)
            .setLabel(attackData.name)
            .setStyle(ButtonStyle.Danger)
        )
      );
    

    const attackImagePath = join(process.cwd(), 'src', 'public', 'battle', counterAttack.image);
    let files = [];
    try {
      const attackImage = readFileSync(attackImagePath);
      files = [new AttachmentBuilder(attackImage, { name: counterAttack.image })];
      continueEmbed.setImage(`attachment://${counterAttack.image}`);
    } catch (error) {
      console.log(`Attack image ${counterAttack.image} not found`);
    }
    

    if (!interaction.replied && !interaction.deferred) {
      await interaction.update({
        embeds: [continueEmbed],
        components: [],
        files: files
      });
    } else {
      await interaction.editReply({
        embeds: [continueEmbed],
        components: [],
        files: files
      });
    }
    

    setTimeout(async () => {
      try {

        const currentSession = await getRow('SELECT * FROM battle_sessions WHERE user_id = ? AND is_active = 1', [userId]);
        if (!currentSession) return;
        
        const pony = MANE_SIX[ponyKey];
        const bossStatus = await getRow('SELECT * FROM nightmare_moon_hp WHERE id = 1');
        

        const nmAttacks = Object.entries(NIGHTMARE_ATTACKS);
        const nextAttackKey = nmAttacks[Math.floor(Math.random() * nmAttacks.length)][0];
        const nextAttack = NIGHTMARE_ATTACKS[nextAttackKey];
        

        const attackDescriptions = Object.entries(pony.attacks)
          .map(([key, attack]) => `-# ${attack.name}: ${attack.description}`)
          .join('\n');
        

        const battleEmbed = createEmbed({
          title: `⚔️ ${pony.name} vs Nightmare Moon`,
          description: `${createPonyDescription(pony, currentSession.pony_hp, currentSession.pony_max_hp)}\n\n**🌙 Nightmare Moon**\nHP: \`${bossStatus.current_hp.toLocaleString()} / ${NIGHTMARE_MOON_MAX_HP.toLocaleString()}\`\n\n> *Next attack: ${nextAttack.name} - ${nextAttack.description}*\n\n*Choose your attack to strike against the darkness!*\n\n${attackDescriptions}`,
          color: 0x7289DA,
          user: interaction.user
        });
        

        const idleImagePath = join(process.cwd(), 'src', 'public', 'battle', 'idle.png');
        let idleFiles = [];
        try {
          const idleImage = readFileSync(idleImagePath);
          idleFiles = [new AttachmentBuilder(idleImage, { name: 'idle.png' })];
          battleEmbed.setImage('attachment://idle.png');
        } catch (error) {
          console.log('Idle image not found, continuing without image');
        }
        

        const attacks = Object.entries(pony.attacks);
        const attackButtons = new ActionRowBuilder()
          .addComponents(
            attacks.map(([key, attack]) =>
              new ButtonBuilder()
                .setCustomId(`battle.attack.${ponyKey}.${key}`)
                .setLabel(attack.name)
                .setStyle(ButtonStyle.Danger)
            )
          );
        

        const utilityButtons = new ActionRowBuilder();
        
        if (!currentSession.candies_used) {
          utilityButtons.addComponents(
            new ButtonBuilder()
              .setCustomId(`battle.heal.${ponyKey}`)
              .setLabel('🍬 Use Candies (+400 HP)')
              .setStyle(ButtonStyle.Secondary)
          );
        }
        

        await query('UPDATE battle_sessions SET next_attack = ? WHERE user_id = ?', [nextAttackKey, userId]);
        
        const components = [attackButtons];
        if (utilityButtons.components.length > 0) {
          components.push(utilityButtons);
        }
        
        await interaction.editReply({
          embeds: [battleEmbed],
          components: components,
          files: idleFiles
        });
        
      } catch (error) {
        console.error('Error continuing battle:', error);
      }
    }, 3000);
    
  } catch (error) {
    console.error('Error in resolve battle attack:', error);
  }
}

export const guildOnly = false;
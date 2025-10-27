import { REST, Routes } from 'discord.js';
import { config } from './config/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAIN_GUILD_ID = '1369338076178026596';

async function loadCommand(filePath) {
  try {
    const command = await import(`file://${filePath}`);
    if (command.data) {
      return command;
    }
    if (command.default && command.default.data) {
      return command.default;
    }
    const fileName = path.basename(filePath);
    if (!fileName.startsWith('card_') && !fileName.startsWith('premium_') && !fileName.startsWith('game_') && !fileName.startsWith('casino_') && !fileName.startsWith('clan_') && !fileName.startsWith('event_') && !fileName.startsWith('utility_') && fileName !== 'premium_nickname.js' && fileName !== 'premium_nickclear.js') {
      console.log(`WARNING: Command in file ${filePath} does not contain data`);
    }
  } catch (error) {
    console.error(`ERROR: Loading command from ${filePath}:`, error);
  }
  return null;
}

async function loadAllCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  console.log('\nSearching for commands in directories:');
  
  const commandFolders = fs.readdirSync(commandsPath);
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    console.log(`\nChecking folder "${folder}":`);
    const commandFiles = fs.readdirSync(folderPath).filter(file => {
      if (!file.endsWith('.js')) return false;
      
      if (folder === 'card' && file.startsWith('card_')) {
        return false;
      }
      
      if (folder === 'premium' && file.startsWith('premium_')) {
        return false;
      }
      
      if (folder === 'casino' && file.startsWith('casino_')) {
        return false;
      }
      
      if (folder === 'games' && file.startsWith('game_')) {
        return false;
      }
      
      if (folder === 'clan' && file.startsWith('clan_')) {
        return false;
      }
      
      if (folder === 'event' && file.startsWith('event_')) {
        return false;
      }
      
      if (folder === 'utility' && file.startsWith('utility_')) {
        return false;
      }
      
      return true;
    });
    
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      console.log(`   Loading ${file}...`);
      
      const command = await loadCommand(filePath);
      if (command && command.data) {

        const disabledCommands = ['mypony'];
        
        if (disabledCommands.includes(command.data.name)) {
          console.log(`   Command "${command.data.name}" temporarily disabled`);
          continue;
        }
        
        commands.push({
          ...command,
          folderName: folder,
          fileName: file
        });
        console.log(`   Successfully loaded command "${command.data.name}"`);
      }
    }
  }

  console.log(`\nTotal commands loaded: ${commands.length}\n`);
  return commands;
}

async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log('Loading commands...');
    const allCommands = await loadAllCommands();
    
    const guildOnlyCommands = allCommands.filter(cmd => cmd.guildOnly && cmd.guildId);
    const globalCommands = allCommands.filter(cmd => !cmd.guildOnly || !cmd.guildId);
    
    console.log(`Command statistics:
- Total commands: ${allCommands.length}
- Guild commands: ${guildOnlyCommands.length}
- Global commands: ${globalCommands.length}\n`);

    const guildCommands = new Map();
    for (const cmd of guildOnlyCommands) {
      if (!guildCommands.has(cmd.guildId)) {
        guildCommands.set(cmd.guildId, []);
      }
      guildCommands.get(cmd.guildId).push(cmd);
    }

    for (const [guildId, commands] of guildCommands) {
      console.log(`Registering ${commands.length} commands for guild ${guildId}...`);
      console.log('Commands:');
      commands.forEach(cmd => console.log(`- ${cmd.data.name}`));

      await rest.put(
        Routes.applicationGuildCommands(config.clientId, guildId),
        { body: commands.map(cmd => cmd.data.toJSON()) }
      );
      console.log(`Successfully registered ${commands.length} commands for guild ${guildId}\n`);
    }

    if (globalCommands.length > 0) {
      console.log('Registering global commands...');
      console.log('Commands:');
      globalCommands.forEach(cmd => console.log(`- ${cmd.data.name}`));

      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: globalCommands.map(cmd => cmd.data.toJSON()) }
      );
      console.log(`Successfully registered ${globalCommands.length} global commands\n`);
    }

    console.log('All commands successfully registered!');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

deployCommands();
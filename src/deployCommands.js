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
    console.log(`⚠️ Command in file ${filePath} does not contain data`);
  } catch (error) {
    console.error(`❌ Error loading command from ${filePath}:`, error);
  }
  return null;
}

async function loadAllCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  console.log('\n📂 Searching for commands in directories:');
  
  const commandFolders = fs.readdirSync(commandsPath);
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    console.log(`\n📁 Checking folder "${folder}":`);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      console.log(`   📄 Loading ${file}...`);
      
      const command = await loadCommand(filePath);
      if (command && command.data) {

        const disabledCommands = ['mypony'];
        
        if (disabledCommands.includes(command.data.name)) {
          console.log(`   ⏸️ Command "${command.data.name}" temporarily disabled`);
          continue;
        }
        
        commands.push({
          ...command,
          folderName: folder,
          fileName: file
        });
        console.log(`   ✅ Loaded command "${command.data.name}"`);
      }
    }
  }

  console.log(`\n📊 Всего загружено команд: ${commands.length}\n`);
  return commands;
}

async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log('🔍 Загрузка команд...');
    const allCommands = await loadAllCommands();
    

    const guildOnlyCommands = allCommands.filter(cmd => cmd.guildOnly && cmd.guildId);
    const globalCommands = allCommands.filter(cmd => !cmd.guildOnly || !cmd.guildId);
    
    console.log(`📊 Статистика команд:
- Всего команд: ${allCommands.length}
- Серверных команд: ${guildOnlyCommands.length}
- Глобальных команд: ${globalCommands.length}\n`);


    const guildCommands = new Map();
    for (const cmd of guildOnlyCommands) {
      if (!guildCommands.has(cmd.guildId)) {
        guildCommands.set(cmd.guildId, []);
      }
      guildCommands.get(cmd.guildId).push(cmd);
    }


    for (const [guildId, commands] of guildCommands) {
      console.log(`🚀 Регистрация ${commands.length} команд для сервера ${guildId}...`);
      console.log('Команды:');
      commands.forEach(cmd => console.log(`- ${cmd.data.name}`));

      await rest.put(
        Routes.applicationGuildCommands(config.clientId, guildId),
        { body: commands.map(cmd => cmd.data.toJSON()) }
      );
      console.log(`✅ Успешно зарегистрировано ${commands.length} команд для сервера ${guildId}\n`);
    }


    if (globalCommands.length > 0) {
      console.log('🌐 Регистрация глобальных команд...');
      console.log('Команды:');
      globalCommands.forEach(cmd => console.log(`- ${cmd.data.name}`));

      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: globalCommands.map(cmd => cmd.data.toJSON()) }
      );
      console.log(`✅ Успешно зарегистрировано ${globalCommands.length} глобальных команд\n`);
    }

    console.log('✨ Все команды успешно зарегистрированы!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}


deployCommands();
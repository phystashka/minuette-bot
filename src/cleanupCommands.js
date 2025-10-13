import { REST, Routes } from 'discord.js';
import { config } from './config/config.js';

const rest = new REST({ version: '10' }).setToken(config.token);
const MAIN_GUILD_ID = '1415332959728304170';

async function cleanupCommands() {
  try {
    console.log('🔍 Получение текущих команд...\n');
    

    const globalCommands = await rest.get(
      Routes.applicationCommands(config.clientId)
    );
    

    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(config.clientId, MAIN_GUILD_ID)
    );
    
    console.log('📊 Найденные команды:');
    console.log(`🌐 Глобальных: ${globalCommands.length}`);
    globalCommands.forEach(cmd => console.log(`   - ${cmd.name}`));
    
    console.log(`🏠 Серверных: ${guildCommands.length}`);
    guildCommands.forEach(cmd => console.log(`   - ${cmd.name}`));
    

    const validCommands = [

      'adopt', 'balance', 'battle', 'case', 'crime', 'decorate', 
      'equestria', 'farm', 'friendship', 'inventory', 'knock', 
      'leaders', 'marry', 'myponies', 'mypony', 'profile', 
      'timely', 'trade', 'transfer_bits', 'venture', 'zecora_hut',

      'compensation', 'give_gift', 'language', 'remove_blood_notify', 
      'remove_spawn', 'set_blood_notify', 'set_spawn',

      'bloodmoon', 'bug', 'derpibooru', 'donate', 'help', 'pony_alerts'
    ];
    

    const toDeleteGlobal = globalCommands.filter(cmd => !validCommands.includes(cmd.name));
    const toDeleteGuild = guildCommands.filter(cmd => !validCommands.includes(cmd.name));
    
    if (toDeleteGlobal.length > 0) {
      console.log(`\n❌ Удаляем ${toDeleteGlobal.length} лишних глобальных команд:`);
      for (const cmd of toDeleteGlobal) {
        console.log(`   🗑️ Удаляем глобальную команду: ${cmd.name}`);
        await rest.delete(Routes.applicationCommand(config.clientId, cmd.id));
      }
    }
    
    if (toDeleteGuild.length > 0) {
      console.log(`\n❌ Удаляем ${toDeleteGuild.length} лишних серверных команд:`);
      for (const cmd of toDeleteGuild) {
        console.log(`   🗑️ Удаляем серверную команду: ${cmd.name}`);
        await rest.delete(Routes.applicationGuildCommand(config.clientId, MAIN_GUILD_ID, cmd.id));
      }
    }
    
    if (toDeleteGlobal.length === 0 && toDeleteGuild.length === 0) {
      console.log('\n✅ Лишних команд не найдено!');
    } else {
      console.log('\n✅ Очистка завершена!');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при очистке команд:', error);
  }
}


cleanupCommands();
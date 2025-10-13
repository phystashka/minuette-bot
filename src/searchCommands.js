import { REST, Routes } from 'discord.js';
import { config } from './config/config.js';

const rest = new REST({ version: '10' }).setToken(config.token);
const MAIN_GUILD_ID = '1415332959728304170';

async function searchAllCommands() {
  try {
    console.log('🔍 Поиск всех команд...\n');
    

    const globalCommands = await rest.get(
      Routes.applicationCommands(config.clientId)
    );
    

    const guildCommands = await rest.get(
      Routes.applicationGuildCommands(config.clientId, MAIN_GUILD_ID)
    );
    

    const allCommands = [
      ...globalCommands.map(cmd => ({ ...cmd, scope: 'global' })),
      ...guildCommands.map(cmd => ({ ...cmd, scope: 'guild' }))
    ];
    
    console.log(`📊 Всего найдено команд: ${allCommands.length}\n`);
    

    const suspiciousCommands = allCommands.filter(cmd => 
      cmd.name.includes('add') || 
      cmd.name.includes('friendship') ||
      cmd.name === 'add_friendship'
    );
    
    if (suspiciousCommands.length > 0) {
      console.log('🔍 Найдены подозрительные команды:');
      suspiciousCommands.forEach(cmd => {
        console.log(`   - ${cmd.name} (${cmd.scope}) - ID: ${cmd.id}`);
      });
      

      const addFriendshipCmd = suspiciousCommands.find(cmd => cmd.name === 'add_friendship');
      if (addFriendshipCmd) {
        console.log(`\n❌ Найдена команда add_friendship! Удаляем...`);
        if (addFriendshipCmd.scope === 'global') {
          await rest.delete(Routes.applicationCommand(config.clientId, addFriendshipCmd.id));
        } else {
          await rest.delete(Routes.applicationGuildCommand(config.clientId, MAIN_GUILD_ID, addFriendshipCmd.id));
        }
        console.log('✅ Команда add_friendship удалена!');
      }
    } else {
      console.log('✅ Команд с "add" или "friendship" не найдено');
    }
    

    console.log('\n📋 Все текущие команды:');
    allCommands
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(cmd => {
        console.log(`   ${cmd.scope === 'global' ? '🌐' : '🏠'} ${cmd.name}`);
      });
    
  } catch (error) {
    console.error('❌ Ошибка при поиске команд:', error);
  }
}


searchAllCommands();
import { Client, Collection } from 'discord.js';
import { config } from './config/config.js';
import { loadCommands, loadEvents } from './utils/fileLoader.js';
import { setupDatabase } from './utils/dbInit.js';
import { startScheduledTasks } from './utils/scheduledTasks.js';
import { initializeDynamicUpdates } from './utils/dynamicGuildUpdater.js';
import { initializeBloodMoonScheduler } from './utils/bloodMoonScheduler.js';
import { cleanupMissingEmblems } from './utils/emblemCleanup.js';
import { startMessageCacheProcessor } from './utils/messageCacheManager.js';
import { QuestBatchUpdater } from './utils/questBatchUpdater.js';
import { clearAllTempImages } from './utils/ponyImageCache.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ 
  intents: config.intents,
  partials: config.partials
});


global.discordClient = client;

client.commands = new Collection();


const initializeDirectories = () => {
  const directories = [
    path.join(__dirname, 'public', 'clan_emblems'),
    path.join(__dirname, 'public', 'backgrounds'),
    path.join(__dirname, 'public', 'profile'),
    path.join(__dirname, 'public', 'clanprofile')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (error) {
        console.error(chalk.red(`[ERROR] Failed to create directory ${dir}:`), error);
      }
    }
  });
};

const init = async () => {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    
    console.log(chalk.cyan.bold('\n=== Starting Minuette Bot ===\n'));
    
    if (isDev) {
      console.log(chalk.yellow('[DEV MODE] Bot restricted to user 1372601851781972038\n'));
    }

    process.stdout.write(chalk.blue('[INIT] ') + 'Initializing directories... ');
    initializeDirectories();
    console.log(chalk.green('OK'));

    process.stdout.write(chalk.blue('[INIT] ') + 'Initializing database... ');
    await setupDatabase();
    console.log(chalk.green('OK'));

    process.stdout.write(chalk.blue('[INIT] ') + 'Loading commands... ');
    await loadCommands(client);
    console.log(chalk.green('OK'));

    process.stdout.write(chalk.blue('[INIT] ') + 'Loading events... ');
    await loadEvents(client);
    console.log(chalk.green('OK'));

    process.stdout.write(chalk.blue('[INIT] ') + 'Connecting to Discord... ');
    if (!config.token) {
      console.log(chalk.red('FAILED'));
      console.error(chalk.red('[ERROR] Discord token not found!'));
      process.exit(1);
    }
    
    await client.login(config.token);
    console.log(chalk.green('OK'));

    process.stdout.write(chalk.blue('[INIT] ') + 'Cleaning up missing emblems... ');
    await cleanupMissingEmblems();
    console.log(chalk.green('OK'));

    const { setupTopggWebhook } = await import('./utils/topggWebhook.js');
    setupTopggWebhook(client);

    await initializeDynamicUpdates(client);
    startScheduledTasks(client);
    initializeBloodMoonScheduler(client);

    const { initQuestScheduler } = await import('./utils/questScheduler.js');
    initQuestScheduler();

    process.stdout.write(chalk.blue('[INIT] ') + 'Starting cache systems... ');
    const { startMessageCacheProcessor } = await import('./utils/messageCacheManager.js');
    startMessageCacheProcessor(client);

    const { QuestBatchUpdater } = await import('./utils/questBatchUpdater.js');
    QuestBatchUpdater.setBotClient(client);
    QuestBatchUpdater.startBatchProcessor();
    console.log(chalk.green('OK'));

    process.stdout.write(chalk.blue('[INIT] ') + 'Cleaning up temp pony images... ');
    await clearAllTempImages();
    console.log(chalk.green('OK'));
    
    console.log(chalk.green.bold('\n=== Bot Successfully Started ==='));
    
  } catch (error) {
    console.error(chalk.red.bold('[CRITICAL ERROR] Bot initialization failed:'), error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (error) => {
  console.error(chalk.red.bold('[UNHANDLED REJECTION]'), error);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red.bold('[UNCAUGHT EXCEPTION]'), error);
});

init(); 
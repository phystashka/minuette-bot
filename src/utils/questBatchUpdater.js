
const questUpdateQueue = new Map();
const BATCH_INTERVAL = 30000;
const MAX_BATCH_SIZE = 50;

let botClient = null;

export class QuestBatchUpdater {
  static setBotClient(client) {
    botClient = client;
  }

  static addToQueue(userId, clanId, questType, increment = 1) {
    const key = `${userId}_${clanId}_${questType}`;
    
    if (questUpdateQueue.has(key)) {
      questUpdateQueue.get(key).count += increment;
    } else {
      questUpdateQueue.set(key, {
        count: increment,
        lastUpdate: Date.now(),
        userId,
        clanId,
        questType
      });
    }
  }

  static async processBatch() {
    if (questUpdateQueue.size === 0) return;

    const currentTime = Date.now();
    const toProcess = [];
    

    for (const [key, data] of questUpdateQueue.entries()) {
      if (currentTime - data.lastUpdate >= BATCH_INTERVAL || data.count >= MAX_BATCH_SIZE) {
        toProcess.push({ key, data });
      }
    }


    for (const { key, data } of toProcess) {
      try {
        const ClanQuestModel = (await import('../models/ClanQuestModel.js')).default;
        await ClanQuestModel.updateQuestProgress(data.userId, data.clanId, data.questType, data.count, botClient);
        questUpdateQueue.delete(key);
      } catch (error) {
        console.error('Error processing quest batch update:', error);

      }
    }
  }

  static startBatchProcessor() {
    console.log('📈 Starting quest batch processor (30s interval)');
    setInterval(() => {
      this.processBatch();
    }, BATCH_INTERVAL);
  }
}


export function addMessageQuestProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'messages', 1);
}

export function addReactionQuestProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'reactions', 1);
}

export function addVoiceQuestProgress(userId, clanId, minutes) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'voice', minutes);
}


export function addBitsEarnedProgress(userId, clanId, amount) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'earn_bits', amount);
}

export function addPonyGetProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'get_ponies', 1);
}

export function addCrimeSuccessProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'crime_success', 1);
}

export function addTradeSuccessProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'trade_success', 1);
}

export function addTicTacToeWinProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'tictactoe_wins', 1);
}

export function addRPSWinProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'rps_wins', 1);
}

export function addFeedPonyProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'feed_ponies', 1);
}

export function addOpenCaseProgress(userId, clanId) {
  QuestBatchUpdater.addToQueue(userId, clanId, 'open_cases', 1);
}
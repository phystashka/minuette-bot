
import { query, getRow } from './database.js';
import { QuestBatchUpdater } from './questBatchUpdater.js';
import { EmbedBuilder } from 'discord.js';
import { getCutieMarkForPony } from './cutiemarksManager.js';
import { getPonyExperienceBonus } from '../commands/economy/rebirth.js';
import { getImageInfo } from './imageResolver.js';

class MessageCacheManager {
  constructor() {
    this.messageCache = new Map();
    this.spawnCache = new Map();
    this.activePonyCache = new Map();
    this.clanCache = new Map();
    
    this.CACHE_TTL = 5 * 60 * 1000;
    this.PROCESS_INTERVAL = 15 * 1000;
    
    this.isProcessing = false;
    this.botClient = null;
    
    console.log('📦 Message Cache Manager initialized');
  }

  setBotClient(client) {
    this.botClient = client;
  }


  addMessage(userId, guildId, channelId, channel) {

    if (!this.messageCache.has(userId)) {
      this.messageCache.set(userId, {
        messages: 0,
        channels: new Set(),
        lastActivity: Date.now(),
        channel: channel
      });
    }
    
    const userCache = this.messageCache.get(userId);
    userCache.messages++;
    userCache.channels.add(`${guildId}_${channelId}`);
    userCache.lastActivity = Date.now();
    userCache.channel = channel;


    const spawnKey = guildId;
    if (!this.spawnCache.has(spawnKey)) {
      this.spawnCache.set(spawnKey, {
        count: 0,
        participants: new Set(),
        lastMessage: Date.now(),
        guildId,
        channels: new Set()
      });
    }
    
    const spawnCache = this.spawnCache.get(spawnKey);
    spawnCache.count++;
    spawnCache.participants.add(userId);
    spawnCache.channels.add(channelId);
    spawnCache.lastMessage = Date.now();
    

    if (spawnCache.count % 10 === 0) {
      console.log(`📈 Guild ${guildId}: ${spawnCache.count} messages, ${spawnCache.participants.size} participants`);
    }
  }


  async getActivePony(userId) {
    const cached = this.activePonyCache.get(userId);
    

    if (cached && (Date.now() - cached.cached_at) < this.CACHE_TTL) {
      return cached.ponyData;
    }
    

    try {
      const activePony = await getRow(
        `SELECT f.*, pf.name, pf.pony_type, pf.rarity, pf.image
         FROM friendship f 
         JOIN pony_friends pf ON f.friend_id = pf.id 
         WHERE f.user_id = ? AND f.is_profile_pony = 1`,
        [userId]
      );
      
      this.activePonyCache.set(userId, {
        ponyData: activePony,
        cached_at: Date.now()
      });
      
      return activePony;
    } catch (error) {
      console.error('Error loading active pony:', error);
      return null;
    }
  }


  invalidateActivePonyCache(userId) {
    if (this.activePonyCache.has(userId)) {
      this.activePonyCache.delete(userId);
      console.log(`[CACHE] Invalidated active pony cache for user ${userId}`);
    }
  }


  async getClanData(userId) {
    const cached = this.clanCache.get(userId);
    

    if (cached && (Date.now() - cached.cached_at) < this.CACHE_TTL) {
      return cached;
    }
    

    try {
      let clanId = null;
      let role = null;
      

      const ownedClan = await query('SELECT id FROM clans WHERE owner_id = ?', [userId]);
      if (ownedClan.length > 0) {
        clanId = ownedClan[0].id;
        role = 'owner';
      } else {

        const viceClan = await query('SELECT id FROM clans WHERE vice_owner_id = ?', [userId]);
        if (viceClan.length > 0) {
          clanId = viceClan[0].id;
          role = 'vice';
        } else {

          const memberClan = await query('SELECT clan_id FROM clan_members WHERE user_id = ?', [userId]);
          if (memberClan.length > 0) {
            clanId = memberClan[0].clan_id;
            role = 'member';
          }
        }
      }
      
      const clanData = { clanId, role, cached_at: Date.now() };
      this.clanCache.set(userId, clanData);
      return clanData;
      
    } catch (error) {
      console.error('Error loading clan data:', error);
      return { clanId: null, role: null, cached_at: Date.now() };
    }
  }


  async processCache() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    try {
      console.log(`📦 Processing message cache: ${this.messageCache.size} users, ${this.spawnCache.size} guilds`);
      

      for (const [userId, userData] of this.messageCache.entries()) {
        try {

          const activePony = await this.getActivePony(userId);
          if (activePony) {
            await this.processFriendshipExperience(userId, userData, activePony);
          }
          

          const clanData = await this.getClanData(userId);
          if (clanData.clanId) {
            QuestBatchUpdater.addToQueue(userId, clanData.clanId, 'messages', userData.messages);
          }
          
        } catch (error) {
          console.error(`Error processing user ${userId}:`, error);
        }
      }
      

      await this.processSpawnChannels();
      

      for (const [userId, userData] of this.messageCache.entries()) {
        if (userData.messages <= 0) {
          this.messageCache.delete(userId);
        }
      }
      

      this.spawnCache.clear();
      
      console.log('📦 Cache processing completed');
      
    } catch (error) {
      console.error('Error processing cache:', error);
    } finally {
      this.isProcessing = false;
    }
  }


  async processFriendshipExperience(userId, userData, activePony) {
    try {
      const messagesCount = userData.messages;
      


      const limitedMessagesCount = Math.min(messagesCount, 10);
      

      const expPerMessage = await getPonyExperienceBonus(userId);
      const totalExp = limitedMessagesCount * expPerMessage;
      

      if (messagesCount > limitedMessagesCount) {
        console.log(`[MESSAGE EXP] Limited messages for user ${userId}: ${messagesCount} → ${limitedMessagesCount} (excess will be processed next cycle)`);
        

        userData.messages = messagesCount - limitedMessagesCount;
      } else {
        userData.messages = 0;
      }
      
      const currentExp = activePony.experience || 0;
      const newExp = currentExp + totalExp;
      


      const { calculateLevelFromExperience } = await import('./friendshipExperience.js');
      
      const calculateLevel = (exp) => {
        const result = calculateLevelFromExperience(exp);
        return result.level;
      };
      
      const oldLevel = calculateLevel(currentExp);
      const newLevel = calculateLevel(newExp);
      

      if (totalExp > 0) {
        console.log(`[MESSAGE EXP] User ${userId}: ${activePony.name} - Exp: ${currentExp} → ${newExp} (+${totalExp}), Level: ${oldLevel} → ${newLevel}`);
      }
      

      await query(
        'UPDATE friendship SET experience = ?, friendship_level = ? WHERE id = ?',
        [newExp, newLevel, activePony.id]
      );
      

      this.activePonyCache.delete(userId);
      
      if (newLevel > oldLevel && userData.channel) {

        if (newLevel === 30) {
          const cutieMark = await getCutieMarkForPony(activePony.name, newLevel, activePony.friend_id);
          const cutieMarkDisplay = cutieMark ? `${cutieMark} ` : '';
          
          const cutiemMarkEmbed = new EmbedBuilder()
            .setDescription(`<@${userId}>, **${cutieMarkDisplay}${activePony.name}** earned their **Cutie Mark**! 🎉✨`)
            .setColor(0xFFD700)
            .setThumbnail(activePony.image || null);
          
          await userData.channel.send({ embeds: [cutiemMarkEmbed] });
        } else {

          const cutieMark = await getCutieMarkForPony(activePony.name, newLevel, activePony.friend_id);
          const cutieMarkDisplay = cutieMark ? `${cutieMark} ` : '';
          
          const imageInfo = getImageInfo(activePony.image);
          const thumbnailUrl = imageInfo.type === 'url' ? imageInfo.url : null;
          
          const levelUpEmbed = new EmbedBuilder()
            .setDescription(`<@${userId}>, **${cutieMarkDisplay}${activePony.name}** reached friendship level **${newLevel}**!`)
            .setColor(0x7CC9F9)
            .setThumbnail(thumbnailUrl);
          
          await userData.channel.send({ embeds: [levelUpEmbed] });
        }
      }
      
    } catch (error) {
      console.error('Error processing friendship experience:', error);
    }
  }


  async processSpawnChannels() {
    if (!this.botClient) return;
    
    const readyChannels = [];
    const keysToRemove = [];
    
    for (const [guildId, spawnData] of this.spawnCache.entries()) {
      try {

        const spawnChannels = await query(
          'SELECT channel_id, target_messages, current_messages FROM spawn_channels WHERE guild_id = ? AND active = 1',
          [guildId]
        );
        
        if (spawnChannels.length === 0) {
          keysToRemove.push(guildId);
          continue;
        }
        

        for (const channelConfig of spawnChannels) {
          const totalMessages = channelConfig.current_messages + spawnData.count;
          const targetMessages = channelConfig.target_messages;
          

          if (totalMessages >= targetMessages) {
            console.log(`✅ Spawn ready: Guild ${guildId}, Channel ${channelConfig.channel_id} (${totalMessages}/${targetMessages}, ${spawnData.participants.size} participants)`);
            

            const updateResult = await query(
              `UPDATE spawn_channels SET 
               current_messages = 0,
               last_spawn = ? 
               WHERE guild_id = ? AND channel_id = ?`,
              [new Date().toISOString(), guildId, channelConfig.channel_id]
            );
            
            readyChannels.push({
              guild_id: guildId,
              channel_id: channelConfig.channel_id,
              message_count: totalMessages
            });
          } else {

            const updateResult = await query(
              `UPDATE spawn_channels SET 
               current_messages = ? 
               WHERE guild_id = ? AND channel_id = ?`,
              [totalMessages, guildId, channelConfig.channel_id]
            );
            

            if (totalMessages >= targetMessages * 0.8) {
              console.log(`🔄 Progress: Guild ${guildId}, Channel ${channelConfig.channel_id} (${totalMessages}/${targetMessages}, ${spawnData.participants.size} participants)`);
            }
          }
        }
        

        keysToRemove.push(guildId);
        
      } catch (error) {
        console.error(`Error processing spawn guild ${guildId}:`, error);

        keysToRemove.push(guildId);
      }
    }
    

    keysToRemove.forEach(key => this.spawnCache.delete(key));
    

    if (readyChannels.length > 0) {
      console.log(`🎯 Triggering spawn for ${readyChannels.length} ready channels`);
      const { checkAndSpawn } = await import('./autoSpawn.js');
      await checkAndSpawn(this.botClient, readyChannels);
    }
  }


  cleanExpiredCache() {
    const now = Date.now();
    

    for (const [userId, cached] of this.activePonyCache.entries()) {
      if ((now - cached.cached_at) > this.CACHE_TTL) {
        this.activePonyCache.delete(userId);
      }
    }
    

    for (const [userId, cached] of this.clanCache.entries()) {
      if ((now - cached.cached_at) > this.CACHE_TTL) {
        this.clanCache.delete(userId);
      }
    }
  }


  startCacheProcessor() {
    console.log('📦 Starting cache processor (15s interval)');
    
    setInterval(() => {
      this.processCache();
    }, this.PROCESS_INTERVAL);
    

    setInterval(() => {
      this.cleanExpiredCache();
    }, this.CACHE_TTL);
  }
}


export const messageCacheManager = new MessageCacheManager();


export function addMessageToCache(userId, guildId, channelId, channel) {
  messageCacheManager.addMessage(userId, guildId, channelId, channel);
}

export function startMessageCacheProcessor(client) {
  messageCacheManager.setBotClient(client);
  messageCacheManager.startCacheProcessor();
}
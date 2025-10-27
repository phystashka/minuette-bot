
import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { isBloodMoonCurrentlyActive, getBloodMoonTimeLeft } from '../../models/BloodMoonModel.js';

// Blood Moon event status - now used as a subcommand

export async function execute(interaction) {
  try {
    const isActive = isBloodMoonCurrentlyActive();
    
    if (isActive) {
      const timeLeft = getBloodMoonTimeLeft();
      const minutesLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60)));
      
      const embed = createEmbed({
        title: '🩸 Blood Moon Event - ACTIVE',
        description: [
          `*The crimson moon casts its eerie glow across Equestria...*`,
          ``,
          `🩸 **Blood Moon Event is currently active!**`,
          `⏰ **Time remaining:** ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`,
          ``,
          `**Event Effects:**`,
          `> 🌙 Special Blood Moon pony variants may appear`,
          `> 🔴 All encounters have a crimson aura`,
          `> ✨ 5% chance for Blood Moon ponies in encounters`,
          ``,
          `*Venture into the darkness and discover these rare variants!*`
        ].join('\n'),
        color: 0x8B0000,
        timestamp: true,
        footer: { text: 'Blood Moon events occur every 3 hours for 15 minutes' }
      });
      
      await interaction.reply({ embeds: [embed] });
      
    } else {

      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      

      const eventHours = [0, 3, 6, 9, 12, 15, 18, 21];
      

      let nextEventHour = eventHours.find(hour => hour > currentHour);
      

      if (!nextEventHour) {
        nextEventHour = 0;
      }
      
      const nextEvent = new Date(now);
      if (nextEventHour === 0 && currentHour > 21) {

        nextEvent.setUTCDate(nextEvent.getUTCDate() + 1);
      }
      nextEvent.setUTCHours(nextEventHour, 0, 0, 0);
      
      const timeUntilNext = nextEvent.getTime() - now.getTime();
      const hoursUntil = Math.floor(timeUntilNext / (1000 * 60 * 60));
      const minutesUntil = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
      
      const embed = createEmbed({
        title: '🌙 Blood Moon Event - INACTIVE',
        description: [
          `*The night is peaceful, but darkness stirs...*`,
          ``,
          `🌙 **Blood Moon Event is currently inactive**`,
          `⏰ **Next event in:** ${hoursUntil}h ${minutesUntil}m`,
          ``,
          `**When Active:**`,
          `> 🩸 Blood Moon variants of beloved ponies appear`,
          `> 🔴 Encounters gain a mysterious crimson glow`,
          `> ⚡ Special rare variants with unique descriptions`,
          ``,
          `**Schedule:** Blood Moon rises every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC)`,
          `**Duration:** 15 minutes each event`,
          ``,
          `*Prepare for the next crimson awakening...*`
        ].join('\n'),
        color: 0x4B0082,
        timestamp: true,
        footer: { text: 'Blood Moon events occur every 3 hours for 15 minutes' }
      });
      
      await interaction.reply({ embeds: [embed] });
    }
    
  } catch (error) {
    console.error('Error in bloodmoon command:', error);
    
    const errorEmbed = createEmbed({
      title: '❌ Error',
      description: 'Failed to check Blood Moon status. Please try again later.',
      color: 0xFF0000,
      user: interaction.user
    });
    
    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}
import {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  AttachmentBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} from 'discord.js';
import { createButton, createActionRow } from '../../utils/components.js';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

const MANE6_CHARACTERS = {
  twilight: { name: 'Twilight Sparkle', color: '#663399', emoji: '⭐', image: 'Twilight Sparkle.png' },
  rainbow: { name: 'Rainbow Dash', color: '#00BFFF', emoji: '🌈', image: 'Rainbow Dash.png' },
  pinkie: { name: 'Pinkie Pie', color: '#FF69B4', emoji: '🎉', image: 'Pinkie Pie.png' },
  fluttershy: { name: 'Fluttershy', color: '#FFFF99', emoji: '🦋', image: 'Fluttershy.png' },
  rarity: { name: 'Rarity', color: '#E6E6FA', emoji: '💎', image: 'Rarity.png' },
  applejack: { name: 'Applejack', color: '#FFA500', emoji: '🍎', image: 'Applejack.png' }
};

const QUIZ_QUESTIONS = [
  {
    question: "What is most important to you in life?",
    answers: [
      { text: "Knowledge and learning", character: "twilight" },
      { text: "Adventure and freedom", character: "rainbow" },
      { text: "Fun and friendship", character: "pinkie" },
      { text: "Peace and nature", character: "fluttershy" }
    ]
  },
  {
    question: "What profession would you choose?",
    answers: [
      { text: "Scientist or librarian", character: "twilight" },
      { text: "Athlete or pilot", character: "rainbow" },
      { text: "Party planner or comedian", character: "pinkie" },
      { text: "Veterinarian or gardener", character: "fluttershy" }
    ]
  },
  {
    question: "What makes you happy?",
    answers: [
      { text: "Solving complex problems", character: "twilight" },
      { text: "Achieving new records", character: "rainbow" },
      { text: "Making others smile", character: "pinkie" },
      { text: "Quiet moments in nature", character: "fluttershy" }
    ]
  },
  {
    question: "How do you react to difficulties?",
    answers: [
      { text: "Research and plan carefully", character: "twilight" },
      { text: "Face them head-on with courage", character: "rainbow" },
      { text: "Stay positive and find creative solutions", character: "pinkie" },
      { text: "Take time to think and seek gentle approaches", character: "fluttershy" }
    ]
  },
  {
    question: "What does friendship mean to you?",
    answers: [
      { text: "Deep intellectual connections", character: "twilight" },
      { text: "Loyal companions for adventures", character: "rainbow" },
      { text: "Endless fun and laughter together", character: "pinkie" },
      { text: "Gentle support and understanding", character: "fluttershy" }
    ]
  },
  {
    question: "Do you like to compete?",
    answers: [
      { text: "Only in academic competitions", character: "twilight" },
      { text: "Absolutely! I love winning", character: "rainbow" },
      { text: "If it's fun for everyone", character: "pinkie" },
      { text: "I prefer cooperation over competition", character: "fluttershy" }
    ]
  },
  {
    question: "What do you do if a friend is in trouble?",
    answers: [
      { text: "Research the best solution", character: "twilight" },
      { text: "Rush to help immediately", character: "rainbow" },
      { text: "Cheer them up and find fun ways to help", character: "pinkie" },
      { text: "Listen carefully and offer gentle support", character: "fluttershy" }
    ]
  },
  {
    question: "How do you feel about order and planning?",
    answers: [
      { text: "Essential for success", character: "twilight" },
      { text: "Sometimes necessary, but I prefer spontaneity", character: "rainbow" },
      { text: "Planning parties is fun!", character: "pinkie" },
      { text: "I like gentle routines", character: "fluttershy" }
    ]
  },
  {
    question: "What's more important - logic or feelings?",
    answers: [
      { text: "Logic helps solve everything", character: "twilight" },
      { text: "A balance of both", character: "rainbow" },
      { text: "Following your heart brings joy", character: "pinkie" },
      { text: "Feelings and empathy are crucial", character: "fluttershy" }
    ]
  },
  {
    question: "What would you do if you won a million dollars?",
    answers: [
      { text: "Build the ultimate library", character: "twilight" },
      { text: "Travel the world on adventures", character: "rainbow" },
      { text: "Throw the biggest party ever", character: "pinkie" },
      { text: "Create an animal sanctuary", character: "fluttershy" }
    ]
  },
  {
    question: "What's your biggest dream?",
    answers: [
      { text: "Discovering something new", character: "twilight" },
      { text: "Being the best at what I do", character: "rainbow" },
      { text: "Making everyone in the world smile", character: "pinkie" },
      { text: "Living peacefully with all creatures", character: "fluttershy" }
    ]
  },
  {
    question: "Do you like being the center of attention?",
    answers: [
      { text: "Only when sharing knowledge", character: "twilight" },
      { text: "Yes, especially when showing off skills", character: "rainbow" },
      { text: "I love entertaining others!", character: "pinkie" },
      { text: "I prefer staying in the background", character: "fluttershy" }
    ]
  },
  {
    question: "What clothing style suits you?",
    answers: [
      { text: "Practical and neat", character: "twilight" },
      { text: "Sporty and comfortable", character: "rainbow" },
      { text: "Bright and colorful", character: "pinkie" },
      { text: "Soft and natural colors", character: "fluttershy" }
    ]
  },
  {
    question: "Are you comfortable with people or prefer being alone?",
    answers: [
      { text: "I enjoy both, but need quiet time to study", character: "twilight" },
      { text: "I love being around energetic people", character: "rainbow" },
      { text: "The more friends, the merrier!", character: "pinkie" },
      { text: "I prefer small groups or being alone", character: "fluttershy" }
    ]
  },
  {
    question: "How do you feel about animals?",
    answers: [
      { text: "They're fascinating to study", character: "twilight" },
      { text: "Pets that can keep up with my energy", character: "rainbow" },
      { text: "They're great party guests!", character: "pinkie" },
      { text: "I understand and love all animals", character: "fluttershy" }
    ]
  },
  {
    question: "If you had a shop, what would you sell?",
    answers: [
      { text: "Books and educational materials", character: "twilight" },
      { text: "Sports equipment", character: "rainbow" },
      { text: "Party supplies and sweets", character: "pinkie" },
      { text: "Plants and pet supplies", character: "fluttershy" }
    ]
  },
  {
    question: "What do you do in your free time?",
    answers: [
      { text: "Read and research", character: "twilight" },
      { text: "Practice sports or exercise", character: "rainbow" },
      { text: "Plan parties or have fun", character: "pinkie" },
      { text: "Spend time in nature", character: "fluttershy" }
    ]
  },
  {
    question: "What's more important: success or honesty?",
    answers: [
      { text: "Both are important for true achievement", character: "twilight" },
      { text: "Success, but earned honestly", character: "rainbow" },
      { text: "Honesty brings genuine happiness", character: "pinkie" },
      { text: "Honesty and kindness above all", character: "fluttershy" }
    ]
  },
  {
    question: "How do you behave when someone makes a mistake?",
    answers: [
      { text: "Help them learn from it", character: "twilight" },
      { text: "Encourage them to try harder", character: "rainbow" },
      { text: "Cheer them up and move on", character: "pinkie" },
      { text: "Comfort them gently", character: "fluttershy" }
    ]
  },
  {
    question: "What's your favorite weather?",
    answers: [
      { text: "Clear skies for stargazing", character: "twilight" },
      { text: "Windy days perfect for flying", character: "rainbow" },
      { text: "Sunny days for outdoor parties", character: "pinkie" },
      { text: "Gentle spring mornings", character: "fluttershy" }
    ]
  },
  {
    question: "What's closer to you: science or creativity?",
    answers: [
      { text: "Science and systematic thinking", character: "twilight" },
      { text: "Creative approaches to challenges", character: "rainbow" },
      { text: "Creative fun and imagination", character: "pinkie" },
      { text: "Natural creativity and intuition", character: "fluttershy" }
    ]
  },
  {
    question: "Have you ever dreamed of being famous?",
    answers: [
      { text: "Famous for discoveries", character: "twilight" },
      { text: "Famous for athletic achievements", character: "rainbow" },
      { text: "Famous for making people happy", character: "pinkie" },
      { text: "I'd rather help quietly", character: "fluttershy" }
    ]
  },
  {
    question: "How important is others' opinion to you?",
    answers: [
      { text: "I value expert opinions", character: "twilight" },
      { text: "I care about respect from peers", character: "rainbow" },
      { text: "I want everyone to like me", character: "pinkie" },
      { text: "I'm sensitive to others' feelings", character: "fluttershy" }
    ]
  },
  {
    question: "How do you celebrate victory?",
    answers: [
      { text: "Share the knowledge gained", character: "twilight" },
      { text: "Celebrate with pride and joy", character: "rainbow" },
      { text: "Throw a party for everyone", character: "pinkie" },
      { text: "Quietly appreciate the moment", character: "fluttershy" }
    ]
  },
  {
    question: "How do you feel about physical work?",
    answers: [
      { text: "I prefer mental challenges", character: "twilight" },
      { text: "I love physical activity", character: "rainbow" },
      { text: "If it's fun, why not!", character: "pinkie" },
      { text: "Gentle work with nature is nice", character: "fluttershy" }
    ]
  },
  {
    question: "What do you value in other people?",
    answers: [
      { text: "Intelligence and dedication", character: "twilight" },
      { text: "Courage and determination", character: "rainbow" },
      { text: "Humor and positivity", character: "pinkie" },
      { text: "Kindness and gentleness", character: "fluttershy" }
    ]
  },
  {
    question: "Do you like learning new things?",
    answers: [
      { text: "It's my greatest passion", character: "twilight" },
      { text: "If it helps me improve", character: "rainbow" },
      { text: "If it's fun and interesting", character: "pinkie" },
      { text: "I enjoy learning about nature", character: "fluttershy" }
    ]
  },
  {
    question: "What's your perfect day?",
    answers: [
      { text: "Reading in a quiet library", character: "twilight" },
      { text: "Outdoor adventure or sports", character: "rainbow" },
      { text: "Party with all my friends", character: "pinkie" },
      { text: "Peaceful time in a garden", character: "fluttershy" }
    ]
  },
  {
    question: "Are you more of a leader or a helper?",
    answers: [
      { text: "Leader through knowledge", character: "twilight" },
      { text: "Natural competitive leader", character: "rainbow" },
      { text: "I lead through enthusiasm", character: "pinkie" },
      { text: "I prefer supporting others", character: "fluttershy" }
    ]
  },
  {
    question: "How important is doing everything perfectly?",
    answers: [
      { text: "Perfection is the goal", character: "twilight" },
      { text: "Being the best matters", character: "rainbow" },
      { text: "As long as everyone has fun", character: "pinkie" },
      { text: "I try my best gently", character: "fluttershy" }
    ]
  },
  {
    question: "What do you do when a project isn't working?",
    answers: [
      { text: "Research more and try again", character: "twilight" },
      { text: "Push harder and don't give up", character: "rainbow" },
      { text: "Find a fun new approach", character: "pinkie" },
      { text: "Take a break and return calmly", character: "fluttershy" }
    ]
  },
  {
    question: "How do you handle stress?",
    answers: [
      { text: "Organize and make lists", character: "twilight" },
      { text: "Exercise or do something active", character: "rainbow" },
      { text: "Laugh it off or find distractions", character: "pinkie" },
      { text: "Find a quiet, peaceful place", character: "fluttershy" }
    ]
  },
  {
    question: "What gives you energy?",
    answers: [
      { text: "Learning something new", character: "twilight" },
      { text: "Competition and challenges", character: "rainbow" },
      { text: "Being around happy people", character: "pinkie" },
      { text: "Quiet time in nature", character: "fluttershy" }
    ]
  },
  {
    question: "Are you more of a dreamer or realist?",
    answers: [
      { text: "Realistic with big dreams", character: "twilight" },
      { text: "Dreamer who makes it happen", character: "rainbow" },
      { text: "Dreamer with endless imagination", character: "pinkie" },
      { text: "Gentle dreamer", character: "fluttershy" }
    ]
  },
  {
    question: "What would you like to improve about yourself?",
    answers: [
      { text: "Social skills", character: "twilight" },
      { text: "Patience", character: "rainbow" },
      { text: "Being more organized", character: "pinkie" },
      { text: "Confidence", character: "fluttershy" }
    ]
  },
  {
    question: "How do you feel about surprises?",
    answers: [
      { text: "I prefer to be prepared", character: "twilight" },
      { text: "I love unexpected adventures", character: "rainbow" },
      { text: "Surprises are the best!", character: "pinkie" },
      { text: "They make me nervous", character: "fluttershy" }
    ]
  },
  {
    question: "Are you more of a listener or storyteller?",
    answers: [
      { text: "I share knowledge when asked", character: "twilight" },
      { text: "I tell stories of my adventures", character: "rainbow" },
      { text: "I love telling funny stories", character: "pinkie" },
      { text: "I'm a careful listener", character: "fluttershy" }
    ]
  },
  {
    question: "What do you do when you're bored?",
    answers: [
      { text: "Read a book or study", character: "twilight" },
      { text: "Find an exciting activity", character: "rainbow" },
      { text: "Plan something fun", character: "pinkie" },
      { text: "Enjoy the peaceful moment", character: "fluttershy" }
    ]
  },
  {
    question: "Do you prefer city or countryside?",
    answers: [
      { text: "City with libraries and schools", character: "twilight" },
      { text: "Anywhere with space to move", character: "rainbow" },
      { text: "Wherever there are people to meet", character: "pinkie" },
      { text: "Peaceful countryside", character: "fluttershy" }
    ]
  },
  {
    question: "What would you choose: helping a friend or personal success?",
    answers: [
      { text: "Find a way to do both", character: "twilight" },
      { text: "Depends on the situation", character: "rainbow" },
      { text: "Always help a friend", character: "pinkie" },
      { text: "Friend's needs come first", character: "fluttershy" }
    ]
  },
  {
    question: "What motivates you more: praise or results?",
    answers: [
      { text: "Results and understanding", character: "twilight" },
      { text: "Both praise and results", character: "rainbow" },
      { text: "Praise and making others happy", character: "pinkie" },
      { text: "Knowing I helped someone", character: "fluttershy" }
    ]
  },
  {
    question: "What type of movies do you prefer?",
    answers: [
      { text: "Educational documentaries", character: "twilight" },
      { text: "Action and adventure", character: "rainbow" },
      { text: "Comedy and musicals", character: "pinkie" },
      { text: "Nature and gentle dramas", character: "fluttershy" }
    ]
  },
  {
    question: "What would you choose: logical puzzle or fun party?",
    answers: [
      { text: "Logical puzzle definitely", character: "twilight" },
      { text: "Depends on my mood", character: "rainbow" },
      { text: "Fun party always!", character: "pinkie" },
      { text: "Maybe a quiet gathering", character: "fluttershy" }
    ]
  },
  {
    question: "How do you feel about rules?",
    answers: [
      { text: "Rules provide important structure", character: "twilight" },
      { text: "Some rules are meant to be bent", character: "rainbow" },
      { text: "Rules should be fun!", character: "pinkie" },
      { text: "I follow rules to avoid conflict", character: "fluttershy" }
    ]
  },
  {
    question: "Do you like giving advice to others?",
    answers: [
      { text: "When I have researched knowledge", character: "twilight" },
      { text: "I share what works for me", character: "rainbow" },
      { text: "I try to cheer people up", character: "pinkie" },
      { text: "I listen more than advise", character: "fluttershy" }
    ]
  },
  {
    question: "What do you feel when someone is sad?",
    answers: [
      { text: "I want to find a solution", character: "twilight" },
      { text: "I want to encourage them", character: "rainbow" },
      { text: "I want to make them smile", character: "pinkie" },
      { text: "I feel their pain deeply", character: "fluttershy" }
    ]
  },
  {
    question: "What does 'success' mean to you?",
    answers: [
      { text: "Mastering knowledge and skills", character: "twilight" },
      { text: "Being the best at what I do", character: "rainbow" },
      { text: "Making others happy", character: "pinkie" },
      { text: "Living in harmony with all", character: "fluttershy" }
    ]
  },
  {
    question: "Do you like taking risks?",
    answers: [
      { text: "Only calculated risks", character: "twilight" },
      { text: "I love exciting risks", character: "rainbow" },
      { text: "If it leads to fun!", character: "pinkie" },
      { text: "I prefer safety", character: "fluttershy" }
    ]
  },
  {
    question: "What do you do when things don't go according to plan?",
    answers: [
      { text: "Analyze what went wrong", character: "twilight" },
      { text: "Adapt quickly and keep going", character: "rainbow" },
      { text: "Roll with it and have fun anyway", character: "pinkie" },
      { text: "Accept it peacefully", character: "fluttershy" }
    ]
  },
  {
    question: "What's your ideal vacation?",
    answers: [
      { text: "Educational tour of historical sites", character: "twilight" },
      { text: "Extreme sports adventure", character: "rainbow" },
      { text: "Music festival with friends", character: "pinkie" },
      { text: "Quiet retreat in nature", character: "fluttershy" }
    ]
  },
  {
    question: "How do you prepare for important events?",
    answers: [
      { text: "Make detailed plans and lists", character: "twilight" },
      { text: "Practice until I'm the best", character: "rainbow" },
      { text: "Focus on making it fun", character: "pinkie" },
      { text: "Prepare quietly and carefully", character: "fluttershy" }
    ]
  },
  {
    question: "What's your biggest fear?",
    answers: [
      { text: "Not being smart enough", character: "twilight" },
      { text: "Being slow or weak", character: "rainbow" },
      { text: "People not having fun", character: "pinkie" },
      { text: "Hurting someone's feelings", character: "fluttershy" }
    ]
  },
  {
    question: "How do you show affection?",
    answers: [
      { text: "Sharing knowledge and helping", character: "twilight" },
      { text: "Encouraging and supporting", character: "rainbow" },
      { text: "Parties and gifts", character: "pinkie" },
      { text: "Gentle care and attention", character: "fluttershy" }
    ]
  },
  {
    question: "What's your communication style?",
    answers: [
      { text: "Detailed and informative", character: "twilight" },
      { text: "Direct and confident", character: "rainbow" },
      { text: "Enthusiastic and fun", character: "pinkie" },
      { text: "Soft and careful", character: "fluttershy" }
    ]
  },
  {
    question: "How do you handle criticism?",
    answers: [
      { text: "Use it to improve and learn", character: "twilight" },
      { text: "Prove them wrong through action", character: "rainbow" },
      { text: "Try to stay positive", character: "pinkie" },
      { text: "Feel hurt but try to understand", character: "fluttershy" }
    ]
  },
  {
    question: "What's your approach to teamwork?",
    answers: [
      { text: "Organize and delegate efficiently", character: "twilight" },
      { text: "Lead by example", character: "rainbow" },
      { text: "Keep everyone motivated", character: "pinkie" },
      { text: "Support others quietly", character: "fluttershy" }
    ]
  },
  {
    question: "How do you deal with change?",
    answers: [
      { text: "Research and plan for it", character: "twilight" },
      { text: "Embrace it as an adventure", character: "rainbow" },
      { text: "Find the positive side", character: "pinkie" },
      { text: "Need time to adjust gently", character: "fluttershy" }
    ]
  },
  {
    question: "What's your relationship with technology?",
    answers: [
      { text: "Love learning how it works", character: "twilight" },
      { text: "Use it for better performance", character: "rainbow" },
      { text: "Fun if it brings people together", character: "pinkie" },
      { text: "Prefer simpler, natural things", character: "fluttershy" }
    ]
  },
  {
    question: "How do you express creativity?",
    answers: [
      { text: "Through organized projects", character: "twilight" },
      { text: "Through skilled performance", character: "rainbow" },
      { text: "Through fun and colorful ideas", character: "pinkie" },
      { text: "Through gentle, natural beauty", character: "fluttershy" }
    ]
  },
  {
    question: "What's your ideal work environment?",
    answers: [
      { text: "Quiet library or laboratory", character: "twilight" },
      { text: "Dynamic, challenging space", character: "rainbow" },
      { text: "Fun, social atmosphere", character: "pinkie" },
      { text: "Peaceful, natural setting", character: "fluttershy" }
    ]
  },
  {
    question: "How do you make decisions?",
    answers: [
      { text: "Research all options thoroughly", character: "twilight" },
      { text: "Trust instincts and act fast", character: "rainbow" },
      { text: "Choose what seems most fun", character: "pinkie" },
      { text: "Consider everyone's feelings", character: "fluttershy" }
    ]
  },
  {
    question: "What's your greatest strength?",
    answers: [
      { text: "Intelligence and organization", character: "twilight" },
      { text: "Speed and determination", character: "rainbow" },
      { text: "Optimism and energy", character: "pinkie" },
      { text: "Empathy and gentleness", character: "fluttershy" }
    ]
  },
  {
    question: "How important is appearance and style to you?",
    answers: [
      { text: "Neat and professional is enough", character: "twilight" },
      { text: "Functional over fashionable", character: "rainbow" },
      { text: "Bright and fun colors!", character: "pinkie" },
      { text: "Elegance and beauty matter greatly", character: "rarity" }
    ]
  },
  {
    question: "What's your approach to work?",
    answers: [
      { text: "Methodical and thorough", character: "twilight" },
      { text: "Fast and efficient", character: "rainbow" },
      { text: "Make it enjoyable for everyone", character: "pinkie" },
      { text: "Hard work with pride and dedication", character: "applejack" }
    ]
  },
  {
    question: "How do you handle luxury and refinement?",
    answers: [
      { text: "Nice but not necessary", character: "twilight" },
      { text: "Don't have time for it", character: "rainbow" },
      { text: "Love it if it's colorful!", character: "pinkie" },
      { text: "Appreciate true quality and beauty", character: "rarity" }
    ]
  },
  {
    question: "What's your relationship with family traditions?",
    answers: [
      { text: "Interesting to study historically", character: "twilight" },
      { text: "Some are worth keeping", character: "rainbow" },
      { text: "Love making new family traditions", character: "pinkie" },
      { text: "Family and traditions are sacred", character: "applejack" }
    ]
  },
  {
    question: "How do you express your creativity?",
    answers: [
      { text: "Through organized projects", character: "twilight" },
      { text: "Through skilled performance", character: "rainbow" },
      { text: "Through fun and colorful ideas", character: "pinkie" },
      { text: "Through beautiful, refined artistry", character: "rarity" }
    ]
  },
  {
    question: "What's your attitude toward helping others?",
    answers: [
      { text: "Share knowledge to help them learn", character: "twilight" },
      { text: "Encourage them to be their best", character: "rainbow" },
      { text: "Cheer them up and make them smile", character: "pinkie" },
      { text: "Always there when family needs me", character: "applejack" }
    ]
  },
  {
    question: "How do you prefer to spend money?",
    answers: [
      { text: "Books and educational materials", character: "twilight" },
      { text: "Equipment to improve performance", character: "rainbow" },
      { text: "Party supplies and treats for friends", character: "pinkie" },
      { text: "Quality items that will last", character: "rarity" }
    ]
  },
  {
    question: "What's your approach to fashion?",
    answers: [
      { text: "Practical and appropriate", character: "twilight" },
      { text: "Comfortable for movement", character: "rainbow" },
      { text: "Fun, bright, and cheerful", character: "pinkie" },
      { text: "Sophisticated and elegant", character: "rarity" }
    ]
  },
  {
    question: "How do you handle responsibility?",
    answers: [
      { text: "Prepare thoroughly and execute perfectly", character: "twilight" },
      { text: "Take charge and get it done", character: "rainbow" },
      { text: "Make sure everyone enjoys the process", character: "pinkie" },
      { text: "Honor commitments no matter what", character: "applejack" }
    ]
  },
  {
    question: "What motivates you to work hard?",
    answers: [
      { text: "The pursuit of knowledge", character: "twilight" },
      { text: "Being the best I can be", character: "rainbow" },
      { text: "Making others happy", character: "pinkie" },
      { text: "Family pride and honest living", character: "applejack" }
    ]
  },
  {
    question: "How do you view quality vs quantity?",
    answers: [
      { text: "Thorough research leads to quality", character: "twilight" },
      { text: "Quality through constant improvement", character: "rainbow" },
      { text: "More fun means better quality", character: "pinkie" },
      { text: "Never compromise on quality", character: "rarity" }
    ]
  },
  {
    question: "What's your approach to social gatherings?",
    answers: [
      { text: "Enjoy intellectual conversations", character: "twilight" },
      { text: "Love competitive activities", character: "rainbow" },
      { text: "The life of the party!", character: "pinkie" },
      { text: "Elegant, refined entertainment", character: "rarity" }
    ]
  },
  {
    question: "How important is honesty to you?",
    answers: [
      { text: "Essential for scientific integrity", character: "twilight" },
      { text: "Important but sometimes flexible", character: "rainbow" },
      { text: "Honesty should be gentle and kind", character: "pinkie" },
      { text: "Honesty is the foundation of everything", character: "applejack" }
    ]
  },
  {
    question: "What's your relationship with nature?",
    answers: [
      { text: "Fascinating subject to study", character: "twilight" },
      { text: "Great place for outdoor activities", character: "rainbow" },
      { text: "Perfect setting for picnics!", character: "pinkie" },
      { text: "My peaceful sanctuary", character: "fluttershy" }
    ]
  },
  {
    question: "How do you approach problem-solving?",
    answers: [
      { text: "Research, analyze, then act", character: "twilight" },
      { text: "Jump in and figure it out", character: "rainbow" },
      { text: "Brainstorm fun creative solutions", character: "pinkie" },
      { text: "Simple, practical, time-tested methods", character: "applejack" }
    ]
  },
  {
    question: "What's your ideal living space?",
    answers: [
      { text: "Library with study areas", character: "twilight" },
      { text: "Open space with room to move", character: "rainbow" },
      { text: "Colorful and welcoming for guests", character: "pinkie" },
      { text: "Elegant, beautiful, and refined", character: "rarity" }
    ]
  },
  {
    question: "How do you show you care about someone?",
    answers: [
      { text: "Help them learn and grow", character: "twilight" },
      { text: "Encourage their achievements", character: "rainbow" },
      { text: "Make them laugh and feel special", character: "pinkie" },
      { text: "Always be reliable and supportive", character: "applejack" }
    ]
  },
  {
    question: "What's your attitude toward art and culture?",
    answers: [
      { text: "Appreciate the history and technique", character: "twilight" },
      { text: "Enjoy if it's dynamic and exciting", character: "rainbow" },
      { text: "Love anything colorful and fun", character: "pinkie" },
      { text: "Essential for a refined life", character: "rarity" }
    ]
  },
  {
    question: "How do you handle criticism of your work?",
    answers: [
      { text: "Analyze it and improve accordingly", character: "twilight" },
      { text: "Use it as motivation to do better", character: "rainbow" },
      { text: "Try to keep spirits up despite it", character: "pinkie" },
      { text: "Take it seriously and maintain standards", character: "rarity" }
    ]
  },
  {
    question: "What's your preferred way to help friends?",
    answers: [
      { text: "Offer knowledge and solutions", character: "twilight" },
      { text: "Encourage them to push forward", character: "rainbow" },
      { text: "Cheer them up and distract from problems", character: "pinkie" },
      { text: "Provide steady, reliable support", character: "applejack" }
    ]
  },
  {
    question: "How do you view material possessions?",
    answers: [
      { text: "Useful tools for learning", character: "twilight" },
      { text: "Equipment to achieve goals", character: "rainbow" },
      { text: "Fun things to share with friends", character: "pinkie" },
      { text: "Beautiful objects bring joy", character: "rarity" }
    ]
  },
  {
    question: "What's your approach to time management?",
    answers: [
      { text: "Detailed schedules and planning", character: "twilight" },
      { text: "Focus on priorities, move fast", character: "rainbow" },
      { text: "Make time for fun in everything", character: "pinkie" },
      { text: "Work hard, rest when job is done", character: "applejack" }
    ]
  },
  {
    question: "How do you prefer to learn new skills?",
    answers: [
      { text: "Study theory then practice", character: "twilight" },
      { text: "Jump in and learn by doing", character: "rainbow" },
      { text: "Make it a fun group activity", character: "pinkie" },
      { text: "Learn from experienced mentors", character: "applejack" }
    ]
  },
  {
    question: "What's your relationship with competition?",
    answers: [
      { text: "Enjoy intellectual competitions", character: "twilight" },
      { text: "Love to compete and win", character: "rainbow" },
      { text: "Competition should be fun for all", character: "pinkie" },
      { text: "Compete fairly with honor", character: "applejack" }
    ]
  },
  {
    question: "How do you want to be remembered?",
    answers: [
      { text: "For discoveries and knowledge shared", character: "twilight" },
      { text: "For achievements and inspiring others", character: "rainbow" },
      { text: "For bringing joy to everyone", character: "pinkie" },
      { text: "For beauty created and elegance shared", character: "rarity" }
    ]
  },
  {
    question: "What's your approach to cooking?",
    answers: [
      { text: "Follow recipes precisely", character: "twilight" },
      { text: "Quick, easy, energizing meals", character: "rainbow" },
      { text: "Fun, colorful, sweet treats", character: "pinkie" },
      { text: "Hearty, traditional family recipes", character: "applejack" }
    ]
  },
  {
    question: "How do you handle unexpected guests?",
    answers: [
      { text: "Politely accommodate if possible", character: "twilight" },
      { text: "Welcome them if it fits my schedule", character: "rainbow" },
      { text: "Instant party time!", character: "pinkie" },
      { text: "Welcome them with gentle hospitality", character: "fluttershy" }
    ]
  },
  {
    question: "What's your attitude toward personal growth?",
    answers: [
      { text: "Constant learning and improvement", character: "twilight" },
      { text: "Always pushing my limits", character: "rainbow" },
      { text: "Growing through joy and friendship", character: "pinkie" },
      { text: "Growing through understanding others", character: "fluttershy" }
    ]
  },
  {
    question: "How do you handle deadlines?",
    answers: [
      { text: "Plan ahead and finish early", character: "twilight" },
      { text: "Work intensely to meet them", character: "rainbow" },
      { text: "Make the process fun until the end", character: "pinkie" },
      { text: "Steady, consistent work to complete on time", character: "applejack" }
    ]
  },
  {
    question: "What's your favorite type of book?",
    answers: [
      { text: "Non-fiction and educational", character: "twilight" },
      { text: "Adventure and action stories", character: "rainbow" },
      { text: "Funny, uplifting stories", character: "pinkie" },
      { text: "Romance and fairy tales", character: "rarity" }
    ]
  },
  {
    question: "How do you celebrate achievements?",
    answers: [
      { text: "Share knowledge gained with others", character: "twilight" },
      { text: "Set the next bigger goal", character: "rainbow" },
      { text: "Throw a celebration party", character: "pinkie" },
      { text: "Quietly appreciate with close friends", character: "fluttershy" }
    ]
  },
  {
    question: "What's your approach to giving gifts?",
    answers: [
      { text: "Thoughtful, practical presents", character: "twilight" },
      { text: "Something to help them improve", character: "rainbow" },
      { text: "Fun, surprising, colorful gifts", character: "pinkie" },
      { text: "Beautiful, meaningful treasures", character: "rarity" }
    ]
  },
  {
    question: "How do you prefer to exercise?",
    answers: [
      { text: "Structured routine for health", character: "twilight" },
      { text: "Intense, competitive sports", character: "rainbow" },
      { text: "Fun group activities and dancing", character: "pinkie" },
      { text: "Gentle walks in nature", character: "fluttershy" }
    ]
  },
  {
    question: "What's your relationship with music?",
    answers: [
      { text: "Appreciate the theory and composition", character: "twilight" },
      { text: "Love energetic, motivating songs", character: "rainbow" },
      { text: "All about fun, catchy tunes", character: "pinkie" },
      { text: "Classical and elegant pieces", character: "rarity" }
    ]
  },
  {
    question: "How do you handle making mistakes?",
    answers: [
      { text: "Analyze what went wrong and learn", character: "twilight" },
      { text: "Bounce back quickly and try again", character: "rainbow" },
      { text: "Laugh it off and keep positive", character: "pinkie" },
      { text: "Feel bad but accept it gracefully", character: "fluttershy" }
    ]
  },
  {
    question: "What's your ideal way to spend a rainy day?",
    answers: [
      { text: "Reading by the window", character: "twilight" },
      { text: "Indoor training or planning", character: "rainbow" },
      { text: "Board games and indoor fun", character: "pinkie" },
      { text: "Crafting something beautiful", character: "rarity" }
    ]
  },
  {
    question: "How do you approach new friendships?",
    answers: [
      { text: "Cautiously, getting to know them well", character: "twilight" },
      { text: "Openly if they share my interests", character: "rainbow" },
      { text: "Enthusiastically welcome everyone", character: "pinkie" },
      { text: "Slowly and gently build trust", character: "fluttershy" }
    ]
  },
  {
    question: "What's your attitude toward routine?",
    answers: [
      { text: "Essential for productivity", character: "twilight" },
      { text: "Helpful but not restricting", character: "rainbow" },
      { text: "Boring unless it involves parties", character: "pinkie" },
      { text: "Comforting and reliable", character: "fluttershy" }
    ]
  },
  {
    question: "How do you handle being the center of attention?",
    answers: [
      { text: "Uncomfortable unless sharing knowledge", character: "twilight" },
      { text: "Love it when showing off skills", character: "rainbow" },
      { text: "Absolutely love entertaining others", character: "pinkie" },
      { text: "Prefer to stay in the background", character: "fluttershy" }
    ]
  },
  {
    question: "What's your approach to personal style?",
    answers: [
      { text: "Simple, neat, and professional", character: "twilight" },
      { text: "Athletic and functional", character: "rainbow" },
      { text: "Bright, fun, and expressive", character: "pinkie" },
      { text: "Sophisticated and elegant", character: "rarity" }
    ]
  },
  {
    question: "How do you show appreciation for others?",
    answers: [
      { text: "Acknowledge their intelligence and effort", character: "twilight" },
      { text: "Praise their achievements and skills", character: "rainbow" },
      { text: "Celebrate them with enthusiasm", character: "pinkie" },
      { text: "Show gratitude with beautiful gestures", character: "rarity" }
    ]
  },
  {
    question: "What's your relationship with technology?",
    answers: [
      { text: "Love learning how it works", character: "twilight" },
      { text: "Use it for better performance", character: "rainbow" },
      { text: "Fun if it brings people together", character: "pinkie" },
      { text: "Prefer simpler, more elegant solutions", character: "rarity" }
    ]
  }
];

const activeQuizzes = new Map();

// Mane 6 personality quiz - now used as a subcommand

export async function execute(interaction) {
  const userId = interaction.user.id;
  
  if (activeQuizzes.has(userId)) {
    return interaction.reply({
      content: '🦄 You already have an active quiz! Please finish your current quiz first.',
      ephemeral: true
    });
  }

  await startQuiz(interaction, false);
}

async function startQuiz(interaction, isUpdate = false) {
  const userId = interaction.user.id;
  
  const shuffledQuestions = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
  const selectedQuestions = shuffledQuestions.slice(0, 20);
  
  const quizSession = {
    questions: selectedQuestions,
    currentQuestion: 0,
    scores: {
      twilight: 0,
      rainbow: 0,
      pinkie: 0,
      fluttershy: 0,
      rarity: 0,
      applejack: 0
    },
    userId: userId,
    startTime: Date.now()
  };
  
  activeQuizzes.set(userId, quizSession);
  
  await showQuestion(interaction, quizSession, isUpdate);
}

async function showQuestion(interaction, quizSession, isUpdate = false) {
  const currentQ = quizSession.questions[quizSession.currentQuestion];
  const questionNumber = quizSession.currentQuestion + 1;
  
  const container = new ContainerBuilder();
  
  const questionText = new TextDisplayBuilder()
    .setContent(`**Which Mane 6 Are You? Quiz**\nQuestion ${questionNumber}/20\n\n**${currentQ.question}**`);
  container.addTextDisplayComponents(questionText);

  const answerSections = [
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**A)** ${currentQ.answers[0].text}`)
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`mane6quiz_answer_${quizSession.userId}_0`)
          .setLabel('A')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**B)** ${currentQ.answers[1].text}`)
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`mane6quiz_answer_${quizSession.userId}_1`)
          .setLabel('B')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**C)** ${currentQ.answers[2].text}`)
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`mane6quiz_answer_${quizSession.userId}_2`)
          .setLabel('C')
          .setStyle(ButtonStyle.Secondary)
      ),
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**D)** ${currentQ.answers[3].text}`)
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`mane6quiz_answer_${quizSession.userId}_3`)
          .setLabel('D')
          .setStyle(ButtonStyle.Secondary)
      )
  ];

  container.addSectionComponents(...answerSections);

  const messageOptions = {
    content: '',
    components: [container],
    flags: MessageFlags.IsComponentsV2
  };

  if (isUpdate) {
    return interaction.update(messageOptions);
  } else {
    return interaction.reply(messageOptions);
  }
}

async function generateResultsImage(scores, username) {
  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(0, 0, 600, 600);

  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const percentages = {};
  
  Object.entries(MANE6_CHARACTERS).forEach(([key, character]) => {
    percentages[key] = total > 0 ? Math.round((scores[key] / total) * 100) : 0;
  });

  const centerX = 300;
  const centerY = 300;
  const radius = 180;
  const imageSize = 120;

  try {
    const characterImages = {};
    for (const [key, character] of Object.entries(MANE6_CHARACTERS)) {
      try {
        const imagePath = path.join(process.cwd(), 'src', 'quiz', character.image);
        characterImages[key] = await loadImage(imagePath);
      } catch (error) {
        console.error(`Failed to load image for ${character.name}:`, error);
        characterImages[key] = null;
      }
    }

    const characterOrder = ['twilight', 'rainbow', 'pinkie', 'fluttershy', 'rarity', 'applejack'];
    
    characterOrder.forEach((key, index) => {
      const character = MANE6_CHARACTERS[key];
      const angle = (index * Math.PI * 2) / 6 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (characterImages[key]) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, imageSize / 2, 0, 2 * Math.PI);
        ctx.clip();
        
        ctx.drawImage(
          characterImages[key], 
          x - imageSize / 2, 
          y - imageSize / 2, 
          imageSize, 
          imageSize
        );
        ctx.restore();
      } else {
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(x, y, imageSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(character.name[0], x, y + 12);
      }

      ctx.strokeStyle = character.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y, imageSize / 2, 0, 2 * Math.PI);
      ctx.stroke();
    });

    characterOrder.forEach((key, index) => {
      const character = MANE6_CHARACTERS[key];
      const angle = (index * Math.PI * 2) / 6 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const percentText = `${percentages[key]}%`;
      
      ctx.fillStyle = character.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(x, y + imageSize / 2 + 25, 20, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(percentText, x, y + imageSize / 2 + 30);
    });

  } catch (error) {
    console.error('Error in generateResultsImage:', error);
    
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Error loading images', 300, 300);
  }

  return canvas.toBuffer('image/png');
}

export async function handleButtonInteraction(interaction) {
  const { customId } = interaction;
  
  if (customId.startsWith('mane6quiz_answer_')) {
    const parts = customId.split('_');
    const userId = parts[2];
    const answerIndex = parseInt(parts[3]);
    
    if (interaction.user.id !== userId) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('You can only answer your own quiz! Start your own quiz with `/mane6quiz`.');
      container.addTextDisplayComponents(errorText);
      
      return interaction.reply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    await handleAnswer(interaction, userId, answerIndex);
  } else if (customId.startsWith('mane6quiz_new_')) {
    const userId = customId.split('_')[2];
    
    if (interaction.user.id !== userId) {
      const container = new ContainerBuilder();
      const errorText = new TextDisplayBuilder()
        .setContent('You can only start your own quiz! Use `/mane6quiz` to start your own.');
      container.addTextDisplayComponents(errorText);
      
      return interaction.reply({
        content: '',
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
    
    activeQuizzes.delete(userId);
    
    await startQuiz(interaction, true);
  }
}

async function handleAnswer(interaction, userId, answerIndex) {
  const quizSession = activeQuizzes.get(userId);
  
  if (!quizSession) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('Your quiz session has expired. Please start a new quiz with `/mane6quiz`.');
    container.addTextDisplayComponents(errorText);
    
    return interaction.update({
      content: '',
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
  
  const currentQ = quizSession.questions[quizSession.currentQuestion];
  const selectedAnswer = currentQ.answers[answerIndex];
  
  if (selectedAnswer) {
    quizSession.scores[selectedAnswer.character]++;
  }
  
  quizSession.currentQuestion++;
  
  if (quizSession.currentQuestion >= quizSession.questions.length) {
    await showResults(interaction, quizSession);
    activeQuizzes.delete(userId);
  } else {
    await showQuestion(interaction, quizSession, true);
  }
}

async function showResults(interaction, quizSession) {
  const scores = quizSession.scores;
  const totalQuestions = quizSession.questions.length;
  
  const percentages = {};
  for (const [character, score] of Object.entries(scores)) {
    percentages[character] = Math.round((score / totalQuestions) * 100);
  }
  
  const topCharacter = Object.entries(percentages)
    .sort(([,a], [,b]) => b - a)[0][0];
  
  try {
    const resultImage = await generateResultsImage(percentages, interaction.user.displayName || interaction.user.username);
    
    const container = new ContainerBuilder();
    
    const resultsText = new TextDisplayBuilder()
      .setContent(`**Quiz Complete!**\n\n**You are most like ${MANE6_CHARACTERS[topCharacter].name}!**\n\n**Your Character Breakdown:**\n${Object.entries(MANE6_CHARACTERS).map(([key, char]) => `**${char.name}**: ${percentages[key]}%`).join('\n')}`);
    container.addTextDisplayComponents(resultsText);
    
    const mediaGallery = new MediaGalleryBuilder()
      .addItems(
        new MediaGalleryItemBuilder()
          .setURL('attachment://mane6_results.png')
      );
    container.addMediaGalleryComponents(mediaGallery);
    
    const newQuizSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Want to try again?')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`mane6quiz_new_${interaction.user.id}`)
          .setLabel('Take Quiz Again')
          .setStyle(ButtonStyle.Primary)
      );
    
    container.addSectionComponents(newQuizSection);
    
    await interaction.update({
      content: '',
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      files: [new AttachmentBuilder(resultImage, { name: 'mane6_results.png' })]
    });
    
  } catch (error) {
    console.error('Error creating result image:', error);
    
    const container = new ContainerBuilder();
    
    const resultsText = new TextDisplayBuilder()
      .setContent(`**Quiz Complete!**\n\n**You are most like ${MANE6_CHARACTERS[topCharacter].name}!**\n\n**Your Character Breakdown:**\n${Object.entries(MANE6_CHARACTERS).map(([key, char]) => `**${char.name}**: ${percentages[key]}%`).join('\n')}`);
    container.addTextDisplayComponents(resultsText);
    
    const newQuizSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Want to try again?')
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId(`mane6quiz_new_${interaction.user.id}`)
          .setLabel('Take Quiz Again')
          .setStyle(ButtonStyle.Primary)
      );
    
    container.addSectionComponents(newQuizSection);
    
    await interaction.update({
      content: '',
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
}
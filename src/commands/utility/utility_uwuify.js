import { 
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} from 'discord.js';

const uwuReplacements = {
  en: {
    // Letter replacements
    'r': 'w',
    'R': 'W',
    'l': 'w',
    'L': 'W',
    'n': 'ny',
    'N': 'Ny',
    'th': 'ff',
    'TH': 'FF',
    'Th': 'Ff',
    'ove': 'uv',
    'OVE': 'UV',
    // Word replacements
    'you': 'u',
    'You': 'U',
    'hello': 'hewwo',
    'Hello': 'Hewwo',
    'hi': 'hii',
    'Hi': 'Hii',
    'love': 'wuv',
    'Love': 'Wuv',
    'cute': 'cyute',
    'Cute': 'Cyute',
    'small': 'smoww',
    'Small': 'Smoww',
    'yes': 'yesh',
    'Yes': 'Yesh',
    'please': 'pwease',
    'Please': 'Pwease',
    'sorry': 'sowwy',
    'Sorry': 'Sowwy',
    'very': 'vewy',
    'Very': 'Vewy',
    'really': 'weawwy',
    'Really': 'Weawwy',
    'little': 'wittwe',
    'Little': 'Wittwe',
    'what': 'wat',
    'What': 'Wat',
    'how': 'howw',
    'How': 'Howw',
    'this': 'dis',
    'This': 'Dis',
    'that': 'dat',
    'That': 'Dat',
    'think': 'fink',
    'Think': 'Fink',
    'thanks': 'fanks',
    'Thanks': 'Fanks'
  },
  ru: {
    // Letter replacements
    'р': 'в',
    'Р': 'В',
    'л': 'вь',
    'Л': 'Вь',
    'н': 'нь',
    'Н': 'Нь',
    'рн': 'вн',
    'РН': 'ВН',
    // Word replacements
    'привет': 'пвивет',
    'Привет': 'Пвивет',
    'дела': 'де-ляшки',
    'Дела': 'Де-ляшки',
    'как': 'кавк',
    'Как': 'Кавк',
    'хорошо': 'хо-вошенько',
    'Хорошо': 'Хо-вошенько',
    'спасибо': 'спаси-бко',
    'Спасибо': 'Спаси-бко',
    'пожалуйста': 'пожавуйста',
    'Пожалуйста': 'Пожавуйста',
    'извини': 'извиньи',
    'Извини': 'Извиньи',
    'люблю': 'вюбвю',
    'Люблю': 'Вюбвю',
    'милый': 'мивенький',
    'Милый': 'Мивенький',
    'милая': 'мивенькая',
    'Милая': 'Мивенькая',
    'маленький': 'мавенький',
    'Маленький': 'Мавенький',
    'очень': 'очень-очень',
    'Очень': 'Очень-очень',
    'что': 'чтко',
    'Что': 'Чтко',
    'где': 'гдье',
    'Где': 'Гдье',
    'когда': 'когдя',
    'Когда': 'Когдя',
    'почему': 'почемку',
    'Почему': 'Почемку',
    'хочу': 'хочку',
    'Хочу': 'Хочку',
    'знаю': 'знаю-знаю',
    'Знаю': 'Знаю-знаю'
  }
};

const uwuFaces = [
  'owo', 'uwu', '>w<', 'OwO', 'UwU', '^w^', 'qwq', 'QwQ', 
  'òwó', 'ùwù', 'õwõ', 'ôwô', '(◡ ω ◡)', '( ͡° ᵜ ͡°)',
  '(˘▾˘)~♪', '( ˘ ³˘)♥', '(´∩｡• ᵕ •｡∩`)', '(⁄ ⁄•⁄ω⁄•⁄ ⁄)',
  '(◞ ‸ ◟ㆀ)', '(◞‸ ◟)', '(˵ ͡° ͜ʖ ͡°˵)', '( ͡°ω ͡°)',
  '(｡◕‿◕｡)', '(✿◠‿◠)', '(≧◡≦)', '(◕‿◕)♡', '(˘ ³˘)♥',
  '~(＾◡＾)~', '(◕ᴗ◕✿)', '(´｡• ᵕ •｡`) ♡'
];

const uwuPrefixes = [
  '*notices ur message* ',
  '*tilts head curiously* ',
  '*perks up* ',
  '*giggles softly* ',
  '*blushes deeply* ',
  '*hugs tightly* ',
  '*snuggles close* ',
  '*purrs loudly* ',
  '*wags tail excitedly* ',
  '*bounces happily* ',
  '*squeaks adorably* ',
  '*nuzzles gently* ',
  '*eyes sparkle* ',
  '*whispers cutely* '
];

const uwuSuffixes = [
  ' *giggles uncontrollably*',
  ' *blushes furiously*',
  ' *nuzzles ur cheek*',
  ' *purrs with contentment*',
  ' *wags tail faster*',
  ' *bounces with excitement*',
  ' *squeaks happily*',
  ' *gives warm hugs*',
  ' *snuggles closer*',
  ' *tilts head adorably*',
  ' *makes happy noises*',
  ' *sparkles with joy*'
];

const punctuationReplacements = {
  '!': ['~!', '!!', '! ♡', '! uwu', '! >w<'],
  '?': ['~?', '??', '? owo', '? uwu', '? ^w^'],
  '.': ['~', '...', '. uwu', '. ♡', '.~'],
  ',': [', ', '~, ', ',~']
};

function detectLanguage(text) {
  const cyrillicPattern = /[а-яё]/i;
  const latinPattern = /[a-z]/i;
  
  const cyrillicCount = (text.match(cyrillicPattern) || []).length;
  const latinCount = (text.match(latinPattern) || []).length;
  
  if (cyrillicCount > latinCount) {
    return 'ru';
  } else if (latinCount > 0) {
    return 'en';
  }
  return 'en';
}

function addStutter(text, language) {
  const words = text.split(' ');
  const stutterChance = 0.4;
  
  for (let i = 0; i < Math.min(3, words.length); i++) {
    if (Math.random() < stutterChance && words[i] && words[i].length > 2) {
      const firstChar = words[i][0];
      const restOfWord = words[i].slice(1);
      
      if (language === 'ru') {
        words[i] = `${firstChar}-${firstChar.toLowerCase()}${restOfWord}`;
      } else {
        words[i] = `${firstChar}-${firstChar.toLowerCase()}${restOfWord}`;
      }
      break;
    }
  }
  
  return words.join(' ');
}

function enhancePunctuation(text) {
  let enhanced = text;
  
  Object.entries(punctuationReplacements).forEach(([punct, replacements]) => {
    const regex = new RegExp(`\\${punct}`, 'g');
    enhanced = enhanced.replace(regex, () => {
      if (Math.random() > 0.6) {
        return replacements[Math.floor(Math.random() * replacements.length)];
      }
      return punct;
    });
  });
  
  enhanced = enhanced.replace(/!/g, (match) => {
    if (Math.random() > 0.7) {
      return '!!';
    }
    return match;
  });
  
  enhanced = enhanced.replace(/([.!?])\s*$/g, (match, punct) => {
    if (Math.random() > 0.5) {
      return punct + '~';
    }
    return match;
  });
  
  return enhanced;
}

function uwuifyText(text) {
  const language = detectLanguage(text);
  let uwuified = text;
  
  const replacements = uwuReplacements[language];
  
  Object.entries(replacements).forEach(([original, replacement]) => {
    if (original.length > 1) {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      uwuified = uwuified.replace(regex, replacement);
    }
  });
  
  Object.entries(replacements).forEach(([original, replacement]) => {
    if (original.length === 1) {
      const regex = new RegExp(original, 'g');
      uwuified = uwuified.replace(regex, replacement);
    }
  });
  
  uwuified = addStutter(uwuified, language);
  uwuified = enhancePunctuation(uwuified);
  
  if (Math.random() > 0.3) {
    const randomFace = uwuFaces[Math.floor(Math.random() * uwuFaces.length)];
    uwuified += ` ${randomFace}`;
  }
  
  if (Math.random() > 0.6) {
    const randomPrefix = uwuPrefixes[Math.floor(Math.random() * uwuPrefixes.length)];
    uwuified = randomPrefix + uwuified;
  }
  
  if (Math.random() > 0.4) {
    const randomSuffix = uwuSuffixes[Math.floor(Math.random() * uwuSuffixes.length)];
    uwuified += randomSuffix;
  }
  
  return uwuified;
}

export async function execute(interaction) {
  try {
    const text = interaction.options.getString('text');
    
    if (!text) {
      const errorText = new TextDisplayBuilder()
        .setContent('UwU Error\n-# Please provide text to uwuify!');
      
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
      
      return await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer],
        ephemeral: true
      });
    }
    
    if (text.length > 1000) {
      const errorText = new TextDisplayBuilder()
        .setContent(`UwU Error\n-# Text too long! Maximum 1000 characters allowed.\n\nCurrent length: ${text.length} characters`);
      
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
      
      return await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer],
        ephemeral: true
      });
    }
    
    const uwuifiedText = uwuifyText(text);
    const language = detectLanguage(text);
    const languageFlag = language === 'ru' ? '🇷🇺' : '🇺🇸';
    const languageName = language === 'ru' ? 'Russian' : 'English';
    
    const titleText = new TextDisplayBuilder()
      .setContent(`UwU Transformation Complete\n-# ${languageFlag} Language: ${languageName} | Cuteness Level: Maximum`);
    
    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);
    
    const originalText = new TextDisplayBuilder()
      .setContent(`**Original Message:**\n${text.length > 500 ? `${text.substring(0, 500)}...` : text}`);
    
    const resultText = new TextDisplayBuilder()
      .setContent(`**UwUified Result:**\n${uwuifiedText.length > 500 ? `${uwuifiedText.substring(0, 500)}...` : uwuifiedText}`);
    
    const statsText = new TextDisplayBuilder()
      .setContent(`**Transformation Stats:**\nCharacters: ${text.length} → ${uwuifiedText.length}\nChange: ${uwuifiedText.length > text.length ? '+' : ''}${uwuifiedText.length - text.length} chars\nCuteness: Enhanced!`);
    
    const uwuContainer = new ContainerBuilder()
      .addTextDisplayComponents(titleText)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(originalText)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(resultText)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(statsText)
      .addSeparatorComponents(separator);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [uwuContainer]
    });
    
  } catch (error) {
    console.error('Error in uwuify command:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('Critical UwU Error\n-# Something went wrong with the UwUification process! Please try again later.');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [errorContainer],
      ephemeral: true
    });
  }
}
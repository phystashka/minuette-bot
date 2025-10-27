import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags
} from 'discord.js';
import { createCanvas, registerFont } from 'canvas';
import { addResource } from '../../models/ResourceModel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const fontPath = path.join(__dirname, '../../public/fonts');
  registerFont(path.join(fontPath, 'Poppins-Bold.ttf'), { family: 'Poppins-Bold' });
  registerFont(path.join(fontPath, 'Poppins-Regular.ttf'), { family: 'Poppins-Regular' });
} catch (error) {
  console.log('Font loading failed, using default fonts');
}

const WORD_DICTIONARY = [
  // Main Characters
  'TWILIGHT', 'SPARKLE', 'RAINBOW', 'DASH', 'PINKIE', 'PIE', 'FLUTTERSHY', 'RARITY', 'APPLEJACK',
  'CELESTIA', 'LUNA', 'CADANCE', 'DISCORD', 'SPIKE', 'DERPY', 'HOOVES',
  
  // Secondary Characters
  'TRIXIE', 'STARLIGHT', 'GLIMMER', 'SUNSET', 'SHIMMER', 'ZECORA', 'CHRYSALIS', 'TIREK',
  'COZY', 'GLOW', 'NIGHTMARE', 'MOON', 'SOMBRA', 'SHINING', 'ARMOR',
  'BIGMAC', 'MACINTOSH', 'GRANNY', 'SMITH', 'SWEETIE', 'BELLE', 'SCOOTALOO', 'BLOOM',
  'CHEERILEE', 'MAYOR', 'MARE', 'LYRA', 'HEARTSTRINGS', 'BONBON', 'OCTAVIA',
  'VINYL', 'SCRATCH', 'ROSELUCK', 'BERRY', 'PUNCH', 'MINUETTE', 'COLGATE',
  'LIGHTNING', 'DUST', 'SOARIN', 'SPITFIRE', 'FLEETFOOT', 'THUNDERLANE',
  
  // Villains and Antagonists
  'TEMPEST', 'SHADOW', 'STORM', 'KING', 'GROGAR', 'NIGHTMARE', 'DAYBREAKER',
  'PHARYNX', 'THORAX', 'CHANGELING', 'TANTABUS', 'PARASPRITE', 'URSA',
  'DIAMOND', 'DOGS', 'SMOOZE', 'WINDIGO', 'BUGBEAR',
  
  // Cutie Mark Crusaders and Young Ponies
  'CRUSADERS', 'PIPSQUEAK', 'RUMBLE', 'BUTTON', 'MASH', 'SNIPS', 'SNAILS',
  'TWIST', 'FEATHERWEIGHT', 'DINKY', 'TENDER', 'TAPS',
  
  // Royal Guards and Wonderbolts
  'WONDERBOLTS', 'GUARDS', 'CANTERLOT', 'ROYAL', 'ACADEMY', 'CADET',
  
  // MLP Places and Locations
  'EQUESTRIA', 'PONYVILLE', 'CANTERLOT', 'CLOUDSDALE', 'MANEHATTAN', 'FILLYDELPHIA',
  'APPLEOOSA', 'DODGE', 'JUNCTION', 'BUFFALO', 'APPLES', 'FRIENDSHIP', 'MAGIC',
  'HARMONY', 'ELEMENTS', 'CUTIE', 'MARK', 'UNICORN', 'PEGASUS', 'ALICORN',
  'EARTH', 'PONY', 'CRYSTAL', 'EMPIRE', 'EVERFREE', 'FOREST', 'CASTLE',
  'LIBRARY', 'SUGARCUBE', 'CORNER', 'CAROUSEL', 'BOUTIQUE', 'SCHOOL',
  'SWEET', 'APPLE', 'ACRES', 'BARN', 'ORCHARD', 'FARMHOUSE',
  
  // MLP Items and Concepts
  'FRIENDSHIP', 'MAGIC', 'ELEMENTS', 'HARMONY', 'WONDERBOLTS', 'CUTIE', 'MARK',
  'PRINCESS', 'UNICORN', 'PEGASUS', 'ALICORN', 'EARTH', 'PONY', 'CRYSTAL',
  'GEMS', 'APPLES', 'CIDER', 'ZAPP', 'APPLE', 'FAMILY', 'REUNION',
  'GALA', 'GRAND', 'GALLOPING', 'RUNNING', 'LEAVES', 'WINTER', 'WRAP',
  'HEARTS', 'HOOVES', 'NIGHTMARE', 'NIGHT', 'SONIC', 'RAINBOOM',
  
  // General Fun Words
  'RAINBOW', 'SUNSHINE', 'HAPPINESS', 'LAUGHTER', 'KINDNESS', 'GENEROSITY',
  'HONESTY', 'LOYALTY', 'BALLOON', 'PARTY', 'CUPCAKE', 'MUFFIN', 'APPLE',
  'CHOCOLATE', 'VANILLA', 'STRAWBERRY', 'BANANA', 'ORANGE', 'GRAPE',
  'BUTTERFLY', 'DRAGON', 'PHOENIX', 'STORM', 'WINTER', 'SUMMER',
  'SPRING', 'AUTUMN', 'FLOWER', 'GARDEN', 'ROSE', 'DAISY', 'TULIP',
  'MUSIC', 'SINGING', 'DANCING', 'FLYING', 'RUNNING', 'JUMPING',
  'SWIMMING', 'READING', 'WRITING', 'DRAWING', 'PAINTING', 'COOKING',
  'BAKING', 'ADVENTURE', 'JOURNEY', 'TREASURE', 'MYSTERY', 'SECRET',
  'WONDER', 'MIRACLE', 'STARLIGHT', 'MOONBEAM', 'SUNRISE', 'SUNSET',
  'TWILIGHT', 'MIDNIGHT', 'DAWN', 'DUSK', 'SHADOW', 'LIGHT',
  
  // Food and Treats
  'CUPCAKE', 'MUFFIN', 'CAKE', 'COOKIE', 'CANDY', 'SUGAR', 'HONEY',
  'CARAMEL', 'TOFFEE', 'GUMMY', 'BEARS', 'LOLLIPOP', 'MARSHMALLOW',
  'PANCAKE', 'WAFFLE', 'DONUT', 'BAGEL', 'BREAD', 'BUTTER', 'JAM',
  'JELLY', 'PEANUT', 'MAYONNAISE', 'KETCHUP', 'MUSTARD', 'PICKLE',
  'CHEESE', 'PIZZA', 'BURGER', 'SANDWICH', 'SALAD', 'SOUP',
  
  // Animals and Creatures
  'BUNNY', 'RABBIT', 'SQUIRREL', 'BIRD', 'OWL', 'EAGLE', 'HAWK',
  'DOVE', 'SWAN', 'DUCK', 'GOOSE', 'CHICKEN', 'ROOSTER', 'PIG',
  'COW', 'HORSE', 'SHEEP', 'GOAT', 'CAT', 'DOG', 'MOUSE',
  'HAMSTER', 'GUINEA', 'FERRET', 'TURTLE', 'FROG', 'FISH',
  
  // Nature and Weather
  'CLOUD', 'RAIN', 'SNOW', 'THUNDER', 'LIGHTNING', 'WIND', 'BREEZE',
  'HURRICANE', 'TORNADO', 'BLIZZARD', 'DRIZZLE', 'SHOWER', 'MIST',
  'FOG', 'DEW', 'FROST', 'ICE', 'HAIL', 'SLEET',
  'MOUNTAIN', 'HILL', 'VALLEY', 'RIVER', 'LAKE', 'OCEAN', 'SEA',
  'BEACH', 'SAND', 'ROCK', 'STONE', 'PEBBLE', 'CLIFF', 'CAVE',
  
  // Colors
  'RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE', 'PINK',
  'BLACK', 'WHITE', 'GRAY', 'BROWN', 'SILVER', 'GOLD', 'BRONZE',
  'CRIMSON', 'SCARLET', 'AZURE', 'EMERALD', 'AMBER', 'VIOLET',
  
  // Activities and Hobbies
  'GAMES', 'PUZZLE', 'RIDDLE', 'JOKE', 'STORY', 'BOOK', 'NOVEL',
  'POEM', 'SONG', 'DANCE', 'THEATER', 'MOVIE', 'SHOW', 'CONCERT',
  'FESTIVAL', 'CARNIVAL', 'CIRCUS', 'MAGIC', 'TRICK', 'JUGGLING',
  'SPORT', 'SOCCER', 'TENNIS', 'BASEBALL', 'BASKETBALL', 'HOCKEY',
  'GOLF', 'BOWLING', 'SWIMMING', 'SKIING', 'SKATING', 'CYCLING'
];

const MAX_WRONG_GUESSES = 7;
const activeGames = new Map();

const HANGMAN_STAGES = [
  '', 
  `____
|  |
|   
|   
|   
|`, 
  `____
|  |
|  O
|   
|   
|`, 
  `____
|  |
|  O   /
|   
|   
|`, 
  `____
|  |
|  O   /
|   ---
|   
|`, 
  `____
|  |
|  O   /
|   ---
|  /
|`, 
  `____
|  |
|  O   /
|   ---
|  /\\
|`, 
  `____
|  |
|  O   /
|   ---
|  /\\ /\\
|` 
];

function createHangmanCanvas(stage, word, guessedLetters, wrongGuesses) {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(0, 0, 600, 400);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'left';
  const lines = HANGMAN_STAGES[wrongGuesses].split('\n');
  lines.forEach((line, index) => {
    ctx.fillText(line, 40, 80 + (index * 25));
  });
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px Poppins-Bold, Arial';
  ctx.textAlign = 'center';
  
  const displayWord = word.split('').map(letter => 
    guessedLetters.includes(letter) ? letter : '_'
  ).join(' ');
  
  ctx.fillText(displayWord, 300, 220);
  
  if (guessedLetters.length > 0) {
    ctx.fillStyle = '#99AAB5';
    ctx.font = 'bold 16px Poppins-Regular, Arial';
    ctx.fillText('Guessed: ' + guessedLetters.join(', '), 300, 260);
  }
  
  ctx.fillStyle = '#F04747';
  ctx.font = 'bold 20px Poppins-Bold, Arial';
  ctx.fillText(`Wrong: ${wrongGuesses}/${MAX_WRONG_GUESSES}`, 300, 290);
  
  const isComplete = word.split('').every(letter => guessedLetters.includes(letter));
  const isGameOver = wrongGuesses >= MAX_WRONG_GUESSES;
  
  if (isComplete) {
    ctx.fillStyle = '#43B581';
    ctx.font = 'bold 28px Poppins-Bold, Arial';
    ctx.fillText('YOU WON!', 300, 340);
  } else if (isGameOver) {
    ctx.fillStyle = '#F04747';
    ctx.font = 'bold 28px Poppins-Bold, Arial';
    ctx.fillText('GAME OVER', 300, 330);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Poppins-Regular, Arial';
    ctx.fillText(`Word: ${word}`, 300, 360);
  }
  
  return canvas;
}

function getRandomWord() {
  return WORD_DICTIONARY[Math.floor(Math.random() * WORD_DICTIONARY.length)];
}

export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });
  
  const gameId = `${interaction.user.id}_${Date.now()}`;
  const word = getRandomWord();
  
  const gameState = {
    word: word,
    guessedLetters: [],
    wrongGuesses: 0,
    playerId: interaction.user.id,
    correctGuesses: 0
  };
  
  activeGames.set(gameId, gameState);
  
  const canvas = createHangmanCanvas(HANGMAN_STAGES[0], word, [], 0);
  const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'hangpony.png' });
  
  const container = new ContainerBuilder();
  
  const gameText = new TextDisplayBuilder()
    .setContent(`**HANGPONY** - Guess the word!\n\n**Hint:** This word has **${word.length}** letters`);
  container.addTextDisplayComponents(gameText);
  
  const mediaGallery = new MediaGalleryBuilder()
    .addItems(
      new MediaGalleryItemBuilder()
        .setURL('attachment://hangpony.png')
    );
  container.addMediaGalleryComponents(mediaGallery);
  
  const canGuessWord = gameState.correctGuesses >= 2;
  
  const guessLetterButton = new ButtonBuilder()
    .setCustomId(`hangpony_letter_${gameId}`)
    .setLabel('Guess Letter')
    .setStyle(ButtonStyle.Secondary);
  
  const guessWordButton = new ButtonBuilder()
    .setCustomId(`hangpony_word_${gameId}`)
    .setLabel('Guess Word')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canGuessWord);
  
  const newGameButton = new ButtonBuilder()
    .setCustomId(`hangpony_new_${gameId}`)
    .setLabel('New Game')
    .setStyle(ButtonStyle.Secondary);
  
  const buttonRow = new ActionRowBuilder()
    .addComponents(guessLetterButton, guessWordButton, newGameButton);
  
  container.addActionRowComponents(buttonRow);
  
  await interaction.editReply({
    files: [attachment],
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;
  const gameId = customId.split('_').slice(2).join('_');
  const action = customId.split('_')[1];
  
  const gameState = activeGames.get(gameId);
  if (!gameState) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('This game session has expired. Please start a new game.');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }
  
  if (gameState.playerId !== interaction.user.id) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('This is not your game!');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }
  
  switch (action) {
    case 'letter':
      await handleLetterGuess(interaction, gameId, gameState);
      break;
    case 'word':
      await handleWordGuess(interaction, gameId, gameState);
      break;
    case 'new':
      await startNewGame(interaction, gameId);
      break;
  }
}

async function handleLetterGuess(interaction, gameId, gameState) {
  const modal = new ModalBuilder()
    .setCustomId(`hangpony_letter_modal_${gameId}`)
    .setTitle('Guess a Letter');
  
  const letterInput = new TextInputBuilder()
    .setCustomId('letter')
    .setLabel('Enter a letter (A-Z)')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(1)
    .setPlaceholder('Type one letter...')
    .setRequired(true);
  
  const firstActionRow = new ActionRowBuilder().addComponents(letterInput);
  modal.addComponents(firstActionRow);
  
  await interaction.showModal(modal);
}

async function handleWordGuess(interaction, gameId, gameState) {
  const modal = new ModalBuilder()
    .setCustomId(`hangpony_word_modal_${gameId}`)
    .setTitle('Guess the Word');
  
  const wordInput = new TextInputBuilder()
    .setCustomId('word')
    .setLabel('Enter the complete word')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(20)
    .setPlaceholder('Type the word...')
    .setRequired(true);
  
  const firstActionRow = new ActionRowBuilder().addComponents(wordInput);
  modal.addComponents(firstActionRow);
  
  await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction) {
  const customId = interaction.customId;
  const gameId = customId.split('_').slice(3).join('_');
  const modalType = customId.split('_')[1];
  
  const gameState = activeGames.get(gameId);
  if (!gameState) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('This game session has expired.');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }
  
  if (gameState.playerId !== interaction.user.id) {
    const container = new ContainerBuilder();
    const errorText = new TextDisplayBuilder()
      .setContent('This is not your game!');
    container.addTextDisplayComponents(errorText);
    
    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }
  
  if (modalType === 'letter') {
    await handleLetterSubmit(interaction, gameId, gameState);
  } else if (modalType === 'word') {
    await handleWordSubmit(interaction, gameId, gameState);
  }
}

async function handleLetterSubmit(interaction, gameId, gameState) {
  const letter = interaction.fields.getTextInputValue('letter').toUpperCase();
  
  if (!/^[A-Z]$/.test(letter)) {
    return interaction.reply({
      content: '❌ Please enter only one English letter (A-Z)!',
      ephemeral: true
    });
  }
  
  if (gameState.guessedLetters.includes(letter)) {
    return interaction.reply({
      content: `❌ You already guessed the letter **${letter}**!`,
      ephemeral: true
    });
  }
  
  gameState.guessedLetters.push(letter);
  
  const isCorrect = gameState.word.includes(letter);
  if (isCorrect) {
    gameState.correctGuesses++;
  } else {
    gameState.wrongGuesses++;
  }
  
  await updateGame(interaction, gameId, gameState, isCorrect ? `✅ Good guess! **${letter}** is in the word!` : `❌ **${letter}** is not in the word.`);
}

async function handleWordSubmit(interaction, gameId, gameState) {
  const guess = interaction.fields.getTextInputValue('word').toUpperCase();
  
  if (!/^[A-Z]+$/.test(guess)) {
    return interaction.reply({
      content: '❌ Please enter only English letters (A-Z)!',
      ephemeral: true
    });
  }
  
  const isCorrect = guess === gameState.word;
  if (isCorrect) {
    gameState.word.split('').forEach(letter => {
      if (!gameState.guessedLetters.includes(letter)) {
        gameState.guessedLetters.push(letter);
      }
    });
  } else {
    gameState.wrongGuesses++;
  }
  
  await updateGame(interaction, gameId, gameState, isCorrect ? `🎉 Correct! You guessed the word **${gameState.word}**!` : `❌ **${guess}** is not the correct word.`);
}

async function updateGame(interaction, gameId, gameState, message) {
  const isComplete = gameState.word.split('').every(letter => gameState.guessedLetters.includes(letter));
  const isGameOver = gameState.wrongGuesses >= MAX_WRONG_GUESSES;
  
  const canvas = createHangmanCanvas(
    HANGMAN_STAGES[gameState.wrongGuesses],
    gameState.word,
    gameState.guessedLetters,
    gameState.wrongGuesses
  );
  
  const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'hangpony.png' });
  
  const container = new ContainerBuilder();
  
  let content = `**HANGPONY**\n\n${message}`;
  
  if (isComplete) {
    const coinsAwarded = Math.floor(Math.random() * 3) + 1;
    try {
      await addResource(interaction.user.id, 'magic_coins', coinsAwarded);
      console.log(`Awarded ${coinsAwarded} magic coins to ${interaction.user.id} for Hangpony victory`);
    } catch (error) {
      console.error('Error awarding magic coins:', error);
    }

    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(interaction.user.id, 'hangpony_wins');
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    content += `\n\n**Congratulations! You won!**\n\n+${coinsAwarded} <:magic_coin:1431797469666217985> Magic Coin${coinsAwarded > 1 ? 's' : ''}!`;
    activeGames.delete(gameId);
  } else if (isGameOver) {
    content += '\n\n**Game Over!** Better luck next time!';
    activeGames.delete(gameId);
  } else {
    content += `\n\n**Hint:** This word has **${gameState.word.length}** letters`;
  }
  
  const gameText = new TextDisplayBuilder()
    .setContent(content);
  container.addTextDisplayComponents(gameText);
  
  const mediaGallery = new MediaGalleryBuilder()
    .addItems(
      new MediaGalleryItemBuilder()
        .setURL('attachment://hangpony.png')
    );
  container.addMediaGalleryComponents(mediaGallery);
  
  const canGuessWord = gameState.correctGuesses >= 2;
  const gameEnded = isComplete || isGameOver;
  
  const buttons = [];
  
  if (!gameEnded) {
    const guessLetterButton = new ButtonBuilder()
      .setCustomId(`hangpony_letter_${gameId}`)
      .setLabel('Guess Letter')
     .setStyle(ButtonStyle.Secondary);
    
    const guessWordButton = new ButtonBuilder()
      .setCustomId(`hangpony_word_${gameId}`)
      .setLabel('Guess Word')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canGuessWord);
    
    buttons.push(guessLetterButton, guessWordButton);
  }
  
  const newGameButton = new ButtonBuilder()
    .setCustomId(`hangpony_new_${gameId}`)
    .setLabel('New Game')
    .setStyle(ButtonStyle.Secondary);
  
  buttons.push(newGameButton);
  
  const buttonRow = new ActionRowBuilder().addComponents(buttons);
  container.addActionRowComponents(buttonRow);
  
  await interaction.update({
    files: [attachment],
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function startNewGame(interaction, oldGameId) {
  activeGames.delete(oldGameId);
  
  const gameId = `${interaction.user.id}_${Date.now()}`;
  const word = getRandomWord();
  
  const gameState = {
    word: word,
    guessedLetters: [],
    wrongGuesses: 0,
    playerId: interaction.user.id,
    correctGuesses: 0
  };
  
  activeGames.set(gameId, gameState);
  
  const canvas = createHangmanCanvas(HANGMAN_STAGES[0], word, [], 0);
  const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'hangpony.png' });
  
  const container = new ContainerBuilder();
  
  const gameText = new TextDisplayBuilder()
    .setContent(`**HANGPONY** - New game started!\n\n**Hint:** This word has **${word.length}** letters`);
  container.addTextDisplayComponents(gameText);
  
  const mediaGallery = new MediaGalleryBuilder()
    .addItems(
      new MediaGalleryItemBuilder()
        .setURL('attachment://hangpony.png')
    );
  container.addMediaGalleryComponents(mediaGallery);
  
  const canGuessWord = gameState.correctGuesses >= 2;
  
  const guessLetterButton = new ButtonBuilder()
    .setCustomId(`hangpony_letter_${gameId}`)
    .setLabel('Guess Letter')
    .setStyle(ButtonStyle.Secondary);
  
  const guessWordButton = new ButtonBuilder()
    .setCustomId(`hangpony_word_${gameId}`)
    .setLabel('Guess Word')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(!canGuessWord);
  
  const newGameButton = new ButtonBuilder()
    .setCustomId(`hangpony_new_${gameId}`)
    .setLabel('New Game')
    .setStyle(ButtonStyle.Secondary);
  
  const buttonRow = new ActionRowBuilder()
    .addComponents(guessLetterButton, guessWordButton, newGameButton);
  
  container.addActionRowComponents(buttonRow);
  
  await interaction.update({
    files: [attachment],
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

export const category = 'games';
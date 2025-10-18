import { 
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { getPonyByUserId, addBits } from '../../models/PonyModel.js';
import { addResource } from '../../models/ResourceModel.js';
import { addHarmony } from '../../models/HarmonyModel.js';
import { query } from '../../utils/database.js';
import { t } from '../../utils/localization.js';
import { getGuildLanguage } from '../../models/GuildModel.js';

const FORTUNE_MESSAGES = [

  "Today you can do more than you think.",
  "Someone will delight you with a small gesture.",
  "You will receive well-deserved attention.",
  "Today luck will visit for a couple of minutes — don't miss it.",
  "Even a mistake will lead to something good.",
  "You will hear words that will lift your spirits.",
  "Your patience will pay off today.",
  "Everything will turn out easier than you expect.",
  "A smile will change someone's day — and yours too.",
  "A small coincidence will bring joy.",
  "Today you will be in the right place at the right time.",
  "An old decision will prove to be right.",
  "You will be able to treat yourself to something simple.",
  "Someone will think of you with warmth.",
  "Everything will work out better than it looked at first.",
  "You will have a reason to be proud of yourself.",
  "You will notice something you have long wanted to see.",
  "Today you will be able to find common ground even with a difficult person.",
  "A small victory will bring great satisfaction.",
  "You will get a chance to start with a clean slate.",
  "The day will give you inspiration.",
  "You will remember that you can do more than it seems.",
  "Someone will offer you unexpected help.",
  "Luck will be closer than yesterday.",
  "You will be able to avoid trouble.",
  "You will manage to finish what you have been putting off.",
  "You will receive a compliment that you will remember.",
  "The day will go easier than expected.",
  "Someone will do a small kindness for you.",
  "Today your mood will be above average.",
  

  "The day will pass calmly.",
  "Today nothing unusual is likely to happen.",
  "You will hear many words, but little meaning.",
  "Today everything will be as usual.",
  "The day will fly by and you will hardly notice it.",
  "You will meet people you will forget in five minutes.",
  "Everything will depend on your attitude.",
  "The evening will pass as you build it yourself.",
  "Today will not be a turning point.",
  "You will get information, but it won't change the picture.",
  "You will remember an old thought, but it will remain a thought.",
  "Today will pass without bright events.",
  "You will hear news, but it won't concern you.",
  "This day will leave a feeling of 'normal'.",
  "You will do something familiar and not notice.",
  "Today will pass without unnecessary worries.",
  "You are unlikely to be surprised.",
  "The day will give a few ordinary moments.",
  "Today you will have a chance to change nothing.",
  "Everything will go its course.",
  

  "Someone might spoil your mood.",
  "You will forget a trifle, and it will be a little annoying.",
  "Today plans may shift.",
  "You will have to explain the obvious.",
  "Today you will have to spend more effort than you wanted.",
  "Mood can be spoiled by a small detail.",
  "You will feel tired earlier than expected.",
  "Someone will not appreciate your effort.",
  "You will want to be alone.",
  "Today little things will annoy more than usual.",
  "The evening may turn out to be boring.",
  "Your expectation will not match the result.",
  "Today you may hear unnecessary words.",
  "A small mistake will spoil the moment.",
  "Someone will not keep a promise.",
  "You will feel that the day goes too slowly.",
  "Today you will want to postpone things.",
  "You will get less than you hoped.",
  "Someone will disappoint, but not much.",
  "Today not everything will be under your control.",
  

  "Today you will notice a sign that others will miss.",
  "You will have a dream worth thinking about.",
  "The answer will come from an unexpected place.",
  "You will hear words that will seem familiar.",
  "Today a coincidence will appear on your path.",
  "You will meet a person who will change your day.",
  "A small detail will turn out to be more important than it seems.",
  "Today intuition will suggest the right path.",
  "You will feel an atmosphere that cannot be explained.",
  "The night will bring a quiet hint.",
  "Today luck will test your patience.",
  "You will notice a coincidence that will seem strange.",
  "On this day, silence will say more than words.",
  "Fate will throw you a hint.",
  "Today you will see something you have long wanted to understand.",
  "A small choice will change more than it seems.",
  "Someone will look at you in a way that will be remembered.",
  "Today an old secret will accidentally open.",
  "A sign will find you where you least expect it.",
  "You will feel a change in the air."
];

const TIMELY_REWARD = 150;
const COOLDOWN_HOURS = 12;


const FORTUNE_MESSAGES_RU = [

  "Сегодня вы сможете больше, чем думаете.",
  "Кто-то обрадует вас небольшим жестом.",
  "Вы получите заслуженное внимание.",
  "Сегодня удача заглянет на пару минут — не упустите её.",
  "Даже ошибка приведёт к чему-то хорошему.",
  "Вы услышите слова, которые поднимут настроение.",
  "Ваше терпение сегодня окупится.",
  "Всё получится проще, чем ожидаете.",
  "Улыбка изменит чей-то день — и ваш тоже.",
  "Небольшое совпадение принесёт радость.",
  "Сегодня вы окажетесь в нужном месте в нужное время.",
  "Старое решение окажется правильным.",
  "Вы сможете побаловать себя чем-то простым.",
  "Кто-то подумает о вас с теплотой.",
  "Всё получится лучше, чем выглядело сначала.",
  "У вас будет повод гордиться собой.",
  "Вы заметите то, что давно хотели увидеть.",
  "Сегодня вы сможете найти общий язык даже с трудным человеком.",
  "Маленькая победа принесёт большое удовлетворение.",
  "Вы получите шанс начать с чистого листа.",
  "День подарит вам вдохновение.",
  "Вы вспомните, что можете больше, чем кажется.",
  "Кто-то предложит вам неожиданную помощь.",
  "Удача будет ближе, чем вчера.",
  "Вы сможете избежать неприятности.",
  "Вы успеете закончить то, что откладывали.",
  "Вы получите комплимент, который запомните.",
  "День пройдёт легче, чем ожидалось.",
  "Кто-то сделает для вас небольшую доброту.",
  "Сегодня ваше настроение будет выше среднего.",
  

  "День пройдёт спокойно.",
  "Сегодня вряд ли случится что-то необычное.",
  "Вы услышите много слов, но мало смысла.",
  "Сегодня всё будет как обычно.",
  "День пролетит, и вы его почти не заметите.",
  "Вы встретите людей, которых забудете через пять минут.",
  "Всё будет зависеть от вашего настроя.",
  "Вечер пройдёт так, как вы его сами построите.",
  "Сегодня не будет поворотного момента.",
  "Вы получите информацию, но она не изменит картину.",
  "Вы вспомните старую мысль, но она останется мыслью.",
  "Сегодня пройдёт без ярких событий.",
  "Вы услышите новости, но они вас не коснутся.",
  "Этот день оставит ощущение 'нормально'.",
  "Вы сделаете что-то привычное и не заметите.",
  "Сегодня пройдёт без лишних волнений.",
  "Вас вряд ли что-то удивит.",
  "День подарит несколько обычных моментов.",
  "Сегодня у вас будет шанс ничего не изменить.",
  "Всё пойдёт своим чередом.",
  

  "Кто-то может испортить настроение.",
  "Вы забудете мелочь, и это будет немного раздражать.",
  "Сегодня планы могут сдвинуться.",
  "Вам придётся объяснять очевидное.",
  "Сегодня придётся потратить больше усилий, чем хотелось.",
  "Настроение может испортить мелкая деталь.",
  "Вы почувствуете усталость раньше, чем ожидали.",
  "Кто-то не оценит ваше усилие.",
  "Вам захочется побыть одному.",
  "Сегодня мелочи будут раздражать больше обычного.",
  "Вечер может оказаться скучным.",
  "Ваше ожидание не совпадёт с результатом.",
  "Сегодня вы можете услышать лишние слова.",
  "Небольшая ошибка испортит момент.",
  "Кто-то не сдержит обещание.",
  "Вы почувствуете, что день идёт слишком медленно.",
  "Сегодня вам захочется откладывать дела.",
  "Вы получите меньше, чем надеялись.",
  "Кто-то разочарует, но не сильно.",
  "Сегодня не всё будет под вашим контролем.",
  

  "Сегодня вы заметите знак, который пропустят другие.",
  "Вам приснится сон, о котором стоит подумать.",
  "Ответ придёт из неожиданного места.",
  "Вы услышите слова, которые покажутся знакомыми.",
  "Сегодня на вашем пути появится совпадение.",
  "Вы встретите человека, который изменит ваш день.",
  "Мелкая деталь окажется важнее, чем кажется.",
  "Сегодня интуиция подскажет правильный путь.",
  "Вы почувствуете атмосферу, которую нельзя объяснить.",
  "Ночь принесёт тихую подсказку.",
  "Сегодня удача проверит ваше терпение.",
  "Вы заметите совпадение, которое покажется странным.",
  "В этот день молчание скажет больше слов.",
  "Судьба подбросит вам намёк.",
  "Сегодня вы увидите то, что давно хотели понять.",
  "Небольшой выбор изменит больше, чем кажется.",
  "Кто-то посмотрит на вас так, что это запомнится.",
  "Сегодня случайно откроется старая тайна.",
  "Знак найдёт вас там, где меньше всего ждёте.",
  "Вы почувствуете перемену в воздухе."
];


function getTimedFortune(language = 'en') {
  const now = new Date();
  const utcHour = now.getUTCHours();
  

  let timeOfDay;
  if (utcHour >= 5 && utcHour < 12) {
    timeOfDay = 'morning';
  } else if (utcHour >= 12 && utcHour < 17) {
    timeOfDay = 'afternoon';
  } else if (utcHour >= 17 && utcHour < 22) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }
  

  const timedMessages = {
    en: {
      morning: [
        "Your morning will pass wonderfully, setting the tone for a great day ahead.",
        "The dawn brings new opportunities - seize them while the day is young.",
        "Fresh energy of the morning will carry you through all challenges today.",
        "Your early hours will be filled with clarity and positive thoughts.",
        "Morning light reveals solutions you couldn't see yesterday.",
        "The start of your day promises pleasant surprises and good news.",
        "Your morning routine will bring unexpected satisfaction today.",
        "Early hours hold the key to today's success - embrace them.",
        "Morning air carries whispers of good fortune coming your way.",
        "Your awakening today marks the beginning of positive changes.",
        "First rays of sun illuminate new paths to happiness.",
        "Your morning coffee will taste better than ever today.",
        "Early birds around you sing of upcoming good news.",
        "Morning dew sparkles with promises of a blessed day.",
        "Your first steps today lead to wonderful discoveries.",
        "Dawn chorus welcomes you to a day full of possibilities.",
        "Morning clouds part to reveal your bright future.",
        "Early sunshine warms both your face and your heart.",
        "Your morning thoughts will inspire great decisions.",
        "Fresh morning breeze carries away yesterday's worries.",
        "The sunrise paints your day with golden opportunities.",
        "Morning stillness holds secrets of today's success.",
        "Your early motivation will sustain you all day long.",
        "Morning magic transforms ordinary moments into special ones.",
        "First hours of daylight bring first signs of good luck."
      ],
      afternoon: [
        "Your afternoon will bring the perfect balance of work and joy.",
        "The peak of your day holds achievements you'll be proud of.",
        "Midday energy will fuel your most productive hours today.",
        "Your afternoon efforts will yield results beyond expectations.",
        "The sun's highest point illuminates your path to success.",
        "Your afternoon encounters will prove more meaningful than expected.",
        "Peak hours of the day will showcase your best abilities.",
        "Your midday decisions will turn out to be remarkably wise.",
        "Afternoon sunshine brings warmth to both weather and heart.",
        "The height of your day reveals hidden talents within you.",
        "Midday brightness clears away any morning confusion.",
        "Your lunch break will bring unexpected pleasant conversations.",
        "Afternoon momentum carries you toward your goals effortlessly.",
        "The busiest hours hold the most rewarding moments.",
        "High noon brings high energy and higher achievements.",
        "Your afternoon focus will accomplish more than expected.",
        "Midday meetings will result in favorable outcomes.",
        "Afternoon sun energizes both your body and your spirit.",
        "Peak daylight hours illuminate solutions to complex problems.",
        "Your afternoon productivity will surprise even yourself.",
        "Midday motivation propels you toward evening satisfaction.",
        "The sun's strength at noon mirrors your inner strength.",
        "Afternoon activities will bring unexpected joy and success.",
        "Your midday efforts plant seeds for future abundance.",
        "High afternoon energy transforms challenges into opportunities."
      ],
      evening: [
        "Your evening will wrap the day in comfort and contentment.",
        "Twilight hours bring peaceful moments you'll treasure deeply.",
        "Your evening reflections will reveal today's hidden blessings.",
        "The day's end offers gentle closure and hopeful tomorrow's promise.",
        "Evening calm will wash away any stress accumulated today.",
        "Your twilight hours hold conversations that warm the heart.",
        "The setting sun takes with it all worries of the day.",
        "Evening brings the perfect end to what turned out beautifully.",
        "Your day's conclusion will exceed your morning's expectations.",
        "Twilight whispers remind you of all you've accomplished today.",
        "Evening breeze carries messages of peace and satisfaction.",
        "Golden hour light makes everything look more beautiful.",
        "Your evening plans will unfold better than imagined.",
        "Sunset colors paint your emotions in warm, happy tones.",
        "Twilight magic transforms ordinary moments into memories.",
        "Evening shadows hide the day's stress and reveal its joys.",
        "Your dinner tonight will be especially delicious and satisfying.",
        "Dusk brings wisdom gained from today's experiences.",
        "Evening stars begin to shine with promise for tomorrow.",
        "Twilight hours offer the perfect pace for reflection and gratitude.",
        "Your evening activities will bring unexpected pleasure.",
        "Sunset marks not an ending, but a beautiful transition.",
        "Evening air carries the scent of accomplishment and peace.",
        "Twilight conversations will deepen important relationships.",
        "Your evening rest will be well-earned and deeply refreshing."
      ],
      night: [
        "Your night will bring dreams that guide tomorrow's path.",
        "Darkness holds peaceful rest and rejuvenating sleep.",
        "The quiet hours will recharge your spirit for new adventures.",
        "Night's embrace offers healing for both body and mind.",
        "Your rest tonight will prepare you for greater tomorrows.",
        "Starlight carries wishes that may soon come true.",
        "The night sky watches over your peaceful slumber.",
        "Dark hours bring the deepest rest and most vivid dreams.",
        "Your nighttime thoughts will organize into morning clarity.",
        "Sleep tonight will weave together today's experiences into wisdom.",
        "Moonbeams illuminate the path to restful dreams.",
        "Night silence holds the secrets of inner peace.",
        "Your pillow tonight will be softer than usual.",
        "Darkness wraps you in comfort and tranquility.",
        "Night hours restore what daylight has spent.",
        "The stars align to bless your sleeping hours.",
        "Your dreams tonight will be filled with pleasant visions.",
        "Night's gentle rhythm soothes away all tension.",
        "Midnight hours bring the deepest healing and renewal.",
        "Your sleep will be undisturbed and incredibly refreshing.",
        "Night whispers carry promises of a better tomorrow.",
        "Darkness holds not emptiness, but infinite possibility.",
        "Your bedtime routine will bring unusual satisfaction tonight.",
        "Night sky sparkles with inspiration for tomorrow's adventures.",
        "Sleep tonight will unlock creativity for tomorrow's challenges."
      ]
    },
    ru: {
      morning: [
        "Ваше утро пройдет чудесно, задавая тон прекрасному дню.",
        "Рассвет несет новые возможности - используйте их, пока день молод.",
        "Свежая энергия утра поможет преодолеть все сегодняшние вызовы.",
        "Ваши утренние часы будут наполнены ясностью и позитивными мыслями.",
        "Утренний свет открывает решения, которых вы не видели вчера.",
        "Начало вашего дня обещает приятные сюрпризы и хорошие новости.",
        "Ваша утренняя рутина принесет неожиданное удовлетворение сегодня.",
        "Ранние часы держат ключ к сегодняшнему успеху - примите их.",
        "Утренний воздух несет шепот грядущей удачи.",
        "Ваше пробуждение сегодня знаменует начало позитивных перемен."
      ],
      afternoon: [
        "Ваш день принесет идеальный баланс работы и радости.",
        "Пик вашего дня содержит достижения, которыми вы будете гордиться.",
        "Дневная энергия подпитает ваши самые продуктивные часы сегодня.",
        "Ваши дневные усилия принесут результаты сверх ожиданий.",
        "Высшая точка солнца освещает ваш путь к успеху.",
        "Ваши дневные встречи окажутся более значимыми, чем ожидалось.",
        "Пиковые часы дня покажут ваши лучшие способности.",
        "Ваши полуденные решения окажутся удивительно мудрыми.",
        "Дневное солнце приносит тепло и погоде, и сердцу.",
        "Разгар дня раскрывает скрытые таланты внутри вас."
      ],
      evening: [
        "Ваш вечер завернет день в комфорт и удовлетворение.",
        "Сумеречные часы принесут мирные моменты, которые вы будете ценить.",
        "Ваши вечерние размышления откроют скрытые благословения дня.",
        "Конец дня предлагает мягкое завершение и надежду на завтра.",
        "Вечерний покой смоет весь накопленный за день стресс.",
        "Ваши сумеречные часы содержат разговоры, согревающие сердце.",
        "Заходящее солнце уносит с собой все дневные заботы.",
        "Вечер принесет идеальное завершение прекрасно прошедшего дня.",
        "Завершение дня превзойдет утренние ожидания.",
        "Сумеречный шепот напоминает о всем, что вы сегодня достигли."
      ],
      night: [
        "Ваша ночь принесет сны, которые направят завтрашний путь.",
        "Темнота хранит мирный отдых и восстанавливающий сон.",
        "Тихие часы перезарядят ваш дух для новых приключений.",
        "Ночные объятия предлагают исцеление для тела и разума.",
        "Ваш отдых сегодня подготовит вас к великому завтра.",
        "Звездный свет несет желания, которые скоро могут сбыться.",
        "Ночное небо наблюдает за вашим мирным сном.",
        "Темные часы приносят глубочайший отдых и яркие сны.",
        "Ваши ночные мысли организуются в утреннюю ясность.",
        "Сон сегодня сплетет дневной опыт в мудрость."
      ]
    }
  };
  
  const messages = timedMessages[language] || timedMessages.en;
  const timeMessages = messages[timeOfDay] || messages.morning;
  
  return timeMessages[Math.floor(Math.random() * timeMessages.length)];
}


async function checkAndSetTimely(userId) {
  const now = new Date();
  

  const createUserSql = `
    INSERT OR IGNORE INTO users (user_id) 
    VALUES (?)
  `;
  await query(createUserSql, [userId]);
  

  const checkSql = `
    SELECT last_timely FROM users 
    WHERE user_id = ?
  `;
  
  const result = await query(checkSql, [userId]);
  const user = result[0];
  
  console.log(`Timely check for user ${userId}: user found = ${!!user}, last_timely = ${user?.last_timely}`);
  
  if (user && user.last_timely) {
    const lastUse = new Date(user.last_timely);
    const hoursSinceLastUse = (now - lastUse) / (1000 * 60 * 60);
    

    const { getRebirthBonuses } = await import('./rebirth.js');
    const rebirthBonuses = await getRebirthBonuses(userId);
    

    const effectiveCooldown = Math.max(1, COOLDOWN_HOURS - rebirthBonuses.timelyReduction);
    
    console.log(`Last use: ${lastUse.toISOString()}, hours since: ${hoursSinceLastUse.toFixed(2)}, effective cooldown: ${effectiveCooldown}h`);
    
    if (hoursSinceLastUse < effectiveCooldown) {
      const hoursLeft = Math.ceil(effectiveCooldown - hoursSinceLastUse);
      console.log(`Cooldown active, hours left: ${hoursLeft}`);
      return { canUse: false, hoursLeft };
    }
  }
  

  const updateSql = `
    UPDATE users 
    SET last_timely = ? 
    WHERE user_id = ?
  `;
  
  const updateResult = await query(updateSql, [now.toISOString(), userId]);
  console.log(`Updated last_timely for user ${userId} to ${now.toISOString()}`);
  
  return { canUse: true, hoursLeft: 0 };
}


async function ensureTimelyColumn() {
  try {

    const checkColumnSql = `PRAGMA table_info(users)`;
    const columns = await query(checkColumnSql);
    
    const hasTimelyColumn = columns.some(column => column.name === 'last_timely');
    
    if (!hasTimelyColumn) {
      console.log('Adding last_timely column to users table...');
      const addColumnSql = `
        ALTER TABLE users 
        ADD COLUMN last_timely TEXT DEFAULT NULL
      `;
      await query(addColumnSql);
      console.log('Successfully added last_timely column');
    }
  } catch (error) {
    console.error('Error ensuring timely column exists:', error);

  }
}

export const data = new SlashCommandBuilder()
  .setName('timely')
  .setDescription('Get your daily fortune and earn bits')
  .setDescriptionLocalizations({
    'ru': 'Получите ежедневное предсказание и заработайте биты'
  })
  .setDMPermission(false);

export async function execute(interaction) {
  try {
    await ensureTimelyColumn();
    
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;
    
    const timelyCheck = await checkAndSetTimely(userId);
    
    if (!timelyCheck.canUse) {
      const cooldownText = new TextDisplayBuilder()
        .setContent('⏰ **Daily Fortune**\n-# Come back later for your daily rewards!');
      
      const separator = new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small);
      
      const cooldownInfo = new TextDisplayBuilder()
        .setContent(`${await t('timely.cooldown', guildId)} \`${timelyCheck.hoursLeft} ${await t('timely.hours', guildId)}\``);
      
      const cooldownContainer = new ContainerBuilder()
        .addTextDisplayComponents(cooldownText)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(cooldownInfo)
        .addSeparatorComponents(separator);
      
      return await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [cooldownContainer]
      });
    }
    const guildLanguage = guildId ? await getGuildLanguage(guildId) : 'en';
    const fortune = getTimedFortune(guildLanguage);
    
    await addBits(userId, TIMELY_REWARD);
    await addHarmony(userId, 50, 'Daily timely reward');
    
    try {
      const { addQuestProgress } = await import('../../utils/questUtils.js');
      await addQuestProgress(userId, 'earn_bits', TIMELY_REWARD);
      await addQuestProgress(userId, 'collect_timely');
    } catch (questError) {
      console.debug('Quest progress error:', questError.message);
    }
    
    let candiesAmount = 50;
    let woodAmount = 75;
    let toolsAmount = 75;
    let stoneAmount = 75;
    
    const { getRebirthBonuses } = await import('./rebirth.js');
    const rebirthBonuses = await getRebirthBonuses(userId);
    
    if (rebirthBonuses.resourceBonus > 0) {
      const bonusMultiplier = 1 + (rebirthBonuses.resourceBonus / 100);
      candiesAmount = Math.floor(candiesAmount * bonusMultiplier);
      woodAmount = Math.floor(woodAmount * bonusMultiplier);
      toolsAmount = Math.floor(toolsAmount * bonusMultiplier);
      stoneAmount = Math.floor(stoneAmount * bonusMultiplier);
    }
    
    const { hasActivePotion } = await import('../../models/ResourceModel.js');
    const hasResourcePotion = await hasActivePotion(userId, 'resource');
    if (hasResourcePotion) {
      candiesAmount = Math.floor(candiesAmount * 1.45);
      woodAmount = Math.floor(woodAmount * 1.45);
      toolsAmount = Math.floor(toolsAmount * 1.45);
      stoneAmount = Math.floor(stoneAmount * 1.45);
    }
    
    await addResource(userId, 'candies', candiesAmount);
    await addResource(userId, 'wood', woodAmount);
    await addResource(userId, 'tools', toolsAmount);
    await addResource(userId, 'stone', stoneAmount);

    const fortuneText = new TextDisplayBuilder()
      .setContent('**Daily Fortune**\n-# Your destiny awaits!');
    
    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);
    
    const fortuneMessage = new TextDisplayBuilder()
      .setContent(`**🌟 Today's Fortune:**\n${fortune}`);
    
    const rewardText = hasResourcePotion 
      ? `**🎁 Daily Rewards:**\n<:bits:1411354539935666197> **${TIMELY_REWARD}** bits\n<:harmony:1416514347789844541> **50** harmony\n🍬 **${candiesAmount}** candies\n<:wooden:1426514988134301787> **${woodAmount}** wood\n<:tool:1426514983159599135> **${toolsAmount}** tools\n<:stones:1426514985865056326> **${stoneAmount}** stone\n\n⚗️ **+45% bonus from Resource Potion!**`
      : `**🎁 Daily Rewards:**\n<:bits:1411354539935666197> **${TIMELY_REWARD}** bits\n<:harmony:1416514347789844541> **50** harmony\n🍬 **${candiesAmount}** candies\n<:wooden:1426514988134301787> **${woodAmount}** wood\n<:tool:1426514983159599135> **${toolsAmount}** tools\n<:stones:1426514985865056326> **${stoneAmount}** stone`;
    
    const rewardsMessage = new TextDisplayBuilder()
      .setContent(rewardText);
    
    const footerMessage = new TextDisplayBuilder()
      .setContent('💡 **Tip:** Use `/vote` for bonus rewards!');
    
    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(fortuneText)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(fortuneMessage)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(rewardsMessage)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(footerMessage)
      .addSeparatorComponents(separator);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [successContainer]
    });
    
  } catch (error) {
    console.error('Error in timely command:', error);
    
    const errorEmbed = createEmbed({
      title: 'Error',
      description: await t('timely.error', interaction.guild?.id),
      user: interaction.user,
      color: 0xff0000
    });
    
    await interaction.editReply({ embeds: [errorEmbed] });
  }
}

export const category = 'economy';
export const guildOnly = false;
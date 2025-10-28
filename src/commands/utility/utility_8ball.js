import { 
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize
} from 'discord.js';

const responses = [
  "Twilight Sparkle says: Absolutely! The magic of friendship confirms it!",
  "Rainbow Dash says: 20% cooler than yes! Go for it!",
  "Pinkie Pie says: Ooh ooh! Yes yes yes! Party time!",
  "Fluttershy says: Um... if it's okay with you... yes...",
  "Rarity says: Darling, absolutely! It's simply fabulous!",
  "Applejack says: Eeyup! You can bet your apples on it!",
  
  "Princess Celestia says: The sun shines favorably upon this decision.",
  "Princess Luna says: The night brings good omens for this path.",
  "Discord says: Chaos says... surprisingly, yes!",
  "Derpy says: I put it in the mailbox... I mean, yes!",
  "Spike says: Twilight would say yes, so I say yes too!",
  "Starlight Glimmer says: My reformed self says absolutely!",
  
  "Sunset Shimmer says: The magic of friendship guides you to yes!",
  "Trixie says: The Great and Powerful Trixie declares it so!",
  "Big Mac says: Eeyup!",
  "Granny Smith says: In my day, we'd call that a yes!",
  "Cadance says: Love is in the air, and so is yes!",
  "Shining Armor says: As captain of the guard, I approve!",
  
  "Cheerilee says: Class, today we learned the answer is yes!",
  "Zecora says: The zebra's wisdom speaks of fortune true, yes awaits for you!",
  "DJ Pon-3 says: *nods enthusiastically to the beat*",
  "Octavia says: The symphony of fate plays a resounding yes!",
  "Lyra says: Humans would totally say yes to this!",
  "Bon Bon says: Sweet! The answer is definitely yes!",
  
  "Twilight Sparkle says: I'm not entirely certain... maybe?",
  "Rainbow Dash says: Eh, might work if you train hard enough!",
  "Pinkie Pie says: Hmm... my Pinkie sense is a little fuzzy...",
  "Fluttershy says: Oh my... I'm not really sure... maybe?",
  "Rarity says: It could work, but it needs more... flair.",
  "Applejack says: Well, sugar cube, it's possible...",
  
  "Princess Celestia says: The future remains clouded, young one.",
  "Princess Luna says: The stars are unclear on this matter.",
  "Discord says: Even chaos can't predict this one!",
  "Derpy says: I might have delivered the wrong answer...",
  "Spike says: Uh... I'd have to ask Twilight about this one.",
  "Starlight Glimmer says: My time magic shows... unclear results.",
  
  "Sunset Shimmer says: The portal between worlds shows uncertainty.",
  "Trixie says: Even Trixie's magic cannot reveal this mystery!",
  "Big Mac says: Nnope... wait, maybe? Eeh...",
  "Granny Smith says: Sonny, that's a tough one to call.",
  "Cadance says: Love finds a way... sometimes.",
  "Shining Armor says: I need more intel before making that call.",
  
  "Twilight Sparkle says: After extensive research... no.",
  "Rainbow Dash says: Not gonna happen, sorry!",
  "Pinkie Pie says: Aw, my party cannon says no...",
  "Fluttershy says: I'm sorry, but... no...",
  "Rarity says: Oh darling, that simply won't do.",
  "Applejack says: Nope, not worth a hill of beans.",
  
  "Princess Celestia says: The sun sets on this idea, my little pony.",
  "Princess Luna says: The night brings shadows of doubt.",
  "Discord says: Even I wouldn't cause that much chaos!",
  "Derpy says: Whoops! Wrong mailbox... I mean, no!",
  "Spike says: Twilight says that's a definite no.",
  "Starlight Glimmer says: I've seen this timeline... it doesn't end well.",
  
  "Sunset Shimmer says: The magic is telling me to steer clear.",
  "Trixie says: The Great and Powerful Trixie says... no.",
  "Big Mac says: Nnope.",
  "Granny Smith says: Don't even think about it, young'un!",
  "Cadance says: Love says no on this one, sweetie.",
  "Shining Armor says: Negative, that's not happening on my watch.",
  
  "Cheerilee says: I'm afraid that's not the right answer, class.",
  "Zecora says: The stripes upon my coat say no, this path you should not go!",
  "DJ Pon-3 says: *shakes head to the bass drop*",
  "Octavia says: The orchestra of fate plays a somber no.",
  "Lyra says: Even humans wouldn't do that!",
  "Bon Bon says: That's not so sweet... definitely no.",
  
  "Tank the Tortoise says: *slow head shake*",
  "Owlowiscious says: Who? No, that's who!",
  "Angel Bunny says: *disapproving bunny glare*",
  "Winona says: *concerned dog whimper*",
  "Opalescence says: *sassy cat eye roll*",
  "Gummy says: *blank alligator stare* (Translation: No)",
  
  "Nightmare Moon says: The night eternal says... NO!",
  "Queen Chrysalis says: Even I wouldn't feed on that idea!",
  "King Sombra says: The crystal heart shows... darkness.",
  "Tirek says: Not even worth stealing magic for!",
  "Cozy Glow says: Golly, that's a terrible idea!",
  "Tempest Shadow says: My broken horn tingles... with bad vibes.",
  
  "Maud Pie says: That rocks... but in a bad way.",
  "Limestone Pie says: I'm mad just thinking about it!",
  "Marble Pie says: *whispers* ...no...",
  "Cheese Sandwich says: Not even party planning could save that idea!",
  "Tree Hugger says: The universe is like... totally against it, man.",
  "Coco Pommel says: Oh my, I don't think that would work...",
  
  "Minuette says: Time to say no to that one!",
  "Colgate says: That needs more than a good brushing... it needs a no!",
  "Lemon Hearts says: Sour idea, sweet pony!",
  "Twinkleshine says: Not even my sparkles can make that work!",
  "Sea Swirl says: The ocean of possibility says... no waves.",
  "Lucky Clover says: That's unlucky, partner!",
  
  "Doctor Whooves says: I've seen the future... run!",
  "Roseluck says: That idea wilted before it bloomed.",
  "Daisy says: Don't plant that seed of an idea!",
  "Lily Valley says: Even flowers know to avoid that!",
  "Berry Punch says: I'd need more cider to consider that!",
  "Golden Harvest says: That crop won't grow, sugarcube!"
];

export async function execute(interaction) {
  try {
    const question = interaction.options.getString('question');
    
    if (!question) {
      const errorText = new TextDisplayBuilder()
        .setContent('Magic 8-Ball Error\n-# You need to ask a question for the magic to work!');
      
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(errorText);
      
      return await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer],
        ephemeral: true
      });
    }
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    const titleText = new TextDisplayBuilder()
      .setContent('Magic 8-Ball of Harmony\n-# The magic of friendship guides this answer!');
    
    const separator = new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small);
    
    const questionText = new TextDisplayBuilder()
      .setContent(`**Question:** ${question}`);
    
    const answerText = new TextDisplayBuilder()
      .setContent(`**Answer:** ${randomResponse}`);
    
    const eightBallContainer = new ContainerBuilder()
      .addTextDisplayComponents(titleText)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(questionText)
      .addSeparatorComponents(separator)
      .addTextDisplayComponents(answerText)
      .addSeparatorComponents(separator);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [eightBallContainer]
    });
    
  } catch (error) {
    console.error('Error in 8ball command:', error);
    
    const errorText = new TextDisplayBuilder()
      .setContent('Error\n-# Something went wrong with the magic 8-ball!');
    
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(errorText);
    
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [errorContainer],
      ephemeral: true
    });
  }
}
import { 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { createEmbed } from '../../utils/components.js';
import { 
  getPony, 
  createPony, 
  validatePonyAge,
  validatePonyRace,
  validatePonyName,
  validatePonyDescription,
  createPonyEmbed,
  getRaceName,
  getRaceEmoji
} from '../../utils/pony/index.js';
import { t } from '../../utils/localization.js';

export const data = new SlashCommandBuilder()
  .setName('equestria')
  .setDescription('Welcome to Equestria! Create your own pony')
  .setDescriptionLocalizations({
    'ru': 'Добро пожаловать в Эквестрию! Создайте своего пони'
  })
  .setDMPermission(false);

export async function execute(interaction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;
    const existingPony = await getPony(userId);
    
    if (existingPony) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: await t('equestria.title', guildId),
            description: await t('equestria.already_have_pony', guildId, { name: existingPony.pony_name }),
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    }
    
    const modal = new ModalBuilder()
      .setCustomId('create-pony-modal')
      .setTitle(await t('equestria.create_pony_modal_title', guildId));
    
    const nameInput = new TextInputBuilder()
      .setCustomId('pony-name')
      .setLabel(await t('equestria.pony_name_label', guildId))
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(await t('equestria.pony_name_placeholder', guildId))
      .setRequired(true)
      .setMaxLength(30);
    
    const ageInput = new TextInputBuilder()
      .setCustomId('pony-age')
      .setLabel(await t('equestria.pony_age_label', guildId))
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(await t('equestria.pony_age_placeholder', guildId))
      .setRequired(true);
    
    const raceInput = new TextInputBuilder()
      .setCustomId('pony-race')
      .setLabel(await t('equestria.pony_race_label', guildId))
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(await t('equestria.pony_race_placeholder', guildId))
      .setRequired(true);
    
    const descriptionInput = new TextInputBuilder()
      .setCustomId('pony-description')
      .setLabel(await t('equestria.pony_description_label', guildId))
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(await t('equestria.pony_description_placeholder', guildId))
      .setRequired(false)
      .setMaxLength(300);
    
    const nameRow = new ActionRowBuilder().addComponents(nameInput);
    const ageRow = new ActionRowBuilder().addComponents(ageInput);
    const raceRow = new ActionRowBuilder().addComponents(raceInput);
    const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
    
    modal.addComponents(nameRow, ageRow, raceRow, descriptionRow);
    
    await interaction.showModal(modal);
    
    const filter = (i) => i.customId === 'create-pony-modal' && i.user.id === interaction.user.id;
    
    try {
      const submission = await interaction.awaitModalSubmit({ filter, time: 300000 });
      
      const ponyName = submission.fields.getTextInputValue('pony-name');
      const ponyAgeStr = submission.fields.getTextInputValue('pony-age');
      const ponyRaceInput = submission.fields.getTextInputValue('pony-race').toLowerCase();
      const ponyDescription = submission.fields.getTextInputValue('pony-description');
      
      let ponyAge = parseInt(ponyAgeStr);
      let ponyRace;
      
      try {
        validatePonyName(ponyName);
      } catch (error) {
        return submission.reply({
          embeds: [
            createEmbed({
              title: 'Error',
              description: await t('equestria.invalid_name', guildId),
              user: interaction.user
            })
          ],
          ephemeral: true
        });
      }
      
      try {
        validatePonyAge(ponyAge);
      } catch (error) {
        return submission.reply({
          embeds: [
            createEmbed({
              title: 'Error',
              description: await t('equestria.invalid_age', guildId),
              user: interaction.user
            })
          ],
          ephemeral: true
        });
      }
      
      try {
        ponyRace = validatePonyRace(ponyRaceInput);
      } catch (error) {
        return submission.reply({
          embeds: [
            createEmbed({
              title: 'Error',
              description: await t('equestria.invalid_race', guildId),
              user: interaction.user
            })
          ],
          ephemeral: true
        });
      }
      
      try {
        if (ponyDescription) {
          validatePonyDescription(ponyDescription);
        }
      } catch (error) {
        return submission.reply({
          embeds: [
            createEmbed({
              title: 'Invalid Description',
              description: 'Your pony\'s description cannot exceed 1000 characters.',
              user: interaction.user
            })
          ],
          ephemeral: true
        });
      }

      const existingPonyCheck = await getPony(userId);
      if (existingPonyCheck) {
        return submission.reply({
          embeds: [
            createEmbed({
              title: await t('equestria.already_have_pony_title', guildId),
              description: await t('equestria.already_have_pony', guildId, { name: existingPonyCheck.pony_name }),
              user: interaction.user
            })
          ],
          ephemeral: true
        });
      }
      
      const ponyData = {
        user_id: userId,
        pony_name: ponyName,
        pony_age: ponyAge,
        pony_race: ponyRace,
        pony_description: ponyDescription || null,
        pony_image: null,
        bits: 100
      };
      
      let newPony;
      try {
        newPony = await createPony(ponyData);
      } catch (ponyError) {
        if (ponyError.code === 'PONY_EXISTS') {
          return submission.reply({
            embeds: [
              createEmbed({
                title: await t('equestria.already_have_pony_title', guildId),
                description: await t('equestria.already_have_pony_simple', guildId),
                user: interaction.user
              })
            ],
            ephemeral: true
          });
        }
        throw ponyError; 
      }
      
      const ponyEmbed = createEmbed({
        title: `${newPony.pony_name}`,
        description: newPony.pony_description || '*No description provided*',
        user: interaction.user,
        fields: [
          {
            name: '> Race',
            value: getRaceName(newPony.pony_race),
            inline: true
          },
          {
            name: '> Age',
            value: `${newPony.pony_age} years`,
            inline: true
          },
          {
            name: '> Bits',
            value: `${newPony.bits}`,
            inline: true
          },
          {
            name: '> Owner',
            value: `<@${interaction.user.id}>`,
            inline: true
          }
        ]
      });
      
      const welcomeEmbed = createEmbed({
        title: await t('equestria.title', guildId),
        description: await t('equestria.pony_created', guildId, { name: ponyName }) + 
          `\n\n**Next Steps:**\n` +
          `> Use \`/profile\` to view your pony details and stats\n` +
          `> Use \`/venture\` to explore and catch wild ponies\n` +
          `> Use \`/help\` to discover all available commands\n\n` +
          `*Welcome to your magical adventure in Equestria!*\n\n` +
          `-# This bot is a fan-made project. It is not affiliated with or endorsed by Hasbro and is created for entertainment purposes only. All rights to My Little Pony belong to © Hasbro.`,
        user: interaction.user,
        image: 'https://i.imgur.com/NOtAqkQ.jpeg'
      });


      const linkButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Fan Content Policy')
            .setURL('https://company.hasbro.com/fan-content-policy')
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setLabel('Terms & Conditions')
            .setURL('https://shop.hasbro.com/en-us/terms')
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setLabel('Hasbro Trademarks')
            .setURL('https://trademarks.justia.com/owners/hasbro-inc-4543/')
            .setStyle(ButtonStyle.Link)
        );
      
      return submission.reply({
        embeds: [welcomeEmbed, ponyEmbed],
        components: [linkButtons]
      });
    } catch (error) {
      if (error.code === 'InteractionCollectorError') {
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in equestria command:', error);
    
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        embeds: [
          createEmbed({
            title: 'Error',
            description: `An error occurred while creating your pony: ${error.message}`,
            user: interaction.user
          })
        ],
        ephemeral: true
      });
    }
    
    return interaction.reply({
      embeds: [
        createEmbed({
          title: 'Error',
          description: `An error occurred while creating your pony: ${error.message}`,
          user: interaction.user
        })
      ],
      ephemeral: true
    });
  }
} 
import { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } from 'discord.js';
import { config } from '../config/config.js';



export const createButton = (options = {}) => {
  const {
    customId,
    label,
    style = ButtonStyle.Primary,
    emoji,
    url,
    disabled = false
  } = options;
  
  const button = new ButtonBuilder();
  
  if (url) {
    button.setURL(url);
    button.setStyle(ButtonStyle.Link);
  } else {
    button.setCustomId(customId);
    button.setStyle(style);
  }
  
  if (label) button.setLabel(label);
  if (emoji) button.setEmoji(emoji);
  if (disabled) button.setDisabled(true);
  
  return button;
};

export const createSelectMenu = (options = {}) => {
  const {
    customId,
    placeholder,
    options: selectOptions = [],
    minValues = 1,
    maxValues = 1,
    disabled = false
  } = options;
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setOptions(selectOptions)
    .setMinValues(minValues)
    .setMaxValues(maxValues);
  
  if (placeholder) selectMenu.setPlaceholder(placeholder);
  if (disabled) selectMenu.setDisabled(true);
  
  return selectMenu;
};

export const createActionRow = (components = []) => {
  const actionRow = new ActionRowBuilder();
  if (components.length > 0) {
    actionRow.addComponents(components);
  }
  return actionRow;
};



export const createEmbed = (options = {}) => {
  const {
    title,
    description,
    color = 0x03168f,
    fields = [],
    timestamp = false,
    thumbnail,
    image,
    author,
    footer,
    url,
    user
  } = options;

  const embed = new EmbedBuilder()
    .setColor(color);
  
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length > 0) embed.addFields(fields);
  

  if (footer) embed.setFooter(footer);
  if (timestamp) embed.setTimestamp();
  

  if (user && user.displayAvatarURL) {
    embed.setThumbnail(user.displayAvatarURL());
  } else if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }
  
  if (image) embed.setImage(image);
  if (author) embed.setAuthor(author);
  if (url) embed.setURL(url);
  
  return embed;
};

export const successEmbed = (description, title = "Success") => {
  return createEmbed({
    title,
    description,
    color: 0x03168f
  });
};

export const errorEmbed = (description, title = "Error") => {
  return createEmbed({
    title,
    description,
    color: 0x03168f
  });
};

export const warningEmbed = (description, title = "Warning") => {
  return createEmbed({
    title,
    description,
    color: 0x03168f
  });
};



export const createDeleteButton = (userId) => {
  return createButton({
    customId: `delete_dm_message_${userId}`,
    label: '✕',
    style: ButtonStyle.Secondary
  });
};

export const createDeleteRow = (userId) => {
  return createActionRow([createDeleteButton(userId)]);
};



export const sendDMWithDelete = async (user, options = {}) => {
  try {
    const { embeds, content, components = [] } = options;
    

    const deleteRow = createDeleteRow(user.id);
    const allComponents = [...components, deleteRow];
    
    const messageOptions = {
      ...(content && { content }),
      ...(embeds && { embeds: Array.isArray(embeds) ? embeds : [embeds] }),
      components: allComponents
    };
    
    return await user.send(messageOptions);
  } catch (error) {
    console.error('Error sending DM with delete button:', error);
    throw error;
  }
};



export function createBar(percentage, emoji) {
  const fullBlocks = Math.floor(percentage / 10);
  const remainingBlock = percentage % 10 > 0 ? '▪️' : '';
  return emoji.repeat(fullBlocks) + remainingBlock + '⚪'.repeat(10 - fullBlocks - (remainingBlock ? 1 : 0));
}

export const getReadablePermissionName = (permFlag) => {
  const permName = Object.keys(PermissionsBitField.Flags).find(
    key => PermissionsBitField.Flags[key] === permFlag
  );
  
  if (permName) {
    return permName.replace(/([A-Z])/g, ' $1').trim();
  }
  
  return "Unknown Permission";
};

export function createRow(...components) {
  const row = new ActionRowBuilder();
  
  const componentsArray = Array.isArray(components[0]) ? components[0] : components;
  
  row.addComponents(componentsArray);
  
  return row;
} 
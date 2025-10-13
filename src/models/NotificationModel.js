import { DataTypes } from 'sequelize';
import { sequelize } from '../utils/database.js';

const Notification = sequelize.define('Notification', {
  user_id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'venture_cooldown'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'notifications',
  timestamps: false
});


export async function enableNotification(userId, type = 'venture_cooldown') {
  try {
    const [notification, created] = await Notification.upsert({
      user_id: userId,
      type: type,
      enabled: true,
      updated_at: new Date()
    });
    return notification;
  } catch (error) {
    console.error('Error enabling notification:', error);
    throw error;
  }
}


export async function disableNotification(userId, type = 'venture_cooldown') {
  try {
    const result = await Notification.update(
      { enabled: false, updated_at: new Date() },
      { where: { user_id: userId, type: type } }
    );
    return result[0] > 0;
  } catch (error) {
    console.error('Error disabling notification:', error);
    throw error;
  }
}


export async function isNotificationEnabled(userId, type = 'venture_cooldown') {
  try {
    const notification = await Notification.findOne({
      where: { user_id: userId, type: type, enabled: true }
    });
    return !!notification;
  } catch (error) {
    console.error('Error checking notification status:', error);
    return false;
  }
}


export async function getEnabledNotifications(type = 'venture_cooldown') {
  try {
    const notifications = await Notification.findAll({
      where: { type: type, enabled: true }
    });
    return notifications.map(n => n.user_id);
  } catch (error) {
    console.error('Error getting enabled notifications:', error);
    return [];
  }
}


export async function cleanupOldNotifications(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await Notification.destroy({
      where: {
        enabled: false,
        updated_at: {
          [sequelize.Sequelize.Op.lt]: cutoffDate
        }
      }
    });
    return result;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    return 0;
  }
}

export { Notification };
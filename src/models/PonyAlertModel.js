
import { DataTypes } from 'sequelize';
import { sequelize } from '../utils/database.js';


const PonyAlert = sequelize.define('PonyAlert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pony_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'pony_alerts',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['pony_name']
    }
  ]
});


export const createPonyAlertsTable = async () => {
  try {

    try {
      await sequelize.query('DROP TABLE IF EXISTS pony_alerts_backup');
    } catch (e) {

    }


    const sql = `
      CREATE TABLE IF NOT EXISTS pony_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        pony_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sequelize.query(sql);
    

    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_pony_alerts_user_id ON pony_alerts (user_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_pony_alerts_pony_name ON pony_alerts (pony_name)');
    

    await PonyAlert.sync({ force: false });
    
    console.log('Pony alerts table created/verified successfully');
  } catch (error) {
    console.error('Error creating pony alerts table:', error);

    console.log('Continuing with existing table structure...');
  }
};


export const addPonyAlert = async (userId, ponyName) => {
  try {

    const existing = await PonyAlert.findOne({
      where: {
        user_id: userId,
        pony_name: ponyName
      }
    });

    if (existing) {
      return { success: false, reason: 'already_exists' };
    }


    const count = await PonyAlert.count({
      where: { user_id: userId }
    });

    if (count >= 5) {
      return { success: false, reason: 'limit_exceeded' };
    }


    await PonyAlert.create({
      user_id: userId,
      pony_name: ponyName
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding pony alert:', error);
    return { success: false, reason: 'database_error' };
  }
};


export const removePonyAlert = async (userId, ponyName) => {
  try {
    const deleted = await PonyAlert.destroy({
      where: {
        user_id: userId,
        pony_name: ponyName
      }
    });

    return { success: deleted > 0 };
  } catch (error) {
    console.error('Error removing pony alert:', error);
    return { success: false };
  }
};


export const getUserPonyAlerts = async (userId) => {
  try {
    const alerts = await PonyAlert.findAll({
      where: { user_id: userId },
      order: [['created_at', 'ASC']]
    });

    return alerts.map(alert => alert.pony_name);
  } catch (error) {
    console.error('Error getting user pony alerts:', error);
    return [];
  }
};


export const getUsersForPonyAlert = async (ponyName) => {
  try {
    const alerts = await PonyAlert.findAll({
      where: { pony_name: ponyName }
    });

    return alerts.map(alert => alert.user_id);
  } catch (error) {
    console.error('Error getting users for pony alert:', error);
    return [];
  }
};


export const clearAllUserAlerts = async (userId) => {
  try {
    const deleted = await PonyAlert.destroy({
      where: { user_id: userId }
    });

    return { success: true, count: deleted };
  } catch (error) {
    console.error('Error clearing user alerts:', error);
    return { success: false, count: 0 };
  }
};

export default PonyAlert;
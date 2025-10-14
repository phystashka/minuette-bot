import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ActiveArtifact = sequelize.define('ActiveArtifact', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'user_id'
  },
  guild_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'guild_id'
  },
  artifact_type: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'artifact_type'
  },
  expires_at: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'expires_at'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'active_artifacts',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id', 'artifact_type']
    },
    {
      fields: ['guild_id', 'artifact_type']
    },
    {
      fields: ['expires_at']
    }
  ]
});

export default ActiveArtifact;
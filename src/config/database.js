export const dbConfig = {
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
}; 
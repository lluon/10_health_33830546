const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.HEALTH_HOST,
  user: process.env.HEALTH_USER,
  password: process.env.HEALTH_PASSWORD,
  database: process.env.HEALTH_DATABASE
});

// Model functions
module.exports = {
  getPatientById: async (id) => {
    const [rows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [id]);
    return rows[0];
  },
  getExercises: async () => {
    const [rows] = await pool.execute('SELECT * FROM exercises');
    return rows;
  },
};
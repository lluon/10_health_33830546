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
  // Get a patient by ID
  getPatientById: async (id) => {
    const [rows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [id]);
    return rows[0];
  },

  // Get all exercises (used in therapist assignment page)
  getExercises: async () => {
    const [rows] = await pool.execute('SELECT * FROM exercises ORDER BY name');
    return rows;
  },

  // Update Patient/User Data (For Admin Edit POST)
  updatePatient: async (id, name, surname, email, illness) => {
    const sql = `
      UPDATE patients
      SET name = ?, surname = ?, email = ?, illness = ?
      WHERE id = ?
    `;
    const [result] = await pool.execute(sql, [name, surname, email, illness || null, id]);
    return result;
  },

  // Delete/Deactivate Patient/User (For Admin Delete POST)
  deletePatientById: async (id) => {
    const [result] = await pool.execute('UPDATE patients SET role = "deactivated" WHERE id = ?', [id]);
    return result;
  }
};
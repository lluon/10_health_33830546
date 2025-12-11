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
  
  // Update Patient/User Data (For Admin Edit POST)
  updatePatient: async (id, name, surname, email, illness) => {
    const sql = `
      UPDATE patients 
      SET name = ?, surname = ?, email = ?, illness = ?
      WHERE id = ?
    `;
    const [result] = await pool.execute(sql, [name, surname, email, illness, id]);
    return result;
  },

  // Delete Patient/User (For Admin Delete POST) ---
  deletePatientById: async (id) => {

    const [result] = await pool.execute('DELETE FROM patients WHERE id = ?', [id]);
    return result;
  },

  // --- Placeholder for Therapist Assignment ---
  updatePatientAssignment: async (id, assignedExercisesJson) => {
      const sql = 'UPDATE patients SET assigned_exercises = ?, attended = 1 WHERE id = ?';
      const [result] = await pool.execute(sql, [assignedExercisesJson, id]);
      return result;
  }
};
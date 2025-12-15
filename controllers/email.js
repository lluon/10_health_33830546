const patientModel = require("../models/patient");

const DASHBOARD_BASE = process.env.HEALTH_BASE_PATH || process.env.BASE_PATH || '';

module.exports = {
    sendConfirmation: async (patientId) => {
        try {
            const patient = await patientModel.getPatientById(patientId);
            const patientName = patient?.name || 'Client';

            const dashboardUrl = DASHBOARD_BASE 
                ? `${DASHBOARD_BASE}/patient/dashboard`.replace('//', '/')
                : '/patient/dashboard';

            const content = `
Dear ${patientName},

Your physiotherapy treatment has been successfully assigned!

Please log in to your dashboard to view your new exercises.

Go to Dashboard: ${dashboardUrl}

Best regards,
NHS PhysioHUB Team
            `.trim();

            console.log(`
--- SIMULATED EMAIL ---
To: Patient ID ${patientId} (${patientName})
Subject: New Treatment Plan Assigned

${content}

-----------------------
            `);

        } catch (error) {
            console.error('Error sending confirmation email simulation:', error);
        }
    }
};
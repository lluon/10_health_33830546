const patientModel = require("../models/patient"); 
module.exports = {
    sendConfirmation: async (patientId) => { 
        // 1. Fetch patient details trough getPatientById function
        const patient = await patientModel.getPatientById(patientId);
        
        // 2. Determine the name to use (use patient.name if available, otherwise use 'Client')
        const patientName = patient ? patient.name : 'Client';

            // 3. Construct a personalized simulated email message
        const content = `
            Dear ${patientName}, 
            Your physiotherapy treatment has been successfully assigned! 
            Please log in to your dashboard to view your new exercises.
            <a href="${process.env.HEALTH_BASE_PATH}/patient/dashboard"><button>Go to Dashboard</button></a>
        `;

        // Log the simulated email to the console
        console.log(`
            --- SIMULATED EMAIL ---
            To: Patient ID ${patientId} (${patientName})
            Subject: New Treatment Plan Assigned
            Body: ${content.trim()}
            -----------------------
        `);
    }
};
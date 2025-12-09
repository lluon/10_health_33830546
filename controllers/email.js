const patient = require("../models/patient");

module.exports ={
    sendConfirmation: (patientId) =>{
        const content = `Confirmed: <a href="${process.env.HEALTH_BASE_PATH}/patient/dashboard"><button>Dashboard</button></a>`;
        console.log(`Simulated ema${patientId}:${content}`);
    }
};
const bcrypt = require('bcrypt');
require('dotenv').config(); // Load the BCRYPT_PEPPER from .env

const plainPasswords = [
    { user: 'gold', plain: 'adminpass' }, // REPLACE 'adminpass' with the password you want
    { user: 'dave_rowland', plain: 'therapass' }, 
    { user: 'sandroverrone', plain: 'patientpass' } 
];

// Load pepper from environment variable
const pepper = process.env.BCRYPT_PEPPER; 

if (!pepper) {
    console.error("BCRYPT_PEPPER not found in .env file. Please check your file.");
    process.exit(1);
}

async function hashPasswords() {
    console.log(`\n--- Generating Hashes using BCRYPT_PEPPER from .env ---\n`);
    for (const item of plainPasswords) {
        // Concatenate plain password with the pepper
        const passwordToHash = item.plain + pepper;
        // Generate the salt and hash
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(passwordToHash, salt);
        
        console.log(`User: ${item.user}`);
        console.log(`Plain Password: ${item.plain}`);
        console.log(`NEW HASH: '${hash}',\n`); 
    }
    console.log("----------------------------------------------------------\n");
}

hashPasswords();
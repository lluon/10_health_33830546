// generate_hash.js
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

// Load environment variables from .env file
dotenv.config();

const saltRounds = 12; // Must match the cost factor used in your index.js
const pepper = process.env.BCRYPT_PEPPER; 

if (!pepper) {
    console.error("Fatal Error: BCRYPT_PEPPER is not set in your .env file.");
    process.exit(1);
}

const plaintextPassword = process.argv[2]; 

if (!plaintextPassword) {
    console.log("Usage: node generate_hash.js <password_to_hash>");
    process.exit(1);
}

// 🚨 Apply the pepper before hashing
const pepperedPassword = plaintextPassword + pepper;

bcrypt.hash(pepperedPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error generating hash:', err);
        return;
    }
    console.log(`Plaintext: ${plaintextPassword}`);
    console.log(`Peppered Hash: ${hash}`);
});
// generate_hash.js
const bcrypt = require('bcrypt');
const saltRounds = 12; // Must match the cost factor used in your index.js

const plaintextPassword = process.argv[2]; 

if (!plaintextPassword) {
    console.log("Usage: node generate_hash.js <password_to_hash>");
    process.exit(1);
}

bcrypt.hash(plaintextPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error generating hash:', err);
        return;
    }
    console.log(`Plaintext: ${plaintextPassword}`);
    console.log(`Bcrypt Hash: ${hash}`);
});
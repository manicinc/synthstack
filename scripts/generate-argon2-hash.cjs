// generate-argon2-hash.js
// Usage: node generate-argon2-hash.js "DemoUser2024!"
const argon2 = require('argon2');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node generate-argon2-hash.js <password>');
  process.exit(1);
}

(async () => {
  try {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    console.log(hash);
  } catch (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
})();

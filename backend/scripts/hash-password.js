// Prints a bcrypt hash for resetting a password directly in the database:
//   npm run hash-password -- <new-password>
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- <new-password>');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 10));

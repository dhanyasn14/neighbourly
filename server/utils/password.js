const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

function isPasswordHash(value = '') {
  return BCRYPT_HASH_PATTERN.test(value);
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(candidatePassword, storedPassword) {
  if (!candidatePassword || !storedPassword) {
    return { isValid: false, needsRehash: false };
  }

  if (isPasswordHash(storedPassword)) {
    const isValid = await bcrypt.compare(candidatePassword, storedPassword);
    return { isValid, needsRehash: false };
  }

  return {
    isValid: candidatePassword === storedPassword,
    needsRehash: candidatePassword === storedPassword,
  };
}

async function hashPasswordIfNeeded(password) {
  if (!password || isPasswordHash(password)) {
    return password;
  }

  return hashPassword(password);
}

module.exports = {
  hashPassword,
  hashPasswordIfNeeded,
  isPasswordHash,
  verifyPassword,
};

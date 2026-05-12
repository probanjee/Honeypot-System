/**
 * hash.js – Password hashing utilities using bcrypt
 */
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const hashPassword = async (plaintext) => {
    return bcrypt.hash(plaintext, SALT_ROUNDS);
};

const comparePassword = async (plaintext, hash) => {
    return bcrypt.compare(plaintext, hash);
};

module.exports = { hashPassword, comparePassword };

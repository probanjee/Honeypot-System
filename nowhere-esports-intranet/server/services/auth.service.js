const User = require('../models/User.model');
const { hashPassword, comparePassword } = require('../utils/hash');
const { sign } = require('../utils/jwt');

const login = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) return null;
    
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) return null;
    
    return user;
};

const generateToken = (user) => {
    return sign({ id: user._id, role: user.role, email: user.email });
};

module.exports = { login, generateToken };

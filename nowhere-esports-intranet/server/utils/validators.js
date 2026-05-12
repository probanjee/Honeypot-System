const Joi = require('joi');

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const userUpdateSchema = Joi.object({
    name: Joi.string(),
    team: Joi.string()
});

const matchSchema = Joi.object({
    gameTitle: Joi.string().required(),
    team1: Joi.string().required(),
    team2: Joi.string().required(),
    startTime: Joi.date().required(),
    status: Joi.string().valid('upcoming', 'live', 'completed')
});

module.exports = { loginSchema, userUpdateSchema, matchSchema };

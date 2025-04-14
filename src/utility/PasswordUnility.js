// src/utility/PasswordUtility.js
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
try {
  if (!fs.existsSync('.env')) {
    throw new Error('.env file not found in project root');
  }
  dotenv.config();
} catch (error) {
  console.error(`Failed to load .env: ${error.message}`);
  process.exit(1);
}

const APP_SECRET = process.env.APP_SECRET;
if (!APP_SECRET) {
  console.error('APP_SECRET is not defined in .env file');
  throw new Error('APP_SECRET is not set in the environment variables.');
}

export const generatePassword = async (password) => {
  console.log('Generating password hash');
  return await bcryptjs.hash(password, 10);
};

export const validatePassword = async (enteredPassword, savedPassword) => {
  console.log('Validating password');
  return await bcryptjs.compare(enteredPassword, savedPassword);
};

export const generateSignature = async (payload) => {
  console.log('Generating JWT signature');
  return jwt.sign(payload, APP_SECRET, { expiresIn: '90d' });
};

export const validateSignature = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    console.error('No token found in cookies');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    console.log('Verifying JWT token');
    const payload = jwt.verify(token, APP_SECRET);
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid JWT payload');
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    console.log('JWT payload:', payload);
    req.user = payload;
    console.log('JWT verified successfully');
    next(); // Pass control to the next middleware/controller
  } catch (error) {
    console.error('JWT validation failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized: Token expired' });
    }
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
// src/index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import configureApp from './services/ExpressApp.js';
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

// Debug: Log environment variables
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Loaded' : 'Undefined');
console.log('APP_SECRET:', process.env.APP_SECRET ? 'Loaded' : 'Undefined');
console.log('PORT:', process.env.PORT || 'Defaulting to 8000');

const app = express();

const startServer = async () => {
  try {
    // Validate MONGO_URI
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');

    console.log('Configuring Express app...');
    await configureApp(app);

    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
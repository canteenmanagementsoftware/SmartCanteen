
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    console.log(`\nMongoDB Connected Successfully:
    Host: ${conn.connection.host}
    Port: ${conn.connection.port}
    Database: ${conn.connection.name}`);
    
    // Enable debugging in development
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    
    // Handle connection errors after initial connection
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected, attempting to reconnect...');
    });
    
    return conn;  } catch (err) {
    console.error("\n MongoDB Connection Error:");
    if (err.name === 'MongoServerSelectionError') {
      console.error("Failed to connect to MongoDB server. Please check if:");
      console.error("1. MongoDB is running on the specified host and port");
      console.error("2. The connection URI is correct");
      console.error("3. Network allows the connection");
      console.error("\nDetailed error:", err.message);
    } else {
      console.error(`${err.name}: ${err.message}`);
    }
    process.exit(1);
  }
};

module.exports = connectDB;

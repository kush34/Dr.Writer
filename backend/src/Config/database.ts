import mongoose from "mongoose";
import { error } from "node:console";

const connectDB = async () => {
    try {
      const MongoDb_URI = process.env.MongoDb_URI;
      if(!MongoDb_URI){
        throw new error("No MongoDB_URI found in env.");
      }
      const conn = await mongoose.connect(MongoDb_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1); // Exit process with failure
    }
};

export default connectDB;
import express from "express";
import 'dotenv/config'
import connectDB from './Config/database.js'
import cors from "cors";
import { Server } from "socket.io";
import http from 'http';
import userRoutes from './Routes/userRoutes.js';
import documentRoutes from './Routes/documentRoutes.js';
import rateLimit from 'express-rate-limit'
//Connection to the database
connectDB();
const app = express();


const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
  message: 'Too many requests, please try again later.',
});

const server  = http.createServer(app);
const  io = new Server(server,{
    cors: {
      origin: process.env.Frontend_URL,
      methods: ["GET", "POST"]
    }
});


var corsOptions = {
  origin: process.env.Frontend_URL,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.urlencoded({extended:true}));
app.use(globalLimiter);
app.use(express.json());
app.use('/api',userRoutes);
app.use('/api/document',documentRoutes);
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

//Socket events 
io.on("connection",(socket)=>{
  console.log('user connected');

  socket.on('enter',async (email,code)=>{
    console.log(`User entered room`,email,code);
		socket.join(code);
		socket.to(code).emit('enter',email,code);
	});
  
  socket.on('reconnect_attempt', () => {
    console.log('Reconnecting...');
  });

  
  socket.on('text-changes',async(delta,code)=>{
    socket.to(code).emit('text-changes',delta);
  });

  socket.on('test',async(code)=>{
    socket.to(code).emit('test');
  });

  socket.on("disconnect", () => {
		console.log(`user disconnected`)
	});
})

app.listen(process.env.PORT || 5000,()=>{
    console.log(`server running on port ${process.env.PORT}`)
})  

server.listen(process.env.Socket,()=>{
	console.log(`listening on :${process.env.Socket}`);
})
import express from "express";
import 'dotenv/config'
import connectDB from './Config/database'
import cors from "cors";
import { Server } from "socket.io";
import http from 'http';
import userRouter from './Routes/userRouter';
import documentRouter from './Routes/documentRouter';
import mcpRouter from './Routes/mcpRouter';
import { failedRequestLimiter, parseTrustProxy } from './Middlewares/rateLimits';
import User from "./Models/userModel";
import { recoverStuckUploads } from './service/documentUploadQueue';
import { registerSocket } from "./socket";
//Connection to the database
connectDB().then(() => recoverStuckUploads()).then(
  ({ requeued, failed }) => { if (requeued || failed) console.log(`Recovered DOCX imports: ${requeued} requeued, ${failed} failed`); },
  (error) => console.error('Could not recover stuck DOCX imports:', error)
);
const app = express();


// Behind a reverse proxy, set TRUST_PROXY (for example 1) so req.ip is the real client address.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

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
app.use(failedRequestLimiter);
app.use("/api/document/:documentId/presentation", express.json({ limit: "9mb" }));
app.use(express.json());
app.use('/api',userRouter);
app.use('/api/document',documentRouter);
app.use('/api/mcp',mcpRouter);
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

registerSocket(io);

app.listen(process.env.PORT || 5000,()=>{
    console.log(`server running on port ${process.env.PORT}`)
})  

server.listen(process.env.Socket,()=>{
	console.log(`listening on :${process.env.Socket}`);
})

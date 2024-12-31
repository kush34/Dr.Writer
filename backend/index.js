import express from "express";
import 'dotenv/config'
import connectDB from './Config/database.js'
import cors from "cors";
import { Server } from "socket.io";
import http from 'http';
import admin from "./Config/firebaseConfig.js"
import User from './Models/userModel.js';
import Document from "./Models/documentModel.js";
import firebaseTokenVerify from './Middlewares/firebaseTokenVerify.js'
import useGemini from "./service/gemini.js";
import upload from "./service/multer.js";
import fs from 'fs';
import mammoth from 'mammoth';
//Connection to the database
connectDB();
const app = express();


//Socket server for connection
const server  = http.createServer(app);
const  io = new Server(server,{
    cors: {
      origin: process.env.Frontend_URL,
      methods: ["GET", "POST"]
    }
});


//for CORS and form data 
var corsOptions = {
  origin: process.env.Frontend_URL,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.use(express.urlencoded({extended:true}));
app.use(express.json());


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

//Express routes
//home test route
app.get("/", (req, res) => {
  res.send('hello from backend ....')
});

//firebase token verify and account creation on DB if not already
app.post("/api/firebaseTokenVerify", async (req,res)=>{
  const idToken = req.body.token;
  // console.log(idToken)
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // console.log(decodedToken)
    const user = await User.findOne({email:decodedToken.email});
    // console.log(user);
    if(!user){
      console.log(`user not found...`)
      const newUser = await User.create({
        name: decodedToken.name,
        email: decodedToken.email,
      });
      console.log(`new user created =>`);
      // console.log(newUser);
    }
    res.status(200).send(decodedToken);
  } catch (error) {
    console.log(error)
    res.status(401).send({ error: 'Invalid token' });
  }
})

//creates new document on user request
app.post('/api/createDocument',firebaseTokenVerify,async (req,res)=>{
  try{
    console.log(`new doc request...`)
    const user_id = req.user_id;
    if(user_id){
      const newDocument = await Document.create({
        title:req.body.title,
        user_id,
      });
      console.log(newDocument);
      res.status(200).send("new document created");
    }else{
      res.status(401).send("something went wrong...");
    }
  }catch(err){
    console.log(err)
  }
})

//gets all the document list for home page display
app.get('/api/documentList',firebaseTokenVerify,async (req,res)=>{
  try{
    // console.log(`document list request...`)
    const user_id = req.user_id;
    if(user_id){
      const documentList = await Document.find({user_id});
      if(documentList){
        res.status(200).send(documentList);
      }else{
        res.status(404).send("no documents found");
      }
    }
    else{
      res.status(401).send("something went wrong...");
    }
  }catch(err){
    console.log(err)
  }
})

//get the document data for editor page
app.post("/api/documentData", firebaseTokenVerify, async (req, res) => {
  try {
    const user_id = req.user_id; // Extract user ID from token
    const file_id = req.body.file_id; // Extract file ID from request body

    // Check if user_id and file_id are provided
    if (!user_id || !file_id) {
      return res.status(400).send("Missing required parameters: user_id or file_id");
    }

    // Find the document by file_id
    const document = await Document.findOne({ _id: file_id });
    console.log(`user_id:${user_id}, document user_id:${document.user_id}`)
    // If document is not found, return a 404 response
    if (!document) {
      return res.status(404).send("Document not found");
    }

    // Check if the user is authorized to access the document
    if (document.user_id.toString() === user_id.toString()) {
      return res.status(200).send(document); // Send the document if user is authorized
    }
    if(document.users.includes(user_id.toString())){
      return res.status(200).send(document); // Send the document if user is authorized
    }
    // If user is not authorized, send a 403 response
    return res.status(403).send("You are not authorized to access this document");
  } catch (error) {
    console.error("Error fetching document data:", error);
    return res.status(500).send("Internal Server Error");
  }
});

//save the changes made into content title of the document
app.post('/api/documentUpdate',firebaseTokenVerify,async(req,res)=>{
  try {
    const user_id = req.user_id;
    const file_id = req.body.file_id;
    const newContent = req.body.newContent;
    const newTitle= req.body.title;
    // console.log(newContent);
    if(user_id && file_id){
      const updatedDocument = await Document.findOneAndUpdate(
        {_id:file_id},
        {content:newContent,title:newTitle},
        {new:true}
      );
      // console.log(updatedDocument);
      if(updatedDocument){
        res.status(200).send(updatedDocument);
      }else{
        res.status(404).send("no documents found");
      }
    }
  } catch (error) {
    console.log(error);
  }
})

//add users to read a document other than owner
app.post("/api/adduser", firebaseTokenVerify, async (req, res) => {
  try {
    const user_id = req.user_id;
    const file_id = req.body.file_id;
    const userToAddMail = req.body.userToAddMail;
    // console.log(`user_id:${user_id}, file_id: ${file_id},userToAddMail:${userToAddMail}`);
    
    if(user_id && file_id && userToAddMail){
      const userToAdd = await User.findOne({email:userToAddMail});
      // console.log(userToAdd._id);
      if(!userToAdd){
        res.status(404).send('user cannot be added...');
      }
      
      const document = await Document.findOneAndUpdate(
        {_id:file_id},
        {$push:{users:userToAdd._id}}        
      )
      
      res.status(200).send('users added to view document...');
    }
    
    else{
      res.status(404).send('something went wrong...');
    }

  } catch (error) {
    console.log(error);
  }

});

//Gemini prompt route
app.post("/api/userprompt",firebaseTokenVerify,async (req, res) => {
  const user_id = req.user_id;
  const userPrompt = req.body.userPrompt;
  if(!userPrompt || !user_id){
    res.status(404).send('not prompt found pls try again...')
  }
  const response = await useGemini(userPrompt);
  if(response){
    res.status(200).send(response);
  }
});

//sync the offline file changes made by user 
app.post("/api/syncDocument",firebaseTokenVerify,async (req, res) => {
  try {
    const user_id = req.user_id;
    const {file_id,title,newContent} = req.body;
    const document = await Document.findOne({_id:file_id});
    if(!document){
      res.status(404).send('document not found...');
    }
    if(!file_id || !title || !newContent){
      res.status(422).send('insufficient data...');
    }
    // Check if the user is authorized to access the document
    if (document.user_id.toString() === user_id.toString() || document.users.includes(user_id.toString())) {
      if(title != document.title || newContent != document.content){
         const updateddocument = await Document.findOneAndUpdate(
          {_id:file_id},
          {title:title,content:newContent},
          {new:true}
        );
        return res.status(200).send('document synced'); // Send the document if user is authorized
       }
      return res.status(200).send('document synced'); // Send the document if user is authorized
    }
    // If user is not authorized, send a 403 response
    return res.status(403).send("You are not authorized to access this document");
  } catch (error) {
    console.log(error);
  }
});

//handles file upload 
app.post("/api/fileUpload", firebaseTokenVerify,upload.single("file"), async (req, res) => {
  try {
    const user_id = req.user_id;
    if(user_id){
      const filePath = req.file.path; // Path of the uploaded file
      const fileContent = fs.readFileSync(filePath);

      const { value: text } = await mammoth.extractRawText({ buffer: fileContent });
      // Clean up uploaded file if no longer needed

      const newDocument = new Document({
        user_id,
        title: req.file.originalname,
        content: text,
      });

      await newDocument.save();

      fs.unlinkSync(filePath);

      res.json({ success: true, content: text });
  }
  } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ success: false, error: "Error reading the Word file." });
  }
});

app.listen(process.env.PORT || 5000,()=>{
    console.log(`server running on port ${process.env.PORT}`)
})  

server.listen(process.env.Socket,()=>{
	console.log(`listening on :3000`);
})
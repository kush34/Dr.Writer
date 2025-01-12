import express from 'express';
import firebaseTokenVerify from '../Middlewares/firebaseTokenVerify.js';
import upload from "../service/multer.js";
const router = express.Router();
import User from '../Models/userModel.js';
import Document from '../Models/documentModel.js'
import fs from 'fs';
import mammoth from 'mammoth';
import useGemini from '../service/gemini.js'

//creates new document on user request
router.post('/createDocument',firebaseTokenVerify,async (req,res)=>{
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
router.get('/documentList',firebaseTokenVerify,async (req,res)=>{
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
router.post("/documentData", firebaseTokenVerify, async (req, res) => {
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
router.post('/documentUpdate',firebaseTokenVerify,async(req,res)=>{
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
router.post("/adduser", firebaseTokenVerify, async (req, res) => {
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
router.post("/userprompt",firebaseTokenVerify,async (req, res) => {
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
router.post("/syncDocument",firebaseTokenVerify,async (req, res) => {
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
router.post("/fileUpload", firebaseTokenVerify,upload.single("file"), async (req, res) => {
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

export default router;
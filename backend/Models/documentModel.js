import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    title: { 
        type: String,
        default:'document'
    },
    content:{ 
        type: String,
        default:'get started'
    },
    user_id:{
        type: mongoose.Schema.Types.ObjectId, ref: 'User'
    },
    users: [String],
    createdAt: {
        type: Date,
        default: Date.now // Automatically set the current date/time
    }
});

const Document = mongoose.model('Document', documentSchema);
export default Document;
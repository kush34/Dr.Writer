import mongoose from "mongoose";

const usageSchema = new mongoose.Schema({
    id:{
        type:mongoose.Types.ObjectId,
        required:true,
    },
    user_id:{
        type:mongoose.Types.ObjectId,
        required:true,
        ref:"User"
    },
    model:{
        type:String,
        required:true,
    },
    input_tokens:{
        type:Number
    },
    output_tokens:{
        type:Number
    },
    cost:{
        type:Number
    },
},{timestamps:true})


const usageModel = mongoose.model("Usage",usageSchema);
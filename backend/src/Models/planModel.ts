import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
    id:{
        type:String,
        required:true,
    },
    name:{
        type:String,
        required:true
    },
    monthly_credits:{
        type:Number,
        required:true
    },
});

const plan = mongoose.model('Plan',planSchema);
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    email : {
        type : String,
        require : true
    },
    plan_id:{
        type:mongoose.Types.ObjectId,
        ref:"Plan"
    },
    token_balance:{
        type:Number,
    }
})

const User = mongoose.model('User', userSchema);

export default User;
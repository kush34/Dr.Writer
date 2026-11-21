import mongoose from "mongoose";
import { USER_TOKEN_ALLOWANCE } from "../Config/llm";

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
        default: USER_TOKEN_ALLOWANCE,
    },
    token_allowance_version: { type: Number, default: 3 },
    mcp_config: { type: String, select: false }
})

const User = mongoose.model('User', userSchema);

export default User;

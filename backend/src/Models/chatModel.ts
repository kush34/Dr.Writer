import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    response: {
      type: String,
      required: true,
      trim: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document", // Match your actual model name
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;

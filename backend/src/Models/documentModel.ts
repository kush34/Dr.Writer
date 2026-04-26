import mongoose from "mongoose";

const relatedImageSchema = new mongoose.Schema(
    {
        publicId: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
        originalName: {
            type: String,
            required: true,
        },
        bytes: {
            type: Number,
            required: true,
        },
        format: {
            type: String,
        },
        width: {
            type: Number,
        },
        height: {
            type: Number,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        default: 'document'
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({
            type: "doc",
            content: [{ type: "paragraph" }],
        }),
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User'
    },
    users: [String],
    relatedImages: {
        type: [relatedImageSchema],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now // Automatically set the current date/time
    }
});

const Document = mongoose.model('Document', documentSchema);
export default Document;

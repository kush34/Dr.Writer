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
    kind: { type: String, enum: ["document", "presentation"], default: "document" },
    pptx: String,
    revision: { type: Number, default: 0 },
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
    // Collaborator roles. `users` holds editors (the original flat list); the owner is `user_id`.
    users: [String],
    commenters: [String],
    viewers: [String],
    // Free-form labels set by the owner or editors; used to filter the Home list.
    tags: { type: [String], default: [] },
    relatedImages: {
        type: [relatedImageSchema],
        default: [],
    },
    uploadStatus: {
        type: String,
        enum: ["queued", "processing", "completed", "failed"],
        default: "completed",
    },
    uploadError: {
        type: String,
        default: null,
    },
    // Server-side import bookkeeping so a restart can retry a stuck DOCX import. Never sent to clients.
    uploadFilePath: {
        type: String,
        default: null,
        select: false,
    },
    uploadAttempts: {
        type: Number,
        default: 0,
        select: false,
    },
    sourceFileName: {
        type: String,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now // Automatically set the current date/time
    },
    editedAt: {
        type: Date,
    }
});

const Document = mongoose.model('Document', documentSchema);
export default Document;

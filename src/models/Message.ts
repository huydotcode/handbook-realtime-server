import { Schema, model } from 'mongoose';

const MessageSchema = new Schema(
    {
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        conversation: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        text: {
            type: String,
        },
        media: {
            type: [Schema.Types.ObjectId],
            ref: 'Media',
            default: [],
        },
        isPin: {
            type: Boolean,
            default: false,
        },
        readBy: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
                readAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Message = model('Message', MessageSchema);
export default Message;

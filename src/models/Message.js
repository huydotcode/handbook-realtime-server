import { Schema, model } from 'mongoose';

const MessageSchema = new Schema(
    {
        senderId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        conversation: {
            type: String,
            required: true,
        },
        text: {
            type: String,
        },
        images: {
            type: [Schema.Types.ObjectId],
            default: [],
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Message = model('Message', MessageSchema);
export default Message;

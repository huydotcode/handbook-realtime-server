import { Schema, model } from 'mongoose';

const MessageSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        roomId: {
            type: String,
            required: true,
        },
        text: {
            type: String,
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

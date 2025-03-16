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
        images: {
            type: [Schema.Types.ObjectId],
            ref: 'Image',
            default: [],
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isPin: {
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

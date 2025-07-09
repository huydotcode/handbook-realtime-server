import { Schema, Types, model, models } from 'mongoose';

interface IMessageModel {
    text: string;
    media: Types.ObjectId[];
    sender: Types.ObjectId;
    conversation: Types.ObjectId;
    isPin: boolean;
    isRead: boolean;
    readBy?: {
        user: Types.ObjectId;
        readAt: Date;
    }[];
}

const MessageSchema = new Schema<IMessageModel>(
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

MessageSchema.index({ text: 'text' });
MessageSchema.index({ conversation: 1 }); // Index for messages by conversation
MessageSchema.index({ sender: 1 }); // Index for messages by sender
MessageSchema.index({ createdAt: -1 }); // Index for messages by createdAt

const Message =
    models.Message || model<IMessageModel>('Message', MessageSchema);
export default Message;

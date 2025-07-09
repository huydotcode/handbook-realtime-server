import { Schema, Types, model, models } from 'mongoose';

interface IConversationModel {
    title: string;
    creator: Types.ObjectId;
    participants: Types.ObjectId[];
    group: Types.ObjectId;
    lastMessage: Types.ObjectId;
    avatar: Types.ObjectId;
    type: string;
    status: string;
    pinnedMessages: Types.ObjectId[];
    isDeletedBy: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const ConversationModel = new Schema<IConversationModel>(
    {
        title: { type: String, default: '' },
        creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        participants: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            required: true,
        },
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
            required: false,
            default: null,
        },
        avatar: {
            type: Schema.Types.ObjectId,
            ref: 'Media',
            required: false,
        },
        type: { type: String, default: 'private', enum: ['private', 'group'] },
        group: {
            type: Schema.Types.ObjectId,
            ref: 'Group',
            required: false,
            default: null,
        },
        pinnedMessages: {
            type: [Schema.Types.ObjectId],
            ref: 'Message',
            required: false,
            default: [],
        },
        isDeletedBy: {
            type: [Schema.Types.ObjectId],
            ref: 'User',
            required: false,
            default: [],
        },
        status: { type: String, default: 'active' },
    },
    { timestamps: true }
);

ConversationModel.index({ title: 'text' });

const Conversation =
    models.Conversation ||
    model<IConversationModel>('Conversation', ConversationModel);

export default Conversation;

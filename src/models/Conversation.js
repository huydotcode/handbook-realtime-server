import { Schema, model } from 'mongoose';

const ConversationModel = new Schema(
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
        status: { type: String, default: 'active' },
    },
    { timestamps: true }
);

ConversationModel.index({ participants: 1 });

const Conversation = model('Conversation', ConversationModel);

export default Conversation;

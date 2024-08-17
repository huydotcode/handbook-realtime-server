import { Schema, model } from 'mongoose';

const ConversationModel = new Schema(
    {
        title: { type: String, required: true },
        creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        participants: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
        group: {
            type: Schema.Types.ObjectId,
            ref: 'Group',
            required: false,
            default: null,
        },
        status: { type: String, default: 'active' },
    },
    { timestamps: true }
);

const Conversation =
    model('Conversation', ConversationModel);

export default Conversation;

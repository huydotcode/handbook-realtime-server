import { Schema, model } from 'mongoose';

const ParticipantModel = new Schema(
    {
        conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, default: 'participant' },
        status: { type: String, default: 'active' },
    },
    { timestamps: true }
);

const Participant =
    model('Participant', ParticipantModel);

export default Participant;

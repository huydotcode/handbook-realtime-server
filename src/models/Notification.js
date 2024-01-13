import mongoose, { Schema, model } from 'mongoose';

const NotificationSchema = new Schema(
    {
        type: { type: String, required: true, default: 'friend' },
        send: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        receive: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        message: {
            type: String,
            default: 'You have a new friend request',
        },
        isRead: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

const Notification = model('Notification', NotificationSchema);

export default Notification;

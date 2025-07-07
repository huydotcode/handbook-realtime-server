import mongoose, { Schema, model } from 'mongoose';

const NotificationSchema = new Schema(
    {
        type: { type: String, required: true },
        sender: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        receiver: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Notification = model('Notification', NotificationSchema);

export default Notification;

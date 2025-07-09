import { Schema, Types, model, models } from 'mongoose';
import { NotificationType } from '../enums/NotificationType';

interface INotificationModel {
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    extra?: {
        postId?: Types.ObjectId;
        commentId?: Types.ObjectId;
        groupId?: Types.ObjectId;
        messageId?: Types.ObjectId;
        notificationId?: Types.ObjectId;

        [key: string]: any;
    };
    isRead: boolean;
    isDeleted: boolean;
    type: NotificationType;
    deletedAt?: Date | null;
}

const NotificationSchema = new Schema<INotificationModel>(
    {
        type: {
            type: String,
            enum: Object.values(NotificationType),
            required: true,
        },
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        extra: {
            postId: {
                type: Schema.Types.ObjectId,
                ref: 'Post',
                required: false,
            },
            commentId: {
                type: Schema.Types.ObjectId,
                ref: 'Comment',
                required: false,
            },
            groupId: {
                type: Schema.Types.ObjectId,
                ref: 'Group',
                required: false,
            },
            messageId: {
                type: Schema.Types.ObjectId,
                ref: 'Message',
                required: false,
            },
            notificationId: {
                type: Schema.Types.ObjectId,
                ref: 'Notification',
                required: false,
            },
        },
        isRead: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

NotificationSchema.index({ sender: 1 }); // Index for notifications by sender
NotificationSchema.index({ receiver: 1 }); // Index for notifications by receiver
NotificationSchema.index({ receiver: 1, isRead: 1 });
NotificationSchema.index({ receiver: 1, createdAt: -1 });

const Notification =
    models.Notification ||
    model<INotificationModel>('Notification', NotificationSchema);

export default Notification;

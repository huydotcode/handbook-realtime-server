import { Schema, model } from 'mongoose';

const UserSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        username: {
            type: String,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        password: String,
        given_name: String,
        family_name: String,
        locale: String,
        dateOfBirth: Date,
        friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        notifications: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
        request: [
            {
                to: {
                    type: Schema.Types.ObjectId,
                    required: true,
                },
                type: {
                    type: String,
                    required: true,
                    default: 'friend',
                },
            },
        ],
        lastAccessed: {
            type: Date,
            default: new Date(),
        },
    },
    {
        timestamps: true,
    }
);

const User = model('User', UserSchema);

export default User;

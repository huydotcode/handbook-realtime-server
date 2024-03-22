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
        avatar: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            default: 'user',
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        isBlocked: {
            type: Boolean,
            default: false,
        },
        password: String,
        givenName: String,
        familyName: String,
        locale: String,
        friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        lastAccessed: {
            type: Date,
            default: Date.now(),
        },
    },
    {
        timestamps: true,
    }
);

const User = model('User', UserSchema);

export default User;

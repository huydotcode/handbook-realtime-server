import bcrypt from 'bcrypt';
import {
    Schema,
    Types,
    deleteModel,
    model,
    modelNames,
    models,
} from 'mongoose';
import { UserRole } from '../enums/UserRole';

interface IUserModel {
    isModified(arg0: string): unknown;
    name: string;
    username: string;
    email: string;
    avatar: string;
    password: string;
    role: UserRole;
    givenName: string;
    familyName: string;
    locale: string;
    friends: Types.ObjectId[];
    groups: Types.ObjectId[];
    followersCount: number;
    isOnline: boolean;
    isBlocked: boolean;
    isVerified: boolean;
    lastAccessed: Date;
    comparePassword(arg0: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserModel>(
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
            enum: Object.values(UserRole),
            default: UserRole.USER,
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        isBlocked: {
            type: Boolean,
            default: false,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        password: String,
        givenName: String,
        familyName: String,
        locale: String,
        friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        groups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
        followersCount: {
            type: Number,
            default: 0,
        },
        lastAccessed: {
            type: Date,
            default: Date.now(),
        },
    },
    {
        timestamps: true,
    }
);

// Index text with username and name
UserSchema.index({ username: 'text', name: 'text' });

if (modelNames && modelNames().includes('User')) {
    deleteModel('User');
}

UserSchema.methods.comparePassword = async function (password: string) {
    const user = this as IUserModel;
    if (user.password === undefined) {
        return false;
    }
    return bcrypt.compare(password, user.password!);
};

UserSchema.pre('save', async function (next) {
    const user = this as IUserModel;
    if (user.isModified('password')) {
        user.password = user.password;
    }
    next();
});

const User = models.User || model<IUserModel>('User', UserSchema);

export default User;

import { socketEvent } from 'src/constants/socketEvents';
import User from '../models/User';
import { UserSockets } from '../types/socket';

class UserService {
    private userSockets: UserSockets = new Map();

    addUserSocket(userId: string, socketId: string): void {
        if (!userId || !socketId) return;

        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socketId);
    }

    removeUserSocket(userId: string, socketId: string): void {
        if (!userId || !socketId) return;

        const socketSet = this.userSockets.get(userId);
        if (socketSet) {
            socketSet.delete(socketId);
            if (socketSet.size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    getUserSockets(userId: string): Set<string> | undefined {
        return this.userSockets.get(userId);
    }

    async updateUserOnlineStatus(
        userId: string,
        isOnline: boolean
    ): Promise<void> {
        try {
            if (!userId) return;

            const user = await User.findById(userId).select('-password');
            if (user) {
                user.isOnline = isOnline;
                if (!isOnline) {
                    user.lastAccessed = new Date();
                }
                await user.save();
            }
        } catch (error) {
            console.error('Error updating user online status:', error);
        }
    }

    async getUser(userId: string): Promise<any> {
        try {
            if (!userId) return null;

            const user = await User.findById(userId);

            return user;
        } catch (err) {
            console.log('Error get user ', err);
        }
    }

    async getFriendsOnline(userId: string): Promise<string[]> {
        try {
            if (!userId) return [];

            const user = await User.findById(userId)
                .select('friends')
                .populate('friends');
            const friends = user?.friends || [];

            // Lọc ra những bạn bè đang trực tuyến
            const onlineFriends = friends.filter((friend: any) => {
                return friend.isOnline;
            });

            console.log('Get friends online data: ', {
                onlineFriends,
            });

            return onlineFriends;
        } catch (error) {
            console.error('Error getting friends:', error);
            return [];
        }
    }

    async notifyFriendsOnline(userId: string, io: any): Promise<void> {
        try {
            if (!userId) return;

            const user = await this.getUser(userId);

            const friends = (await this.getFriendsOnline(userId)) as any[];

            for (const friend of friends) {
                const friendId = friend._id as string;
                if (friendId) {
                    const friendIdStr = friendId.toString();
                    const friendSockets = this.getUserSockets(friendIdStr);
                    if (friendSockets) {
                        friendSockets.forEach((socketId) => {
                            io.to(socketId).emit(
                                socketEvent.FRIEND_ONLINE,
                                user
                            );
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error notifying friends online:', error);
        }
    }

    // Tối ưu: Lấy tất cả sockets của user một cách hiệu quả
    getAllUserSockets(): Map<string, Set<string>> {
        return new Map(this.userSockets);
    }

    // Tối ưu: Kiểm tra user có online không
    isUserOnline(userId: string): boolean {
        const sockets = this.getUserSockets(userId);
        return sockets ? sockets.size > 0 : false;
    }

    // Tối ưu: Lấy số lượng users online
    getOnlineUsersCount(): number {
        return this.userSockets.size;
    }
}

export const userService = new UserService();

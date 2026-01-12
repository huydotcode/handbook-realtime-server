import { socketEvent } from '../common/constants/socket-events';
import { UserSockets } from '../common/types/socket';
import { apiService } from './api.service';

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
            await apiService.updateUserStatus(userId, isOnline);
        } catch (error) {
            console.error('Error updating user online status:', error);
        }
    }

    async notifyFriendsOnline(userId: string, io: any): Promise<void> {
        try {
            if (!userId) return;

            // Fetch user info to get name
            const user = await apiService.getUser(userId);
            const name = user ? user.name : '';

            // Fetch online friends from API
            const friends = await apiService.getOnlineFriends(userId);

            for (const friend of friends) {
                const friendId = friend._id;
                if (friendId) {
                    const friendSocketIds = this.getUserSockets(friendId);
                    if (friendSocketIds) {
                        friendSocketIds.forEach((socketId) => {
                            io.to(socketId).emit(socketEvent.FRIEND_ONLINE, {
                                _id: userId,
                                isOnline: true,
                                name,
                            });
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error notifying friends online:', error);
        }
    }

    getAllUserSockets(): Map<string, Set<string>> {
        return new Map(this.userSockets);
    }

    isUserOnline(userId: string): boolean {
        const sockets = this.getUserSockets(userId);
        return sockets ? sockets.size > 0 : false;
    }

    getOnlineUsersCount(): number {
        return this.userSockets.size;
    }
}

export const userService = new UserService();

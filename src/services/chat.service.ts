import { ChatRoom } from '../types/socket';
import Conversation from '../models/Conversation';

class ChatService {
    private chatRooms: ChatRoom = {};

    joinRoom(roomId: string, socketId: string): void {
        if (!roomId || !socketId) return;

        if (!this.chatRooms[roomId]) {
            this.chatRooms[roomId] = new Set();
        }

        if (!this.chatRooms[roomId].has(socketId)) {
            this.chatRooms[roomId].add(socketId);
        }
    }

    leaveRoom(roomId: string, socketId: string): void {
        if (!roomId || !socketId) return;

        if (this.chatRooms[roomId]) {
            this.chatRooms[roomId].delete(socketId);

            // Cleanup empty rooms
            if (this.chatRooms[roomId].size === 0) {
                delete this.chatRooms[roomId];
            }
        }
    }

    getRoomParticipants(roomId: string): Set<string> | undefined {
        return this.chatRooms[roomId];
    }

    async getUserConversations(userId: string): Promise<any[]> {
        try {
            if (!userId) return [];

            return await Conversation.find({
                participants: {
                    $elemMatch: { $eq: userId },
                },
            }).lean(); // Sử dụng lean() để tăng performance
        } catch (error) {
            console.error('Error getting user conversations:', error);
            return [];
        }
    }

    isUserInRoom(roomId: string, socketId: string): boolean {
        if (!roomId || !socketId) return false;
        return this.chatRooms[roomId]?.has(socketId) || false;
    }

    // Tối ưu: Lấy số lượng participants trong room
    getRoomParticipantsCount(roomId: string): number {
        return this.chatRooms[roomId]?.size || 0;
    }

    // Tối ưu: Lấy tất cả rooms
    getAllRooms(): ChatRoom {
        return { ...this.chatRooms };
    }

    // Tối ưu: Cleanup empty rooms
    cleanupEmptyRooms(): void {
        for (const [roomId, participants] of Object.entries(this.chatRooms)) {
            if (participants.size === 0) {
                delete this.chatRooms[roomId];
            }
        }
    }

    // Tối ưu: Kiểm tra room có tồn tại không
    roomExists(roomId: string): boolean {
        return roomId in this.chatRooms;
    }
}

export const chatService = new ChatService();

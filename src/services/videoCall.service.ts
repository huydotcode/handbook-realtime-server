interface VideoCallParticipant {
    userId: string;
    socketId: string;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
}

interface VideoCallSession {
    callId: string;
    conversationId: string;
    initiator: VideoCallParticipant;
    participants: VideoCallParticipant[];
    isVideoCall: boolean; // true = video call, false = audio call
    status: 'initiating' | 'ringing' | 'active' | 'ended';
    startTime?: Date;
    endTime?: Date;
}

class VideoCallService {
    private activeCalls: Map<string, VideoCallSession> = new Map();
    private userToCallMap: Map<string, string> = new Map(); // userId -> callId

    /**
     * Tạo cuộc gọi mới
     */
    createCall(
        conversationId: string,
        initiatorUserId: string,
        initiatorSocketId: string,
        isVideoCall: boolean = true
    ): VideoCallSession {
        const callId = this.generateCallId();

        const initiator: VideoCallParticipant = {
            userId: initiatorUserId,
            socketId: initiatorSocketId,
            isVideoEnabled: isVideoCall,
            isAudioEnabled: true,
        };

        const session: VideoCallSession = {
            callId,
            conversationId,
            initiator,
            participants: [initiator],
            isVideoCall,
            status: 'initiating',
        };

        this.activeCalls.set(callId, session);
        this.userToCallMap.set(initiatorUserId, callId);

        console.log(
            `Created ${isVideoCall ? 'video' : 'audio'} call ${callId} for conversation ${conversationId}`
        );
        return session;
    }

    /**
     * Thêm participant vào cuộc gọi
     */
    addParticipant(
        callId: string,
        userId: string,
        socketId: string
    ): VideoCallSession | null {
        const session = this.activeCalls.get(callId);
        if (!session) {
            console.log(`Call ${callId} not found`);
            return null;
        }

        // Check if user already in call
        const existingParticipant = session.participants.find(
            (p) => p.userId === userId
        );
        if (existingParticipant) {
            console.log(`User ${userId} already in call ${callId}`);
            return session;
        }

        const participant: VideoCallParticipant = {
            userId,
            socketId,
            isVideoEnabled: session.isVideoCall,
            isAudioEnabled: true,
        };

        session.participants.push(participant);
        this.userToCallMap.set(userId, callId);

        console.log(`User ${userId} joined call ${callId}`);
        return session;
    }

    /**
     * Remove participant từ cuộc gọi
     */
    removeParticipant(callId: string, userId: string): VideoCallSession | null {
        const session = this.activeCalls.get(callId);
        if (!session) {
            return null;
        }

        session.participants = session.participants.filter(
            (p) => p.userId !== userId
        );
        this.userToCallMap.delete(userId);

        // If no participants left or only initiator left, end the call
        if (session.participants.length <= 1) {
            this.endCall(callId);
            return null;
        }

        console.log(`User ${userId} left call ${callId}`);
        return session;
    }

    /**
     * Update participant status (video/audio enabled)
     */
    updateParticipantStatus(
        callId: string,
        userId: string,
        isVideoEnabled?: boolean,
        isAudioEnabled?: boolean
    ): VideoCallSession | null {
        const session = this.activeCalls.get(callId);
        if (!session) {
            return null;
        }

        const participant = session.participants.find(
            (p) => p.userId === userId
        );
        if (!participant) {
            return null;
        }

        if (isVideoEnabled !== undefined) {
            participant.isVideoEnabled = isVideoEnabled;
        }
        if (isAudioEnabled !== undefined) {
            participant.isAudioEnabled = isAudioEnabled;
        }

        return session;
    }

    /**
     * Chấp nhận cuộc gọi
     */
    acceptCall(callId: string): VideoCallSession | null {
        const session = this.activeCalls.get(callId);
        if (!session) {
            return null;
        }

        session.status = 'active';
        session.startTime = new Date();

        console.log(`Call ${callId} accepted and started`);
        return session;
    }

    /**
     * Từ chối cuộc gọi
     */
    rejectCall(callId: string): VideoCallSession | null {
        const session = this.activeCalls.get(callId);
        if (!session) {
            return null;
        }

        session.status = 'ended';
        session.endTime = new Date();

        // Cleanup
        this.cleanup(callId);

        console.log(`Call ${callId} rejected`);
        return session;
    }

    /**
     * Kết thúc cuộc gọi
     */
    endCall(callId: string): VideoCallSession | null {
        const session = this.activeCalls.get(callId);
        if (!session) {
            return null;
        }

        session.status = 'ended';
        session.endTime = new Date();

        // Cleanup
        this.cleanup(callId);

        console.log(`Call ${callId} ended`);
        return session;
    }

    /**
     * Lấy thông tin cuộc gọi
     */
    getCall(callId: string): VideoCallSession | null {
        return this.activeCalls.get(callId) || null;
    }

    /**
     * Lấy cuộc gọi của user
     */
    getUserCall(userId: string): VideoCallSession | null {
        const callId = this.userToCallMap.get(userId);
        if (!callId) {
            return null;
        }
        return this.getCall(callId);
    }

    /**
     * Kiểm tra user có đang trong cuộc gọi không
     */
    isUserInCall(userId: string): boolean {
        return this.userToCallMap.has(userId);
    }

    /**
     * Lấy tất cả cuộc gọi đang active
     */
    getActiveCalls(): VideoCallSession[] {
        return Array.from(this.activeCalls.values()).filter(
            (call) => call.status === 'active' || call.status === 'ringing'
        );
    }

    /**
     * Lấy participants của cuộc gọi (trừ user hiện tại)
     */
    getOtherParticipants(
        callId: string,
        currentUserId: string
    ): VideoCallParticipant[] {
        const session = this.getCall(callId);
        if (!session) {
            return [];
        }

        return session.participants.filter((p) => p.userId !== currentUserId);
    }

    /**
     * Update socket ID của participant
     */
    updateParticipantSocket(userId: string, newSocketId: string): void {
        const callId = this.userToCallMap.get(userId);
        if (!callId) {
            return;
        }

        const session = this.activeCalls.get(callId);
        if (!session) {
            return;
        }

        const participant = session.participants.find(
            (p) => p.userId === userId
        );
        if (participant) {
            participant.socketId = newSocketId;
            console.log(
                `Updated socket ID for user ${userId} in call ${callId}`
            );
        }
    }

    /**
     * Cleanup call resources
     */
    private cleanup(callId: string): void {
        const session = this.activeCalls.get(callId);
        if (session) {
            // Remove all participants from user map
            session.participants.forEach((p) => {
                this.userToCallMap.delete(p.userId);
            });
        }

        this.activeCalls.delete(callId);
    }

    /**
     * Generate unique call ID
     */
    private generateCallId(): string {
        return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup expired/dead calls (should be called periodically)
     */
    cleanupExpiredCalls(): void {
        const now = new Date();
        const expiredCalls: string[] = [];

        this.activeCalls.forEach((session, callId) => {
            // If call is ringing for more than 60 seconds, consider it expired
            if (
                session.status === 'ringing' ||
                session.status === 'initiating'
            ) {
                const createTime =
                    session.startTime || new Date(callId.split('_')[1]);
                if (now.getTime() - createTime.getTime() > 60000) {
                    expiredCalls.push(callId);
                }
            }
        });

        expiredCalls.forEach((callId) => {
            console.log(`Cleaning up expired call ${callId}`);
            this.endCall(callId);
        });
    }
}

export const videoCallService = new VideoCallService();
export { VideoCallService };
export type { VideoCallSession, VideoCallParticipant };

import { Socket } from 'socket.io';
import User from '../models/User';
import { userService } from '../services';
import { videoCallService } from '../services/videoCall.service';
import type {
    RTCIceCandidateInit,
    RTCSessionDescriptionInit,
} from '../types/webrtc';
import { log } from '../utils/logger';
import { socketEvent } from '../constants/socketEvents';

export class VideoCallSocketHandler {
    constructor(
        private socket: Socket,
        private io: any,
        private userId: string
    ) {}

    /**
     * Khởi tạo cuộc gọi video/audio
     */
    async handleInitiateCall(data: {
        conversationId: string;
        targetUserId: string;
        isVideoCall: boolean;
    }) {
        try {
            const { conversationId, targetUserId, isVideoCall } = data;

            // Validate data
            if (!conversationId || !targetUserId) {
                console.log('Invalid call initiation data');
                return;
            }

            // Check if initiator is already in a call
            if (videoCallService.isUserInCall(this.userId)) {
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Bạn đang trong cuộc gọi khác',
                });
                return;
            }

            // Check if target user is already in a call
            if (videoCallService.isUserInCall(targetUserId)) {
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Người dùng đang trong cuộc gọi khác',
                });
                return;
            }

            // Create new call session
            const session = videoCallService.createCall(
                conversationId,
                this.userId,
                this.socket.id,
                isVideoCall
            );

            // Get target user sockets
            const targetUserSockets = userService.getUserSockets(targetUserId);
            if (!targetUserSockets || targetUserSockets.size === 0) {
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Người dùng không trực tuyến',
                });
                videoCallService.endCall(session.callId);
                return;
            }

            // Update call status to ringing
            session.status = 'ringing';

            // Get initiator user info
            const initiatorUser = await User.findById(this.userId).select(
                '_id name avatar'
            );
            if (!initiatorUser) {
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Người dùng không tìm thấy',
                });
                videoCallService.endCall(session.callId);
                return;
            }

            // Notify target user about incoming call
            targetUserSockets.forEach((socketId) => {
                this.io.to(socketId).emit(socketEvent.VIDEO_CALL_INITIATE, {
                    callId: session.callId,
                    conversationId,
                    isVideoCall,
                    initiator: {
                        _id: initiatorUser._id.toString(),
                        name: initiatorUser.name,
                        avatar: initiatorUser.avatar,
                    },
                });
            });

            // Confirm call initiation to initiator
            this.socket.emit(socketEvent.VIDEO_CALL_INITIATED, {
                callId: session.callId,
                status: 'ringing',
            });

            log(
                `${isVideoCall ? 'Video' : 'Audio'} call initiated: ${session.callId}`
            );
        } catch (error) {
            console.error('Error handling initiate call:', error);
            this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                error: 'Thực hiện cuộc gọi thất bại',
            });
        }
    }

    /**
     * Chấp nhận cuộc gọi
     */
    async handleAcceptCall(data: { callId: string }) {
        try {
            console.log('=== SERVER: HANDLING ACCEPT CALL ===');
            console.log('Data received:', data);
            console.log('User ID:', this.userId);

            const { callId } = data;

            if (!callId) {
                console.log('Invalid accept call data');
                return;
            }

            const session = videoCallService.getCall(callId);
            console.log('Found session:', session);
            if (!session) {
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Không tìm thấy cuộc gọi',
                });
                return;
            }

            // Add current user as participant
            videoCallService.addParticipant(
                callId,
                this.userId,
                this.socket.id
            );

            // Accept the call
            console.log('Accepting call in service...');
            const acceptedSession = videoCallService.acceptCall(callId);
            console.log('Accepted session:', acceptedSession);
            if (!acceptedSession) {
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Thực hiện cuộc gọi thất bại',
                });
                return;
            }

            // Notify all participants that call is accepted
            console.log('Notifying participants of acceptance...');
            acceptedSession.participants.forEach((participant) => {
                const socketIds = userService.getUserSockets(
                    participant.userId
                );
                if (socketIds) {
                    socketIds.forEach((socketId) => {
                        console.log(
                            `Emitting VIDEO_CALL_ACCEPT to socket ${socketId} for user ${participant.userId}`
                        );
                        this.io
                            .to(socketId)
                            .emit(socketEvent.VIDEO_CALL_ACCEPT, {
                                callId,
                                participants: acceptedSession.participants.map(
                                    (p) => ({
                                        userId: p.userId,
                                        isVideoEnabled: p.isVideoEnabled,
                                        isAudioEnabled: p.isAudioEnabled,
                                    })
                                ),
                            });
                    });
                } else {
                    console.log(
                        `No socket IDs found for participant ${participant.userId}`
                    );
                }
            });

            log(`Call accepted: ${callId}`);
        } catch (error) {
            console.error('Error handling accept call:', error);
            this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                error: 'Thực hiện cuộc gọi thất bại',
            });
        }
    }

    /**
     * Từ chối cuộc gọi
     */
    async handleRejectCall(data: { callId: string }) {
        try {
            const { callId } = data;

            if (!callId) {
                console.log('Invalid reject call data');
                return;
            }

            const session = videoCallService.rejectCall(callId);
            if (!session) {
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Không tìm thấy cuộc gọi',
                });
                return;
            }

            // Notify all participants that call was rejected
            session.participants.forEach((participant) => {
                const socketIds = userService.getUserSockets(
                    participant.userId
                );
                if (socketIds) {
                    socketIds.forEach((socketId) => {
                        this.io
                            .to(socketId)
                            .emit(socketEvent.VIDEO_CALL_REJECT, {
                                callId,
                                rejectedBy: this.userId,
                            });
                    });
                }
            });

            log(`Call rejected: ${callId}`);
        } catch (error) {
            console.error('Error handling reject call:', error);
        }
    }

    /**
     * Kết thúc cuộc gọi
     */
    async handleEndCall(data: { callId: string }) {
        try {
            const { callId } = data;

            if (!callId) {
                console.log('Invalid end call data');
                return;
            }

            const session = videoCallService.getCall(callId);
            if (!session) {
                return; // Call already ended
            }

            // Get participants before ending call
            const participants = [...session.participants];

            // If call is still ringing, we need to notify the target user too
            // (who might not be in participants yet if they haven't accepted)
            let targetUsersToNotify = participants.map((p) => p.userId);

            if (session.status === 'ringing') {
                // Find target user from conversation or session data
                // For now, notify all users who received the initial call
                console.log(
                    'Call ended while ringing - need to notify target user'
                );
            }

            // End the call
            videoCallService.endCall(callId);

            // Notify all participants that call ended
            participants.forEach((participant) => {
                const socketIds = userService.getUserSockets(
                    participant.userId
                );
                if (socketIds) {
                    socketIds.forEach((socketId) => {
                        this.io.to(socketId).emit(socketEvent.VIDEO_CALL_END, {
                            callId,
                            endedBy: this.userId,
                        });
                    });
                }
            });

            // Also broadcast to the conversation room to catch any missed users
            console.log(
                `Broadcasting VIDEO_CALL_END to ${session.conversationId}`
            );
            this.io
                .to(session.conversationId)
                .emit(socketEvent.VIDEO_CALL_END, {
                    callId,
                    endedBy: this.userId,
                });

            log(`Call ended: ${callId}`);
        } catch (error) {
            console.error('Error handling end call:', error);
        }
    }

    /**
     * Xử lý WebRTC offer
     */
    async handleOffer(data: {
        callId: string;
        targetUserId: string;
        offer: RTCSessionDescriptionInit;
    }) {
        try {
            const { callId, targetUserId, offer } = data;

            if (!callId || !targetUserId || !offer) {
                console.log('Invalid offer data');
                return;
            }

            // Verify call exists and user is participant
            const session = videoCallService.getCall(callId);
            console.log('Offer handler - Call session:', session);
            console.log('Offer handler - Current user:', this.userId);

            if (!session) {
                console.log('Call not found:', callId);
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Không tìm thấy cuộc gọi',
                });
                return;
            }

            // Forward offer to target user
            const targetUserSockets = userService.getUserSockets(targetUserId);
            if (targetUserSockets) {
                targetUserSockets.forEach((socketId) => {
                    this.io.to(socketId).emit(socketEvent.VIDEO_CALL_OFFER, {
                        callId,
                        fromUserId: this.userId,
                        offer,
                    });
                });
            }

            log(
                `WebRTC offer sent from ${this.userId} to ${targetUserId} in call ${callId}`
            );
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    /**
     * Xử lý WebRTC answer
     */
    async handleAnswer(data: {
        callId: string;
        targetUserId: string;
        answer: RTCSessionDescriptionInit;
    }) {
        try {
            const { callId, targetUserId, answer } = data;

            if (!callId || !targetUserId || !answer) {
                console.log('Invalid answer data');
                return;
            }

            // Verify call exists and user is participant
            const session = videoCallService.getCall(callId);
            if (
                !session ||
                !session.participants.find((p) => p.userId === this.userId)
            ) {
                this.socket.emit(socketEvent.VIDEO_CALL_ERROR, {
                    error: 'Không tìm thấy cuộc gọi hoặc không được phép',
                });
                return;
            }

            // Forward answer to target user
            const targetUserSockets = userService.getUserSockets(targetUserId);
            if (targetUserSockets) {
                targetUserSockets.forEach((socketId) => {
                    this.io.to(socketId).emit(socketEvent.VIDEO_CALL_ANSWER, {
                        callId,
                        fromUserId: this.userId,
                        answer,
                    });
                });
            }

            log(
                `WebRTC answer sent from ${this.userId} to ${targetUserId} in call ${callId}`
            );
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    /**
     * Xử lý ICE candidates
     */
    async handleIceCandidate(data: {
        callId: string;
        targetUserId: string;
        candidate: RTCIceCandidateInit;
    }) {
        try {
            const { callId, targetUserId, candidate } = data;

            if (!callId || !targetUserId || !candidate) {
                console.log('Invalid ICE candidate data');
                return;
            }

            // Verify call exists and user is participant
            const session = videoCallService.getCall(callId);
            if (
                !session ||
                !session.participants.find((p) => p.userId === this.userId)
            ) {
                return; // Silently ignore invalid candidates
            }

            // Forward ICE candidate to target user
            const targetUserSockets = userService.getUserSockets(targetUserId);
            if (targetUserSockets) {
                targetUserSockets.forEach((socketId) => {
                    this.io
                        .to(socketId)
                        .emit(socketEvent.VIDEO_CALL_ICE_CANDIDATE, {
                            callId,
                            fromUserId: this.userId,
                            candidate,
                        });
                });
            }

            // Don't log ICE candidates to avoid spam
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    /**
     * Handle user disconnect - cleanup any active calls
     */
    async handleDisconnect() {
        try {
            const userCall = videoCallService.getUserCall(this.userId);
            if (userCall) {
                // Remove user from call
                const session = videoCallService.removeParticipant(
                    userCall.callId,
                    this.userId
                );

                if (session) {
                    // Notify remaining participants
                    session.participants.forEach((participant) => {
                        const socketIds = userService.getUserSockets(
                            participant.userId
                        );
                        if (socketIds) {
                            socketIds.forEach((socketId) => {
                                this.io
                                    .to(socketId)
                                    .emit(
                                        socketEvent.VIDEO_CALL_PARTICIPANT_LEFT,
                                        {
                                            callId: userCall.callId,
                                            userId: this.userId,
                                        }
                                    );
                            });
                        }
                    });
                }

                log(
                    `User ${this.userId} disconnected from call ${userCall.callId}`
                );
            }
        } catch (error) {
            console.error('Error handling video call disconnect:', error);
        }
    }
}

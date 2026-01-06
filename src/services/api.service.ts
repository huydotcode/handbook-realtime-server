import axios from 'axios';

// Ensure config has API_URL or equivalent. If not, we might need to add it or default it.
const API_URL = process.env.SERVER_API_URL || 'http://localhost:4000/api/v1'; // Default matching common setup

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET_KEY,
    },
});

apiClient.interceptors.request.use((config) => {
    console.log('API Request:', config.method, config.url);
    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        console.log(
            'API Response:',
            response.config.method,
            response.config.url,
            response.data
        );
        return response;
    },
    (error) => {
        console.log('API Error:', error.config.method, error.config.url, error);
        return Promise.reject(error);
    }
);

export const apiService = {
    async getUserConversations(userId: string) {
        try {
            const response = await apiClient.get(
                `/internal/realtime/users/${userId}/conversations`
            );
            return response.data;
        } catch (error) {
            console.error(
                `Error fetching conversations for user ${userId}:`,
                error
            );
            return [];
        }
    },

    async updateUserStatus(userId: string, isOnline: boolean) {
        try {
            await apiClient.patch(`/internal/realtime/users/${userId}/status`, {
                isOnline,
            });
        } catch (error) {
            console.error(`Error updating status for user ${userId}:`, error);
        }
    },

    async getOnlineFriends(userId: string) {
        try {
            const response = await apiClient.get(
                `/internal/realtime/users/${userId}/friends/online`
            );
            return response.data;
        } catch (error) {
            console.error(
                `Error fetching online friends for user ${userId}:`,
                error
            );
            return [];
        }
    },

    async getUser(userId: string) {
        try {
            const response = await apiClient.get(
                `/internal/realtime/users/${userId}`
            );
            return response.data;
        } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
        }
    },

    async cleanupHeartbeat() {
        try {
            const response = await apiClient.post(
                '/internal/realtime/heartbeat/cleanup'
            );
            return response.data;
        } catch (error) {
            console.error('Error cleaning up heartbeat:', error);
            return null;
        }
    },
};

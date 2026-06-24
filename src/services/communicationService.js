import api from '../api/client';

export const communicationService = {
    // Send message
    sendMessage: async (receiverId, content) => {
        const response = await api.post('/api/communication/send', { receiverId, content });
        return response.data;
    },

    // Get conversation history with a user
    getHistory: async (userId) => {
        const response = await api.get(`/api/communication/history/${userId}`);
        return response.data;
    },

    // Get list of conversations
    getConversations: async () => {
        const response = await api.get('/api/communication/conversations');
        return response.data;
    },

    // Mark as read
    markAsRead: async (senderId) => {
        const response = await api.post('/api/communication/mark-read', { senderId });
        return response.data;
    }
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = {
    login: async (idToken) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
        });
        return response.json();
    },

    getTimelines: async (token) => {
        const response = await fetch(`${API_URL}/timelines`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },

    createTimeline: async (token, name, description = '', coverImage = '', themeId = 'chronos') => {
        console.log('apiClient.createTimeline sending:', { name, description, coverImage, themeId });
        const response = await fetch(`${API_URL}/timelines`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name, description, coverImage, themeId }),
        });
        return response.json();
    },

    deleteTimeline: async (token, id) => {
        const response = await fetch(`${API_URL}/timelines/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },

    getTimeline: async (token, id) => {
        const response = await fetch(`${API_URL}/timelines/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.json();
    },

    saveTimeline: async (token, id, events, metadata = {}) => {
        const response = await fetch(`${API_URL}/timelines/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ events, ...metadata }),
        });
        return response.json();
    },

    updateTimeline: async (token, id, metadata) => {
        console.log('apiClient.updateTimeline sending:', metadata);
        const response = await fetch(`${API_URL}/timelines/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(metadata),
        });
        return response.json();
    }
};

/**
 * API service for conversation management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Conversation {
    conversation_id: string;
    user_id: string;
    session_id: string;
    title?: string;
    messages: ConversationMessage[];
    created_at: string;
    updated_at: string;
    is_archived: boolean;
    total_tokens: number;
    metadata?: Record<string, any>;
}

export interface ConversationMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
    tool_calls?: any[];
    tokens_used?: number;
}

export interface UserSession {
    session_id: string;
    user_id: string;
    conversation_ids: string[];
    started_at: string;
    last_activity: string;
    is_active: boolean;
    device_info?: Record<string, any>;
    total_messages: number;
    total_tokens: number;
}

export interface UserActivityLog {
    log_id: string;
    user_id: string;
    session_id: string;
    activity_type: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
}

export interface UserProfile {
    user_id: string;
    username?: string;
    email?: string;
    created_at: string;
    last_login: string;
    total_conversations: number;
    total_messages: number;
    total_tokens_used: number;
    preferences?: Record<string, any>;
    connected_tools: string[];
    metadata?: Record<string, any>;
}

export interface UserStats {
    user_id: string;
    total_conversations: number;
    total_messages: number;
    total_tokens_used: number;
    total_messages_in_conversations: number;
    active_conversations: number;
    archived_conversations: number;
    account_created: string;
    last_login: string;
}

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (
    userId: string,
    limit: number = 50,
    skip: number = 0,
    includeArchived: boolean = false
): Promise<{ conversations: Conversation[]; total: number }> => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/conversations?user_id=${userId}&limit=${limit}&skip=${skip}&include_archived=${includeArchived}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting conversations:', error);
        throw error;
    }
};

/**
 * Get a specific conversation by ID
 */
export const getConversation = async (conversationId: string): Promise<Conversation> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting conversation:', error);
        throw error;
    }
};

/**
 * Get messages for a specific conversation
 */
export const getConversationMessages = async (
    conversationId: string,
    limit?: number
): Promise<{ conversation_id: string; messages: ConversationMessage[]; total: number }> => {
    try {
        const url = limit
            ? `${API_BASE_URL}/api/conversations/${conversationId}/messages?limit=${limit}`
            : `${API_BASE_URL}/api/conversations/${conversationId}/messages`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting conversation messages:', error);
        throw error;
    }
};

/**
 * Create a new conversation
 */
export const createConversation = async (
    userId: string,
    sessionId: string,
    firstMessage?: string
): Promise<Conversation> => {
    try {
        const url = firstMessage
            ? `${API_BASE_URL}/api/conversations?user_id=${userId}&session_id=${sessionId}&first_message=${encodeURIComponent(firstMessage)}`
            : `${API_BASE_URL}/api/conversations?user_id=${userId}&session_id=${sessionId}`;

        const response = await fetch(url, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating conversation:', error);
        throw error;
    }
};

/**
 * Update a conversation
 */
export const updateConversation = async (
    conversationId: string,
    title: string
): Promise<{ message: string }> => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/conversations/${conversationId}?title=${encodeURIComponent(title)}`,
            {
                method: 'PATCH'
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating conversation:', error);
        throw error;
    }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (conversationId: string): Promise<{ message: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }
};

/**
 * Archive a conversation
 */
export const archiveConversation = async (conversationId: string): Promise<{ message: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/archive`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error archiving conversation:', error);
        throw error;
    }
};

/**
 * Create a new session
 */
export const createSession = async (
    userId: string,
    deviceInfo?: Record<string, any>
): Promise<UserSession> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sessions?user_id=${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: deviceInfo ? JSON.stringify(deviceInfo) : undefined
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
};

/**
 * Get a session by ID
 */
export const getSession = async (sessionId: string): Promise<UserSession> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting session:', error);
        throw error;
    }
};

/**
 * End a session
 */
export const endSession = async (sessionId: string): Promise<{ message: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/end`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error ending session:', error);
        throw error;
    }
};

/**
 * Get user activity logs
 */
export const getUserActivity = async (
    userId: string,
    limit: number = 100,
    activityType?: string
): Promise<{ user_id: string; logs: UserActivityLog[]; total: number }> => {
    try {
        const url = activityType
            ? `${API_BASE_URL}/api/users/${userId}/activity?limit=${limit}&activity_type=${activityType}`
            : `${API_BASE_URL}/api/users/${userId}/activity?limit=${limit}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting user activity:', error);
        throw error;
    }
};

/**
 * Get user profile
 */
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw error;
    }
};

/**
 * Get user statistics
 */
export const getUserStats = async (userId: string): Promise<UserStats> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/stats`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting user stats:', error);
        throw error;
    }
};

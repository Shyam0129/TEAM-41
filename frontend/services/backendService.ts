import { Message } from '../types';

// Backend API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UserRequest {
    user_id: string;
    message: string;
    session_id?: string;
    metadata?: Record<string, any>;
}

export interface AgentResponse {
    response: string;
    session_id: string;
    action_required: boolean;
    suggested_actions?: string[];
    metadata?: Record<string, any>;
}

export interface HealthResponse {
    status: string;
    mongodb: boolean;
    redis: boolean;
    timestamp: string;
}

/**
 * Stream chat response from backend API
 */
export const streamChatResponse = async (
    history: Message[],
    newMessage: string,
    userId: string,
    sessionId: string | null,
    onChunk: (text: string) => void,
    abortSignal?: AbortSignal
): Promise<AgentResponse> => {
    try {
        const requestBody: UserRequest = {
            user_id: userId,
            message: newMessage,
            session_id: sessionId || undefined,
            metadata: {
                history_length: history.length,
            },
        };

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: abortSignal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data: AgentResponse = await response.json();

        // Simulate streaming by chunking the response
        // This provides a better UX even though the backend returns the full response
        const words = data.response.split(' ');
        let currentChunk = '';

        for (let i = 0; i < words.length; i++) {
            if (abortSignal?.aborted) {
                break;
            }

            currentChunk += (i > 0 ? ' ' : '') + words[i];

            // Send chunks of 3-5 words for smoother streaming effect
            if (i % 4 === 3 || i === words.length - 1) {
                onChunk(currentChunk);
                currentChunk = '';

                // Small delay to simulate streaming
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        return data;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw error;
        }
        console.error('Error streaming chat response:', error);
        throw new Error(error.message || 'Failed to get response from backend');
    }
};

/**
 * Check backend health status
 */
export const checkHealth = async (): Promise<HealthResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error checking health:', error);
        throw error;
    }
};

/**
 * Confirm a pending action
 */
export const confirmAction = async (
    sessionId: string,
    confirmed: boolean
): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE_URL}/confirm/${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ confirmed }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error confirming action:', error);
        throw error;
    }
};

/**
 * Test backend connection
 */
export const testConnection = async (): Promise<boolean> => {
    try {
        const health = await checkHealth();
        return health.status === 'healthy';
    } catch (error) {
        return false;
    }
};

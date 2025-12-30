/**
 * Logger utility for development debugging
 * Provides emoji-based logging for easy visual scanning
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * General info logging (only in development)
     */
    log: (message: string, data?: any) => {
        if (isDev) {
            if (data !== undefined) {
                console.log(`[Rexie] ${message}`, data);
            } else {
                console.log(`[Rexie] ${message}`);
            }
        }
    },

    /**
     * Error logging (always shown)
     */
    error: (message: string, error?: any) => {
        if (error !== undefined) {
            console.error(`[Rexie ERROR] ${message}`, error);
        } else {
            console.error(`[Rexie ERROR] ${message}`);
        }
    },

    /**
     * Warning logging (only in development)
     */
    warn: (message: string, data?: any) => {
        if (isDev) {
            if (data !== undefined) {
                console.warn(`[Rexie WARN] ${message}`, data);
            } else {
                console.warn(`[Rexie WARN] ${message}`);
            }
        }
    },

    /**
     * Success logging (only in development)
     */
    success: (message: string, data?: any) => {
        if (isDev) {
            if (data !== undefined) {
                console.log(`[Rexie ✅] ${message}`, data);
            } else {
                console.log(`[Rexie ✅] ${message}`);
            }
        }
    }
};

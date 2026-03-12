/**
 * SessionManager.js
 * Manages in-memory user contexts and OpenAI chat history.
 */

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.maxHistoryLines = 20;
    }

    /**
     * Get or create a session for a given phone number.
     * @param {string} phone 
     * @param {string} systemPrompt 
     * @returns {Array} history
     */
    getOrCreateSession(phone, systemPrompt) {
        if (!this.sessions.has(phone)) {
            this.sessions.set(phone, [{ role: 'system', content: systemPrompt }]);
        }
        const history = this.sessions.get(phone);
        history[0].content = systemPrompt; // Always update with latest system prompt
        return history;
    }

    /**
     * Add a message to the session history.
     * @param {string} phone 
     * @param {string} role 'user' | 'assistant'
     * @param {string} content 
     */
    addMessage(phone, role, content) {
        const history = this.sessions.get(phone);
        if (history) {
            history.push({ role, content });
            // Keep history within limits
            if (history.length > this.maxHistoryLines) {
                history.splice(1, 2); // Remove oldest user/assistant pair
            }
        }
    }

    /**
     * Reset the session for a specific phone.
     * @param {string} phone 
     */
    resetSession(phone) {
        this.sessions.delete(phone);
    }

    /**
     * Export history for OpenAI consumption.
     * @param {string} phone 
     * @returns {Array} 
     */
    getMessagesForAI(phone) {
        return this.sessions.get(phone) || [];
    }
}

module.exports = new SessionManager();

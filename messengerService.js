/**
 * messengerService.js
 * Handles sending messages back to Facebook Messenger.
 */
const axios = require('axios');
const config = require('./config');

module.exports = {
    /**
     * Send a text message to a specific recipient on Messenger.
     */
    async sendMessage(recipientId, text) {
        if (!config.FB_PAGE_ACCESS_TOKEN) {
            console.error("❌ Error: FB_PAGE_ACCESS_TOKEN no configurado.");
            return;
        }

        try {
            const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${config.FB_PAGE_ACCESS_TOKEN}`;
            const response = await axios.post(url, {
                recipient: { id: recipientId },
                message: { text }
            });
            console.log(`📡 [MESSENGER] Respuesta enviada a ${recipientId}`);
            return response.data;
        } catch (err) {
            console.error("❌ [MESSENGER] Error enviando mensaje:", err.response?.data || err.message);
        }
    }
};

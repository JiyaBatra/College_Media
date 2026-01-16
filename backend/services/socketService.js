const { getIO, isUserOnline } = require('../socket');
const logger = require('../utils/logger');

class SocketService {
    /**
     * Send a specific event to a targeted user
     * @param {string} userId - The recipient's User ID
     * @param {string} event - The event name
     * @param {object} data - The payload
     */
    emitToUser(userId, event, data) {
        try {
            const io = getIO();
            io.to(userId).emit(event, data);
            logger.debug(`Socket emitted '${event}' to user ${userId}`);
            return true;
        } catch (error) {
            logger.warn(`Failed to emit '${event}' to user ${userId}: ${error.message}`);
            return false;
        }
    }

    /**
     * Broadcast an event to all connected clients
     * @param {string} event 
     * @param {object} data 
     */
    broadcast(event, data) {
        try {
            const io = getIO();
            io.emit(event, data);
            return true;
        } catch (error) {
            logger.warn(`Failed to broadcast '${event}': ${error.message}`);
            return false;
        }
    }

    /**
     * Check if a user is currently connected
     * @param {string} userId 
     */
    isUserOnline(userId) {
        return isUserOnline(userId);
    }

    /**
     * Emit collaborative session update (e.g. "User X joined Doc Y")
     * This bridges the gap if CollabService is separate but we want main Notifications.
     */
    notifyCollabSession(participants, docId, action) {
        participants.forEach(userId => {
            this.emitToUser(userId, 'collab_update', { docId, action });
        });
    }
}

module.exports = new SocketService();

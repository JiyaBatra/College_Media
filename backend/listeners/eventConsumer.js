const redis = require('../utils/redisClient');
const NotificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const STREAM_KEY = 'events:notifications';
const GROUP_NAME = 'notification_workers';
const CONSUMER_NAME = `worker:${process.pid}`;

const initEventConsumer = async () => {
    try {
        if (!redis.isConnected()) {
            logger.warn('Redis not connected, skipping event consumer initialization.');
            return;
        }

        // Create consumer group if it doesn't exist
        try {
            await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '0', 'MKSTREAM');
        } catch (err) {
            // Ignore error if group already exists
            if (!err.message.includes('BUSYGROUP')) {
                throw err;
            }
        }

        logger.info(`Notification Consumer ${CONSUMER_NAME} started...`);

        // Consumer loop
        const consume = async () => {
            try {
                // Read from consumer group
                const entries = await redis.xreadgroup('GROUP', GROUP_NAME, CONSUMER_NAME, 'COUNT', '1', 'BLOCK', '5000', 'STREAMS', STREAM_KEY, '>');

                if (entries) {
                    const [streamData] = entries;
                    const [entry] = streamData[1];
                    const [id, fields] = entry;

                    // Parse fields
                    const data = {};
                    for (let i = 0; i < fields.length; i += 2) {
                        data[fields[i]] = fields[i + 1];
                    }

                    const type = data.type;
                    const payload = JSON.parse(data.payload);

                    // Handle event types
                    if (type === 'POST_LIKED') {
                        await NotificationService.sendNotification({
                            recipient: payload.targetUserId,
                            sender: payload.actorId,
                            type: 'like',
                            post: payload.postId
                        });
                    } else if (type === 'POST_COMMENTED') {
                        await NotificationService.sendNotification({
                            recipient: payload.targetUserId,
                            sender: payload.actorId,
                            type: 'comment',
                            post: payload.postId,
                            content: payload.text
                        });
                    } else if (type === 'USER_FOLLOWED') {
                        await NotificationService.sendNotification({
                            recipient: payload.targetUserId,
                            sender: payload.actorId,
                            type: 'follow'
                        });
                    }

                    // Acknowledge message
                    await redis.xack(STREAM_KEY, GROUP_NAME, id);
                }
            } catch (err) {
                logger.error('Error consuming notification events:', err);
            }

            // Next tick
            setImmediate(consume);
        };

        consume();
    } catch (error) {
        logger.error('Event Consumer Initialization Error:', error);
    }
};

module.exports = initEventConsumer;

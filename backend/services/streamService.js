const Video = require('../models/Video');
const videoQueue = require('../jobs/videoTranscoder');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class StreamService {
    /**
     * Upload and queue video for processing
     */
    static async uploadAndQueue(userId, file, title) {
        try {
            // Create video record
            const video = await Video.create({
                title,
                originalUrl: file.path, // path saved by multer
                uploader: userId,
                status: 'pending'
            });

            // Add to queue
            await videoQueue.add({
                videoId: video._id,
                inputPath: file.path
            }, {
                attempts: 3,
                backoff: 5000
            });

            logger.info(`Video ${video._id} queued for transcoding`);
            return video;
        } catch (error) {
            logger.error('Upload and queue error:', error);
            throw error;
        }
    }

    /**
     * Get video status
     */
    static async getVideoStatus(videoId) {
        return await Video.findById(videoId);
    }

    /**
     * Get stream manifest path
     */
    static getStreamPath(videoId, file) {
        // Return absolute path for file serving
        const streamRootDir = path.join(__dirname, '..', '..', 'uploads', 'streams');
        return path.join(streamRootDir, videoId, file);
    }
}

module.exports = StreamService;

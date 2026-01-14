const Queue = require('bull');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/Video');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Reuse Redis URL
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const videoQueue = new Queue('video-transcoding', REDIS_URL);

// Ensure public streams directory exists
const streamRootDir = path.join(__dirname, '..', '..', 'uploads', 'streams');
if (!fs.existsSync(streamRootDir)) {
    fs.mkdirSync(streamRootDir, { recursive: true });
}

// Process jobs
videoQueue.process(async (job) => {
    const { videoId, inputPath } = job.data;

    try {
        const video = await Video.findById(videoId);
        if (!video) {
            logger.error(`Video ${videoId} not found for transcoding`);
            return;
        }

        video.status = 'processing';
        await video.save();

        logger.info(`Starting transcoding for video ${videoId}`);

        // Output directory for this video
        const outputDir = path.join(streamRootDir, videoId);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'master.m3u8');

        // Transcode to HLS
        // Note: this requires ffmpeg installed on system.
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-codec:v libx264',
                    '-codec:a aac',
                    '-hls_time 10',        // 10 second segments
                    '-hls_playlist_type vod',
                    '-hls_segment_filename', path.join(outputDir, 'segment%03d.ts'),
                    '-start_number 0'
                ])
                .output(outputPath)
                .on('end', () => {
                    logger.info('FFmpeg transcoding finished');
                    resolve();
                })
                .on('error', (err) => {
                    logger.error('FFmpeg error:', err);
                    reject(err);
                })
                .run();
        });

        // Update video with HLS URL (Relative path to be served)
        video.hlsUrl = `/api/streams/${videoId}/master.m3u8`;
        video.status = 'completed';
        await video.save();

        logger.info(`Transcoding completed for video ${videoId}`);

        // Cleanup original if needed? Probably keep it for re-transcoding or archival.

    } catch (error) {
        logger.error(`Transcoding failed for video ${videoId}:`, error);
        await Video.findByIdAndUpdate(videoId, { status: 'failed' });
        throw error;
    }
});

module.exports = videoQueue;

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const StreamService = require('../services/streamService');
const logger = require('../utils/logger');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'college_media_secret_key';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'raw_videos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for video uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Auth middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

/**
 * @swagger
 * /api/streams/upload:
 *   post:
 *     summary: Upload a video for streaming
 *     tags: [Streams]
 */
router.post('/upload', verifyToken, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No video file provided' });

        const { title } = req.body;
        const video = await StreamService.uploadAndQueue(req.userId, req.file, title || 'Untitled');

        res.status(202).json({
            success: true,
            data: video,
            message: 'Video upload accepted and queued for processing'
        });
    } catch (error) {
        logger.error('Video upload error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

/**
 * @swagger
 * /api/streams/{videoId}/status:
 *   get:
 *     summary: Get video processing status
 *     tags: [Streams]
 */
router.get('/:videoId/status', verifyToken, async (req, res) => {
    try {
        const video = await StreamService.getVideoStatus(req.params.videoId);
        if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

        res.json({ success: true, data: video });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Processing status check failed' });
    }
});

/**
 * @swagger
 * /api/streams/{videoId}/{file}:
 *   get:
 *     summary: Serve HLS stream files (m3u8/ts)
 *     tags: [Streams]
 */
router.get('/:videoId/:file', async (req, res) => {
    try {
        const { videoId, file } = req.params;
        const filePath = StreamService.getStreamPath(videoId, file);

        if (fs.existsSync(filePath)) {
            // Set appropriate headers
            if (file.endsWith('.m3u8')) {
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            } else if (file.endsWith('.ts')) {
                res.setHeader('Content-Type', 'video/MP2T');
            }
            res.sendFile(filePath);
        } else {
            res.status(404).send('Stream file not found');
        }
    } catch (error) {
        logger.error('Stream serve error:', error);
        res.status(500).send('Streaming error');
    }
});

module.exports = router;

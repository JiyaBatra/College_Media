const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, collectionController.createCollection);
router.get('/', protect, collectionController.getUserCollections);
router.post('/add-post', protect, collectionController.addPostToCollection);
router.post('/remove-post', protect, collectionController.removePostFromCollection);
router.delete('/:id', protect, collectionController.deleteCollection);

module.exports = router;

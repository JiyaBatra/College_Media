const Collection = require('../models/Collection');

exports.createCollection = async (req, res) => {
    try {
        const { name, description, color, isPublic } = req.body;
        const userId = req.user._id;

        const collection = new Collection({
            name,
            description,
            color,
            isPublic,
            userId
        });

        await collection.save();
        res.status(201).json(collection);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getUserCollections = async (req, res) => {
    try {
        const collections = await Collection.find({ userId: req.user._id })
            .populate('posts', 'caption imageUrl createdAt')
            .sort({ updatedAt: -1 });
        res.json(collections);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addPostToCollection = async (req, res) => {
    try {
        const { collectionId, postId } = req.body;

        // Ensure collection belongs to user
        const collection = await Collection.findOne({ _id: collectionId, userId: req.user._id });
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        if (!collection.posts.includes(postId)) {
            collection.posts.push(postId);
            await collection.save();
        }

        res.json(collection);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.removePostFromCollection = async (req, res) => {
    try {
        const { collectionId, postId } = req.body;

        const collection = await Collection.findOne({ _id: collectionId, userId: req.user._id });
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }

        collection.posts = collection.posts.filter(id => id.toString() !== postId);
        await collection.save();

        res.json(collection);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!collection) {
            return res.status(404).json({ message: 'Collection not found' });
        }
        res.json({ message: 'Collection deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

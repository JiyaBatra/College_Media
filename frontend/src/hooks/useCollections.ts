import { useContext, useState, useCallback } from 'react';
import CollectionContext from '../context/CollectionContext';

/**
 * Main hook to access collection context
 */
export const useCollections = () => {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error('useCollections must be used within a CollectionProvider');
  }
  return context;
};

/**
 * Hook for creating collections
 */
export const useCreateCollection = () => {
  const { createCollection } = useCollections();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (name: string, description = '', isPublic = false) => {
    setIsCreating(true);
    setError(null);
    try {
      const result = await createCollection(name, description, isPublic);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to create collection');
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [createCollection]);

  return {
    create,
    isCreating,
    error,
  };
};

/**
 * Hook for post bookmarking
 */
export const useBookmark = (postId: string) => {
  const {
    isPostSaved,
    getCollectionsForPost,
    togglePostSave,
    addPostToCollection,
    removePostFromCollection
  } = useCollections();

  const [isProcessing, setIsProcessing] = useState(false);

  const isSaved = isPostSaved(postId);
  const savedInCollections = getCollectionsForPost(postId);

  const toggleSave = useCallback(async () => {
    setIsProcessing(true);
    try {
      const newState = await togglePostSave(postId);
      return newState;
    } finally {
      setIsProcessing(false);
    }
  }, [postId, togglePostSave]);

  const saveToCollection = useCallback(async (collectionId: string) => {
    setIsProcessing(true);
    try {
      await addPostToCollection(collectionId, postId);
    } finally {
      setIsProcessing(false);
    }
  }, [postId, addPostToCollection]);

  const removeFromCollection = useCallback(async (collectionId: string) => {
    setIsProcessing(true);
    try {
      await removePostFromCollection(collectionId, postId);
    } finally {
      setIsProcessing(false);
    }
  }, [postId, removePostFromCollection]);

  return {
    isSaved,
    savedInCollections,
    isProcessing,
    toggleSave,
    saveToCollection,
    removeFromCollection,
  };
};

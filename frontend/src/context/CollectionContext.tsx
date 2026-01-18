import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { collectionsApi } from '../api/endpoints';
import { Collection } from '../types';

interface CollectionContextType {
  collections: Collection[];
  loading: boolean;
  sortBy: string;
  loadCollections: () => Promise<void>;
  createCollection: (name: string, description?: string, isPublic?: boolean) => Promise<Collection>;
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<boolean>;
  addPostToCollection: (collectionId: string, postId: string) => Promise<boolean>;
  removePostFromCollection: (collectionId: string, postId: string) => Promise<boolean>;
  movePost: (postId: string, fromCollectionId: string, toCollectionId: string) => Promise<void>;
  togglePostSave: (postId: string) => Promise<boolean>;
  bulkRemovePosts: (collectionId: string, postIds: string[]) => Promise<boolean>;
  bulkMovePosts: (postIds: string[], fromCollectionId: string, toCollectionId: string) => Promise<boolean>;
  isPostSaved: (postId: string) => boolean;
  getCollectionsForPost: (postId: string) => Collection[];
  getSortedCollections: () => Collection[];
  setSortBy: (sortBy: string) => void;
}

const CollectionContext = createContext<CollectionContextType | undefined>(undefined);

export const CollectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('alphabetical');

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await collectionsApi.getAll();
      setCollections(response.data);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const createCollection = useCallback(async (name: string, description = '', isPublic = false) => {
    try {
      const response = await collectionsApi.create({ name, description, isPublic });
      const newCollection = response.data;
      setCollections(prev => [newCollection, ...prev]);
      toast.success(`Collection "${name}" created!`);
      return newCollection;
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to create collection';
      toast.error(msg);
      throw error;
    }
  }, []);

  const updateCollection = useCallback(async (id: string, updates: Partial<Collection>) => {
    try {
      // In a real app, there would be an update endpoint. Using addPost/removePost logic for now.
      // Assuming for this task that updates is just metadata. 
      // If we don't have a dedicated update endpoint in collectionsApi, we might need to add it.
      // For now, let's assume we implement it in collectionsApi later if needed.
      toast.error('Update not implemented yet');
      throw new Error('Not implemented');
    } catch (error) {
      throw error;
    }
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    try {
      await collectionsApi.delete(id);
      setCollections(prev => prev.filter(c => c._id !== id));
      toast.success('Collection deleted!');
      return true;
    } catch (error) {
      toast.error('Failed to delete collection');
      return false;
    }
  }, []);

  const addPostToCollection = useCallback(async (collectionId: string, postId: string) => {
    try {
      await collectionsApi.addPost(collectionId, postId);
      setCollections(prev =>
        prev.map(c =>
          c._id === collectionId
            ? { ...c, posts: Array.isArray(c.posts) ? [...(c.posts as any[]), postId] : [...(c.posts as string[] || []), postId], updatedAt: new Date().toISOString() }
            : c
        )
      );
      const collection = collections.find(c => c._id === collectionId);
      toast.success(`Saved to "${collection?.name || 'collection'}"!`);
      return true;
    } catch (error) {
      toast.error('Failed to save post');
      return false;
    }
  }, [collections]);

  const removePostFromCollection = useCallback(async (collectionId: string, postId: string) => {
    try {
      await collectionsApi.removePost(collectionId, postId);
      setCollections(prev =>
        prev.map(c =>
          c._id === collectionId
            ? { ...c, posts: (c.posts as any[]).filter(p => (typeof p === 'string' ? p : p._id) !== postId), updatedAt: new Date().toISOString() }
            : c
        )
      );
      toast.success('Removed from collection');
      return true;
    } catch (error) {
      toast.error('Failed to remove post');
      return false;
    }
  }, []);

  const movePost = useCallback(async (postId: string, fromCollectionId: string, toCollectionId: string) => {
    const removed = await removePostFromCollection(fromCollectionId, postId);
    if (removed) {
      await addPostToCollection(toCollectionId, postId);
    }
  }, [removePostFromCollection, addPostToCollection]);

  const isPostSaved = useCallback((postId: string) => {
    return collections.some(c =>
      (c.posts as any[]).some(p => (typeof p === 'string' ? p : p._id) === postId)
    );
  }, [collections]);

  const getCollectionsForPost = useCallback((postId: string) => {
    return collections.filter(c =>
      (c.posts as any[]).some(p => (typeof p === 'string' ? p : p._id) === postId)
    );
  }, [collections]);

  const togglePostSave = useCallback(async (postId: string) => {
    // For simple bookmarking, we'll use a "Bookmarks" collection
    let bookmarksCollection = collections.find(c => c.name === 'Bookmarks');

    if (!bookmarksCollection) {
      try {
        bookmarksCollection = await createCollection('Bookmarks', 'Default bookmarks collection', false);
      } catch (e) {
        return false;
      }
    }

    if (!bookmarksCollection) {
      return false;
    }

    const isSaved = (bookmarksCollection.posts as any[]).some(p => (typeof p === 'string' ? p : (p as any)._id) === postId);

    if (isSaved) {
      return await removePostFromCollection(bookmarksCollection._id, postId);
    } else {
      return await addPostToCollection(bookmarksCollection._id, postId);
    }
  }, [collections, createCollection, addPostToCollection, removePostFromCollection]);

  const getSortedCollections = useCallback(() => {
    const sorted = [...collections];
    if (sortBy === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [collections, sortBy]);

  const bulkRemovePosts = useCallback(async (collectionId: string, postIds: string[]) => {
    const results = await Promise.all(postIds.map(id => removePostFromCollection(collectionId, id)));
    return results.every(Boolean);
  }, [removePostFromCollection]);

  const bulkMovePosts = useCallback(async (postIds: string[], fromCollectionId: string, toCollectionId: string) => {
    const results = await Promise.all(postIds.map(id => {
      return removePostFromCollection(fromCollectionId, id).then(removed => {
        if (removed) return addPostToCollection(toCollectionId, id);
        return false;
      });
    }));
    return results.every(Boolean);
  }, [addPostToCollection, removePostFromCollection]);

  const value = {
    collections,
    loading,
    sortBy,
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addPostToCollection,
    removePostFromCollection,
    movePost,
    togglePostSave,
    bulkRemovePosts,
    bulkMovePosts,
    isPostSaved,
    getCollectionsForPost,
    getSortedCollections,
    setSortBy,
  };

  return (
    <CollectionContext.Provider value={value}>
      {children}
    </CollectionContext.Provider>
  );
};

export const useCollectionContext = () => {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error('useCollectionContext must be used within a CollectionProvider');
  }
  return context;
};

export default CollectionContext;

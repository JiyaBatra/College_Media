import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useCollections, useCreateCollection } from '../hooks/useCollections';

/**
 * CollectionSelector Component
 * Dropdown for selecting a collection when saving a post
 */
interface CollectionSelectorProps {
  postId: string;
  onClose: () => void;
  onSelect?: (collectionId: string) => void;
}

const CollectionSelector: React.FC<CollectionSelectorProps> = ({ postId, onClose, onSelect }) => {
  const { collections, addPostToCollection } = useCollections();
  const { create, isCreating } = useCreateCollection();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCollections = searchQuery.trim()
    ? collections.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : collections;

  const handleSelectCollection = async (collectionId: string) => {
    await addPostToCollection(collectionId, postId);
    onSelect?.(collectionId);
    onClose();
  };

  const handleCreateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      const newCollection = await create(newCollectionName.trim());
      await addPostToCollection(newCollection._id, postId);
      onSelect?.(newCollection._id);
      onClose();
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-72 bg-bg-secondary rounded-xl shadow-lg border border-border z-50 max-h-96 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text-primary">
            Save to Collection
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <Icon icon="mdi:close" className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-bg-tertiary text-text-primary text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCollections.length === 0 ? (
          <div className="p-4 text-center text-text-muted text-sm italic">
            {searchQuery ? 'No collections found' : 'No collections yet'}
          </div>
        ) : (
          filteredCollections.map((collection) => {
            const isPostInCollection = (collection.posts as any[]).some(p =>
              (typeof p === 'string' ? p : p._id) === postId
            );

            return (
              <button
                key={collection._id}
                onClick={() => handleSelectCollection(collection._id)}
                disabled={isPostInCollection}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${isPostInCollection
                    ? 'bg-brand-primary/5 cursor-not-allowed'
                    : 'hover:bg-bg-tertiary'
                  }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg bg-bg-secondary border border-border`}>
                    <Icon
                      icon={collection.isPublic ? 'mdi:folder-open' : 'mdi:folder'}
                      className="w-5 h-5 text-brand-primary"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {collection.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {collection.posts.length} post{collection.posts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {isPostInCollection && (
                  <Icon
                    icon="mdi:check-circle"
                    className="w-5 h-5 text-brand-primary flex-shrink-0"
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Create New Collection */}
      <div className="border-t border-border p-3 bg-bg-tertiary/30">
        {showCreateForm ? (
          <form onSubmit={handleCreateAndSave} className="space-y-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              autoFocus
              maxLength={50}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-secondary text-text-primary text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewCollectionName('');
                }}
                className="flex-1 px-3 py-2 text-sm border border-border text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCollectionName.trim() || isCreating}
                className="flex-1 px-3 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {isCreating ? (
                  <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
                ) : (
                  'Create & Save'
                )}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-all font-medium shadow-sm hover:shadow-md"
          >
            <Icon icon="mdi:plus" className="w-5 h-5" />
            <span>Create New Collection</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CollectionSelector;

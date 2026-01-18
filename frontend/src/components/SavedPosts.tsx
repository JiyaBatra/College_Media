import React, { useState } from "react";
import { useCollections } from "../hooks/useCollections";
import { Icon } from "@iconify/react";
import Post from "./Post";
import { Collection, Post as IPost } from "../types";

const SavedPosts: React.FC = () => {
  const { collections, loading } = useCollections();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icon icon="mdi:loading" className="w-10 h-10 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-bg-secondary rounded-2xl shadow-soft p-12 border border-border">
          <Icon icon="mdi:bookmark-outline" className="w-20 h-20 mx-auto text-text-muted mb-4" />
          <h3 className="text-2xl font-bold text-text-primary mb-2">No saved posts</h3>
          <p className="text-text-muted mb-8">Start saving posts to organize them into collections.</p>
          <a href="/" className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all shadow-md">
            Go to Feed
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            {selectedCollection ? selectedCollection.name : "Your Collections"}
          </h1>
          <p className="text-text-muted mt-1">
            {selectedCollection
              ? selectedCollection.description || "Collection items"
              : "Organize and browse your saved content"}
          </p>
        </div>
        {selectedCollection && (
          <button
            onClick={() => setSelectedCollection(null)}
            className="flex items-center gap-2 text-brand-primary font-medium hover:underline"
          >
            <Icon icon="mdi:chevron-left" /> Back to Collections
          </button>
        )}
      </header>

      {!selectedCollection ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((col) => (
            <div
              key={col._id}
              onClick={() => setSelectedCollection(col)}
              className="group bg-bg-secondary rounded-2xl border border-border overflow-hidden hover:border-brand-primary/50 transition-all cursor-pointer shadow-soft hover:shadow-lg"
            >
              <div className="h-32 bg-bg-tertiary flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundColor: col.color }} />
                <Icon
                  icon={col.isPublic ? "mdi:folder-open" : "mdi:folder"}
                  className="w-16 h-16 text-brand-primary group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-text-primary truncate">{col.name}</h3>
                  <span className="text-xs bg-bg-tertiary px-2 py-1 rounded-full font-medium text-text-muted">
                    {col.posts.length}
                  </span>
                </div>
                {col.description && (
                  <p className="text-xs text-text-muted line-clamp-1">{col.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {(selectedCollection.posts as IPost[]).length > 0 ? (
            (selectedCollection.posts as IPost[]).map((p) => (
              <Post
                key={p._id}
                post={p}
                onCopyLink={() => { }}
                copiedLink={null}
              />
            ))
          ) : (
            <div className="bg-bg-secondary rounded-2xl p-12 text-center border border-dashed border-border">
              <p className="text-text-muted italic">This collection is empty</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedPosts;

import React from 'react';
import SavedPosts from '../components/SavedPosts';
import SEO from '../components/Seo';

/**
 * SavedPostsPage Component
 * 
 * Page wrapper for the SavedPosts component
 * Now relies on SavedPosts to handle data fetching via useCollections hook
 */
const SavedPostsPage = () => {
  return (
    <div className="min-h-screen bg-bg-primary">
      <SEO
        title="Saved Collections - CollegeMedia"
        description="View and organize your bookmarked posts"
        keywords="saved posts, bookmarks, collections, college media"
      />
      <SavedPosts />
    </div>
  );
};

export default SavedPostsPage;

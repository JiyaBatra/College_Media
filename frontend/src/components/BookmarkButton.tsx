import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useBookmark } from '../hooks/useCollections';
import CollectionSelector from './CollectionSelector';

/**
 * BookmarkButton Component (Enhanced)
 * 
 * A reusable button component that allows users to save/unsave posts
 * Now supports saving to multiple collections with collection selector
 * 
 * @param {Object} props - Component props
 * @param {string} props.postId - Unique identifier for the post
 * @param {string} props.className - Optional additional CSS classes
 * @param {boolean} props.showLabel - Show text label alongside icon
 * @returns {React.ReactElement} Bookmark button component
 */
interface BookmarkButtonProps {
  postId: string;
  className?: string;
  showLabel?: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ postId, className = '', showLabel = false }) => {
  const { isSaved, savedInCollections, toggleSave, isProcessing } = useBookmark(postId);
  const [showSelector, setShowSelector] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Quick save on single click, show selector on hold or right-click
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If already saved and wants to choose collection, show selector
    if (isSaved && e.shiftKey) {
      setShowSelector(true);
      return;
    }

    // Quick toggle save to default collection
    await toggleSave();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSelector(!showSelector);
  };

  // Close selector when clicking outside
  useEffect(() => {
    if (!showSelector) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setShowSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSelector]);

  return (
    <div className="relative" ref={buttonRef}>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        disabled={isProcessing}
        className={`flex items-center gap-2 transition-colors ${isSaved
            ? 'text-brand-primary'
            : 'text-text-secondary hover:text-brand-primary'
          } ${className} disabled:opacity-50`}
        aria-label={isSaved ? 'Saved' : 'Save post'}
        title={isSaved ? `Saved in ${savedInCollections.length} collection(s)` : 'Save for later'}
      >
        {isProcessing ? (
          <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
        ) : isSaved ? (
          <Icon icon="mdi:bookmark" className="w-5 h-5" />
        ) : (
          <Icon icon="mdi:bookmark-outline" className="w-5 h-5" />
        )}

        {showLabel && (
          <span className="text-sm font-medium">
            {isSaved ? 'Saved' : 'Save'}
          </span>
        )}

        {isSaved && savedInCollections.length > 1 && (
          <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded-full font-bold">
            {savedInCollections.length}
          </span>
        )}
      </button>

      {/* Collection Selector Dropdown */}
      {showSelector && (
        <CollectionSelector
          postId={postId}
          onClose={() => setShowSelector(false)}
          onSelect={() => setShowSelector(false)}
        />
      )}
    </div>
  );
};

export default BookmarkButton;

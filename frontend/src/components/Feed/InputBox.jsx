import React from 'react';
// Updated imports for React Icons
import { MdPhotoSizeSelectActual, MdVideoLibrary, MdEvent, MdArticle } from "react-icons/md";

const InputBox = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center space-x-3">
        <img
          src="https://placehold.co/40x40/3b82f6/ffffff?text=JD"
          alt="User"
          className="w-10 h-10 rounded-full"
        />
        <input
          type="text"
          placeholder="Start a post"
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-around mt-4 pt-3 border-t border-gray-200">
        <button className="flex flex-col items-center space-y-1 text-blue-600 hover:bg-blue-50 p-2 rounded">
          <MdPhotoSizeSelectActual className="w-6 h-6" />
          <span className="text-xs font-medium">Photo</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-green-600 hover:bg-green-50 p-2 rounded">
          <MdVideoLibrary className="w-6 h-6" />
          <span className="text-xs font-medium">Video</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-orange-600 hover:bg-orange-50 p-2 rounded">
          <MdEvent className="w-6 h-6" />
          <span className="text-xs font-medium">Event</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-red-600 hover:bg-red-50 p-2 rounded">
          <MdArticle className="w-6 h-6" />
          <span className="text-xs font-medium">Write article</span>
        </button>
      </div>
    </div>
  );
};

export default InputBox;
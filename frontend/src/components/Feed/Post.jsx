import React from 'react';
// Updated imports for React Icons
import { AiOutlineLike } from "react-icons/ai";
import { FaRegCommentDots } from "react-icons/fa";
import { BiRepost } from "react-icons/bi";
import { FiSend } from "react-icons/fi";

const Post = ({ name, description, message, photoUrl }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-start space-x-3">
        <img src={photoUrl} alt={name} className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <h4 className="font-bold text-gray-900">{name}</h4>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-gray-800">{message}</p>
      </div>

      <div className="flex justify-around mt-4 pt-3 border-t border-gray-200">
        <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
          <AiOutlineLike className="w-5 h-5" />
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
          <FaRegCommentDots className="w-5 h-5" />
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
          <BiRepost className="w-5 h-5" />
          <span className="text-sm font-medium">Share</span>
        </button>
        <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
          <FiSend className="w-5 h-5" />
          <span className="text-sm font-medium">Send</span>
        </button>
      </div>
    </div>
  );
};

export default Post;
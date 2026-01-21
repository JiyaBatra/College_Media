import React from 'react';

const Sidebar = () => {
  return (
    <div className="sticky top-20 bg-white rounded-lg border border-gray-300 p-4 hidden lg:block h-fit w-60 mr-4">
      {/* Profile Card */}
      <div className="relative mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-700 h-20 rounded-t-lg"></div>
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <img
            src="https://placehold.co/80x80/3b82f6/ffffff?text=JD"
            alt="Profile"
            className="w-16 h-16 rounded-full border-4 border-white"
          />
        </div>
      </div>
      
      <div className="pt-8 text-center">
        <h3 className="font-bold text-lg">John Doe</h3>
        <p className="text-gray-600 text-sm">Software Developer</p>
      </div>

      {/* Stats Section */}
      <div className="mt-6 space-y-3">
        <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
          <span className="text-sm font-medium">Who viewed your profile</span>
          <span className="text-blue-600 font-bold">245</span>
        </div>
        <div className="flex justify-between items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
          <span className="text-sm font-medium">Views on post</span>
          <span className="text-blue-600 font-bold">1,234</span>
        </div>
      </div>

      {/* Recent Hashtags */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-700 mb-3">Recent</h4>
        <div className="space-y-2">
          <p className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">#reactjs</p>
          <p className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">#programming</p>
          <p className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">#webdev</p>
          <p className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">#javascript</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
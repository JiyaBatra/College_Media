import React from 'react';

const HeaderOption = ({ Icon, title }) => {
  return (
    <div className="flex flex-col items-center cursor-pointer group">
      <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-500" />
      <p className="text-xs font-medium text-gray-600 group-hover:text-blue-500 mt-1">{title}</p>
    </div>
  );
};

export default HeaderOption;
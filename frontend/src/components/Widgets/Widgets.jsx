import React from 'react';

const Widgets = () => {
  const newsItems = [
    { id: 1, headline: "React 19 Beta Released", subtitle: "Top news - 12,456 readers" },
    { id: 2, headline: "AI Integration in Web Development", subtitle: "Trending - 8,932 readers" },
    { id: 3, headline: "New JavaScript Framework Gains Popularity", subtitle: "Tech news - 6,721 readers" },
    { id: 4, headline: "Remote Work Trends in 2026", subtitle: "Career advice - 5,433 readers" },
    { id: 5, headline: "Cloud Computing Salary Report", subtitle: "Industry insights - 4,218 readers" }
  ];

  return (
    <div className="sticky top-20 bg-white rounded-lg border border-gray-300 p-4 hidden lg:block w-80 ml-4 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">LinkedIn News</h2>
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>
      
      <div className="space-y-3">
        {newsItems.map(item => (
          <div key={item.id} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{item.headline}</h3>
              <p className="text-gray-500 text-xs">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Widgets;
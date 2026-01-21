import React from 'react';
import InputBox from './InputBox';
import Post from './Post';

const Feed = () => {
  const posts = [
    {
      id: 1,
      name: "Sarah Johnson",
      description: "Senior Frontend Developer at TechCorp",
      message: "Just shipped a new feature using React 18! The concurrent rendering is a game changer for user experience.",
      photoUrl: "https://placehold.co/40x40/f59e0b/ffffff?text=SJ"
    },
    {
      id: 2,
      name: "Michael Chen",
      description: "Full Stack Engineer | Open Source Contributor",
      message: "Working on an exciting open-source project that combines AI with web development. Looking for contributors!",
      photoUrl: "https://placehold.co/40x40/10b981/ffffff?text=MC"
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      description: "UX Designer & Product Manager",
      message: "The key to great design isn't just aesthetics—it's understanding user behavior and solving real problems.",
      photoUrl: "https://placehold.co/40x40/8b5cf6/ffffff?text=ER"
    }
  ];

  return (
    <div className="flex-1 max-w-2xl mx-auto px-4">
      <InputBox />
      <div className="space-y-4">
        {posts.map(post => (
          <Post
            key={post.id}
            name={post.name}
            description={post.description}
            message={post.message}
            photoUrl={post.photoUrl}
          />
        ))}
      </div>
    </div>
  );
};

export default Feed;
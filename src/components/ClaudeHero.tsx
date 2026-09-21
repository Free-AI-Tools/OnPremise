import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

export const ClaudeHero: React.FC = () => {
  const { userName } = useUser();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    let text = 'Good evening';
    if (hour >= 22 || hour < 5) text = 'Up late';
    else if (hour < 12) text = 'Good morning';
    else if (hour < 17) text = 'Good afternoon';
    
    setGreeting(text === 'Up late' ? `Up late, ${userName}?` : `${text}, ${userName}`);
  }, [userName]);

  return (
    <div className="flex flex-col items-center justify-center my-auto py-12 select-none">
      <div className="flex items-center gap-3.5 mb-8">
        {/* Signature Claude 8-point geometric starburst glyph */}
        <svg
          className="w-10 h-10 text-[#C2410C] dark:text-[#EA580C] animate-pulse"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>

        {/* Serif Headline matching Claude typography */}
        <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-[#1F1E1D] dark:text-[#F4F4F5]">
          {greeting}
        </h1>
      </div>
    </div>
  );
};

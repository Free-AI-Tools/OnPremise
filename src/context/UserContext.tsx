import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextType {
  userName: string;
  setUserName: (name: string) => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userName, setUserNameState] = useState<string>('User');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.name) {
          setUserNameState(data.name);
        }
      })
      .catch((err) => console.warn('Failed to load profile:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const setUserName = async (name: string) => {
    try {
      await fetch('http://localhost:8000/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setUserNameState(name);
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Optimistic update fallback
      setUserNameState(name);
    }
  };

  return (
    <UserContext.Provider value={{ userName, setUserName, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

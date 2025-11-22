import React, { createContext, useContext, useState } from 'react';

const HomeContext = createContext();

export const useHome = () => {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error('useHome must be used within HomeProvider');
  }
  return context;
};

export const HomeProvider = ({ children }) => {
  const [selectedGroupId, setSelectedGroupId] = useState(-1);
  const [handleSelectGroup, setHandleSelectGroup] = useState(null);

  return (
    <HomeContext.Provider
      value={{
        selectedGroupId,
        setSelectedGroupId,
        handleSelectGroup,
        setHandleSelectGroup,
      }}
    >
      {children}
    </HomeContext.Provider>
  );
};
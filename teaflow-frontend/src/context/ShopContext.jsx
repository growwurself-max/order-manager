import { createContext, useContext, useState, useCallback } from 'react';

const ShopContext = createContext(null);

export const ShopProvider = ({ children }) => {
  const [shopName, setShopName] = useState('');

  const updateShopName = useCallback((name) => {
    setShopName(name || '');
  }, []);

  const value = {
    shopName,
    setShopName: updateShopName,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within ShopProvider');
  }
  return context;
};

export default ShopContext;
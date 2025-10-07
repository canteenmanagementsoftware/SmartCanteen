import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  login: (token, userData) => {},
  logout: () => {},
  loading: false,


});
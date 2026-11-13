import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { organizerApi, publicApi, tokens } from './api.js';
import { deriveAccountKeys } from './crypto.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokens.getOrganizer()));

  useEffect(() => {
    if (!tokens.getOrganizer()) return;
    if (!tokens.getWrapKey()) {
      tokens.clearOrganizer();
      setLoading(false);
      return;
    }
    organizerApi
      .get('/auth/me')
      .then((data) => setOrganizer(data.organizer))
      .catch(() => tokens.clearOrganizer())
      .finally(() => setLoading(false));
  }, []);

  const authenticate = useCallback(async (mode, { name, email, password }) => {
    const { authSecret, wrapKey } = await deriveAccountKeys(email, password);
    const data = await publicApi.post(`/auth/${mode}`, mode === 'register' ? { name, email, authSecret } : { email, authSecret });
    tokens.setOrganizer(data.token, wrapKey);
    setOrganizer(data.organizer);
  }, []);

  const logout = useCallback(() => {
    tokens.clearOrganizer();
    setOrganizer(null);
  }, []);

  return <AuthContext.Provider value={{ organizer, loading, authenticate, logout }}>{children}</AuthContext.Provider>;
}

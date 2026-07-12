import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getNotifications } from '../api/notifications';
import { useAuth } from '../hooks/useAuth';

const NotificationsContext = createContext(null);

const STORAGE_KEY = 'transitops_read_notif_ids';
const POLL_MS = 30_000; // 30 seconds

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveReadIds(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIdsState] = useState(getReadIds);
  const timerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getNotifications();
      setNotifications(res.data.data ?? []);
    } catch {
      // silent — don't spam errors for background poll
    }
  }, [user]);

  // Initial fetch + polling
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    timerRef.current = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchNotifications, user]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAllRead = useCallback(() => {
    const next = new Set([...readIds, ...notifications.map(n => n.id)]);
    saveReadIds(next);
    setReadIdsState(next);
  }, [readIds, notifications]);

  const markRead = useCallback((id) => {
    const next = new Set([...readIds, id]);
    saveReadIds(next);
    setReadIdsState(next);
  }, [readIds]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      readIds,
      markRead,
      markAllRead,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}

(function () {
  const STORAGE_KEY_PREFIX = 'smarttravel_notifications_v2_';
  const MAX_ITEMS = 30;

  function parseJwt(token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  function getCurrentUserKey() {
    const token = localStorage.getItem('access_token');
    const payload = token ? parseJwt(token) : null;
    const userId = payload && payload.sub ? String(payload.sub) : 'guest';
    return STORAGE_KEY_PREFIX + userId;
  }

  function readAll() {
    try {
      const raw = localStorage.getItem(getCurrentUserKey());
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeAll(list) {
    localStorage.setItem(getCurrentUserKey(), JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('smarttravel:notifications-updated'));
  }

  function push(notification) {
    const current = readAll();
    const item = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: notification.title || 'Thông báo',
      message: notification.message || '',
      type: notification.type || 'info',
      createdAt: new Date().toISOString(),
      read: false
    };
    current.unshift(item);
    writeAll(current.slice(0, MAX_ITEMS));
    return item;
  }

  function markAllRead() {
    const current = readAll().map(n => ({ ...n, read: true }));
    writeAll(current);
  }

  function removeById(id) {
    const current = readAll();
    const next = current.filter(n => String(n.id) !== String(id));
    writeAll(next);
  }

  function unreadCount() {
    return readAll().filter(n => !n.read).length;
  }

  window.SmartNotify = {
    getAll: readAll,
    push,
    markAllRead,
    removeById,
    unreadCount
  };
})();

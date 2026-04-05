(function () {
  const STORAGE_KEY = 'smarttravel_notifications';
  const MAX_ITEMS = 30;

  function readAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeAll(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

(function () {
  const INACTIVITY_MS = 10 * 60 * 1000; // 10 phút
  const EVENTS = ["click", "mousemove", "keydown", "scroll", "touchstart"];
  const STORAGE_KEY = "smarttravel_last_activity";

  let timeoutId = null;

  function parseJwt(token) {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
      return null;
    }
  }

  function hasValidAccessToken() {
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    const payload = parseJwt(token);
    return !!(payload && payload.exp * 1000 > Date.now());
  }

  function clearAuthAndRedirect() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem(STORAGE_KEY);
    const msg = encodeURIComponent("Phien dang nhap da het han do khong hoat dong qua 5 phut.");
    window.location.href = "/auth/login?msg=" + msg;
  }

  function doAutoLogout() {
    if (!hasValidAccessToken()) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (typeof window.doLogout === "function") {
      localStorage.removeItem(STORAGE_KEY);
      window.doLogout();
      return;
    }
    clearAuthAndRedirect();
  }

  function markActivity() {
    if (!hasValidAccessToken()) return;
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    scheduleTimeout();
  }

  function scheduleTimeout() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
    const elapsed = Date.now() - last;
    const remaining = INACTIVITY_MS - elapsed;
    if (remaining <= 0) {
      doAutoLogout();
      return;
    }
    timeoutId = setTimeout(doAutoLogout, remaining);
  }

  function initInactivityLogout() {
    if (!hasValidAccessToken()) return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    scheduleTimeout();
    EVENTS.forEach(function (eventName) {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
    window.addEventListener("focus", scheduleTimeout);
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY || event.key === "access_token") {
        scheduleTimeout();
      }
    });
  }

  window.initInactivityLogout = initInactivityLogout;
})();
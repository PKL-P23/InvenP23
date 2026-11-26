// Apply the palette before the first paint, including on direct asset links.
(() => {
  const key = 'pinjambalik.theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  const browserTint = document.querySelector('meta[name="theme-color"]');
  let preference = null;
  let button;

  function readPreference() {
    try {
      const stored = localStorage.getItem(key);
      preference = stored === 'dark' || stored === 'light' ? stored : null;
    } catch {
      // When storage is unavailable the choice lasts for this page.
    }
  }

  function applyTheme() {
    const dark = preference ? preference === 'dark' : system.matches;
    root.dataset.theme = dark ? 'dark' : 'light';
    browserTint.content = dark ? '#132228' : '#f7f8f6';
    if (button) {
      button.setAttribute('aria-checked', String(dark));
      button.title = dark ? 'Gunakan mode terang' : 'Gunakan mode gelap';
    }
  }

  readPreference();
  applyTheme();
  system.addEventListener('change', applyTheme);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      readPreference();
      applyTheme();
    }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      readPreference();
      applyTheme();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.side-bottom');
    const toolbar = document.querySelector('.bar-meta');
    if (!sidebar || !toolbar) return;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-label', 'Mode gelap');
    button.innerHTML = `<span class="theme-track" aria-hidden="true">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
      <svg viewBox="0 0 24 24"><path d="M20.5 14a8.6 8.6 0 0 1-10.6-10.6A9 9 0 1 0 20.5 14Z"/></svg>
    </span>`;
    button.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* Page-only preference. */ }
      applyTheme();
    });
    const mobile = window.matchMedia('(max-width: 900px)');
    function placeButton() {
      const focused = button === document.activeElement;
      if (mobile.matches) toolbar.append(button);
      else sidebar.prepend(button);
      if (focused) button.focus({ preventScroll: true });
    }
    placeButton();
    applyTheme();
    mobile.addEventListener('change', placeButton);
  });
})();

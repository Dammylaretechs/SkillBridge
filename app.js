// Shared navigation, view switching and small UI utilities.
(() => {
  const views = {
    landing: document.getElementById('landingView'),
    auth: document.getElementById('authView'),
    app: document.getElementById('appView')
  };
  const toast = document.getElementById('toast');
  let toastTimer;

  window.SkillBridge = {
    showToast(message) {
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    },
    showView(name) {
      Object.values(views).forEach(view => view.classList.add('hidden'));
      (views[name] || views.landing).classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    openPage(page) {
      document.querySelectorAll('.app-page').forEach(section => section.classList.remove('active'));
      const target = document.getElementById(`page-${page}`);
      if (!target) return;
      target.classList.add('active');
      document.querySelectorAll('.side-link[data-page]').forEach(link => link.classList.toggle('active', link.dataset.page === page));
      const label = ({ dashboard: 'Overview', skills: 'My skills', learning: 'Learning centre', opportunities: 'Opportunities', profile: 'My profile' })[page] || 'Overview';
      document.getElementById('pageCrumb').textContent = label;
      document.getElementById('sidebar').classList.remove('open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  document.addEventListener('click', event => {
    const viewTrigger = event.target.closest('[data-view]');
    if (viewTrigger) {
      event.preventDefault();
      const destination = viewTrigger.dataset.view;
      if (destination === 'login' || destination === 'signup') {
        window.SkillBridge.showView('auth');
        window.Auth?.setTab(destination);
      } else if (destination === 'dashboard') {
        window.SkillBridge.showView('app');
        window.SkillBridge.openPage('dashboard');
      } else {
        window.SkillBridge.showView(destination);
      }
    }
    const pageTrigger = event.target.closest('[data-page]');
    if (pageTrigger) {
      const page = pageTrigger.dataset.page;
      window.SkillBridge.showView('app');
      window.SkillBridge.openPage(page);
    }
  });

  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    const header = document.querySelector('.site-header');
    header.classList.toggle('menu-open');
    document.getElementById('mobileMenuBtn').setAttribute('aria-expanded', header.classList.contains('menu-open'));
  });
  document.getElementById('appMenuBtn')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('notificationBtn')?.addEventListener('click', () => window.SkillBridge.showToast('You are all caught up.'));

  // Theme preference: shared across landing, authentication and workspace.
  const themeButtons = () => document.querySelectorAll('[data-theme-toggle]');
  function applyTheme(theme, persist = false) {
    const selected = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = selected;
    document.body.dataset.theme = selected;
    themeButtons().forEach(button => {
      const darkActive = selected === 'dark';
      button.setAttribute('aria-label', darkActive ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('title', darkActive ? 'Switch to light mode' : 'Switch to dark mode');
      const icon = button.querySelector('.theme-toggle-icon');
      const label = button.querySelector('.theme-toggle-label');
      if (icon) icon.textContent = darkActive ? '☀' : '☾';
      if (label) label.textContent = button.classList.contains('theme-toggle-compact')
        ? (darkActive ? 'Light' : 'Dark')
        : (darkActive ? 'Light mode' : 'Dark mode');
    });
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', selected === 'dark' ? '#101a25' : '#0b1728');
    if (persist) {
      try { localStorage.setItem('skillbridge-theme', selected); } catch (_) {}
    }
  }
  applyTheme(document.documentElement.dataset.theme || 'light');
  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-theme-toggle]');
    if (!toggle) return;
    const current = document.documentElement.dataset.theme || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark', true);
  });

  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
})();

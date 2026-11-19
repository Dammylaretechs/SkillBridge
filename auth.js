// PostgreSQL-backed authentication. The server owns credentials and sessions.
(() => {
  let activeUser = null;
  const initials = name => (name || 'User').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  async function api(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  }
  function enterApp(user) {
    activeUser = user;
    window.Dashboard?.loadUser(user);
    window.Skills?.render();
    window.SkillBridge.showView('app');
    window.SkillBridge.openPage('dashboard');
  }
  const auth = {
    setTab(tab) {
      const signup = tab === 'signup';
      document.getElementById('loginFormWrap').classList.toggle('hidden', signup);
      document.getElementById('signupFormWrap').classList.toggle('hidden', !signup);
      document.getElementById('loginTab').classList.toggle('active', !signup);
      document.getElementById('signupTab').classList.toggle('active', signup);
    },
    currentUser: () => activeUser,
    async updateUser(updated) {
      const data = await api('/api/profile', { method: 'PUT', body: JSON.stringify(updated) });
      activeUser = data.user;
      window.Dashboard?.loadUser(activeUser);
      window.Skills?.render();
      return activeUser;
    },
    async logout() {
      try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); }
      catch (error) { window.SkillBridge.showToast(error.message); }
      activeUser = null;
      window.SkillBridge.showView('landing');
      window.SkillBridge.showToast('You have logged out.');
    },
    async refreshUser() {
      const data = await api('/api/auth/me');
      activeUser = data.user;
      return activeUser;
    }
  };
  window.Auth = auth;

  document.getElementById('loginTab').addEventListener('click', () => auth.setTab('login'));
  document.getElementById('signupTab').addEventListener('click', () => auth.setTab('signup'));
  document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => auth.setTab(button.dataset.authTab)));
  document.querySelectorAll('[data-toggle]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.toggle);
    input.type = input.type === 'password' ? 'text' : 'password';
    button.textContent = input.type === 'password' ? 'Show' : 'Hide';
  }));

  document.getElementById('signupForm').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    const payload = {
      name: document.getElementById('signupName').value.trim(),
      email: document.getElementById('signupEmail').value.trim().toLowerCase(),
      password: document.getElementById('signupPassword').value,
      goal: document.getElementById('signupGoal').value
    };
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
      enterApp(data.user);
      window.SkillBridge.showToast('Welcome to SkillBridge, ' + data.user.name.split(' ')[0] + '!');
      event.currentTarget.reset();
    } catch (error) { window.SkillBridge.showToast(error.message); }
    finally { submit.disabled = false; }
  });

  document.getElementById('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    const payload = {
      email: document.getElementById('loginEmail').value.trim().toLowerCase(),
      password: document.getElementById('loginPassword').value
    };
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
      enterApp(data.user);
      window.SkillBridge.showToast('Welcome back, ' + data.user.name.split(' ')[0] + '!');
      event.currentTarget.reset();
    } catch (error) { window.SkillBridge.showToast(error.message); }
    finally { submit.disabled = false; }
  });

  document.getElementById('logoutBtn').addEventListener('click', auth.logout);

  (async () => {
    try {
      const user = await auth.refreshUser();
      if (user) enterApp(user);
      else window.SkillBridge.showView('landing');
    } catch (error) {
      console.error('Could not restore SkillBridge session:', error);
      window.SkillBridge.showView('landing');
      window.SkillBridge.showToast('Unable to connect to SkillBridge. Please refresh the page.');
    }
  })();
})();

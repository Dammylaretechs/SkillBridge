// In-site course discovery across supported learning platforms.
(() => {
  const input = document.getElementById('courseSearch');
  const button = document.getElementById('courseSearchBtn');
  const refresh = document.getElementById('refreshCoursesBtn');
  const results = document.getElementById('courseResults');
  const status = document.getElementById('courseSearchStatus');
  if (!input || !results || !status) return;
  let selectedPlatform = '';
  let lastSearch = null;

  function makeCard(item) {
    const article = document.createElement('article'); article.className = 'discovery-result-card course-result-card';
    const top = document.createElement('div'); top.className = 'discovery-result-top';
    const source = document.createElement('span'); source.className = 'result-source'; source.textContent = item.source || 'Learning resource';
    const title = document.createElement('h3'); title.textContent = item.title;
    const desc = document.createElement('p'); desc.className = 'result-description'; desc.textContent = item.description || 'Open the provider page to view course details.';
    const link = document.createElement('a'); link.className = 'btn btn-outline result-link'; link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'View course ↗';
    top.append(source); article.append(top, title, desc, link); return article;
  }

  async function search(refreshing = false) {
    const query = input.value.trim();
    if (!query) { input.focus(); window.SkillBridge?.showToast?.('Enter a skill or subject to find courses.'); return; }
    lastSearch = { kind: 'courses', query, filters: { platform: selectedPlatform } };
    status.textContent = refreshing ? 'Checking saved learning resources…' : 'Searching SkillBridge learning resources…';
    results.innerHTML = '<div class="loading-results">Searching your SkillBridge database…</div>';
    document.getElementById('courseResultsTitle').textContent = selectedPlatform ? `Courses on ${selectedPlatform === 'freecodecamp' ? 'freeCodeCamp' : selectedPlatform[0].toUpperCase() + selectedPlatform.slice(1)}` : 'Course search results';
    try {
      const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lastSearch) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Course search could not be completed.');
      results.replaceChildren();
      if (!data.results?.length) results.innerHTML = '<div class="empty-results"><strong>No course listings found.</strong><p>Try another keyword or choose a different learning platform.</p></div>';
      else data.results.forEach(item => results.append(makeCard(item)));
      status.textContent = `${data.results.length} course/resource database results found · Updated ${new Date(data.updatedAt).toLocaleTimeString()}`;
      document.getElementById('courseResultsMeta').textContent = `Showing SkillBridge database results for “${query}”${selectedPlatform ? ` from ${selectedPlatform}` : ' across supported learning platforms'}.`;
    } catch (error) {
      results.innerHTML = '<div class="empty-results"><strong>Course database search is not available yet.</strong><p></p></div>';
      results.querySelector('p').textContent = error.message;
      status.textContent = 'Course search unavailable';
    }
  }

  button?.addEventListener('click', () => search());
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); search(); } });
  refresh?.addEventListener('click', () => search(true));
  document.getElementById('allPlatformsBtn')?.addEventListener('click', () => {
    selectedPlatform = '';
    document.querySelectorAll('[data-platform]').forEach(buttonEl => buttonEl.classList.remove('platform-selected'));
    if (input.value.trim()) search();
    else status.textContent = 'All platforms selected. Enter a topic to search across learning providers.';
  });
  document.querySelectorAll('[data-platform]').forEach(cardButton => cardButton.addEventListener('click', () => {
    selectedPlatform = cardButton.dataset.platform;
    document.querySelectorAll('[data-platform]').forEach(buttonEl => buttonEl.classList.toggle('platform-selected', buttonEl === cardButton));
    if (!input.value.trim()) { input.focus(); status.textContent = `Selected ${selectedPlatform}. Enter a topic, then choose Find courses.`; return; }
    search();
  }));
})();

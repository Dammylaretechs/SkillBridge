// Live opportunity discovery. Results are fetched by the SkillBridge server and rendered in-page.
(() => {
  const form = document.getElementById('opportunitySearchForm');
  const results = document.getElementById('opportunityResults');
  const status = document.getElementById('opportunitySearchStatus');
  if (!form || !results || !status) return;
  let lastSearch = null;
  const get = id => document.getElementById(id)?.value.trim() || '';

  function card(item) {
    const article = document.createElement('article'); article.className = 'discovery-result-card';
    const top = document.createElement('div'); top.className = 'discovery-result-top';
    const source = document.createElement('span'); source.className = 'result-source'; source.textContent = item.source || 'Web result';
    const title = document.createElement('h3'); title.textContent = item.title;
    const desc = document.createElement('p'); desc.className = 'result-description'; desc.textContent = item.description || 'Open the source page for more information.';
    const link = document.createElement('a'); link.className = 'btn btn-outline result-link'; link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'View opportunity ↗';
    top.append(source); article.append(top, title, desc, link); return article;
  }

  async function search(refresh = false) {
    const payload = lastSearch || {
      kind: 'opportunities', query: get('opportunitySearch') || get('opportunityType') || 'opportunities',
      filters: { type: get('opportunityType'), location: get('opportunityLocation'), mode: get('opportunityMode'), level: get('opportunityLevel'), pay: get('opportunityPay') }
    };
    if (!payload.query) { window.SkillBridge?.showToast?.('Enter a keyword or choose a filter to search.'); return; }
    lastSearch = payload;
    status.textContent = refresh ? 'Checking the latest saved listings…' : 'Searching SkillBridge listings…';
    results.innerHTML = '<div class="loading-results">Searching your SkillBridge database…</div>';
    document.getElementById('opportunityResultsTitle').textContent = 'Search results';
    try {
      const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search could not be completed.');
      results.replaceChildren();
      if (!data.results?.length) {
        results.innerHTML = '<div class="empty-results"><strong>No matching results found.</strong><p>Try broader keywords, a different location or fewer filters.</p></div>';
      } else data.results.forEach(item => results.append(card(item)));
      status.textContent = `${data.results.length} database results found · Updated ${new Date(data.updatedAt).toLocaleTimeString()}`;
      document.getElementById('opportunityResultsMeta').textContent = `Results for “${payload.query}” · Listings are managed in SkillBridge.`;
    } catch (error) {
      results.innerHTML = '<div class="empty-results"><strong>Database search is not available yet.</strong><p></p></div>';
      results.querySelector('p').textContent = error.message;
      status.textContent = 'Search unavailable';
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const query = get('opportunitySearch') || get('opportunityType') || 'opportunities';
    lastSearch = { kind: 'opportunities', query, filters: { type: get('opportunityType'), location: get('opportunityLocation'), mode: get('opportunityMode'), level: get('opportunityLevel'), pay: get('opportunityPay') } };
    search();
  });
  document.getElementById('refreshOpportunitiesBtn')?.addEventListener('click', () => search(true));
  document.querySelectorAll('[data-opportunity-suggestion]').forEach(button => button.addEventListener('click', () => {
    document.getElementById('opportunitySearch').value = button.dataset.opportunitySuggestion;
    form.requestSubmit();
  }));
})();

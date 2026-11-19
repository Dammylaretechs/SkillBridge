// User skills are stored in the SkillBridge PostgreSQL database.
(() => {
  const form = document.getElementById('skillForm');
  const input = document.getElementById('skillInput');
  const level = document.getElementById('skillLevel');
  const list = document.getElementById('skillList');
  if (!form || !input || !level || !list) return;

  function render() {
    const skills = window.Auth?.currentUser()?.skills || [];
    list.replaceChildren();
    if (!skills.length) {
      list.innerHTML = '<div class="empty-state"><span>⌘</span><strong>Your skills will appear here</strong><p>Add a skill you already have or want to develop.</p></div>';
    } else {
      skills.forEach(skill => {
        const chip = document.createElement('div'); chip.className = 'skill-chip';
        const name = document.createElement('strong'); name.textContent = skill.name;
        const detail = document.createElement('small'); detail.textContent = skill.level;
        const remove = document.createElement('button'); remove.type = 'button'; remove.setAttribute('aria-label', 'Remove ' + skill.name); remove.textContent = '×';
        remove.addEventListener('click', async () => {
          try {
            const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}`, { method: 'DELETE', credentials: 'same-origin' });
            const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to remove skill.');
            const user = await window.Auth.refreshUser(); window.Dashboard?.loadUser(user); render();
          } catch (error) { window.SkillBridge.showToast(error.message); }
        });
        chip.append(name, detail, remove); list.appendChild(chip);
      });
    }
    window.Dashboard?.refresh();
  }
  async function addSkill(name, skillLevel) {
    if (!window.Auth?.currentUser()) return;
    try {
      const response = await fetch('/api/skills', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, level: skillLevel }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to add skill.');
      const user = await window.Auth.refreshUser(); window.Dashboard?.loadUser(user); render();
      window.SkillBridge.showToast('Skill added to your profile.');
    } catch (error) { window.SkillBridge.showToast(error.message); }
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); const name = input.value.trim(); if (!name) return;
    addSkill(name, level.value); input.value = '';
  });
  document.querySelectorAll('[data-skill]').forEach(button => button.addEventListener('click', () => addSkill(button.dataset.skill, 'Beginner')));
  window.Skills = { render };
  document.querySelector('[data-page="skills"]')?.addEventListener('click', () => setTimeout(render, 0));
})();

// Dashboard and profile rendering.
(() => {
  const initials = name => (name || 'User').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  function renderAvatar(element, image, fallback) {
    if (!element) return;
    element.replaceChildren();
    if (image) {
      const photo = document.createElement('img');
      photo.src = image;
      photo.alt = 'Profile photograph';
      element.appendChild(photo);
      element.classList.add('has-profile-image');
    } else {
      element.textContent = fallback;
      element.classList.remove('has-profile-image');
    }
  }

  function render(user) {
    if (!user) return;
    const firstName = user.name.trim().split(/\s+/)[0] || 'there';
    document.getElementById('welcomeName').textContent = firstName;
    document.getElementById('topUserName').textContent = firstName;
    renderAvatar(document.getElementById('topAvatar'), user.profileImage, initials(user.name));
    renderAvatar(document.getElementById('profileAvatar'), user.profileImage, initials(user.name));
    document.getElementById('profileDisplayName').textContent = user.name;
    document.getElementById('profileDisplayEmail').textContent = user.email;
    document.getElementById('profileName').value = user.name;
    document.getElementById('profileLocation').value = user.location || '';
    document.getElementById('profileInterest').value = user.interest || 'Still exploring';
    document.getElementById('profileBio').value = user.bio || '';
    document.getElementById('goalTitle').textContent = user.goal || 'Explore career options';
    document.getElementById('goalDescription').textContent = 'Your profile and learning recommendations can be shaped around this goal.';
    document.getElementById('skillsCount').textContent = (user.skills || []).length;
    const completed = [user.name, user.location, user.interest && user.interest !== 'Still exploring' ? user.interest : '', user.bio, (user.skills || []).length ? 'skills' : ''].filter(Boolean).length;
    const percent = Math.min(100, 25 + completed * 15);
    document.getElementById('profilePercent').textContent = percent + '%';
    document.getElementById('profileBar').style.width = percent + '%';
  }
  window.Dashboard = {
    loadUser: render,
    refresh() { render(window.Auth?.currentUser()); }
  };
  document.getElementById('profileForm').addEventListener('submit', async event => {
    event.preventDefault();
    const user = window.Auth.currentUser();
    if (!user) return;
    const updated = { ...user, name: document.getElementById('profileName').value.trim(), location: document.getElementById('profileLocation').value.trim(), interest: document.getElementById('profileInterest').value, bio: document.getElementById('profileBio').value.trim() };
    try { const saved = await window.Auth.updateUser(updated); render(saved); window.SkillBridge.showToast('Your profile has been updated.'); }
    catch (error) { window.SkillBridge.showToast(error.message); }
  });


  const imageInput = document.getElementById('profileImageInput');
  const removeImageButton = document.getElementById('removeProfileImage');
  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      window.SkillBridge.showToast('Please choose a JPG, PNG or WebP image.');
      imageInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.SkillBridge.showToast('Choose an image smaller than 5 MB.');
      imageInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 480;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const user = window.Auth?.currentUser();
        if (!user) return;
        user.profileImage = canvas.toDataURL('image/jpeg', 0.82);
        window.Auth.updateUser(user).then(saved => {
          render(saved);
          window.SkillBridge.showToast('Profile photograph updated.');
        }).catch(() => window.SkillBridge.showToast('The image could not be saved. Try a smaller photo.'));
        imageInput.value = '';
      };
      image.onerror = () => window.SkillBridge.showToast('That image could not be opened.');
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  removeImageButton?.addEventListener('click', () => {
    const user = window.Auth?.currentUser();
    if (!user?.profileImage) return window.SkillBridge.showToast('There is no profile photograph to remove.');
    delete user.profileImage;
    window.Auth.updateUser(user).then(saved => { render(saved); window.SkillBridge.showToast('Profile photograph removed.'); })
      .catch(error => window.SkillBridge.showToast(error.message));
  });
})();

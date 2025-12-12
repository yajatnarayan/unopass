const overlayId = 'unopass-autofill-toast';

function showToast(message) {
  let toast = document.getElementById(overlayId);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = overlayId;
    toast.style.position = 'fixed';
    toast.style.bottom = '16px';
    toast.style.right = '16px';
    toast.style.zIndex = '2147483647';
    toast.style.padding = '10px 14px';
    toast.style.background = '#0f172a';
    toast.style.color = '#e2e8f0';
    toast.style.border = '1px solid #22d3ee';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2400);
}

function findFields() {
  const password = document.querySelector('input[type="password"]');
  if (!password) return null;

  const candidates = Array.from(
    document.querySelectorAll(
      'input[type="email"], input[type="text"], input[type="tel"], input:not([type])'
    )
  ).filter((el) => el !== password);

  const username = candidates.find((el) => {
    const name = (el.getAttribute('name') || '').toLowerCase();
    return name.includes('user') || name.includes('login') || name.includes('email');
  }) || candidates[0];

  return { username, password };
}

function fillCredential(entry) {
  const fields = findFields();
  if (!fields) {
    showToast('No form fields detected on this page.');
    return;
  }

  const { username, password } = fields;

  if (username) {
    username.focus();
    username.value = entry.username;
    username.dispatchEvent(new Event('input', { bubbles: true }));
    username.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (password) {
    password.value = entry.password;
    password.dispatchEvent(new Event('input', { bubbles: true }));
    password.dispatchEvent(new Event('change', { bubbles: true }));
  }
  showToast('UnoPass filled credentials.');
}

function requestFill() {
  chrome.runtime.sendMessage(
    { type: 'REQUEST_CREDS', domain: window.location.hostname },
    (response) => {
      if (!response) {
        showToast('Unable to reach UnoPass extension.');
        return;
      }
      if (response.error) {
        showToast(response.error);
        return;
      }
      fillCredential(response.entry);
    }
  );
}

document.addEventListener('keydown', (e) => {
  if (e.altKey && e.shiftKey && e.code === 'KeyL') {
    e.preventDefault();
    requestFill();
  }
});

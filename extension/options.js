const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');

chrome.storage.local.get(['sessionToken'], (result) => {
  if (result.sessionToken) {
    tokenInput.value = result.sessionToken;
  }
});

document.getElementById('save').addEventListener('click', () => {
  const value = tokenInput.value.trim();
  if (!value) {
    statusEl.textContent = 'Please enter a session token';
    statusEl.style.color = '#f87171';
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.style.color = '';
    }, 2000);
    return;
  }
  chrome.storage.local.set({ sessionToken: value }, () => {
    statusEl.textContent = 'Saved. You can now autofill with Alt + Shift + L.';
    statusEl.style.color = '#34d399';
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.style.color = '';
    }, 2000);
  });
});

document.getElementById('clear').addEventListener('click', () => {
  chrome.storage.local.remove('sessionToken', () => {
    tokenInput.value = '';
    statusEl.textContent = 'Token cleared. Autofill disabled.';
    statusEl.style.color = '#fbbf24';
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.style.color = '';
    }, 2000);
  });
});

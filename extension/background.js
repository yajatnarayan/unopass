const API_BASE = 'http://localhost:4000/api';

async function getSessionToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sessionToken'], (result) => resolve(result.sessionToken));
  });
}

async function fetchCredential(domain) {
  const token = await getSessionToken();
  if (!token) {
    return { error: 'Set your session token in the extension options.' };
  }

  try {
    const res = await fetch(`${API_BASE}/autofill?domain=${encodeURIComponent(domain)}`, {
      headers: { 'X-Session-Token': token },
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Vault locked or request failed.' };
    }
    const entry = data.entries?.[0];
    if (!entry) return { error: 'No matching credential for this domain.' };
    return { entry };
  } catch (err) {
    return { error: 'Unable to reach local UnoPass server.' };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'REQUEST_CREDS') {
    fetchCredential(message.domain).then((result) => sendResponse(result));
    return true;
  }
  return false;
});

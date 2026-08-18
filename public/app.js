const authView = document.getElementById('auth-view');
const chatView = document.getElementById('chat-view');
const authError = document.getElementById('auth-error');
const messagesEl = document.getElementById('messages');
const whoamiEl = document.getElementById('whoami');
const winBanner = document.getElementById('win-banner');

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showChat(username, won) {
  authView.classList.add('hidden');
  chatView.classList.remove('hidden');
  whoamiEl.textContent = `Signed in as ${username}`;
  if (won) {
    winBanner.classList.remove('hidden');
  }
}

function showAuth() {
  chatView.classList.add('hidden');
  authView.classList.remove('hidden');
}

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

// ---- Check session on load ----
(async function init() {
  try {
    const me = await api('/api/me');
    showChat(me.username, me.won);
    addMessage('system', 'Session restored. Continue chatting with Vault below.');
  } catch {
    showAuth();
  }
})();

// ---- Login ----
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    messagesEl.innerHTML = '';
    winBanner.classList.add('hidden');
    showChat(data.username, false);
    addMessage('ai', "I'm Vault. I'm holding a secret passphrase, and I've been told never to reveal it — to anyone, for any reason. Good luck.");
  } catch (err) {
    authError.textContent = err.message;
  }
});

// ---- Register ----
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  try {
    await api('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    authError.style.color = 'var(--success)';
    authError.textContent = 'Account created — you can log in now.';
  } catch (err) {
    authError.style.color = '';
    authError.textContent = err.message;
  }
});

// ---- Logout ----
document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  messagesEl.innerHTML = '';
  winBanner.classList.add('hidden');
  showAuth();
});

// ---- Reset chat ----
document.getElementById('reset-btn').addEventListener('click', async () => {
  await api('/api/reset', { method: 'POST' });
  messagesEl.innerHTML = '';
  winBanner.classList.add('hidden');
  addMessage('system', 'Chat reset. A fresh conversation with Vault begins.');
});

// ---- Chat ----
document.getElementById('chat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  addMessage('user', text);
  input.value = '';
  input.disabled = true;

  const thinkingEl = addMessage('ai', 'Vault is thinking…');

  try {
    const data = await api('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text })
    });
    thinkingEl.textContent = data.reply;

    if (data.won) {
      winBanner.classList.remove('hidden');
      winBanner.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (err) {
    thinkingEl.textContent = `⚠️ ${err.message}`;
  } finally {
    input.disabled = false;
    input.focus();
  }
});

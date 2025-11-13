// Pequeno helper para chamadas à API com tratamento e reuso
window.api = {
  async get(path) {
    const res = await fetch(path, { credentials: 'same-origin' });
    if (!res.ok) throw res;
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body), credentials: 'same-origin' });
    if (!res.ok) throw res;
    return res.json();
  },
  async patch(path, body) {
    const res = await fetch(path, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body), credentials: 'same-origin' });
    if (!res.ok) throw res;
    return res.json();
  },
  async del(path) {
    const res = await fetch(path, { method: 'DELETE', credentials: 'same-origin' });
    if (!res.ok) throw res;
    return res.json();
  }
};

// Gerencia login local e resposta do Google Identity
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('localLogin');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    try {
      const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) { showToast(data.mensagem || 'Credenciais inválidas','danger'); return; }
      // redireciona para o dashboard
      window.location.href = '/dashboard.html';
    } catch (err) {
      console.error(err);
      showToast('Erro no login','danger');
    }
  });

  // Renderiza botão do Google
  window.handleCredentialResponse = async (response) => {
    try {
      const id_token = response.credential;
      const res = await fetch('/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_token }) });
      const data = await res.json();
      if (!res.ok) { showToast(data.mensagem || 'Erro no login Google','danger'); return; }
      window.location.href = '/dashboard.html';
    } catch (err) {
      console.error('Google login error', err);
      showToast('Erro no login Google','danger');
    }
  };

  // Renderiza botão após biblioteca do Google carregar
  function renderGoogleButton() {
    if (window.google && window.google.accounts) {
      try {
        google.accounts.id.renderButton(
          document.getElementById('googleButton'), 
          { theme: 'outline', size: 'large', text: 'signin_with', locale: 'pt-BR' }
        );
        console.log('Google button rendered');
      } catch (err) {
        console.error('Failed to render Google button:', err);
        document.getElementById('googleButton').innerHTML = '<p style="color:#999;">Login Google indisponível</p>';
      }
    } else {
      // Tenta novamente após um tempo se o script do Google ainda não carregou
      setTimeout(renderGoogleButton, 100);
    }
  }
  
  renderGoogleButton();
});

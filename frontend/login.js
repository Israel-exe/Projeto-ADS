// Gerencia login local
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('localLogin');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
      showToast('Preencha usuário e senha', 'warning');
      return;
    }
    
    try {
      const res = await fetch('/login', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username, password }) 
      });
      
      const data = await res.json();
      
      if (!res.ok) { 
        showToast(data.mensagem || 'Credenciais inválidas', 'danger'); 
        return; 
      }
      
      // Login bem-sucedido
      showToast('Login realizado com sucesso!', 'success');
      setTimeout(() => window.location.href = '/dashboard.html', 500);
      
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      showToast('Erro ao conectar com o servidor', 'danger');
    }
  });
});

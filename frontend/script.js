// Toggle menu mobile
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', (!expanded).toString());
    });
    // Fechar ao clicar em link (experiência melhor em mobile)
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if (nav.classList.contains('open')) {
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }
});

async function loadServices() {
  try {
    const res = await fetch('/api/services');
    const services = await res.json();
    const container = document.getElementById('services');
    container.innerHTML = '';
    services.forEach(s => {
      const card = document.createElement('div');
      card.className = 'service-card';
      card.innerHTML = `
        <div class="service-icon">🛠️</div>
        <h3>${s.name}</h3>
        <p>${s.description}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Erro ao carregar serviços', err);
  }
}

loadServices();

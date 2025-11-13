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

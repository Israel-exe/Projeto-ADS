async function loadRequests() {
  const res = await fetch('/api/requests');
  const list = await res.json();
  
  // Ordenar: concluídos por último
  const sorted = list.sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  const container = document.getElementById('requests');
  container.innerHTML = '';
  sorted.forEach(r => {
    const el = document.createElement('div');
    el.className = 'col-12 col-md-6 col-lg-4';
    // Formata a data/hora para exibição amigável
    const data = new Date(r.createdAt);
    const dataFormatada = data.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Define badge color baseado no status
    const badgeClass = r.status === 'completed' ? 'bg-success' : 'bg-secondary';
    
    // Botão de concluir só aparece se não estiver concluído
    const completeBtn = r.status !== 'completed' 
      ? `<button data-id="${r.id}" class="btn btn-success complete" title="Concluir"><i class="bi bi-check2-circle"></i></button>`
      : '';

    el.innerHTML = `
      <div class="card h-100 shadow-sm ${r.status === 'completed' ? 'opacity-75' : ''}">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title mb-1">${r.name} <span class="badge ${badgeClass} text-uppercase">${r.status === 'completed' ? 'concluído' : r.status}</span></h5>
          <p class="text-muted mb-2"><small>Solicitado em: ${dataFormatada}</small></p>
          <p class="mb-1"><strong>Problema:</strong> ${r.problem || '-'}</p>
          <p class="mb-1"><strong>Equipamento:</strong> ${r.brand || '-'} - ${r.model || '-'}</p>
          <p class="mb-1"><strong>Endereço:</strong> ${r.address || '-'}</p>
          <p class="mb-3"><strong>Contato:</strong> ${r.phone || '-'} ${r.email || ''}</p>
          <div class="mt-auto btn-group btn-group-sm" role="group">
            <button data-id="${r.id}" class="btn btn-outline-primary edit" title="Editar"><i class="bi bi-pencil"></i></button>
            <button data-id="${r.id}" class="btn btn-outline-danger delete" title="Excluir"><i class="bi bi-trash"></i></button>
            ${completeBtn}
          </div>
        </div>
      </div>
    `;
    container.appendChild(el);
  });

  document.querySelectorAll('.complete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const res = await fetch(`/api/requests/${id}/complete`, { method: 'POST' });
      if (!res.ok) return showToast('Falha ao concluir','danger');
      showToast('Solicitação concluída','success');
      loadRequests();
    });
  });

  // Handlers de edição
  document.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      // Carrega detalhes da solicitação do servidor
      try {
        const res = await fetch('/api/requests');
        const all = await res.json();
        const item = all.find(x => x.id === id);
        if (!item) return showToast('Solicitação não encontrada','danger');
        // Preenche o modal
        document.getElementById('editId').value = item.id;
        document.getElementById('editName').value = item.name || '';
        document.getElementById('editPhone').value = item.phone || '';
        document.getElementById('editEmail').value = item.email || '';
        document.getElementById('editAddress').value = item.address || '';
        document.getElementById('editBrand').value = item.brand || '';
        document.getElementById('editModel').value = item.model || '';
        document.getElementById('editProblem').value = item.problem || '';
        document.getElementById('editPreferredTime').value = item.preferredTime || '';
        const modalEl = document.getElementById('editModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      } catch (err) { console.error(err); showToast('Erro ao carregar','danger'); }
    });
  });

  // Handlers de exclusão
  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!confirm('Confirma exclusão desta solicitação?')) return;
      const id = e.target.dataset.id;
      try {
        const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
        if (!res.ok) return showToast('Falha ao excluir','danger');
        showToast('Solicitação excluída','warning');
        loadRequests();
      } catch (err) { console.error(err); showToast('Erro ao excluir','danger'); }
    });
  });

  // Envio do formulário do modal
  const editForm = document.getElementById('editForm');
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const body = {
      name: document.getElementById('editName').value,
      phone: document.getElementById('editPhone').value,
      email: document.getElementById('editEmail').value,
      address: document.getElementById('editAddress').value,
      brand: document.getElementById('editBrand').value,
      model: document.getElementById('editModel').value,
      problem: document.getElementById('editProblem').value,
      preferredTime: document.getElementById('editPreferredTime').value
    };
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!res.ok) return showToast('Falha ao salvar','danger');
      
      // Fecha o modal corretamente removendo o backdrop
      const modalEl = document.getElementById('editModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      
      showToast('Alterações salvas','success');
      loadRequests();
    } catch (err) { console.error(err); showToast('Erro ao salvar','danger'); }
  });

  document.getElementById('cancelEdit')?.addEventListener('click', () => {
    const modalEl = document.getElementById('editModal');
    const m = bootstrap.Modal.getInstance(modalEl);
    m && m.hide();
  });
}

// Handler de logout
document.getElementById('logoutForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch('/logout', { method: 'POST' });
    if (res.ok) {
      showToast('Logout realizado com sucesso', 'success');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 500);
    } else {
      showToast('Erro ao fazer logout', 'danger');
    }
  } catch (err) {
    console.error('Erro no logout:', err);
    showToast('Erro ao fazer logout', 'danger');
  }
});

loadRequests().catch(console.error);

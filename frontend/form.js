const form = document.getElementById('leadForm');
const resultEl = document.getElementById('result');
const submitBtn = document.getElementById('submitBtn');

function validateEmail(email) {
  if (!email) return true;
  // Regex simples: algo@algo.algo
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  if (!phone) return false;
  // Aceita apenas 11 dígitos (formato (DD) 9XXXX-XXXX)
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11;
}

function showErrors(errors) {
  resultEl.innerHTML = '';
  if (errors.length === 0) return;
  const ul = document.createElement('ul');
  ul.style.color = 'crimson';
  errors.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = msg;
    ul.appendChild(li);
  });
  resultEl.appendChild(ul);
}

function highlightInvalidFields() {
  // Remove destaques anteriores
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  
  // Destaca campos com base na validação atual
  const name = form.name.value && form.name.value.trim();
  const phone = form.phone.value && form.phone.value.trim();
  const email = form.email.value && form.email.value.trim();
  const address = form.address.value && form.address.value.trim();
  const brand = form.brand.value;
  const outraMarca = form.outraMarca?.value && form.outraMarca.value.trim();
  const preferredTime = form.preferredTime.value && form.preferredTime.value.trim();
  const problem = form.problem.value && form.problem.value.trim();
  
  if (!name) form.name.classList.add('is-invalid');
  if (!validatePhone(phone)) form.phone.classList.add('is-invalid');
  if (email && !validateEmail(email)) form.email.classList.add('is-invalid');
  if (!address) form.address.classList.add('is-invalid');
  if (!brand) form.brand.classList.add('is-invalid');
  if (brand === 'outra' && !outraMarca) form.outraMarca.classList.add('is-invalid');
  if (!preferredTime) form.preferredTime.classList.add('is-invalid');
  if (!problem) form.problem.classList.add('is-invalid');
}

function clearFieldHighlight(field) {
  field.classList.remove('is-invalid');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultEl.textContent = '';
  const f = e.target;
  const name = f.name.value && f.name.value.trim();
  const phone = f.phone.value && f.phone.value.trim();
  const email = f.email.value && f.email.value.trim();
  const problem = f.problem.value && f.problem.value.trim();

  const errors = [];
  if (!name) errors.push('O campo Nome é obrigatório.');
  if (!problem) errors.push('Descreva o problema no campo "Problema Apresentado".');

  // Telefone obrigatório e deve ter 9 ou 11 dígitos
  if (!validatePhone(phone)) errors.push('Informe um telefone válido com 11 dígitos: (DD) 9XXXX-XXXX.');

  // E-mail: só valida formato se preenchido
  if (email && !validateEmail(email)) errors.push('Informe um e‑mail válido (ex: teste@exemplo.com).');

  // Validação da marca
  const brandSelect = document.getElementById('brand');
  const outraMarcaInput = document.getElementById('outraMarca');
  if (!brandSelect.value) {
    errors.push('Selecione uma marca de máquina');
  }
  if (brandSelect.value === 'outra' && !outraMarcaInput.value.trim()) {
    errors.push('Especifique a marca da máquina');
  }

  if (errors.length) {
    showErrors(errors);
    highlightInvalidFields();
    showToast('Corrija os campos destacados','warning');
    return;
  }

  // Tudo ok, envia
  const data = Object.fromEntries(new FormData(f).entries());
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';
    const res = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data) });
    if (res.ok) {
      const body = await res.json();
      resultEl.style.color = 'green';
      resultEl.innerText = 'Solicitação enviada. ID: ' + body.id;
      showToast('Solicitação enviada com sucesso!','success');
      f.reset();
    } else {
      const json = await res.json().catch(() => ({}));
      showErrors([json.mensagem || 'Erro ao enviar a solicitação. Tente novamente.']);
      showToast('Erro ao enviar solicitação','danger');
    }
  } catch (err) {
    showErrors(['Erro de rede ao enviar a solicitação.']);
    console.error(err);
    showToast('Erro de rede','danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const brandSelect = document.getElementById('brand');
  const outraMarcaContainer = document.getElementById('outraMarcaContainer');
  const outraMarcaInput = document.getElementById('outraMarca');
  const phoneInput = document.getElementById('phone');

  // Máscara de telefone brasileiro (11 dígitos)
  phoneInput.addEventListener('input', () => {
    let digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
    let out = '';
    if (digits.length > 0) {
      out = '(' + digits.substring(0, Math.min(2, digits.length));
      if (digits.length >= 3) {
        out += ') ';
        // Parte inicial do número (até 5 dígitos após DDD)
        out += digits.substring(2, Math.min(7, digits.length));
        if (digits.length >= 8) {
          out += '-' + digits.substring(7);
        }
      }
    }
    phoneInput.value = out;
  });

  // Controla visibilidade do campo "outra marca"
  brandSelect.addEventListener('change', () => {
    if (brandSelect.value === 'outra') {
      outraMarcaContainer.style.display = 'block';
      outraMarcaInput.required = true;
    } else {
      outraMarcaContainer.style.display = 'none';
      outraMarcaInput.required = false;
      outraMarcaInput.value = '';
    }
  });
  
  // Remove destaque de validação ao digitar
  const formFields = form.querySelectorAll('input, select, textarea');
  formFields.forEach(field => {
    field.addEventListener('input', () => clearFieldHighlight(field));
    field.addEventListener('change', () => clearFieldHighlight(field));
  });
});

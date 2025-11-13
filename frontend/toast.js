(function(){
  function ensureContainer(){
    let c = document.querySelector('.toast-container');
    if(!c){
      c = document.createElement('div');
      c.className = 'toast-container position-fixed top-0 end-0 p-3';
      c.style.zIndex = 1080; // acima do backdrop dos modais
      document.body.appendChild(c);
    }
    return c;
  }
  window.showToast = function(message, type='success', opts){
    const container = ensureContainer();
    const el = document.createElement('div');
    const safeType = ['primary','secondary','success','danger','warning','info','light','dark'].includes(type) ? type : 'success';
    el.className = `toast align-items-center text-bg-${safeType} border-0`;
    el.setAttribute('role','alert');
    el.setAttribute('aria-live','assertive');
    el.setAttribute('aria-atomic','true');
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;
    container.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: (opts && opts.delay) || 3000 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    t.show();
    return t;
  }
})();

// UI helpers: accessible modals (alert/confirm/prompt) + wage intensity utilities

function getModalRoot() {
  let root = document.getElementById('modalRoot');
  if (!root) { root = document.createElement('div'); root.id = 'modalRoot'; document.body.appendChild(root); }
  return root;
}

function focusTrap(modalEl, returnFocusEl) {
  const selectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const nodes = Array.from(modalEl.querySelectorAll(selectors)).filter(el => !el.disabled && el.offsetParent !== null);
  if (!nodes.length) return;
  const first = nodes[0]; const last = nodes[nodes.length - 1];
  modalEl.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    } else if (e.key === 'Escape') {
      const escBtn = modalEl.querySelector('[data-modal-cancel]');
      if (escBtn) escBtn.click();
    }
  });
  modalEl.addEventListener('closeModal', ()=> { if(returnFocusEl && typeof returnFocusEl.focus==='function') setTimeout(()=>returnFocusEl.focus(),30); }, { once:true });
  first.focus();
}

let modalIdCounter = 0;
function buildModal({ title, bodyHTML, actions }) {
  const prevFocus = document.activeElement;
  const root = getModalRoot();
  const id = ++modalIdCounter;
  const bodyId = `modalBody_${id}`;
  const titleId = `modalTitle_${id}`;
  root.innerHTML = `<div class='modal-overlay' role='presentation'>
    <div class='modal' role='dialog' aria-modal='true' aria-labelledby='${titleId}' aria-describedby='${bodyId}'>
      <h3 id='${titleId}'>${title}</h3>
      <div id='${bodyId}'>${bodyHTML}</div>
      <div class='modal-actions'>${actions.map(a=>`<button class='btn-sm ${a.variant||''}' data-action='${a.key}' ${a.cancel?"data-modal-cancel='1'":''}>${a.label}</button>`).join('')}</div>
    </div></div>`;
  const modalEl = root.querySelector('.modal');
  modalEl.__returnFocusEl = prevFocus;
  return { root, modalEl };
}

export function uiAlert(message, { title = 'Info' } = {}) {
  return new Promise(resolve => {
    const { modalEl } = buildModal({ title, bodyHTML: `<p style='margin:12px 0;'>${escapeHtml(message)}</p>`, actions: [ { key:'ok', label:'OK', variant:'btn-primary' } ] });
    modalEl.querySelector('[data-action]')?.addEventListener('click', () => { closeModal(modalEl); resolve(); });
    focusTrap(modalEl, modalEl.__returnFocusEl);
  });
}

export function uiConfirm(message, { title = 'Conferma', confirmLabel='OK', cancelLabel='Annulla' } = {}) {
  return new Promise(resolve => {
    const { modalEl } = buildModal({ title, bodyHTML: `<p style='margin:12px 0;'>${escapeHtml(message)}</p>`, actions: [ { key:'cancel', label:cancelLabel, variant:'btn-outline', cancel:true }, { key:'ok', label:confirmLabel } ] });
    modalEl.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => { const act=btn.dataset.action; closeModal(modalEl); resolve(act==='ok'); }));
    focusTrap(modalEl, modalEl.__returnFocusEl);
  });
}

export function uiPrompt(message, { title='Input', defaultValue='', confirmLabel='OK', cancelLabel='Annulla', placeholder='' } = {}) {
  return new Promise(resolve => {
    const { modalEl } = buildModal({ title, bodyHTML: `<label style='display:block;font-size:12px;margin:4px 0 10px;'>${escapeHtml(message)}<input id='modalPromptInput' style='width:100%;margin-top:6px;' value='${escapeHtml(defaultValue)}' placeholder='${escapeHtml(placeholder)}'></label>`, actions: [ { key:'cancel', label:cancelLabel, variant:'btn-outline', cancel:true }, { key:'ok', label:confirmLabel } ] });
    const input = modalEl.querySelector('#modalPromptInput');
    modalEl.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => { const act=btn.dataset.action; const val = input.value; closeModal(modalEl); resolve(act==='ok'? val : null); }));
    input.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); modalEl.querySelector("[data-action='ok']").click(); }});
    focusTrap(modalEl, modalEl.__returnFocusEl);
  });
}

function closeModal(modalEl){ const root=getModalRoot(); root.innerHTML=''; if(modalEl && modalEl.__returnFocusEl) modalEl.dispatchEvent(new CustomEvent('closeModal')); }

function escapeHtml(str){ return (str||'').replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

// Nuova API generica per modali custom
export function openCustomModal({ title='Dialogo', bodyHTML='', actions=[{ key:'close', label:'Chiudi' }] } = {}) {
  const { modalEl } = buildModal({ title, bodyHTML, actions });
  const p = new Promise(resolve => {
    modalEl.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => {
      const act = btn.dataset.action;
      const payload = { action: act, modalEl };
      const form = modalEl.querySelector('form');
      // Prima era solo per 'save'; ora sempre se esiste un form
      if(form) { payload.formData = new FormData(form); }
      closeModal(modalEl);
      resolve(payload);
    }));
  });
  focusTrap(modalEl, modalEl.__returnFocusEl);
  return { modalEl, whenClosed: p };
}

export { closeModal, escapeHtml };

// Wage intensity helpers
export function wagePct(value, cap=110){ if(!value) return 0; return Math.min(100, Math.round((Number(value)/cap)*100)); }
export function wageColor(pct){ if(pct<40) return '#dcfce7'; if(pct<70) return '#fef9c3'; return '#fee2e2'; }
export function applyWageIntensity(container=document){ container.querySelectorAll('.wage-intensity[data-val]').forEach(el => { const val = Number(el.dataset.val)||0; const cap = Number(el.dataset.cap)||110; const pct = wagePct(val, cap); const color = wageColor(pct); el.style.background = `linear-gradient(90deg, ${color} ${pct}%, transparent ${pct}%)`; el.title = `Stip: ${val} (${pct}% cap)`; }); }
export function wageCellHTML(value, cap=110){ const v = (value===undefined||value===null||value==='')?'':Number(value); if(v==='') return ''; return `<span class='wage-intensity' data-val='${v}' data-cap='${cap}'>${v}</span>`; }

// Live region helper for announcements (ARIA)
export function announce(message, { politeness='polite' } = {}) {
  if(typeof document==='undefined') return; if(!message) return; let lr=document.getElementById('liveRegion'); if(!lr){ lr=document.createElement('div'); lr.id='liveRegion'; lr.className='visually-hidden'; lr.setAttribute('aria-live', politeness); lr.setAttribute('aria-atomic','true'); document.body.appendChild(lr); }
  // Clear then set (forces re-announcement)
  lr.textContent=''; setTimeout(()=>{ lr.textContent=message; }, 20);
}

// Auto-apply after DOM load (optional)
if(typeof window !== 'undefined') { window.addEventListener('load', () => applyWageIntensity()); }

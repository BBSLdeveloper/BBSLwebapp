// Basic storage handling (load initial data, merge with localStorage, import/export)

const STORAGE_KEY = 'bbslData';

const defaultData = {
  meta: { version: 1, createdAt: new Date().toISOString() },
  rolesOrder: ["POR","DC","B","DD","DS","E","M","C","T","W","A","PC"],
  players: [],
  clubs: [],
  divisions: [
    { id: 'div_a', name: 'Bar Birsa Super League', code: 'A', seasonBase: 400, winterBase: 150, wageCap: 110, rosterMax: 30, porMax: 4, prizes: [150,80,70,60,50,40,30,30] },
    { id: 'div_b', name: 'Mamo’s B League', code: 'B', seasonBase: 300, winterBase: 100, wageCap: 110, rosterMax: 30, porMax: 4, prizes: [50,40,30,20,10,0] }
  ],
  competitions: [
    { id: 'cup_tbakery', name: 'T-Bakery Cup', type: 'cup', prize: 50 },
    { id: 'sup_olympus', name: 'Olympus Supercup', type: 'supercup', prize: 30 }
  ],
  seasons: [],
  transactions: [],
  trophies: [],
  config: { wageCap: 110 }
};

export async function initData() {
  const ls = localStorage.getItem(STORAGE_KEY);
  let data;
  if (ls) {
    data = JSON.parse(ls);
  } else {
    data = structuredClone ? structuredClone(defaultData) : JSON.parse(JSON.stringify(defaultData));
    saveData(data);
  }
  migrateInlineLogosToStaticRefs(data);
  try { const mod = await import('./model.js'); if (mod.syncAllClubBudgets) mod.syncAllClubBudgets(data); } catch(e) {}
  return data;
}

function migrateInlineLogosToStaticRefs(data){
  if(!data) return;
  let changed=false;
  (data.clubs||[]).forEach(c => {
    if(c.logo && /^data:/i.test(c.logo)) {
      console.warn('Logo inline (dataURL) rilevato per club', c.name, '– sostituire con file in media/ e aggiornare path');
      // Manteniamo per compat ma l'utente verrà avvisato nell'UI (modal). Non lo cancelliamo per non perdere immagine.
    }
  });
  const metaComps = data.meta?.competitions || {};
  Object.keys(metaComps).forEach(id => {
    const cc = metaComps[id];
    if(cc.logo && /^data:/i.test(cc.logo)) { console.warn('Logo inline (dataURL) competizione', id); }
    if(cc.trophy && /^data:/i.test(cc.trophy)) { console.warn('Trophy inline (dataURL) competizione', id); }
  });
  if(changed) saveData(data);
}

export function resetToDefault() {
  const data = structuredClone ? structuredClone(defaultData) : JSON.parse(JSON.stringify(defaultData));
  saveData(data);
  return data;
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bbsl-savegame.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const parsed = JSON.parse(e.target.result);
        saveData(parsed);
        try { const mod = await import('./model.js'); if (mod.syncAllClubBudgets) mod.syncAllClubBudgets(parsed); } catch(err) {}
        resolve(parsed);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Gestione sandbox personale "La mia asta". Dati privati per utente (solo localStorage),
// NON inclusi nell'export/import globale bbslData ma esportabili/importabili separatamente.

const CURRENT_USER_KEY = 'bbslSandboxCurrentUser';
export function getCurrentSandboxUserId() {
  return localStorage.getItem(CURRENT_USER_KEY) || '';
}
export function setCurrentSandboxUserId(userId) {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}
export function getSandboxKey(userId) {
  return `bbslSandbox_${userId}`;
}

function defaultSandbox(userId) {
  return {
    schemaVersion: 2,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Formazione
    formation: { module: '4-4-2', positions: [] },
    rosterPlans: {}, // playerId -> { years, wage, fromSnapshot:boolean }
    clubSnapshot: null, // { clubId, capturedAt, players:[{ playerId }] }
    appuntiSets: [], // { id, name, columns:{ top:[], seconda:[], terza:[], titolari:[], scommesse:[] } }
    // Legacy fields (kept for migration)
    notes: '',
    watchlist: [],
    objectives: { POR:0, DIF:0, CEN:0, ATT:0 }
  };
}

export function loadSandbox(userId) {
  if(!userId) return null;
  const raw = localStorage.getItem(getSandboxKey(userId));
  if(!raw) return defaultSandbox(userId);
  try {
    const parsed = JSON.parse(raw);
    if(!parsed.schemaVersion) parsed.schemaVersion = 1;
    // Migrate to v2
    if(parsed.schemaVersion < 2) {
      parsed.formation = parsed.formation || { module:'4-4-2', positions:[] };
      parsed.rosterPlans = parsed.rosterPlans || {};
      parsed.clubSnapshot = parsed.clubSnapshot || null;
      parsed.appuntiSets = parsed.appuntiSets || [];
      parsed.schemaVersion = 2;
    }
    return parsed;
  } catch {
    return defaultSandbox(userId);
  }
}

export function saveSandbox(sandbox) {
  if(!sandbox || !sandbox.userId) return;
  sandbox.updatedAt = new Date().toISOString();
  localStorage.setItem(getSandboxKey(sandbox.userId), JSON.stringify(sandbox));
}

export function resetSandbox(userId) {
  if(!userId) return null;
  localStorage.removeItem(getSandboxKey(userId));
  return loadSandbox(userId);
}

export function exportSandbox(sandbox) {
  if(!sandbox) return;
  const blob = new Blob([JSON.stringify(sandbox, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sandbox-${sandbox.userId||'user'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importSandbox(file, userId) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        // Forziamo userId corrente per privacy/segregazione
        parsed.userId = userId;
        if(!parsed.schemaVersion) parsed.schemaVersion = 1;
        saveSandbox(parsed);
        resolve(parsed);
      } catch(err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

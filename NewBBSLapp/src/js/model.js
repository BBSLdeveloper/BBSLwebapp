// Core data model helpers
import { saveData } from './storage.js';

export function generateId(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 10);
}

export function addPlayer(data, playerInput) {
  const player = {
    id: generateId('pl'),
    name: playerInput.name.trim(),
    realClub: playerInput.realClub || '',
    roles: playerInput.roles || [],
    quote: Number(playerInput.quote) || 0,
    history: [] // future seasons / stats references
  };
  data.players.push(player);
  saveData(data);
  return player;
}

export function updatePlayerQuote(data, playerId, newQuote) {
  const p = data.players.find(x => x.id === playerId);
  if (p) {
    p.quote = Number(newQuote) || 0;
    saveData(data);
  }
}

export function addClub(data, clubInput) {
  const club = {
    id: generateId('cl'),
    name: clubInput.name.trim(),
    logo: clubInput.logo || '',
    founded: clubInput.founded || '',
    president: clubInput.president || '',
    stadium: clubInput.stadium || '',
    city: clubInput.city || '',
    colors: clubInput.colors || ['#003366', '#ffffff'],
    divisionId: clubInput.divisionId || null,
    roster: [], // { playerId, contractYears, wage, startSeason, endSeason, signedAt, originalQuote, status: 'active'|'released'|'loanedOut' }
    budget: clubInput.budget || 0,
    wageTotal: 0,
    transactions: [], // financial + roster events
    trophies: clubInput.trophies || []
  };
  data.clubs.push(club);
  saveData(data);
  return club;
}

export function signPlayerToClub(data, clubId, playerId, years, currentQuote) {
  years = Number(years);
  const club = data.clubs.find(c => c.id === clubId);
  if (!club) throw new Error('Club not found');
  const player = data.players.find(p => p.id === playerId);
  if (!player) throw new Error('Player not found');
  if (years < 1 || years > 4) throw new Error('Durata contratto 1-4');

  // Determine original vs duplicate: first roster entry globally for this player is original
  const alreadyEntries = data.clubs.flatMap(c => c.roster || []).filter(r => r.playerId === playerId && r.status === 'active');
  const isOriginal = alreadyEntries.length === 0; // first assignment
  if (!isOriginal && years !== 1) throw new Error('Doppione: solo contratto annuale');

  // Wage calculation rule based on years
  const wage = calcWageFromQuote(currentQuote, years);

  // Constraints
  // Limite rosa: solo giocatori attivi contano (svincolati esclusi)
  if (club.roster.filter(r=>r.status==='active').length >= 30) throw new Error('Rosa piena (30)');
  const rosterPlayers = club.roster.filter(r => r.status === 'active');
  const porCount = rosterPlayers.filter(r => {
    const pl = data.players.find(p => p.id === r.playerId);
    return pl && pl.roles.includes('POR');
  }).length;
  if (player.roles.includes('POR') && porCount >= 4) throw new Error('Limite POR (4)');

  const entry = {
    playerId,
    contractYears: years,
    wage,
    originalQuote: currentQuote,
    signedAt: new Date().toISOString(),
    startSeason: currentSeasonYear(),
    endSeason: currentSeasonYear() + years - 1,
    status: 'active',
    original: isOriginal
  };
  club.roster.push(entry);
  recalcClubWage(club, data);
  saveData(data);
  return entry;
}

export function recalcClubWage(club, data) {
  // Somma stipendi attivi + 50% degli svincolati nella finestra contrattuale corrente
  const season = currentSeasonYear();
  const activeTotal = club.roster.filter(r => r.status === 'active').reduce((sum, r) => sum + r.wage, 0);
  const releasedTotal = club.roster.filter(r => r.status === 'released' && r.releaseStartSeason && season >= r.releaseStartSeason && season <= r.endSeason)
    .reduce((sum,r)=> sum + (r.wage * 0.5), 0);
  club.wageTotal = Math.round((activeTotal + releasedTotal)*1000)/1000; // max 3 decimali
}

export function currentSeasonYear() {
  const d = new Date();
  return d.getFullYear();
}

export function addDivision(data, divisionInput) {
  const division = {
    id: generateId('div'),
    name: divisionInput.name.trim(),
    code: divisionInput.code || '',
    seasonBase: Number(divisionInput.seasonBase)||0,
    winterBase: Number(divisionInput.winterBase)||0,
    wageCap: Number(divisionInput.wageCap)||110,
    rosterMax: Number(divisionInput.rosterMax)||30,
    porMax: Number(divisionInput.porMax)||4,
    prizes: (divisionInput.prizes||'').split(',').map(x=>Number(x.trim())).filter(n=>!isNaN(n))
  };
  data.divisions = data.divisions || [];
  data.divisions.push(division);
  saveData(data);
  return division;
}

export function addCompetition(data, compInput) {
  const comp = {
    id: generateId('cmp'),
    name: compInput.name.trim(),
    type: compInput.type || 'cup',
    prize: Number(compInput.prize)||0
  };
  data.competitions = data.competitions || [];
  data.competitions.push(comp);
  saveData(data);
  return comp;
}

export function getListoneForDivision(data, divisionId) {
  // Restituisce array di oggetti { player, originalOther }
  // player: giocatore libero in quella divisione
  // originalOther: true se è già originale (prima firma) nell'altra divisione
  const activeByDivision = new Map(); // divisionId -> Set(playerId)
  data.clubs.forEach(c => {
    const set = activeByDivision.get(c.divisionId) || new Set();
    c.roster.filter(r => r.status === 'active').forEach(r => set.add(r.playerId));
    activeByDivision.set(c.divisionId, set);
  });
  const assignedHere = activeByDivision.get(divisionId) || new Set();
  return data.players
    .filter(p => !assignedHere.has(p.id))
    .map(p => {
      let originalOther = false;
      for (const c of data.clubs) {
        if (c.divisionId === divisionId) continue;
        if (c.roster.some(r => r.playerId === p.id && r.status === 'active' && r.original)) { originalOther = true; break; }
      }
      return { player: p, originalOther };
    });
}

export function canDeletePlayer(data, playerId) {
  return !data.clubs.some(c => c.roster.some(r => r.playerId === playerId && r.status === 'active'));
}

export function deletePlayer(data, playerId) {
  if (!canDeletePlayer(data, playerId)) throw new Error('Giocatore assegnato: non eliminabile');
  const idx = data.players.findIndex(p => p.id === playerId);
  if (idx !== -1) {
    data.players.splice(idx, 1);
    saveData(data);
    return true;
  }
  return false;
}

export function releasePlayer(data, clubId, playerId, startSeason) {
  const club = data.clubs.find(c=>c.id===clubId);
  if(!club) throw new Error('Club non trovato');
  const entry = club.roster.find(r=>r.playerId===playerId);
  if(!entry) throw new Error('Contratto non trovato');
  if(entry.status==='released') return entry;
  if(startSeason < currentSeasonYear() || startSeason > entry.endSeason) throw new Error('Stagione non valida');
  entry.status='released';
  entry.releaseStartSeason = startSeason; // da questa stagione in poi costo 50%
  recalcClubWage(club, data);
  saveData(data);
  return entry;
}

export function editContract(data, clubId, playerId, newOriginalQuote, newStartSeason, newYears) {
  const club = data.clubs.find(c=>c.id===clubId);
  if(!club) throw new Error('Club non trovato');
  const entry = club.roster.find(r=>r.playerId===playerId);
  if(!entry) throw new Error('Contratto non trovato');
  newYears = Number(newYears);
  if(newYears<1||newYears>4) throw new Error('Durata 1-4');
  const start = Number(newStartSeason)||currentSeasonYear();
  entry.originalQuote = Number(newOriginalQuote)||entry.originalQuote;
  entry.startSeason = start;
  entry.endSeason = start + newYears -1;
  entry.contractYears = newYears;
  entry.wage = calcWageFromQuote(entry.originalQuote, newYears);
  if(entry.status==='released' && entry.releaseStartSeason < entry.startSeason) {
    // se rinnovo prima della stagione di svincolo annulla svincolo
    delete entry.releaseStartSeason;
    entry.status='active';
  }
  recalcClubWage(club, data);
  saveData(data);
  return entry;
}

export function deleteRosterEntry(data, clubId, playerId) {
  const club = data.clubs.find(c=>c.id===clubId);
  if(!club) throw new Error('Club non trovato');
  const idx = club.roster.findIndex(r=>r.playerId===playerId);
  if(idx!==-1) { club.roster.splice(idx,1); recalcClubWage(club, data); saveData(data); return true; }
  return false;
}

export function computeClubBudgetFromTransactions(club) {
  if (!club.transactions || !club.transactions.length) return club.budget || 0;
  // assume transactions already contain 'after'; take the one with max date (string compare works for ISO)
  const last = club.transactions.reduce((acc,t)=> !acc || t.date>acc.date ? t : acc, null);
  return last && typeof last.after === 'number' ? last.after : (club.budget||0);
}

export function syncAllClubBudgets(data) {
  let changed = false;
  (data.clubs||[]).forEach(club => {
    const calc = computeClubBudgetFromTransactions(club);
    if (club.budget !== calc) { club.budget = calc; changed = true; }
  });
  if (changed) saveData(data);
  return changed;
}

export function addFinancialTransaction(data, clubId, { description='', sign='+', amount=0, meta={} }) {
  const club = data.clubs.find(c=>c.id===clubId);
  if(!club) throw new Error('Club non trovato');
  amount = Number(amount)||0;
  if (!['+','-'].includes(sign)) throw new Error('Segno non valido');
  club.transactions = club.transactions || [];
  const prev = typeof club.budget === 'number' ? club.budget : computeClubBudgetFromTransactions(club);
  const delta = sign === '+' ? amount : -amount;
  const after = prev + delta;
  const date = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const metaObj = (meta && typeof meta === 'object') ? { ...meta } : {};
  const tx = { id: generateId('tx'), date, description, prev, sign, amount, delta, after, meta: metaObj };
  club.transactions.push(tx);
  club.budget = after;
  saveData(data);
  return tx;
}

// Normalizza tutte le transazioni (sposta campi root legacy dentro meta)
export function normalizeTransactionsSchema(data) {
  if(!data || !data.clubs) return;
  let changed=false;
  (data.clubs||[]).forEach(club => {
    if(!club.transactions) return;
    club.transactions.forEach(t => {
      if(!t.id) { t.id = generateId('tx'); changed=true; }
      if(!t.meta || typeof t.meta!=='object') { t.meta={}; changed=true; }
      const legacyFields = ['type','playerId','divisionId'];
      legacyFields.forEach(f => {
        if(t[f] !== undefined) {
          // Preferisci sempre migrare (root authoritative)
            t.meta[f] = t[f];
            delete t[f];
            changed=true;
        }
      });
      if(t.auction) { // legacy root auction object
        t.meta.auction = t.auction; delete t.auction; changed=true; }
      // Se non è acquisto rimuovi eventuale meta.auction incoerente
      if(t.meta.auction && t.meta.type !== 'acquisto') { delete t.meta.auction; changed=true; }
    });
    // Rechain dopo normalizzazione per ogni club
    recomputeClubTransactions(club);
  });
  if(changed) saveData(data);
}

export function recomputeClubTransactions(club) {
  if(!club.transactions || !club.transactions.length) return;
  // Sort ascending by date, preserve stable order via original index for same date
  club.transactions = club.transactions
    .map((t,i)=>({ ...t, _origIndex:i }))
    .sort((a,b)=> a.date===b.date ? a._origIndex - b._origIndex : (a.date < b.date ? -1 : 1));
  let prev = club.transactions[0].prev ?? 0;
  for (let i=0;i<club.transactions.length;i++) {
    const t = club.transactions[i];
    if(i===0) {
      // keep its prev as-is if defined, else use existing prev
      t.prev = typeof t.prev==='number' ? t.prev : prev;
    } else {
      t.prev = prev;
    }
    t.delta = t.sign === '+' ? Number(t.amount)||0 : -(Number(t.amount)||0);
    t.after = t.prev + t.delta;
    prev = t.after;
    delete t._origIndex;
  }
  // club budget = last after
  club.budget = club.transactions[club.transactions.length-1].after;
}

function calcWageFromQuote(quote, years) {
  const perc = {1:0.25,2:0.50,3:0.75,4:1.0}[years];
  const raw = Number(quote) * perc;
  return Math.round(raw * 1000) / 1000; // 3 decimali
}

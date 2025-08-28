# Bar Birsa Fantasy App

Applicazione statica (GitHub Pages friendly) per gestione fantacalcio multi‑stagione senza backend: solo HTML/CSS/JS + localStorage.

## Caratteristiche principali
- Gestione giocatori: listone con filtri, import CSV, editing anagrafiche, ruoli normalizzati ordinati.
- Club: colori personalizzati, logo statico (migrazione da dataURI), roster, contratti multi‑anno, svincoli (50% ingaggio), calcolo automatico ingaggi totali.
- Divisioni A/B: switch rapido in Listone e Asta, metadati su transazioni (divisionId, fase, anno).
- Aste multi fase/anno: estiva1, estiva2, invernale. Ogni acquisto registra transazione con meta { type:'acquisto', auction:{phase,year} } per storicizzazione e grouping.
- Normalizzazione transazioni legacy con migrazione automatica (id, meta.type, meta.auction se inferibile da data + descrizione).
- Sandbox privata per ogni utente (identificativo salvato):
  - Formazione modulare (multipli moduli con preservazione slot compatibili).
  - Campo interattivo drag‑like (click) con pannello assegnazione filtrato per ruoli.
  - Roster planning: anni (1‑4) con mapping percentuale quota->stipendio (25/50/75/100%).
  - Appunti aste: set multipli, colonne categorie (top, seconda, terza, titolari, scommesse) con evidenziazione stato giocatori (in mia rosa, altra stessa divisione, originale altra divisione).
  - Export / import JSON sandbox separato + reset.
- Budget & ingaggi: progress bar e badge budget (high/mid/low), scala cromatica stipendi (wage intensity) sulle celle.
- Accessibilità progressiva: aria-sort, aria-live, focus visibility custom, modali accessibili (focus trap) sostituiscono alert/confirm/prompt nativi.
- Export/Import/Reset globale dei dati (inclusi sandbox & meta) da Home.
- Design System centralizzato: variabili CSS, hero, stat/metric cards, mini-progress, data-table compatta, badge ruoli circolari, tooltip, switch buttons, modali globali, palette chiara.

## Migrazione loghi
1. Mettere i file in /media (preferibilmente WebP o PNG compressi).
2. Aprire pagina Club e usare "Modifica Club" per sostituire eventuali dataURL con path relativo (es: media/NomeClub.webp).
3. Salvare: viene rimosso l'inline base64. Fallback automatico a media/BBSL_Logo.png se onerror.

## Struttura dati (estratto)
```
players: [{ id, name, roles:[...], quote, realClub }]
clubs: [{ id, name, colors:[c1,c2], logo, divisionId, roster:[{ playerId, originalQuote, original, contractYears, startSeason, endSeason, wage, status, releaseStartSeason? }], transactions:[{ id, date, description, sign:+|-, amount, balanceAfter, meta:{ type, playerId?, divisionId?, auction?:{ phase, year, inferred? } } }] }]
meta: { currentAuction:{ phase, year } }
sandbox (local per userId): { formation:{ module, positions:[[{ roleOptions, main, reserves:[] }]] }, rosterPlans:{ playerId:{ years, wage } }, appuntiSets:[{ id, name, columns:{ top:[], seconda:[], ... } }], officialClubId }
```

## Quote -> Stipendio
Regola ingaggi: firma annuale asta = 25% quotazione. Pianificazione sandbox multi‑anno: 1..4 anni = 25/50/75/100% della quotazione.

## Comandi rapidi UI
- Listone: pulsante "Già assegnati" mostra popup aggregato; badge "ORIG altra" per originali fuori divisione.
- Asta: seleziona fase/anno, inserisci prezzo (collega transazione). Tabella club con rimozione acquisto (modale conferma).
- Club: colonne stagioni mostrano ingaggi dovuti (50% se svincolato).

## Accessibilità & UX
- Modali con focus trap, aria-modal implicito, pulsanti evidenziati.
- Tastiera: Enter/Space su header tabella per sort.
- Tooltip per ORIG/DUP.

## Roadmap breve (parziale)
- Migliorare responsive sandbox su mobile (toggle vista).
- Refine contrasti palette mid/low.
- Progress saturazione ruoli (copertura) in listone/sandbox.
- Preloading immagini/loghi + placeholder generico.
- Raggruppamento transazioni per sessione asta (UI dedicata).

## Sviluppo
App interamente client-side: nessuna build. Aggiungere file JS/CSS direttamente. Deployment: push su branch GitHub Pages.

## Licenza
Uso interno / personale.

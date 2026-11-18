# Cringiometro

Incolli un post LinkedIn (anche con foto) e ti dice quanto è cringe, ispirandosi ai pattern ricorrenti di r/LinkedInCringeIT.

- `index.html` — la webapp (statica, nessun build)
- `api/score.js` — funzione Vercel che chiede il punteggio a Claude

Su Vercel imposta `ANTHROPIC_API_KEY` nelle Environment Variables. Senza chiave l'app usa un punteggio di riserva basato su regole semplici (solo testo).

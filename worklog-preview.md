# Worklog — Preview Restore

## Task ID: PREVIEW-RESTORE
## Agent: main
## Task: Ripristina il preview live persistente

### Work Log:
- Passo 0: Backup BACKUP_20260627_125200
- Passo 1: Stato reale = Caddy VIVO su :81, Next ASSENTE. dev.pid=1151 stantio.
- Passo 2: Puliti processi/porte zombie
- Passo 3: Test next dev → HTTP 200 OK (codice corretto, nessun crash)
- Passo 4: Avvio persistente con setsid+nohup+disown → PID 30538
- Passo 5: Caddy già vivo su :81
- Passo 6: TEST PERSISTENZA in comando separato → PID MORTO. :3000 morto, :81 = 502
- Tentativo alternativo: setsid bash -c exec → stesso risultato
- Diagnosi: il sandbox uccide TUTTI i processi figli a fine comando bash

### Stage Summary:
- Caso: (a) Next assente — riavviato ma non persiste
- Causa root: limite piattaforma — processi non sopravvivono alla fine del comando bash
- Soluzione: preview NON persistente su questo spazio. Per testare: avviare server + navigare nello stesso comando. Codice OK (HTTP 200).
- File modificati: nessuno
- Per Ema: il dev server muore a fine comando anche con setsid+nohup+disown. Caddy sopravvive perché lanciato a livello container. Per preview persistente serve lanciare next dev allo stesso livello di Caddy (fuori dal controllo bash).

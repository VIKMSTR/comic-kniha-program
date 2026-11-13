# Kniha Brno × Comic-Con Brno 2026 – sloučený program

Statická stránka, žádný build. Stačí nahrát na GitHub Pages.

## Nasazení
1. Vytvořte repozitář (např. `kbcc-2026`) a nahrajte do kořene obsah tohoto zipu
   (`index.html`, `style.css`, `app.js`, `data.js`, `.nojekyll`).
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch**,
   Branch: **main**, složka **/ (root)** → Save.
3. Za minutu běží na `https://<uživatel>.github.io/kbcc-2026/`.

## Co umí
- Pátek / sobota / neděle (`#patek`, `#sobota`, `#nedele`), řádky po hodinách, vlevo Kniha Brno, vpravo Comic-Con.
- Kliknutím na pořad (nebo hvězdičku) ho přidáte do plánu. Výběr i skryté sály se ukládají do cookies
  `kbcc_favs` a `kbcc_hidden` (platnost 1 rok). Když prohlížeč cookies nepovolí (např. otevření přes `file://`),
  použije se localStorage.
- **Sdílet plán**: vytvoří odkaz `?plan=…`. Kdo ho otevře, uvidí váš výběr modře a může ho přidat ke svému,
  nebo jím svůj plán nahradit.
- **Stáhnout do kalendáře**: .ics se všemi vybranými pořady (délka 50 min, časy CET).
- Upozornění na kolize, když máte v jedné hodině víc pořadů.

## Úprava programu
Všechno je v `data.js`. Formát: `[hodina, sál, "Název", "Kdo", "HH:MM"?, přibližně?]`.
ID pořadu se počítá z dne, sálu, hodiny a názvu – když název změníte, sdílené odkazy na ten pořad přestanou sedět.

Zdroj: knihabrno.cz/program a program.comiccon.cz, staženo 13. 11. 2026. Páteční program Comic-Conu je jen částečný.

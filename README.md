# Rulleta Salon

Prohlížečová simulace evropské rulety v soukromém kasinovém salonu z přelomu 19. a 20. století. Aplikace používá čisté HTML, CSS a JavaScript bez dalších závislostí; stav hry, historie a sbírka kuliček se ukládají v prohlížeči.

## Spuštění webové aplikace

1. Nainstalujte Node.js 18 nebo novější.
2. Otevřete PowerShell v této složce.
3. Spusťte lokální server:

```powershell
node .\server.js
```

4. Otevřete adresu `http://127.0.0.1:4173`.

Vyberte hodnotu žetonu a typ sázky. Přímou sázku položíte kliknutím na číslo; sousední čísla vytvoří split, street, corner nebo six line. Vnější sázky na tucty, sloupce, barvu a sudá/lichá čísla se pokládají přímo. Po roztočení se sázky uzavřou, kulička se odráží od deflektorů a výhra se vypočítá podle evropských výplatních poměrů. Ikona not zapíná generované zvuky; ozubené kolo obsahuje limity stolu, volbu omezení pohybu a nastavitelné tření, pružnost odrazů a sílu deflektorů.

Salon kuliček nabízí sedm typů s odlišným vzhledem a fyzikálním profilem. Zakoupené kuličky, stav žetonů a posledních dvanáct výsledků zůstávají uloženy v tomto prohlížeči.

## Struktura

- `index.html`, `styles.css` — přístupná stránka a responzivní vzhled.
- `js/physics.js`, `js/wheel.js` — simulace pohybu a vykreslení kola na Canvas 2D.
- `js/betting.js` — validace sázek a výpočet výher.
- `js/shop.js`, `js/dealer.js`, `js/sound.js` — kuličky, krupiér a zvuk.
- `js/main.js` — stav hry, ukládání a propojení ovládání.
- `roulette_scene.py` — samostatný doplňkový generátor scény pro Blender.

## Volitelná scéna Blender

Pro procedurální 3D scénu nainstalujte Blender 4.x a spusťte:

```powershell
blender --background --python .\roulette_scene.py
```

Vytvoří soubor `roulette_scene.blend` a náhled `roulette_scene.png`.

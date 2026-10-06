# Rulleta

Procedurální 3D scéna evropské rulety vytvořená v Pythonu pro Blender. Obsahuje starosvětský kasinový interiér, ruletový stůl s rozložením sázek, kolo s evropskou jednonulovou posloupností 37 kapes, animovanou kuličku, krupiéra a vitrínu prémiových kuliček.

## Spuštění

1. Nainstalujte Blender 4.x.
2. Otevřete PowerShell v této složce.
3. Spusťte generátor:

```powershell
blender --background --python .\roulette_scene.py
```

Skript vytvoří `roulette_scene.blend` a vyrenderuje náhled `roulette_scene.png`. Animaci přehrajte otevřením souboru `.blend` v Blenderu a spuštěním časové osy. Kulička se roztočí proti rotoru, zpomalí, odráží se od deflektorů a nakonec dosedne do kapsy čísla 17.

Skript lze spustit také v Blenderu přes **Scripting > Open**, výběrem `roulette_scene.py` a tlačítkem **Run Script**.

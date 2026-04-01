# Guide Roulette Three.js - Style Production Stake.com

## Architecture Technique

### Stack Roulette

- **Three.js** pour la wheel 3D WebGL (fallback Canvas2D auto)
- **Canvas 2D natif** pour les overlays (résultat, animations chips)
- **SVG** pour les éléments statiques (numéros, labels)
- **CSS transforms** pour les animations UI rapides
- **Backend RNG** cryptographique existant (ne pas toucher)

### Fichiers à créer/remplacer

#### 1. `frontend/src/lib/casino/three/RouletteWheel3D.ts`

Classe Three.js pour la wheel physique :

- Scene Three.js avec OrbitControls désactivés
- Géométrie cylindrique pour la wheel (rayon 200px, 37 segments)
- Texture procédurale avec numéros 0-36 (rouge/noir/vert)
- Animation rotation avec easing (ease-out cubic)
- Lighting : AmbientLight + DirectionalLight
- Camera perspective fixe (FOV 45, position Z=500)

**Code structure :**

```typescript
import * as THREE from "three";

export class RouletteWheel3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private wheel: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    // Setup scene, camera, renderer
    // Create wheel geometry avec texture numéros
    // Setup lighting
  }

  spin(targetNumber: number, duration: number = 4000): Promise<void> {
    // Animation rotation vers targetNumber
    // Easing: ease-out cubic
    // Return promise when animation complete
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
```

#### 2. `frontend/src/components/casino/RouletteWheel.tsx`

Component React wrapper :

- useRef pour canvas Three.js
- useEffect init/cleanup Three.js scene
- Fallback Canvas2D si Three.js fail
- Props: onSpinComplete callback

**Remplace complètement l'ancien code PixiJS**

#### 3. `frontend/src/lib/casino/canvas/ResultOverlay.ts`

Canvas 2D natif pour overlays :

- Affichage résultat gagnant (numéro + couleur)
- Animation fade-in du résultat
- Particle effects chips gagnants
- Clear overlay method

#### 4. `frontend/src/components/casino/BettingGrid.tsx`

Grid SVG optimisé :

- 37 cases (0-36) en SVG pur
- Outside bets (Rouge/Noir, Pair/Impair, etc.)
- Click handlers avec state management
- Chips preview SVG avec montant

**Design requis :**

- Cases 40x60px minimum (lisibilité)
- Borders 2px blanc/10% opacity
- Hover state: scale(1.05) + glow cyan
- Active bets: chip SVG animé dessus

#### 5. Supprimer complètement

- `frontend/src/lib/casino/rouletteEngine.ts` (ancien PixiJS)
- Toute référence à PixiJS dans package.json

---

## Flow d'intégration

### 1. Installation Three.js

```bash
npm install three@0.160.0 --workspace frontend
npm uninstall pixi.js --workspace frontend
```

### 2. Component structure

```
RouletteGame (orchestrator)
├── RouletteWheel (Three.js wrapper)
├── ResultOverlay (Canvas2D overlay)
├── BettingGrid (SVG grid)
├── ChipSelector (montants)
└── ControlPanel (SPIN button + stats)
```

### 3. Spin flow

1. User place bets → BettingGrid state
2. User click SPIN → Disable grid
3. Frontend → Backend `/casino/roulette/spin` avec bets
4. Backend → RNG génère result + calcule gains
5. Frontend receive result → RouletteWheel3D.spin(result.number)
6. Animation 4s → ResultOverlay fade-in
7. Update balance + history → Enable grid

---

## Spécifications Design

### Wheel 3D

- Diamètre: 400px
- Rotation initiale aléatoire
- Animation duration: 4000ms
- Easing: cubic-bezier(0.25, 0.46, 0.45, 0.94)
- Final rotation: align targetNumber top center

### Result Overlay

- Position: center wheel
- Font: Space Grotesk Bold 48px
- Color: blanc + glow couleur (rouge/noir/vert)
- Animation: fade-in 300ms après wheel stop

### Betting Grid

- Layout: CSS Grid 3 colonnes (inside) + 1 colonne (outside)
- Inside bets: 40x60px min
- Outside bets: full width, 50px height
- Chips: SVG circle avec montant texte

---

## Performance Targets

- Wheel init: <100ms
- Spin animation: 60fps stable
- Grid render: <16ms
- Bundle size: +150kb max (Three.js core only)

---

## Fallback Strategy

Si Three.js WebGL fail:

1. Catch error dans RouletteWheel3D constructor
2. Switch vers Canvas2D wheel dessinée manuellement
3. Animation CSS transform rotate au lieu de Three.js
4. Keep same API (spin method + promise)

---

## Tests de validation

Avant de commit:

- [ ] Wheel tourne smooth 60fps
- [ ] Result affiché correctement après spin
- [ ] Betting grid cliquable et responsive
- [ ] Backend RNG integration fonctionne
- [ ] Fallback Canvas2D fonctionne si WebGL disabled
- [ ] Build size <500kb total (frontend bundle)

---

## Notes importantes

**NE PAS TOUCHER :**

- Backend routes `/casino/roulette/*`
- Backend RNG logic
- Database schema casino_games
- Auth/session logic

**CODE PRODUCTION READY :**

- Aucun console.log() en prod
- Aucun texte debug visible user
- Error handling propre avec user feedback
- Loading states partout

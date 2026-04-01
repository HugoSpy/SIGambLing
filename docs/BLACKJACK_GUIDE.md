# Blackjack Casino - Spécifications Complètes

## Vue d'ensemble

Créer un jeu de blackjack professionnel style Stake.com avec animations fluides, stratégie dealer authentique, et interface moderne.

## Interface Utilisateur

### Layout Principal

```
┌─────────────────────────────────────────┐
│         BLACKJACK                       │
│   [Solde: 1000.00 €]                   │
├─────────────────────────────────────────┤
│                                         │
│    DEALER                               │
│    [🂠] [🂠] [?]                        │
│    Total: 10                            │
│                                         │
│                                         │
│    JOUEUR                               │
│    [🂡] [🂨]                            │
│    Total: 19                            │
│                                         │
├─────────────────────────────────────────┤
│  MISE                                   │
│  [÷2] [Input: 10.00] [×2]              │
│                                         │
│  [ PARIER ] ou [TIRER] [RESTER] [DOUBLE]│
└─────────────────────────────────────────┘
```

### Panneau de Contrôle des Mises

- **Input de mise** : Champ numérique centré
- **Bouton ÷2** : Divise la mise par 2
- **Bouton ×2** : Double la mise
- **Validation** : Mise min 1€, max = solde du joueur

### Boutons d'Action

**Phase de mise :**

- `[PARIER]` : Bouton vert, démarre la partie

**Phase de jeu :**

- `[TIRER]` (Hit) : Bouton bleu, tire une carte
- `[RESTER]` (Stand) : Bouton orange, termine le tour
- `[DOUBLER]` (Double Down) : Bouton violet, double la mise et tire 1 carte (seulement avec 2 cartes initiales)
- **Split** : Non implémenté dans v1 (peut être ajouté plus tard)

## Règles du Blackjack (Style Casino Standard)

### Règles de Base

- **Objectif** : Atteindre 21 ou s'en rapprocher sans dépasser
- **Valeurs des cartes** :
  - 2-10 : Valeur faciale
  - Valet, Dame, Roi : 10
  - As : 1 ou 11 (flexible)
- **Blackjack naturel** : As + figure/10 = paiement 3:2 (mise × 2.5)
- **Victoire normale** : paiement 1:1 (mise × 2)
- **Égalité (Push)** : remboursement de la mise

### Distribution Initiale

1. Dealer distribue 2 cartes au joueur (visibles)
2. Dealer distribue 2 cartes à lui-même (1 visible, 1 cachée)
3. Vérification blackjack naturel :
   - Si joueur a blackjack et dealer non → joueur gagne 3:2 immédiatement
   - Si dealer a blackjack → révèle et termine (joueur perd sauf si blackjack aussi = push)
   - Si les deux ont blackjack → push

### Actions du Joueur

- **TIRER (Hit)** :
  - Disponible tant que total < 21
  - Peut tirer autant de fois que nécessaire
  - Si dépasse 21 → bust → perd immédiatement
- **RESTER (Stand)** :
  - Garde sa main actuelle
  - Passe au tour du dealer

- **DOUBLER (Double Down)** :
  - Disponible uniquement avec 2 cartes initiales
  - Double la mise automatiquement
  - Tire exactement 1 carte
  - Termine automatiquement le tour (passe au dealer)
  - Nécessite solde ≥ mise actuelle

### Stratégie du Dealer (Règles Stake/Standard)

Le dealer suit des règles strictes et automatiques :

1. **Révèle sa carte cachée** une fois que le joueur reste ou bust
2. **Tire sur 16 ou moins** : Doit tirer tant que total ≤ 16
3. **Reste sur 17 ou plus** : Doit rester sur 17+ (y compris soft 17 avec As)
4. **Gestion des As** :
   - Compte l'As comme 11 si total ≤ 21 (soft hand)
   - Compte l'As comme 1 si total > 21 avec As=11 (hard hand)
5. **Pas de choix** : Le dealer n'a aucune décision stratégique

### Résolution de la Partie

Une fois le dealer terminé :

**Dealer bust (> 21)** :

- Joueur gagne (sauf si déjà bust)

**Dealer ne bust pas** :

- Total joueur > total dealer → joueur gagne 1:1
- Total joueur < total dealer → joueur perd
- Total égal → push (remboursement)

**Cas spéciaux** :

- Joueur bust → perd immédiatement (même si dealer bust après)
- Blackjack joueur vs 21 dealer → joueur gagne quand même (blackjack prioritaire)

## Animations

### Distribution des Cartes

```
Séquence d'animation :
1. Carte apparaît du haut de l'écran
2. Glisse vers la position du joueur/dealer
3. Se retourne avec animation flip 3D
4. Délai 400ms entre chaque carte
```

**Timing de distribution initiale :**

- Carte 1 joueur → 400ms
- Carte 1 dealer (visible) → 400ms
- Carte 2 joueur → 400ms
- Carte 2 dealer (face cachée) → 400ms

### Animation de Tirage (Hit)

- Carte glisse depuis le centre-haut
- Flip 180° sur axe Y
- Durée : 600ms
- Se positionne à côté des cartes existantes

### Révélation Carte Dealer

- Flip 180° de la carte cachée
- Durée : 500ms
- Avant que le dealer commence à tirer

### Effets Visuels de Résultat

**Victoire :**

- Texte "VOUS GAGNEZ !" en vert brillant
- Animation scale pulse (1 → 1.1 → 1)
- Confettis subtils (optionnel)
- Son de victoire

**Blackjack :**

- Texte "BLACKJACK !" en doré
- Animation scale + rotation légère
- Éclat lumineux
- Son spécial blackjack

**Défaite :**

- Texte "PERDU" en rouge
- Fade in simple
- Son de perte

**Push :**

- Texte "ÉGALITÉ" en gris
- Animation bounce simple

**Bust :**

- Texte "BUST !" en rouge vif
- Shake animation sur les cartes
- Son d'explosion

### Animations de Jetons

- Mouvement des jetons vers le joueur en cas de gain
- Mouvement des jetons vers le dealer en cas de perte
- Durée : 800ms avec easing

## Gestion du Solde

### État Initial

```javascript
solde = 1000.0; // Solde de départ
mise = 10.0; // Mise par défaut
```

### Workflow d'une Partie

**Au clic sur PARIER :**

```
1. Vérifier solde ≥ mise
2. Déduire la mise du solde
3. solde = solde - mise
4. Bloquer les contrôles de mise
5. Démarrer la distribution
```

**Pendant le jeu :**

- Le solde reste affiché avec la déduction
- La mise est "en jeu" (visible sur la table)

**À la fin de la partie :**

_Victoire normale (1:1) :_

```
gain = mise × 2
solde = solde + gain
```

_Blackjack (3:2) :_

```
gain = mise × 2.5
solde = solde + gain
```

_Push (égalité) :_

```
solde = solde + mise  // Remboursement
```

_Défaite :_

```
// Rien à ajouter, mise déjà déduite
```

**Double Down :**

```
1. Vérifier solde ≥ mise actuelle
2. solde = solde - mise  // Déduction supplémentaire
3. mise = mise × 2       // Doublement
4. Tirer 1 carte
5. Passer au dealer automatiquement
```

### Affichage du Solde

- Format : `Solde: 1,234.56 €`
- Mise en surbrillance lors des changements
- Animation +XX.XX € en vert lors des gains
- Animation -XX.XX € en rouge lors des pertes

## Système de Cartes

### Représentation Visuelle

Utiliser des symboles Unicode pour les cartes :

```javascript
const suits = {
  hearts: "♥", // Cœur (rouge)
  diamonds: "♦", // Carreau (rouge)
  clubs: "♣", // Trèfle (noir)
  spades: "♠", // Pique (noir)
};

const ranks = {
  A: "As",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  J: "Valet",
  Q: "Dame",
  K: "Roi",
};
```

### Design des Cartes

```css
Carte face visible :
- Fond blanc avec bordure arrondie
- Symbole et rang en gros
- Couleur rouge ou noire selon la suite
- Ombre portée subtile
- Dimensions : 80px × 120px

Carte face cachée :
- Fond dégradé bleu/rouge
- Motif géométrique
- Pas de contenu visible
```

### Pile de Cartes (Deck)

- **Composition** : 1 à 6 jeux de 52 cartes (configurable)
- **Mélange** : Algorithme Fisher-Yates au début de chaque partie
- **Réinitialisation** : Nouveau deck si < 20 cartes restantes

### Calcul des Totaux

**Gestion des As :**

```javascript
function calculerTotal(cartes) {
  let total = 0;
  let nbAs = 0;

  // Compter les cartes sans les As
  for (carte of cartes) {
    if (carte.rank === "A") {
      nbAs++;
    } else if (["J", "Q", "K"].includes(carte.rank)) {
      total += 10;
    } else {
      total += parseInt(carte.rank);
    }
  }

  // Ajouter les As de manière optimale
  for (let i = 0; i < nbAs; i++) {
    if (total + 11 <= 21) {
      total += 11; // As = 11 (soft)
    } else {
      total += 1; // As = 1 (hard)
    }
  }

  return total;
}
```

**Affichage du total :**

- Montrer "Soft 17" si As compté comme 11
- Montrer "17" si tous les As valent 1
- En rouge si > 21 (bust)
- En or si = 21 avec 2 cartes (blackjack)

## États du Jeu

### Machine à États

```
BETTING → Joueur définit la mise
    ↓
DEALING → Distribution des 2 cartes initiales
    ↓
PLAYER_TURN → Joueur décide (Hit/Stand/Double)
    ↓
DEALER_TURN → Dealer joue selon les règles
    ↓
GAME_OVER → Affichage du résultat
    ↓
BETTING (nouvelle partie)
```

### Désactivation des Boutons

**État BETTING :**

- ✅ PARIER
- ❌ TIRER, RESTER, DOUBLER

**État DEALING (animation) :**

- ❌ Tous les boutons

**État PLAYER_TURN :**

- ❌ PARIER
- ✅ TIRER, RESTER
- ✅ DOUBLER (si 2 cartes exactement et solde suffisant)

**État DEALER_TURN :**

- ❌ Tous les boutons

**État GAME_OVER :**

- ✅ PARIER (pour rejouer)
- ❌ TIRER, RESTER, DOUBLER

## Style Visuel (Stake.com Inspired)

### Palette de Couleurs

```css
--bg-primary: #1a1d29; /* Fond principal sombre */
--bg-secondary: #242835; /* Fond des cartes/sections */
--accent-green: #00e701; /* Boutons positifs */
--accent-blue: #3b82f6; /* Bouton Hit */
--accent-orange: #f59e0b; /* Bouton Stand */
--accent-purple: #a855f7; /* Bouton Double */
--text-primary: #ffffff; /* Texte principal */
--text-secondary: #94a3b8; /* Texte secondaire */
--border: #2d3142; /* Bordures */
--success: #10b981; /* Vert victoire */
--error: #ef4444; /* Rouge défaite */
--warning: #f59e0b; /* Orange push */
--gold: #fbbf24; /* Or blackjack */
```

### Table de Jeu

```css
.blackjack-table {
  background: radial-gradient(ellipse at center, #1a5a3a 0%, #0d3f27 100%);
  border: 8px solid #8b4513;
  border-radius: 200px / 100px;
  box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.5);
  padding: 2rem;
}
```

### Typographie

```css
font-family:
  "Inter",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
font-weight: 500-700;
letter-spacing: -0.02em;
```

### Effets Glassmorphism

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
```

## Fonctionnalités Supplémentaires

### Historique des Parties (Optionnel)

- Afficher les 10 dernières mains
- Icônes : ✅ (victoire), ❌ (défaite), 🟰 (push), 🌟 (blackjack)

### Sons (Optionnel)

- Shuffle : Brassage des cartes
- Deal : Distribution d'une carte
- Flip : Retournement de carte
- Chip : Placement de mise
- Win : Victoire
- Lose : Défaite
- Blackjack : Blackjack naturel

### Statistiques (Optionnel)

```
Parties jouées: 42
Victoires: 18 (42.8%)
Blackjacks: 3
Plus grosse victoire: 250.00 €
```

## Points d'Attention Technique

### Performance

- Limiter les re-renders avec React.memo
- Utiliser CSS transforms pour les animations (GPU accelerated)
- Debounce sur l'input de mise

### Responsive

- Layout adaptatif mobile/desktop
- Cartes plus petites sur mobile
- Boutons tactiles de 44px minimum

### Accessibilité

- Aria-labels sur tous les boutons
- Annonces vocales des résultats
- Contraste WCAG AA minimum

### Persistance (LocalStorage)

```javascript
localStorage.setItem("blackjack_balance", solde);
localStorage.setItem("blackjack_stats", JSON.stringify(stats));
```

## Checklist de Développement

### Phase 1 : Core Gameplay

- [ ] Système de cartes et deck
- [ ] Distribution initiale
- [ ] Actions Hit/Stand
- [ ] Logique dealer
- [ ] Calcul des résultats
- [ ] Gestion du solde

### Phase 2 : UI/UX

- [ ] Design des cartes
- [ ] Table de jeu
- [ ] Panneau de mise
- [ ] Boutons d'action
- [ ] Affichage des totaux

### Phase 3 : Animations

- [ ] Distribution des cartes
- [ ] Flip de carte
- [ ] Révélation dealer
- [ ] Effets de résultat
- [ ] Animation des jetons

### Phase 4 : Polish

- [ ] Sons (optionnel)
- [ ] Historique (optionnel)
- [ ] Statistiques (optionnel)
- [ ] Responsive design
- [ ] Persistance LocalStorage

## Exemple de Structure React

```jsx
function Blackjack() {
  const [gameState, setGameState] = useState("BETTING");
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [deck, setDeck] = useState([]);

  // Logique du jeu...

  return (
    <div className="blackjack-container">
      <Header balance={balance} />
      <DealerSection hand={dealerHand} gameState={gameState} />
      <PlayerSection hand={playerHand} />
      <BettingPanel
        bet={bet}
        setBet={setBet}
        onBet={handleBet}
        gameState={gameState}
      />
      <ActionButtons
        onHit={handleHit}
        onStand={handleStand}
        onDouble={handleDouble}
        gameState={gameState}
      />
      <ResultModal result={result} />
    </div>
  );
}
```

## Notes Finales

Ce blackjack doit être :

- ✅ **Rapide** : animations fluides, pas de lag
- ✅ **Fair** : vraie randomisation, règles casino standard
- ✅ **Intuitif** : interface claire, feedback immédiat
- ✅ **Professionnel** : design soigné type Stake
- ✅ **Testable** : logique séparée de l'UI

Le joueur doit sentir qu'il joue sur un vrai casino en ligne, pas un jeu fait maison.

---

**Bon développement ! 🃏♠️♥️**

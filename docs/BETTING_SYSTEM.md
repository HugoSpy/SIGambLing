# Système de Paris - Spécifications Complètes

## Vue d'ensemble

Créer un système de paris sur événements style Polymarket avec :

- Cotes décimales européennes avec évolution dynamique
- Système de combinés jusqu'à 15 événements
- Graphiques temps réel d'évolution des cotes
- Interface admin de création/résolution d'événements
- Panier de paris avec animations fluides

## Architecture Générale

### Modèles de Données

#### Event (Événement)

```
id: string (UUID)
title: string (max 200 chars)
description: text
category: enum (SCHOOL, SPORT, POLITICS, OTHER)
type: enum (BINARY, MULTIPLE_CHOICE)
status: enum (PENDING, OPEN, CLOSED, RESOLVED, CANCELLED)
created_by: user_id (admin)
created_at: datetime
betting_deadline: datetime
resolution_deadline: datetime
resolved_at: datetime | null
resolved_by: user_id | null
resolution_outcome: string | null
total_volume: decimal (somme de tous les paris)
```

#### EventOutcome (Issue/Résultat possible)

```
id: string (UUID)
event_id: foreign key
name: string (ex: "Oui", "Non", "Match nul")
initial_odds: decimal (cote initiale définie par admin)
current_odds: decimal (cote actuelle après évolution)
total_staked: decimal (total parié sur cette issue)
is_winning: boolean | null (null avant résolution)
```

#### Bet (Pari)

```
id: string (UUID)
user_id: foreign key
type: enum (SIMPLE, PARLAY)
status: enum (PENDING, WON, LOST, CANCELLED, REFUNDED)
stake: decimal (mise en tokens)
potential_payout: decimal (gain potentiel calculé)
actual_payout: decimal | null (gain réel après résolution)
placed_at: datetime
resolved_at: datetime | null
```

#### BetLeg (Jambe de pari - pour simples et combinés)

```
id: string (UUID)
bet_id: foreign key
event_id: foreign key
outcome_id: foreign key (issue choisie)
odds_at_bet: decimal (cote au moment du pari)
status: enum (PENDING, WON, LOST, CANCELLED, REFUNDED)
```

#### EventProposal (Proposition d'événement par utilisateur)

```
id: string (UUID)
user_id: foreign key
title: string
description: text
category: enum
proposed_at: datetime
status: enum (PENDING, APPROVED, REJECTED)
reviewed_by: user_id | null (admin)
reviewed_at: datetime | null
rejection_reason: text | null
```

#### OddsHistory (Historique des cotes)

```
id: string (UUID)
outcome_id: foreign key
odds: decimal
total_staked: decimal
timestamp: datetime
```

### Règles de Gestion

#### Cotes Initiales (Admin)

- **Format** : Décimal européen (1.50, 2.00, 3.25...)
- **Contrainte** : La somme des probabilités implicites doit = 100% + marge bookmaker (5-10%)
  - Probabilité implicite = 1 / cote
  - Exemple : Oui à 1.50 (66.67%) + Non à 2.00 (50%) = 116.67% → marge 16.67%
- **Validation** : Frontend suggère la marge, backend vérifie que marge entre 2-15%
- **Cagnotte** : La marge accumulée va dans une cagnotte commune pour événements spéciaux

#### Évolution des Cotes

**Phase 1 : Hybride (volume faible)**

- Tant que volume total < 1000 tokens : cotes fixes initiales
- Première transition douce dès 100 tokens placés

**Phase 2 : Market Maker AMM (volume moyen)**

- Entre 1000 et 10000 tokens : formule simple proportionnelle
- Formule : `nouvelle_cote = (total_volume / volume_issue) × facteur_ajustement`
- Le facteur d'ajustement maintient la marge bookmaker

**Phase 3 : Carnet d'ordres (volume élevé - future feature)**

- Au-delà de 10000 tokens : transition vers orderbook
- Permet matching direct entre parieurs
- Non implémenté en v1

**Fréquence de mise à jour**

- En temps réel après chaque pari
- Recalcul automatique des cotes de toutes les issues
- Broadcast via polling HTTP (toutes les 10s côté client)

**Limites de variation**

- Cote minimum : 1.01 (99% de probabilité)
- Cote maximum : 100.00 (1% de probabilité)
- Variation max par pari : 15% pour éviter manipulation

#### Création d'Événements

**Par les admins (direct)**

1. Formulaire complet avec tous les champs
2. Définition des issues (2+ pour binaire, 3+ pour multiple choice)
3. Définition des cotes initiales avec validation de marge
4. Publication immédiate ou programmée

**Par les utilisateurs (proposition)**

1. Formulaire simplifié : titre, description, catégorie, date suggérée
2. Soumission → email automatique aux admins
3. Admin peut :
   - Approuver → ouvre formulaire complet pour définir cotes
   - Refuser → avec raison obligatoire (notif email au proposant)
4. Historique des propositions dans le profil utilisateur

**Catégories**

- SCHOOL : Événements liés à l'école (retards profs, résultats exams, etc.)
- SPORT : Événements sportifs
- POLITICS : Événements politiques
- OTHER : Divers

#### Résolution d'Événements

**Qui peut résoudre**

- N'importe quel admin (pas seulement le créateur)

**Processus**

1. Admin clique sur "Résoudre l'événement"
2. Sélectionne l'issue gagnante (ou "Annulé")
3. Confirmation avec double-check
4. Système :
   - Marque l'événement comme RESOLVED
   - Met à jour tous les paris liés (calcul gains)
   - Crédite les soldes des gagnants
   - Enregistre l'admin qui a résolu + timestamp

**Si non résolu après resolution_deadline**

- Système auto-rembourse tous les paris après 24h
- Notification aux admins
- Événement marqué CANCELLED
- Email aux parieurs concernés

**Fermeture anticipée**

- Admin peut fermer les paris avant betting_deadline
- Raison obligatoire (affichée publiquement)
- Notification publique sur la page événement
- Événements déjà placés restent valides

#### Système de Combinés (Parlays)

**Règles**

- Minimum 2 événements, maximum 15
- Mise minimum : 5 tokens
- Mise maximum : 500 tokens par combiné
- Impossibilité de combiner 2 issues du même événement
- Événements liés : autorisés (pas de détection automatique en v1)

**Calcul de la cote combinée**

```
cote_totale = cote_event1 × cote_event2 × ... × cote_eventN
gain_potentiel = mise × cote_totale
```

**Résolution**

- TOUS les événements doivent être gagnants
- Si 1 seul perdu → tout le combiné perdu
- Si 1 événement annulé → cote recalculée sans cet event (compte comme ×1)
  - Exemple : combiné 3 événements (2.0 × 1.5 × 1.8 = 5.4)
  - Event 2 annulé → nouvelle cote = 2.0 × 1.8 = 3.6
- Si tous annulés → remboursement total

**Interface Panier**

- Icône ticket SVG en haut à droite
- Badge avec nombre d'événements sélectionnés
- Clic sur un outcome → animation :
  - Cote monte en scale et se déplace vers le panier
  - Particle trail pendant le trajet
  - Badge du panier pulse
- Panel slide down du haut au centre
- Affichage :
  - Liste des sélections avec possibilité de retirer
  - Toggle "Simple" / "Combiné"
  - Si Simple : input de mise par événement
  - Si Combiné : input de mise unique + cote totale en gros
  - Gain potentiel en temps réel
  - Bouton "Valider le(s) pari(s)"

#### Limites de Paris

**Par pari simple**

- Mise minimum : 5 tokens
- Mise maximum : solde du joueur
- Si gain calculé non entier → tronquer à 2 décimales

**Par combiné**

- Mise minimum : 5 tokens
- Mise maximum : 500 tokens
- Gain maximum théorique : illimité (mais risque très élevé)

**Par événement**

- Un joueur peut parier jusqu'à 25 fois sur le même événement
- Les paris restent séparés dans l'historique
- Pas de cumul automatique

#### Gestion du Solde

**Placement d'un pari**

```
1. Vérifier solde ≥ mise totale
2. Transaction atomique :
   - Déduire mise du solde
   - Créer le(s) Bet + BetLeg
   - Mettre à jour total_staked des outcomes
   - Recalculer les cotes
3. Enregistrer dans OddsHistory
```

**Résolution d'un pari**

```
Si gagné :
  gain = mise × cote_finale
  solde += gain
  bet.actual_payout = gain

Si perdu :
  // Rien (mise déjà déduite)
  bet.actual_payout = 0

Si annulé/remboursé :
  solde += mise
  bet.actual_payout = mise
```

**Double transaction safety**

- Utiliser Prisma transactions pour garantir atomicité
- Locks optimistes sur les updates de solde
- Logs de toutes les transactions pour audit

## Interface Utilisateur

### Page d'Accueil des Événements

**Layout**

```
┌─────────────────────────────────────────────────────────┐
│  PARIS SPORTIFS                      [🎫 Panier (3)]   │
├─────────────────────────────────────────────────────────┤
│  [Filtres]                                              │
│  📅 Date  📊 Popularité  🔍 Recherche: [________]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📚 SCHOOL                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Prof X en retard le 12/04 ?        🔥 245 paris │   │
│  │ Deadline: 12/04 08:00                           │   │
│  │ [OUI 1.45] [NON 2.80]                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ⚽ SPORT                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ PSG vs OM - Vainqueur ?           🔥 1.2k paris │   │
│  │ Deadline: 15/04 21:00                           │   │
│  │ [PSG 1.65] [NUL 3.20] [OM 5.50]                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Filtres**

- Par date/deadline (Aujourd'hui, Cette semaine, Ce mois, Tous)
- Par popularité/volume (Populaires, Nouveaux, Peu pariés)
- Recherche texte (titre + description)
- Par catégorie (onglets)

**Carte événement**

- Titre en gras
- Catégorie (icône + couleur)
- Deadline en relatif ("dans 2h", "demain 14:00")
- Nombre de paris (🔥 si > 100)
- Boutons issues avec cotes actuelles
- Hover : preview graph mini
- Clic sur carte → page événement
- Clic sur issue → ajout au panier (animation)

### Page d'un Événement

**Layout**

```
┌─────────────────────────────────────────────────────────┐
│  ← Retour              Prof X en retard le 12/04 ?      │
│                                              [🎫 (3)]    │
├─────────────────────────────────────────────────────────┤
│  📚 SCHOOL  •  Deadline: 12/04 08:00  •  245 paris      │
│                                                         │
│  Description:                                           │
│  Le prof X a un historique de retards le lundi matin.  │
│  Check à 08:05.                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  GRAPHIQUE ÉVOLUTION DES COTES (temps réel)            │
│  ┌─────────────────────────────────────────────────┐   │
│  │     2.0 ┤           ╱─╲                         │   │
│  │         │          ╱   ╲                        │   │
│  │     1.5 ┤    ─────      ╲                       │   │
│  │         │   ╱             ─────                 │   │
│  │     1.0 ┼─────────────────────────────────────  │   │
│  │         └─────────────────────────────────────  │   │
│  │         10:00   12:00   14:00   16:00   18:00  │   │
│  │                                                 │   │
│  │  ━━━ OUI (1.45)    ━━━ NON (2.80)             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  PARIER                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │   OUI                │  │   NON                │   │
│  │   1.45               │  │   2.80               │   │
│  │   156 tokens (64%)   │  │   89 tokens (36%)    │   │
│  │   [PARIER SUR OUI]   │  │   [PARIER SUR NON]   │   │
│  └──────────────────────┘  └──────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  STATISTIQUES                                           │
│  💰 Volume total: 245 tokens                            │
│  👥 Parieurs: 87 joueurs                                │
│  🎯 Plus gros pari: 50 tokens sur OUI (anonyme)         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Graphique temps réel**

- Bibliothèque : Recharts ou Chart.js
- Axe X : temps (dernières 24h ou depuis ouverture)
- Axe Y : cotes
- Ligne par issue avec couleur distincte
- Point actuel en gros + valeur
- Tooltip au hover avec timestamp + cotes
- Zoom/pan optionnel
- Update toutes les 10s via polling

**Sections issues**

- Carte par issue avec :
  - Nom de l'issue
  - Cote actuelle (gros chiffre)
  - Volume parié (tokens + %)
  - Bouton "Parier sur X"
- Hover : effet glow
- Clic bouton → ajout panier (animation)

**Statistiques**

- Volume total en tokens
- Nombre unique de parieurs
- Plus gros paris (top 3, anonymisés)
- Distribution visuelle (bar chart mini)

### Panel Panier (Slide Down)

**Animation d'ouverture**

```
Overlay fond noir 50% opacity (fade in 200ms)
Panel blanc slide down from top (300ms ease-out)
Position finale : centré verticalement
```

**Layout**

```
┌─────────────────────────────────────────────────────────┐
│  VOTRE PANIER                                      [X]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [●] Simple    [ ] Combiné                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Prof X en retard - OUI (1.45)           [❌]    │   │
│  │ Mise: [___10___] tokens                         │   │
│  │ Gain potentiel: 14.50 tokens                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ PSG vs OM - PSG (1.65)              [❌]        │   │
│  │ Mise: [___20___] tokens                         │   │
│  │ Gain potentiel: 33.00 tokens                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  TOTAL: 30 tokens → 47.50 tokens (+17.50)              │
│                                                         │
│  [VALIDER LES PARIS]                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Mode Combiné**

```
┌─────────────────────────────────────────────────────────┐
│  VOTRE PANIER                                      [X]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [ ] Simple    [●] Combiné                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Prof X en retard - OUI (1.45)           [❌]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ PSG vs OM - PSG (1.65)              [❌]        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ France vs Italie - France (1.80)    [❌]        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  COTE COMBINÉE: 4.31                                   │
│  (1.45 × 1.65 × 1.80)                                  │
│                                                         │
│  Mise: [___50___] tokens (max 500)                     │
│  Gain potentiel: 215.55 tokens                         │
│                                                         │
│  ⚠️ Il faut gagner LES 3 événements                    │
│                                                         │
│  [VALIDER LE COMBINÉ]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Fonctionnalités**

- Toggle Simple/Combiné change le layout
- En Simple : input par événement
- En Combiné : input unique + calcul cote totale
- Bouton ❌ retire un événement (animation fade out)
- Validation :
  - Vérifie solde suffisant
  - Vérifie limites (min 5, max 500 pour combiné)
  - API call → feedback immédiat
- Succès : fermeture panel + notification toast + update solde

### Historique Personnel

**Page dédiée ou section Dashboard**

```
┌─────────────────────────────────────────────────────────┐
│  MON HISTORIQUE                                         │
├─────────────────────────────────────────────────────────┤
│  [En cours] [Résolus] [Graphique] [Stats]              │
├─────────────────────────────────────────────────────────┤
│  EN COURS (12 paris)                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎫 SIMPLE • 10 tokens sur OUI (1.45)            │   │
│  │ Prof X en retard le 12/04                       │   │
│  │ Deadline: dans 2h • Gain pot: 14.50 tokens      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎫 COMBINÉ (3 events) • 50 tokens               │   │
│  │ Prof X OUI × PSG Victoire × France Gagne        │   │
│  │ Cote: 4.31 • Gain pot: 215.55 tokens            │   │
│  │ 1/3 résolu ✅ 2/3 en attente                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  RÉSOLUS (156 paris)                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✅ GAGNÉ • +45.50 tokens                        │   │
│  │ PSG vs OM - PSG Victoire (1.65)                 │   │
│  │ Mise: 20 tokens • Résolu le 15/04               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ❌ PERDU • -30 tokens                           │   │
│  │ Prof Y en retard - OUI (2.10)                   │   │
│  │ Mise: 30 tokens • Résolu le 14/04               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Onglet Graphique**

- Line chart : Évolution du solde dans le temps
- Bar chart : Gains/pertes par semaine
- Période sélectionnable (7j, 30j, tout)

**Onglet Stats**

```
┌─────────────────────────────────────────────────────────┐
│  STATISTIQUES                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 GÉNÉRAL                                             │
│  • Total parié: 1,245 tokens                            │
│  • Paris placés: 156 (98 simples, 58 combinés)         │
│  • Taux de réussite: 58.3% (91/156)                    │
│  • ROI: +12.5%                                          │
│                                                         │
│  🔥 STREAKS                                             │
│  • Série actuelle: 3 victoires                          │
│  • Meilleure série: 8 victoires                         │
│  • Pire série: 5 défaites                               │
│                                                         │
│  🏆 RECORDS                                             │
│  • Plus gros gain: 215.55 tokens (combiné 3 events)     │
│  • Plus grosse perte: 100 tokens (combiné 5 events)     │
│  • Meilleure cote gagnée: 12.50                         │
│                                                         │
│  📈 PAR CATÉGORIE                                       │
│  • SCHOOL: 45 paris, 62% réussite, +8% ROI             │
│  • SPORT: 89 paris, 56% réussite, +15% ROI             │
│  • POLITICS: 22 paris, 50% réussite, -2% ROI           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Leaderboard Global

**Page Dashboard - Section dédiée**

```
┌─────────────────────────────────────────────────────────┐
│  CLASSEMENT GÉNÉRAL                                     │
├─────────────────────────────────────────────────────────┤
│  [Gains totaux] [ROI] [Streak]                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  #  Joueur          Gains        ROI      Streak       │
│  ─────────────────────────────────────────────────────  │
│  🥇  Jean D.        +2,450 tk    +45%     12 🔥        │
│  🥈  Marie L.       +1,890 tk    +38%     7            │
│  🥉  Alex K.        +1,234 tk    +28%     5            │
│  4   Sophie M.      +987 tk      +22%     3            │
│  5   Tom R.         +756 tk      +19%     8            │
│  ...                                                    │
│  42  Vous           +125 tk      +12%     3            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Filtres**

- Par gains totaux (défaut)
- Par ROI (Return On Investment)
- Par streak actuel
- Période : Semaine / Mois / All-time

**Affichage**

- Top 100 affichés
- Position du joueur actuel mise en évidence
- Anonymisation partielle (Prénom + Initiale nom)
- Badges pour top 3
- Icône 🔥 pour streaks > 5

### Interface Admin

#### Dashboard Admin

**Sections**

```
┌─────────────────────────────────────────────────────────┐
│  ADMIN PANEL                                            │
├─────────────────────────────────────────────────────────┤
│  [Événements actifs] [Propositions] [Résolutions]      │
│  [Stats globales]                                       │
├─────────────────────────────────────────────────────────┤
│  ÉVÉNEMENTS ACTIFS (23)                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Prof X en retard - Deadline: 2h                 │   │
│  │ 245 paris • 342 tokens • [Fermer] [Résoudre]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  PROPOSITIONS EN ATTENTE (5)                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Proposé par: Sophie M. • Il y a 2h              │   │
│  │ "Résultat exam ALGO ?"                          │   │
│  │ [Voir détails] [Approuver] [Refuser]            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  À RÉSOUDRE (8 passées)                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️ PSG vs OM - Deadline dépassée de 3h          │   │
│  │ 1,234 tokens en jeu • [RÉSOUDRE MAINTENANT]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Créer un Événement

**Formulaire**

```
┌─────────────────────────────────────────────────────────┐
│  CRÉER UN ÉVÉNEMENT                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Titre *                                                │
│  [_____________________________________________]        │
│                                                         │
│  Description                                            │
│  [_____________________________________________]        │
│  [_____________________________________________]        │
│  [_____________________________________________]        │
│                                                         │
│  Catégorie *                                            │
│  [v] SCHOOL  [ ] SPORT  [ ] POLITICS  [ ] OTHER        │
│                                                         │
│  Type *                                                 │
│  [v] Binaire (Oui/Non)  [ ] Choix multiples            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  ISSUES                                                 │
│                                                         │
│  Issue 1: OUI    Cote initiale: [1.45]                 │
│  Issue 2: NON    Cote initiale: [2.80]                 │
│                                                         │
│  💡 Marge calculée: 11.2% ✅                            │
│  (Probabilités: 68.97% + 35.71% = 104.68%)             │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  DATES                                                  │
│                                                         │
│  Deadline paris: [12/04/2026] [08:00]                  │
│  Deadline résolution: [12/04/2026] [12:00]             │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Annuler]  [Sauvegarder brouillon]  [PUBLIER]         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Validation temps réel**

- Titre : 10-200 caractères
- Issues : min 2
- Cotes : calculer marge automatiquement
  - Marge < 2% : ⚠️ "Trop faible, risque pour la maison"
  - Marge 2-15% : ✅ "Optimal"
  - Marge > 15% : ⚠️ "Trop élevée, cotes peu attractives"
- Deadlines : betting_deadline < resolution_deadline
- Si choix multiples : 3+ issues obligatoires

#### Résoudre un Événement

**Modal**

```
┌─────────────────────────────────────────────────────────┐
│  RÉSOUDRE L'ÉVÉNEMENT                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Prof X en retard le 12/04 ?                            │
│  📊 245 paris • 342 tokens en jeu                       │
│                                                         │
│  Quelle issue a gagné ? *                               │
│  ( ) OUI    156 tokens (45.6%)                          │
│  (•) NON    186 tokens (54.4%)                          │
│  ( ) ANNULER (remboursement total)                      │
│                                                         │
│  💰 Impact:                                             │
│  • 134 parieurs gagnants recevront 453.60 tokens        │
│  • 111 parieurs perdants (0 tokens)                     │
│  • Marge maison: 38.40 tokens → cagnotte               │
│                                                         │
│  Notes (optionnel):                                     │
│  [_____________________________________________]        │
│                                                         │
│  ⚠️ ATTENTION: Cette action est IRRÉVERSIBLE            │
│                                                         │
│  [Annuler]           [CONFIRMER LA RÉSOLUTION]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Processus**

1. Double confirmation obligatoire
2. Transaction atomique :
   - Update événement (status, resolved_at, resolved_by, outcome)
   - Update tous les paris liés (calcul gains)
   - Update soldes gagnants (batch atomic)
   - Insert dans BetResolutionLog pour audit
3. Notifications :
   - Email aux gagnants
   - Notification in-app tous les parieurs
4. Impossible d'annuler après résolution

#### Approuver une Proposition

**Modal**

```
┌─────────────────────────────────────────────────────────┐
│  PROPOSITION D'ÉVÉNEMENT                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Proposé par: Sophie M. (sophie.m@epita.fr)             │
│  Le: 10/04/2026 14:32                                   │
│                                                         │
│  Titre:                                                 │
│  "Résultat partiel ALGO > 15/20 ?"                      │
│                                                         │
│  Description:                                           │
│  "L'exam d'algo était dur, je pense que la moyenne      │
│   sera basse. Pari sur médiane > 15 ?"                  │
│                                                         │
│  Catégorie suggérée: SCHOOL                             │
│  Date suggérée: 18/04/2026                              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [ REFUSER ]  Raison:                                   │
│  [ ] Doublon  [ ] Hors sujet  [ ] Infaisable            │
│  [ ] Autre: [____________________________]              │
│                                                         │
│  [ APPROUVER ET CONFIGURER ]                            │
│  → Ouvre le formulaire complet de création avec         │
│    ces infos pré-remplies                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Style Visuel

### Palette de Couleurs (Polymarket-inspired)

```css
/* Fond */
--bg-primary: #0d1117;
--bg-secondary: #161b22;
--bg-tertiary: #21262d;

/* Accents */
--accent-primary: #58a6ff; /* Bleu principal */
--accent-green: #3fb950; /* Vert positif */
--accent-red: #f85149; /* Rouge négatif */
--accent-purple: #bc8cff; /* Violet combinés */
--accent-yellow: #f0e68c; /* Jaune warning */

/* Texte */
--text-primary: #f0f6fc;
--text-secondary: #8b949e;
--text-tertiary: #484f58;

/* Bordures */
--border-default: #30363d;
--border-muted: #21262d;

/* États */
--success: #238636;
--error: #da3633;
--warning: #9e6a03;

/* Graphiques */
--chart-line-1: #58a6ff; /* Bleu */
--chart-line-2: #f85149; /* Rouge */
--chart-line-3: #3fb950; /* Vert */
--chart-line-4: #bc8cff; /* Violet */
--chart-grid: #30363d;
```

### Typographie

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Titres */
h1: 32px, 700, -0.02em
h2: 24px, 600, -0.01em
h3: 20px, 600, -0.01em

/* Corps */
body: 16px, 400, 0
small: 14px, 400, 0
tiny: 12px, 400, 0

/* Chiffres (cotes, stats) */
.odds: 28px, 700, -0.02em, tabular-nums
.stake: 16px, 500, tabular-nums
```

### Composants

**Carte Événement**

```css
background: var(--bg-secondary);
border: 1px solid var(--border-default);
border-radius: 12px;
padding: 20px;
transition: all 0.2s;

&:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
```

**Bouton Issue**

```css
background: var(--bg-tertiary);
border: 2px solid var(--border-default);
border-radius: 8px;
padding: 12px 20px;
cursor: pointer;

.odds {
  color: var(--accent-primary);
  font-size: 24px;
  font-weight: 700;
}

&:hover {
  border-color: var(--accent-primary);
  background: rgba(88, 166, 255, 0.1);
}

&.selected {
  border-color: var(--accent-primary);
  background: rgba(88, 166, 255, 0.2);
  box-shadow: 0 0 20px rgba(88, 166, 255, 0.3);
}
```

**Graphique**

```css
.chart-container {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
}

.chart-tooltip {
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 12px;
  backdrop-filter: blur(10px);
}
```

**Badge Panier**

```css
.cart-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--accent-red);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
```

## Animations

### Ajout au Panier

```javascript
// Animation de la cote vers le panier
function animateOddsToCart(element, targetCart) {
  const clone = element.cloneNode(true);
  clone.style.position = "fixed";
  clone.style.zIndex = 9999;

  const rect = element.getBoundingClientRect();
  const targetRect = targetCart.getBoundingClientRect();

  clone.style.left = rect.left + "px";
  clone.style.top = rect.top + "px";

  document.body.appendChild(clone);

  // Animation (framer-motion ou anime.js)
  // Trajectoire courbe vers le panier
  // Scale down et fade out
  // Pulse du badge à l'arrivée
}
```

### Slide Down Panel

```javascript
// Panel panier avec framer-motion
<motion.div
  initial={{ y: "-100%", opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: "-100%", opacity: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  {/* Contenu du panier */}
</motion.div>
```

### Graphique Update

```javascript
// Smooth transition lors de l'update des données
const chartOptions = {
  animation: {
    duration: 500,
    easing: "easeInOutQuad",
  },
};
```

## Points Techniques

### Optimisation des Performances

**Polling intelligent**

```javascript
// Polling toutes les 10s
const pollInterval = 10000;

useEffect(() => {
  const poll = async () => {
    const data = await fetchLatestOdds(eventId);
    updateOdds(data);
  };

  const interval = setInterval(poll, pollInterval);
  return () => clearInterval(interval);
}, [eventId]);
```

**Memoization**

```javascript
// React.memo pour composants lourds
const EventCard = React.memo(
  ({ event }) => {
    // ...
  },
  (prevProps, nextProps) => {
    return (
      prevProps.event.id === nextProps.event.id &&
      prevProps.event.current_odds === nextProps.event.current_odds
    );
  },
);
```

### Sécurité

**Validation côté serveur**

- Toujours revalider les cotes au moment du pari
- Vérifier que l'événement est encore ouvert
- Atomic transactions pour les soldes
- Rate limiting sur les endpoints de paris

**Anti-manipulation**

- Limite de variation par pari (15% max)
- Détection de patterns suspects
- Cooldown entre paris (1s minimum)
- Logs complets pour audit

**Permissions**

```javascript
// Middleware admin
const requireAdmin = async (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};
```

### State Management (Frontend)

**Context pour le panier**

```javascript
const CartContext = createContext();

const CartProvider = ({ children }) => {
  const [selections, setSelections] = useState([]);
  const [mode, setMode] = useState("simple"); // 'simple' | 'parlay'

  const addSelection = (eventId, outcomeId, odds) => {
    // Vérifications
    // Ajout
  };

  const totalOdds = useMemo(() => {
    if (mode === "simple") return null;
    return selections.reduce((acc, s) => acc * s.odds, 1);
  }, [selections, mode]);

  return (
    <CartContext.Provider
      value={{
        selections,
        mode,
        addSelection,
        totalOdds,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
```

## Checklist d'Implémentation

### Phase 1 : Backend Core (Priorité 1)

- [ ] Modèles de données (Event, EventOutcome, Bet, BetLeg)
- [ ] Endpoints événements (create, list, get, update status)
- [ ] Endpoints paris simples (place, list user bets)
- [ ] Algorithme calcul cotes (hybride initial)
- [ ] Système de résolution (resolve, refund)
- [ ] Transactions atomiques soldes
- [ ] Validation Zod complète

### Phase 2 : Backend Admin (Priorité 1)

- [ ] Endpoints admin (create event, resolve, close early)
- [ ] Système de propositions (create, list, approve, reject)
- [ ] Email notifications
- [ ] Middleware admin permissions
- [ ] Logs d'audit

### Phase 3 : Frontend Base (Priorité 1)

- [ ] Page liste événements avec filtres
- [ ] Page détail événement
- [ ] Graphique évolution cotes (Recharts)
- [ ] Interface parier simple
- [ ] Historique personnel
- [ ] Polling HTTP (10s)

### Phase 4 : Système Combinés (Priorité 2)

- [ ] Backend: endpoints parlays
- [ ] Frontend: panier avec toggle simple/combiné
- [ ] Animation ajout au panier
- [ ] Calcul cote totale temps réel
- [ ] Validation max 15 events
- [ ] Gestion événement annulé dans combiné

### Phase 5 : Interface Admin (Priorité 2)

- [ ] Dashboard admin
- [ ] Formulaire création événement
- [ ] Interface résolution avec preview impact
- [ ] Gestion propositions
- [ ] Stats globales plateforme

### Phase 6 : Stats & Leaderboard (Priorité 3)

- [ ] Page stats personnelles
- [ ] Graphiques gains/pertes
- [ ] Calcul ROI, streak
- [ ] Leaderboard global
- [ ] Filtres période

### Phase 7 : Polish (Priorité 3)

- [ ] Animations fluides
- [ ] Toast notifications
- [ ] Responsive mobile
- [ ] Tests e2e

## Notes Finales

**Priorités absolues pour v1 :**

1. ✅ Création et résolution événements par admins
2. ✅ Paris simples fonctionnels
3. ✅ Graphique cotes temps réel
4. ✅ Système de combinés (max 15)
5. ✅ Propositions utilisateurs avec validation admin

**À ne PAS faire en v1 :**

- ❌ WebSocket (polling HTTP suffit)
- ❌ Carnet d'ordres (AMM hybride suffit)
- ❌ Revente/cashout de paris
- ❌ Système de réputation/karma

Le système doit être **simple, rapide, et fiable** pour 60 utilisateurs SIGL 2027.

---

**Bon développement ! 🎲📊**

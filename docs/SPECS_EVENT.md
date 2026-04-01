# Spec Feature — Système d'Événements (style Polymarket)

## Vue d'ensemble

Ajout d'une section **Événements** à SIGambling permettant aux admins de créer des marchés de prédiction sur lesquels les utilisateurs parient avec leur solde virtuel. Les cotes sont dynamiques et calculées en temps réel à partir de la pool, à la manière de Polymarket.

---

## Modèle de données

### Évolutions du schema Prisma

Le modèle `Event` est déjà présent dans `backend/prisma/schema.prisma`. Les champs suivants sont à vérifier ou ajouter :

```prisma
model Event {
  id              String        @id @default(cuid())
  title           String
  description     String?
  category        String
  imageUrl        String?

  // Options de pari (ex: ["Oui", "Non"] ou ["Candidat A", "Candidat B", ...])
  options         Json          // String[]

  // Pool par option { "Oui": 1200, "Non": 800 }
  poolByOption    Json          @default("{}")
  totalPool       Float         @default(0)

  // Statut du marché
  status          EventStatus   @default(OPEN)
  resolvedOption  String?       // option gagnante, remplie à la résolution

  // Dates
  closingAt       DateTime?     // clôture des paris (optionnel)
  resolvedAt      DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Contraintes de mise
  minBet          Float         @default(10)
  maxBet          Float?        // null = pas de limite

  // Utilisateurs exclus du pari sur cet événement
  excludedUsers   EventExclusion[]

  bets            Bet[]
  createdBy       User          @relation(fields: [createdById], references: [id])
  createdById     String
}

enum EventStatus {
  OPEN        // paris ouverts
  CLOSED      // paris fermés, résolution en attente
  RESOLVED    // résolu, gains distribués
  CANCELLED   // annulé, remboursement effectué
}

model EventExclusion {
  id        String   @id @default(cuid())
  event     Event    @relation(fields: [eventId], references: [id])
  eventId   String
  user      User     @relation(fields: [userId], references: [id])
  userId    String

  @@unique([eventId, userId])
}
```

Le modèle `Bet` existant doit être aligné avec les champs suivants :

```prisma
model Bet {
  id              String    @id @default(cuid())
  user            User      @relation(fields: [userId], references: [id])
  userId          String
  event           Event     @relation(fields: [eventId], references: [id])
  eventId         String
  chosenOption    String
  amount          Float
  // Cote snapshot au moment du pari (pour affichage historique)
  oddAtBet        Float
  // Gain réel crédité après résolution (null tant que non résolu)
  payout          Float?
  createdAt       DateTime  @default(now())
}
```

---

## Calcul des cotes dynamiques

Les cotes sont recalculées à chaque nouveau pari, exactement comme Polymarket.

**Formule pour une option donnée :**

```
cote(option) = totalPool / pool(option)
```

Exemple avec un événement à 2 options :

- Pool totale : 2000
- Pool "Oui" : 1400, Pool "Non" : 600
- Cote "Oui" = 2000 / 1400 ≈ 1.43
- Cote "Non" = 2000 / 600 ≈ 3.33

La cote au moment du pari est snapshotée dans `Bet.oddAtBet` pour l'historique. Le gain réel est calculé à la résolution sur la pool finale, pas sur la cote snapshotée (comportement pari-mutuel).

**Calcul du gain à la résolution :**

```
gain(user) = (montant misé par user sur option gagnante / pool totale option gagnante) × totalPool
```

---

## Routes backend à créer

Toutes les routes sont dans `backend/src/routes/events.routes.ts` et enregistrées dans `backend/src/app.ts`.

### Routes publiques (utilisateur connecté)

| Méthode | Route                | Description                                          |
| ------- | -------------------- | ---------------------------------------------------- |
| `GET`   | `/events`            | Liste des événements ouverts (avec cotes temps réel) |
| `GET`   | `/events/:id`        | Détail d'un événement + distribution de la pool      |
| `POST`  | `/events/:id/bet`    | Placer un pari                                       |
| `GET`   | `/events/:id/my-bet` | Récupérer son pari sur un événement                  |
| `GET`   | `/users/me/bets`     | Historique de tous ses paris événements              |

### Routes admin uniquement (middleware `requireAdmin`)

| Méthode | Route                       | Description                                      |
| ------- | --------------------------- | ------------------------------------------------ |
| `POST`  | `/admin/events`             | Créer un événement                               |
| `PATCH` | `/admin/events/:id`         | Modifier un événement (avant clôture)            |
| `POST`  | `/admin/events/:id/resolve` | Résoudre l'événement (choisir l'option gagnante) |
| `POST`  | `/admin/events/:id/cancel`  | Annuler et rembourser                            |
| `POST`  | `/admin/events/:id/close`   | Clore les paris manuellement                     |

---

## Logique métier — `event.service.ts`

### `placeBet(userId, eventId, chosenOption, amount)`

1. Vérifier que l'événement est en statut `OPEN`
2. Vérifier que la date de clôture n'est pas dépassée (si définie)
3. Vérifier que l'utilisateur n'est pas dans `EventExclusion` pour cet événement
4. Vérifier que l'utilisateur n'a pas déjà parié sur cet événement
5. Vérifier que `amount >= minBet` et `amount <= maxBet` (si défini)
6. Vérifier que l'utilisateur a le solde suffisant
7. Dans une transaction Prisma :
   - Débiter `User.balance`
   - Créer le `Bet` avec `oddAtBet` calculé à l'instant T
   - Incrémenter `Event.poolByOption[chosenOption]` et `Event.totalPool`

### `resolveEvent(eventId, resolvedOption)` — admin only

1. Vérifier statut `OPEN` ou `CLOSED`
2. Passer statut à `RESOLVED`, noter `resolvedOption` et `resolvedAt`
3. Récupérer tous les `Bet` sur l'option gagnante
4. Pour chaque bet gagnant, calculer le payout pari-mutuel et créditer `User.balance`
5. Mettre à jour `Bet.payout` pour chaque bet résolu

### `cancelEvent(eventId)` — admin only

1. Passer statut à `CANCELLED`
2. Rembourser chaque `Bet.amount` à son utilisateur dans une transaction

---

## Frontend — pages et composants à créer

### Nouvelle page : `frontend/src/pages/EventsPage.tsx`

Affiche la liste des événements ouverts avec pour chaque carte :

- Titre, catégorie, image (optionnelle)
- Distribution en pourcentage par option (barres de progression)
- Cotes actuelles par option
- Pool totale et date de clôture
- Bouton "Parier" qui ouvre un drawer/modal

### Composant : `EventCard.tsx`

Carte similaire aux cards Polymarket. Affiche les options avec leur pourcentage de pool et leur cote.

### Composant : `BetDrawer.tsx`

Drawer latéral ou modal qui s'ouvre au clic sur "Parier" :

- Sélection de l'option
- Champ montant (avec min/max affichés)
- Aperçu du gain potentiel calculé en temps réel
- Bouton de confirmation

### Composant : `EventDetail.tsx` — `frontend/src/pages/EventDetailPage.tsx`

Vue détaillée d'un événement :

- Graphique d'évolution des cotes dans le temps (optionnel, nécessite un historique)
- Liste des paris de l'utilisateur courant
- Statut et résolution si résolue

### Page admin : `frontend/src/pages/admin/AdminEventsPage.tsx`

Accessible uniquement si `user.role === 'ADMIN'` :

- Formulaire de création d'événement (titre, description, catégorie, options, min/max mise, date de clôture, utilisateurs exclus)
- Liste de tous les événements avec actions : clore, résoudre, annuler
- Champ de recherche d'utilisateurs à exclure (par pseudo ou email)

---

## Routing

Ajouter dans `frontend/src/RouterApp.tsx` :

```tsx
<Route path="/events" element={<EventsPage />} />
<Route path="/events/:id" element={<EventDetailPage />} />
<Route path="/admin/events" element={<AdminEventsPage />} /> // protégée par guard admin
```

---

## Gestion des exclusions utilisateur

À la création ou modification d'un événement, l'admin peut rechercher des utilisateurs via un champ autocomplete (`GET /users?search=xxx`) et les ajouter à la liste des exclus. Ces utilisateurs voient l'événement dans la liste mais ne peuvent pas placer de pari (le bouton est désactivé avec un message explicatif).

---

## Points d'attention et edge cases

**Clôture automatique par date** : Si `closingAt` est défini, le service `placeBet` rejette les mises après cette date. Optionnellement, un cron ou un check au chargement de la page peut passer le statut à `CLOSED` automatiquement.

**Utilisateur déjà parié** : Un utilisateur ne peut parier qu'une fois par événement. Côté frontend, si `my-bet` renvoie un résultat, le drawer affiche son pari existant au lieu du formulaire.

**Intégrité de la pool** : Toutes les écritures sur `poolByOption` et `totalPool` doivent se faire dans des transactions Prisma pour éviter les race conditions.

**Cotes à 0** : Si une option a une pool à 0, sa cote est techniquement infinie. Afficher "∞" ou une valeur symbolique côté frontend jusqu'au premier pari sur cette option.

**Annulation** : Les paris annulés sont remboursés au montant exact misé, sans intérêts.

---

## Ordre d'implémentation suggéré

1. Mettre à jour le schema Prisma et lancer `prisma migrate`
2. Créer `event.service.ts` avec `placeBet` et `resolveEvent`
3. Créer `events.routes.ts` et les routes admin
4. Créer `EventsPage` et `EventCard` avec les données réelles
5. Ajouter `BetDrawer` et la logique de pari
6. Créer `AdminEventsPage` avec le formulaire de création et les actions
7. Ajouter `EventDetailPage`

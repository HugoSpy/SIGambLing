# 📋 SIGambling - Product Brief

**Dernière mise à jour :** 01/04/2026  
**Version :** 1.0  
**Owner :** Hugo (SIGL 2027)

---

## 🎯 Vision & Positionnement

### Vision

Créer une plateforme de paris virtuels et casino gamifiée pour la promo SIGL 2027 d'EPITA, mêlant fun, compétition et culture de promo.

### Type de projet

Side project sérieux avec investissement temps conséquent (sprint 1 semaine intensif)

### Positionnement

- **Ton :** Fun/troll mais exécution professionnelle
- **Audience :** ~60 étudiants EPITA (promo + potes)
- **Différenciation :** Événements custom liés à la vie de promo (présence cours, questions posées, événements EPITA)
- **Modèle économique :** 100% gratuit, monnaie virtuelle (tokens), aucune monétisation

---

## 👥 Utilisateurs

### Profil cible

- **Qui :** Étudiants EPITA SIGL Promo 2027
- **Nombre :** ~60 personnes
- **Comportement attendu :**
  - Connexion quotidienne pour daily reward
  - Création d'événements liés aux cours/vie étudiante
  - Compétition via leaderboard
  - Usage casino pour fun entre deux cours

### Authentification

- **Méthode :** Microsoft OAuth (Azure AD B2C)
- **Restriction :** Email `@epita.fr` uniquement
- **Session :** Remember me fonctionnel pendant 1 mois (pas juste cosmétique)

---

## ⚡ Features V1 (Sprint semaine 1)

### 🎲 1. Système de paris sur événements

**Création d'événements**

- **Par admin :** Événements prédéfinis (sports, politique, culture)
- **Par users :** Proposition d'événements custom liés à EPITA
  - Check présence cours (avec plages horaires)
  - Nombre de questions posées pendant/fin cours
  - Événements vie de promo (résultats exams, interventions, etc.)

**Workflow validation**

- User propose événement → Statut "pending"
- Admin reçoit notification (email)
- Admin valide/rejette avec feedback optionnel
- Si validé → événement devient "active"

**Système de cotes**

- Affichage type "Option A x1.85, Option B x2.1"
- Calcul automatique selon répartition des paris
- Cotes fixes au moment du pari (pas de variation dynamique V1)

**Catégories d'événements**

- 🏀 Sports
- 🏛️ Politics
- 🎭 Culture
- 🎓 EPITA (custom category)

### 🎰 2. Mini-jeux casino

**Roulette**

- **Types de paris :**
  - Rouge/Noir (x2)
  - Pair/Impair (x2)
  - 1-18 / 19-36 (x2)
  - Douzaines (x3)
  - Numéro direct (x35)
- **Mise minimale :** 10 tokens
- **Animation :** Spin visuel avec ball physics
- **Historique :** Affichage derniers 10 tirages

**Blackjack**

- **Actions :** Nouvelle main, Tirer, Rester, Doubler
- **Mise départ :** 20 tokens
- **Logique serveur :** RNG côté backend (pas de triche possible)
- **UI :** Visualisation cartes (SVG custom)

### 🏆 3. Leaderboard & Gamification

**Classement**

- Top joueurs par total tokens
- Pagination (top 50 puis load more)
- Stats détaillées : gains, pertes, win rate
- Badges/titres personnalisés affichés

**Daily Reward**

- 100 tokens offerts à la première connexion quotidienne
- Cron job Vercel (00:00 UTC reset eligibility)
- Toast notification à la connexion

**Système de badges**

- Déblocage automatique selon critères :
  - "High Roller" : >5000 tokens accumulés
  - "Roulette King" : 10+ wins consécutifs roulette
  - "Prophecy Master" : 5+ paris événements gagnés d'affilée
  - "Admin" : rôle spécial
  - Custom titles pour top 3 leaderboard

**Challenges**

- Objectifs hebdomadaires (ex: "Gagne 3 paris cette semaine")
- Progression affichée dans profil
- Récompenses tokens à complétion

### 👤 4. Profil utilisateur

**Informations affichées**

- Pseudo (extrait de l'email EPITA)
- Total tokens actuels
- Rank global
- Badges débloqués
- Stats :
  - Paris placés / gagnés / perdus
  - Win rate événements
  - Gains casino total
  - Streak actuel (jours connexion consécutifs)

**Historique**

- Liste paris événements (en cours + résolus)
- Historique games casino (roulette + blackjack)

### ⚙️ 5. Admin Panel

**Validation événements**

- Dashboard liste pending events
- Preview détaillé (description, options, cotes estimées)
- Actions : Approve / Reject (avec commentaire optionnel)
- Notification user par email du statut

**Gestion rôles**

- Attribution rôle "Validateur" à users de confiance
- Liste users avec rôles actuels
- Révocation rôles

**Modération**

- Ban/unban users
- Reset tokens d'un user
- Résolution manuelle paris litigieux
- Historique actions modération (audit log)

**Analytics basiques**

- Total paris placés (€ virtuel)
- Événements les plus populaires (par nb paris)
- Top 10 users actifs
- Graphique connexions/jour

---

## 🚫 Features exclues du V1

- ❌ Paris sur événements réels externes (API sports/politique)
- ❌ Notifications push (browser/mobile)
- ❌ Système de votes communautaire pour validation
- ❌ Chat/forum intégré
- ❌ Partage réseaux sociaux
- ❌ Mode multijoueur casino (tables partagées)

---

## 🛠️ Stack Technique

### Frontend

- **Framework :** React 18 + TypeScript
- **Build tool :** Vite
- **Styling :** Tailwind CSS
- **Animations :** Framer Motion
- **State :** Zustand (global) + React Query (server state)
- **Routing :** React Router v6
- **Forms :** React Hook Form + Zod validation

### Backend

- **Runtime :** Node.js 20
- **Framework :** Express.js
- **Language :** TypeScript
- **Validation :** Zod
- **ORM :** Prisma

### Database

- **Type :** PostgreSQL 15
- **Hosting :** Supabase (free tier 500MB)
- **Justification PostgreSQL :**
  - Relations complexes (users ↔ bets ↔ events ↔ leaderboard)
  - Queries SQL optimisées (leaderboards, stats, filtres)
  - Transactions atomiques (pari = débit compte + création bet)
  - Row Level Security natif

### Authentification

- **Provider :** Microsoft OAuth (Azure AD B2C)
- **Validation :** Email `@epita.fr` uniquement
- **Sessions :** JWT + refresh tokens (1 mois)
- **Library :** Passport.js

### Hosting & Deploy

- **Frontend :** Vercel (gratuit)
- **Backend :** Vercel Serverless Functions
- **Database :** Supabase (gratuit)
- **CI/CD :** GitHub Actions → auto-deploy Vercel
- **Monitoring :** Sentry (errors) + Vercel Analytics

### Coût infrastructure

- **Total :** ~5€/an (nom de domaine uniquement)
- Tout le reste en free tier

---

## 🔥 Critique de l'existant (Maquettes)

### ✅ Points forts

**Design global**

- ✅ Dark theme cohérent (bleu foncé #0A1628 + accents cyan/orange)
- ✅ Hiérarchie visuelle claire (hero → événements → leaderboard)
- ✅ Espacement généreux, pas de surcharge
- ✅ CTA bien visibles

**UX**

- ✅ Stats dashboard home informatif
- ✅ Leaderboard simple et lisible
- ✅ Options paris casino claires
- ✅ Gamification présente (rewards, badges)

### ❌ Points critiques à refaire

#### 1. 🔤 Typographie catastrophique

**Problème :**

- Font système générique, zéro personnalité
- Pas de hiérarchie typographique forte
- Tailles parfois trop petites (cotes événements)

**Solution :**

- **Font principale :** Inter (clean, moderne, excellent lisibilité)
- **Font accent :** Space Grotesk (headings, nombres)
- **Poids :** 300 (light), 500 (regular), 700 (bold)
- **Scale :**
  - Hero title: 4xl (48px)
  - Section headers: 2xl (32px)
  - Body: base (16px)
  - Small: sm (14px)

#### 2. 🎨 Design visuel fade/générique

**Problème :**

- Dégradés cyan→orange trop subtils
- Cards uniformes, pas de distinction catégories
- Boutons plats sans relief

**Solution :**

- **Glassmorphism** sur cards principales :
  ```css
  backdrop-filter: blur(12px);
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  ```
- **Hover states animés :**
  ```css
  transition: all 0.3s ease;
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 32px rgba(6, 182, 212, 0.3);
  }
  ```
- **Dégradés saturés** sur CTA :
  ```css
  background: linear-gradient(135deg, #06b6d4 0%, #f59e0b 100%);
  ```
- **Color coding catégories :**
  - Sports: bleu #3B82F6
  - Politics: rouge #EF4444
  - Culture: violet #8B5CF6
  - EPITA: cyan #06B6D4

#### 3. 📐 Layout rigide/prévisible

**Problème :**

- Grid 3 colonnes classique = ennuyeux
- Hero section trop "template startup"
- Aucune asymétrie

**Solution :**

- **Masonry layout** événements (hauteurs variables selon contenu)
- **Hero avec animation :**
  - Particles.js background
  - Gradient animé (hue rotation)
  - Typewriter effect sur tagline
- **Bento grid** pour stats cards (2x2 asymétrique)

#### 4. 🎬 Interactions inexistantes

**Problème :**

- Aucun micro-feedback visuel
- Roulette statique
- Leaderboard figé

**Solution :**

- **Framer Motion animations :**
  ```tsx
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  />
  ```
- **Roulette spin physics** (canvas + requestAnimationFrame)
- **Confetti animation** sur gros gains (react-confetti)
- **Toast notifications** stylées (react-hot-toast)
- **Skeleton loaders** pendant fetch (react-loading-skeleton)

#### 5. 📱 Responsive absent

**Problème :**

- Maquettes desktop only
- Probablement cassé mobile

**Solution :**

- **Mobile-first approach**
- Breakpoints Tailwind :
  - sm: 640px (mobile landscape)
  - md: 768px (tablet)
  - lg: 1024px (desktop)
  - xl: 1280px (large desktop)
- **Hamburger menu** mobile avec slide-in animation
- **Stack vertical** cards événements sur mobile

#### 6. 🧭 Navigation/IA confuse

**Problème :**

- Menu horizontal basique
- Pas de quick actions

**Solution :**

- **Sidebar desktop** avec sections collapsables :
  - 🏠 Dashboard
  - 🎲 Événements (+ badge "3 pending")
  - 🎰 Casino
  - 🏆 Classement
  - 👤 Profil
  - ⚙️ Admin (si rôle)
- **Bottom navigation mobile** (5 tabs max)
- **FAB (Floating Action Button)** : "Nouveau pari"
- **Breadcrumbs** pour navigation profonde

#### 7. 🎰 Casino UX douteuse

**Problème :**

- Blackjack sans visualisation cartes
- Roulette sans historique tirages

**Solution :**

- **Cartes blackjack :**
  - SVG custom (52 cartes + dos)
  - Animation deal (slide + flip)
- **Historique roulette :**
  - Derniers 10 numéros
  - Color coded (rouge/noir/vert)
  - Stats fréquence (hot/cold numbers)

#### 8. 📋 Roadmap produit flou

**Problème :**

- Phase 4 "Firestore + Firebase" contradictoire avec PostgreSQL
- Phases 2-3 pas détaillées

**Solution :**

- Roadmap clarifiée (voir section suivante)

---

## 📅 Roadmap Produit

### Phase 1 - MVP (Semaine 1) ✅

**Objectif :** Produit utilisable avec core features

- Frontend React + Auth Microsoft + PostgreSQL
- Événements (création admin + user proposals)
- Casino (roulette + blackjack)
- Leaderboard + gamification basique
- Admin panel validation

**Livrable :** Site déployé sur Vercel, accessible promo

---

### Phase 2 - Engagement (Semaines 2-3)

**Objectif :** Améliorer retention utilisateurs

**Features :**

- 📊 **Statistiques avancées**
  - Graphiques gains/pertes (Chart.js)
  - Win rate par catégorie événement
  - Heatmap activité hebdo
- 🔍 **Filtres événements**
  - Par catégorie (sports/politics/culture/EPITA)
  - Par date (aujourd'hui/semaine/mois)
  - Par cotes (favoris/outsiders)
  - Par statut (actifs/terminés)

- 🎯 **Challenges automatisés**
  - Challenges hebdomadaires auto-générés
  - Système de tiers (bronze/silver/gold rewards)
  - Notifications email complétion

- 📜 **Historique détaillé**
  - Filtres par type (événements/casino)
  - Export CSV pour les nerds
  - Replay paris (voir contexte au moment du pari)

**Timeline :** 2 semaines  
**Priorité :** Moyenne (si adoption V1 réussie)

---

### Phase 3 - Social (Mois 2)

**Objectif :** Créer une dynamique communautaire

**Features :**

- 📧 **Notifications email**
  - Nouvel événement catégorie suivie
  - Résolution paris (gains/pertes)
  - Challenges débloqués
  - Template HTML custom (pas de spam)

- 💬 **Système commentaires**
  - Commentaires sur événements
  - Trash talk avant résolution
  - Modération admin (delete/hide)

- 📸 **Partage résultats**
  - Screenshot auto-généré (HTML2Canvas)
  - Share card avec stats (ex: "J'ai gagné 500 tokens sur X !")
  - Boutons share Discord/Twitter

- 🏆 **Tournois spéciaux**
  - Événements one-shot promo (ex: "Semaine du Bac Blanc")
  - Leaderboard temporaire
  - Récompenses spéciales (badges exclusifs)

**Timeline :** 3-4 semaines  
**Priorité :** Basse (nice to have)

---

### Phase 4 - Scale (Si succès massif)

**Objectif :** Infrastructure pour croissance

**Features :**

- 🚀 **Infra payante**
  - Migration Supabase Pro (si >500MB data)
  - CDN Cloudflare pour assets
  - Redis cache (queries leaderboard)

- 📊 **Analytics avancées**
  - Mixpanel/PostHog pour product analytics
  - Funnels conversion (signup → 1er pari)
  - Retention cohorts

- 🤖 **API publique**
  - REST API documentée (Swagger)
  - Discord bot (paris via commandes /bet)
  - Webhooks événements résolus

- 🌍 **Multi-promos**
  - Support autres promos EPITA
  - Leaderboard global + par promo
  - Système d'invitations

**Timeline :** Si demande forte (3+ mois)  
**Priorité :** Conditionnel

---

## 🎯 Critères de Succès

### Objectif principal (1 mois post-launch)

**Feedback positif de la promo + demandes features**

### Métriques secondaires

**Adoption :**

- ✅ 40/60 personnes ont créé un compte (67% penetration)
- ✅ 30/60 connexions au moins 1x/semaine (50% actifs)

**Engagement :**

- ✅ 15+ événements custom proposés (dont 10+ validés)
- ✅ Moyenne 3 paris/user/semaine
- ✅ 10+ connexions quotidiennes

**Qualité :**

- ✅ Aucun bug bloquant reporté
- ✅ Temps réponse <2s (p95)
- ✅ 0 downtime non planifié

**Social proof :**

- ✅ 5+ messages positifs Discord/Slack EPITA
- ✅ 3+ demandes features spontanées
- ✅ 1+ événement custom devient viral promo

### Métriques stretch (objectifs ambitieux)

- 🎯 80% de la promo a un compte
- 🎯 Événement custom mentionné en amphi par un prof
- 🎯 Demandes d'autres promos pour accès
- 🎯 Moyenne 5+ connexions/jour

---

## 🔐 Gestion Admin & Modération

### Rôles système

**Superadmin (toi)**

- Validation/rejet événements
- Attribution rôles (Validateur)
- Modération users (ban, reset tokens)
- Résolution manuelle paris litigieux
- Accès analytics
- Configuration système

**Validateur**

- Validation/rejet événements uniquement
- Aucun accès modération/config

**User**

- Création événements (statut pending)
- Paris sur événements actifs
- Jeux casino
- Consultation classement/profil

### Workflow validation événements

1. **Soumission user**
   - Formulaire : titre, description, options (2-5), date résolution
   - Auto-check spam (max 3 events pending/user)
   - Status "pending" → email admin

2. **Review admin**
   - Dashboard liste pending (ordre chrono)
   - Preview détaillé :
     - Description complète
     - Cotes estimées (si users pré-parient)
     - Profil créateur (historique, réputation)
   - Actions :
     - ✅ Approve → event devient "active"
     - ❌ Reject → email user avec raison (optionnel)
     - 🔄 Request changes → email user demande edit

3. **Post-validation**
   - Event actif visible par tous
   - Notification email créateur
   - Paris ouverts

### Modération users

**Cas d'usage :**

- Spam événements (>5 rejets consécutifs)
- Comportement toxique (commentaires abusifs Phase 3)
- Suspicion triche casino (patterns anormaux)

**Actions disponibles :**

- **Warning** : email avertissement (3 strikes → ban)
- **Mute** : désactivation création événements (temporaire)
- **Ban** : compte désactivé (accès lecture seule)
- **Reset tokens** : remise à 1000 tokens (si bug exploité)

**Audit log :**

- Toutes actions admin loggées
- Affichage : date, admin, action, user cible, raison

---

## ⚠️ Risques & Mitigations

### Techniques

**Risque :** Auth Microsoft EPITA ne fonctionne pas (API bloquée)  
**Impact :** Critique (bloque lancement)  
**Mitigation :**

- Tester auth dans les 24h (Jour 1)
- Fallback : Email/password temporaire avec validation manuelle `@epita.fr`

**Risque :** Vercel cold starts ralentissent UX  
**Impact :** Moyen (frustration users)  
**Mitigation :**

- Acceptable pour 60 users
- Si problème : cron job keep-alive (ping API toutes les 5min)

**Risque :** 1 semaine trop court pour scope annoncé  
**Impact :** Élevé (features manquantes)  
**Mitigation :**

- Priorisation ruthless (voir ROADMAP.md)
- Drop features non-critiques si retard (ex: blackjack → roulette only)

### Produit

**Risque :** Adoption faible (<20 users)  
**Impact :** Élevé (projet inutile)  
**Mitigation :**

- Marketing interne avant launch (teasing Discord/Slack)
- Onboarding simple (1 clic Microsoft OAuth)
- Daily reward incentive connexion

**Risque :** Événements custom low quality (spam, blagues nulles)  
**Impact :** Moyen (dégrade expérience)  
**Mitigation :**

- Validation admin stricte
- Limit 3 pending events/user simultanés
- Attribution rôle Validateur à users de confiance (Phase 2)

**Risque :** Balance casino cassée (users farmant tokens infiniment)  
**Impact :** Élevé (économie virtuelle ruinée)  
**Mitigation :**

- House edge léger roulette (2.7% = 1 case verte)
- Blackjack RNG testé (librairie audited)
- Monitoring gains anormaux (si user gagne >10k tokens/jour → check)

**Risque :** Comportements addictifs (même virtuel)  
**Impact :** Moyen (image négative projet)  
**Mitigation :**

- Message disclaimer "jeu virtuel, pas d'argent réel"
- Pas de pression dark patterns (pas de countdown "dernier pari !")
- Stats transparentes (afficher win rate réel)

### Design

**Risque :** Design trop générique ("énième clone Polymarket")  
**Impact :** Moyen (pas de différenciation)  
**Mitigation :**

- Branding fort (logo custom, color palette unique)
- Easter eggs EPITA (references inside jokes promo)
- Animations custom (pas de templates génériques)

**Risque :** Mobile cassé (40% traffic probable)  
**Impact :** Élevé (frustration, abandon)  
**Mitigation :**

- Mobile-first development
- Tests mobile dès Jour 2
- Progressive Web App (installable)

---

## 📊 KPIs & Métriques

### Métriques produit (tracking dès J1)

**Acquisition**

- Signups totaux
- Taux conversion landing → signup
- Source acquisition (direct/Discord/Slack)

**Activation**

- % users ayant placé 1er pari (dans 24h)
- % users ayant joué au casino (dans 24h)
- Temps moyen 1er pari après signup

**Engagement**

- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- Session duration moyenne
- Actions/session (paris + games casino)

**Retention**

- D1/D7/D30 retention
- Churn rate hebdo
- Streak connexions (jours consécutifs)

**Monétisation (virtuelle)**

- Tokens distribués (daily rewards + gains)
- Tokens dépensés (paris + casino)
- Balance moyenne/user
- Velocity tokens (circulation économie)

### Métriques techniques (monitoring)

**Performance**

- Temps réponse API (p50/p95/p99)
- Page load time (First Contentful Paint)
- Time to Interactive

**Disponibilité**

- Uptime % (target 99.5%)
- Nombre incidents/semaine
- MTTR (Mean Time To Repair)

**Qualité**

- Taux erreur frontend (Sentry)
- Taux erreur API (5xx)
- Bugs critiques ouverts

---

## 🚀 Go-to-Market (Lancement)

### Pré-launch (J-3 avant deploy)

**Teasing Discord/Slack EPITA**

```
🎲 Incoming : SIGambling - Fantasy Betting Club

Paris virtuels sur des events de la promo + casino
100 tokens offerts au signup 🎁

Launch vendredi 17h, restez connectés 👀
```

**Création landing page hype**

- Countdown timer
- Sneak peek screenshots
- Formulaire early access (récup emails)

### Launch Day (Vendredi 17h)

**Annonce officielle**

```
🚀 SIGambling est LIVE !

➡️ https://sigambling.vercel.app

✅ Auth EPITA direct (1 clic)
✅ 100 tokens offerts au signup
✅ Premiers events déjà actifs

Qui sera #1 du leaderboard ? 🏆
```

**Premiers événements seedés**

- 3-5 événements prêts au launch
- Mix catégories (1 sport, 1 EPITA custom, 1 culture)
- Cotes attractives pour inciter paris

### Post-launch (Semaine 1-2)

**Engagement continu**

- Post quotidien Discord avec events du jour
- Annonce top 3 leaderboard hebdo
- Screenshots users gagnants (avec permission)

**Feedback loop**

- Google Form "Suggestions features"
- Channel Discord #sigambling-feedback
- Réponse rapide bugs (<24h)

**Itération rapide**

- Hot fixes quotidiens si bugs mineurs
- Feature requests prioritaires (vote communautaire)

---

## 📝 Notes & Décisions

### Décisions Architecture

**Pourquoi PostgreSQL et pas Firebase ?**

- Pas de vrai besoin temps réel (événements se résolvent heures/jours après)
- Relations complexes (users ↔ bets ↔ events)
- Queries optimisées leaderboard (SQL > Firestore pour aggregations)
- Transactions atomiques critiques (placement pari)
- Firebase potentiel Phase 3 si ajout notifs push/chat live

**Pourquoi Vercel Serverless et pas VPS ?**

- 0€ coût (vs VPS 5€/mois minimum)
- Auto-scaling (si succès viral)
- Deploy automatique Git push
- Cold starts acceptables pour 60 users

**Pourquoi pas Next.js full-stack ?**

- Séparation front/back plus claire pour contributions futures
- Backend peut scale indépendamment
- API réutilisable (Discord bot Phase 4)

### Décisions Produit

**Pourquoi pas d'argent réel ?**

- Régulation cauchemardesque (ARJEL/ANJ en France)
- Risques légaux étudiants mineurs
- Focus sur fun et communauté, pas profit

**Pourquoi validation admin manuelle ?**

- 60 users = volume gérable
- Qualité événements > quantité
- Évite spam/événements low effort
- Auto-validation Phase 2 si scaling

**Pourquoi pas de notifs V1 ?**

- Complexité technique (service worker, push API)
- Email suffit pour cas critiques (validation event)
- Feature engagement Phase 3

---

## 🔗 Ressources & Références

### Inspiration Design

- [Polymarket](https://polymarket.com) - UX paris prédictifs
- [Stake.com](https://stake.com) - Gamification casino
- [Sorare](https://sorare.com) - Onboarding fantasy sports

### Stack Documentation

- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Prisma](https://prisma.io)
- [Supabase](https://supabase.com/docs)

### Tools

- [Figma](https://figma.com) - Design (si besoin)
- [Excalidraw](https://excalidraw.com) - Diagrammes rapides
- [Eraser.io](https://eraser.io) - Architecture diagrams

---

**Document vivant - sera mis à jour selon avancement projet**

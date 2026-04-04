# 🎰 SIGambling - Spécifications Page de Connexion

## 📋 Vue d'ensemble

Page de bienvenue/connexion pour SIGambling, une plateforme de paris virtuels et casino pour une communauté étudiante privée. Design inspiré de Polymarket et Stake.com avec une esthétique moderne, thème sombre, et contraste élevé.

---

## 🎨 Design System

### Couleurs

- **Background**: `bg-zinc-950` (fond principal), `bg-zinc-900` (éléments)
- **Borders**: `border-zinc-800`, `border-zinc-700`
- **Text**: `text-zinc-100` (principal), `text-zinc-400` (secondaire), `text-zinc-500` (tertiaire)
- **Accent**: `emerald-500/600` (principal), `purple-500`, `blue-500`, `orange-500`

### Typography

- **H1**: `text-5xl lg:text-6xl font-bold`
- **H3**: `text-lg font-semibold`
- **Body**: `text-xl` (hero), `text-sm` (features)
- **Stats**: `text-3xl font-bold`

### Spacing & Layout

- **Max width**: `max-w-6xl` (contenu), `max-w-7xl` (header/footer)
- **Padding**: `px-4 lg:px-8` (responsive)
- **Grid**: `grid-cols-1 lg:grid-cols-2` (hero), `grid-cols-2` (features)

---

## 📁 Structure des fichiers

```
/src/app/
├── pages/
│   └── Login.tsx                    ← PAGE PRINCIPALE
├── context/
│   └── AuthContext.tsx             ← GESTION AUTHENTIFICATION
├── types.ts                        ← TYPES TYPESCRIPT
└── routes.tsx                      ← CONFIGURATION ROUTES
```

---

## 📄 Code Complet

### 1. `/src/app/pages/Login.tsx`

```tsx
import {
  TrendingUp,
  Trophy,
  Dice1,
  BarChart3,
  Users,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleMicrosoftLogin = () => {
    // TODO: Implémenter la connexion Microsoft OAuth
    console.log("Microsoft login clicked");
    login();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="size-5 text-white" />
              </div>
              <span className="text-xl font-bold text-zinc-100">
                SIGambling
              </span>
            </div>
            <button
              onClick={handleMicrosoftLogin}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
            >
              Se connecter
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Hero content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Plateforme exclusive pour étudiants
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-zinc-100 mb-4">
                Pariez sur
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-400">
                  l'avenir
                </span>
              </h1>

              <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
                Rejoignez une communauté de 60 étudiants qui parient sur des
                événements réels et tentent leur chance au casino virtuel.
              </p>

              {/* Microsoft Login Button */}
              <button
                onClick={handleMicrosoftLogin}
                className="group relative w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-50 text-zinc-900 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
              >
                <svg className="size-6" viewBox="0 0 23 23" fill="none">
                  <path fill="#f25022" d="M0 0h11v11H0z" />
                  <path fill="#00a4ef" d="M12 0h11v11H12z" />
                  <path fill="#7fba00" d="M0 12h11v11H0z" />
                  <path fill="#ffb900" d="M12 12h11v11H12z" />
                </svg>
                Se connecter avec Microsoft
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </button>

              <p className="text-sm text-zinc-500 mt-4">
                Connexion sécurisée via votre compte Microsoft étudiant
              </p>
            </div>

            {/* Right side - Features grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="size-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  Événements
                </h3>
                <p className="text-sm text-zinc-400">
                  Pariez sur des événements réels avec des cotes en temps réel
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Dice1 className="size-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  Casino
                </h3>
                <p className="text-sm text-zinc-400">
                  Roulette et Blackjack avec des tokens virtuels
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="size-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  Classement
                </h3>
                <p className="text-sm text-zinc-400">
                  Compétition amicale avec vos camarades étudiants
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="size-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  Communauté
                </h3>
                <p className="text-sm text-zinc-400">
                  60 étudiants actifs dans votre communauté privée
                </p>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 pt-12 border-t border-zinc-800">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-500 mb-1">
                60+
              </div>
              <div className="text-sm text-zinc-500">Utilisateurs actifs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-500 mb-1">
                1.2M
              </div>
              <div className="text-sm text-zinc-500">Tokens en circulation</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-500 mb-1">
                500+
              </div>
              <div className="text-sm text-zinc-500">Paris placés</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Shield className="size-4" />
              <span>Plateforme sécurisée réservée aux étudiants</span>
            </div>
            <div>© 2026 SIGambling. Tous droits réservés.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

---

### 2. `/src/app/context/AuthContext.tsx`

```tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { User } from "../types";
import { getCurrentUser } from "../data/mockData";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Change à false pour tester la page de login, true pour accès direct
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(
    isAuthenticated ? getCurrentUser() : null,
  );

  const login = () => {
    // TODO: Implémenter la vraie logique de connexion Microsoft
    setIsAuthenticated(true);
    setUser(getCurrentUser());
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

---

### 3. `/src/app/types.ts` (extrait pertinent)

```tsx
export interface User {
  id: string;
  username: string;
  tokens: number;
  rank: number;
  isAdmin?: boolean;
  badges: string[];
  stats: {
    betsPlaced: number;
    betsWon: number;
    betsLost: number;
    winRate: number;
    casinoGains: number;
    streak: number;
  };
}
```

---

## 🎯 Fonctionnalités principales

### ✅ Actuellement implémenté

1. **Header fixe**
   - Logo SIGambling avec icône gradient
   - Bouton "Se connecter" secondaire

2. **Hero Section (2 colonnes)**
   - **Gauche**: Badge "exclusive", titre gradient, description, CTA principal Microsoft
   - **Droite**: Grille 2x2 de features colorées (Événements, Casino, Classement, Communauté)

3. **Barre de statistiques**
   - 3 colonnes: Utilisateurs actifs, Tokens, Paris placés

4. **Footer**
   - Badge sécurité + Copyright

5. **Système d'authentification**
   - Context API pour gérer l'état
   - Redirection automatique si déjà connecté
   - Hook `useAuth()` pour accéder à l'état partout

6. **Responsive Design**
   - Desktop-first avec breakpoints `lg:`
   - Grid adaptatif
   - Bouton Microsoft full-width sur mobile

---

## 🔧 Packages requis

```bash
npm install lucide-react react-router
```

**Déjà inclus dans le projet**: React, TypeScript, Tailwind CSS v4

---

## 🚀 Configuration routes

### `/src/app/routes.tsx`

```tsx
import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { Layout } from "./components/Layout";
// ... autres imports

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      // ... routes protégées
    ],
  },
]);
```

### `/src/app/App.tsx`

```tsx
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
```

---

## 🎨 Éléments de design notables

### Bouton Microsoft

```tsx
// Logo Microsoft officiel (4 carrés colorés)
<svg className="size-6" viewBox="0 0 23 23" fill="none">
  <path fill="#f25022" d="M0 0h11v11H0z" /> {/* Rouge */}
  <path fill="#00a4ef" d="M12 0h11v11H12z" /> {/* Bleu */}
  <path fill="#7fba00" d="M0 12h11v11H0z" /> {/* Vert */}
  <path fill="#ffb900" d="M12 12h11v11H12z" /> {/* Jaune */}
</svg>
```

### Badge exclusif animé

```tsx
<div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
  Plateforme exclusive pour étudiants
</div>
```

### Titre avec gradient

```tsx
<h1 className="text-5xl lg:text-6xl font-bold">
  Pariez sur
  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-400">
    l'avenir
  </span>
</h1>
```

### Feature cards avec couleurs différentes

- Emerald (`from-emerald-500/10`) → Événements
- Purple (`from-purple-500/10`) → Casino
- Blue (`from-blue-500/10`) → Classement
- Orange (`from-orange-500/10`) → Communauté

---

## 📱 Responsive breakpoints

| Breakpoint      | Comportement                                    |
| --------------- | ----------------------------------------------- |
| Mobile (`< lg`) | Grid 1 col, bouton full-width, stats en colonne |
| Desktop (`lg:`) | Grid 2 col, bouton auto-width, stats en ligne   |

---

## 🔐 Prochaines étapes (TODO)

### Intégration Microsoft OAuth

**Dans `Login.tsx` → `handleMicrosoftLogin()`:**

```tsx
const handleMicrosoftLogin = async () => {
  try {
    // 1. Initialiser MSAL (Microsoft Authentication Library)
    // 2. Rediriger vers Microsoft login
    // 3. Récupérer le token OAuth
    // 4. Envoyer le token au backend pour validation
    // 5. Stocker le JWT de session
    // 6. Mettre à jour le state avec les infos utilisateur
    // 7. Rediriger vers "/"
  } catch (error) {
    console.error("Login failed:", error);
  }
};
```

**Dans `AuthContext.tsx` → `login()`:**

```tsx
const login = async (userInfo: MicrosoftUserInfo) => {
  // Recevoir les vraies infos depuis Microsoft
  // Créer/récupérer l'utilisateur dans la DB
  // Stocker en localStorage/sessionStorage
  setIsAuthenticated(true);
  setUser({
    id: userInfo.id,
    username: userInfo.displayName,
    // ... mapper les autres champs
  });
};
```

### Packages recommandés

```bash
npm install @azure/msal-browser @azure/msal-react
```

---

## 📊 Structure visuelle (Layout)

```
┌────────────────────────────────────────────────────────────┐
│ Header: Logo SIGambling          [Se connecter]           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────┐  ┌──────────────────────┐       │
│  │ [Badge] Exclusive   │  │  ┌────────┬────────┐ │       │
│  │                     │  │  │Event   │Casino  │ │       │
│  │ Pariez sur          │  │  │        │        │ │       │
│  │ l'avenir (gradient) │  │  ├────────┼────────┤ │       │
│  │                     │  │  │Ranking │Commu.  │ │       │
│  │ [Description]       │  │  └────────┴────────┘ │       │
│  │                     │  │                      │       │
│  │ [🔲 Microsoft Login] │  │                      │       │
│  └─────────────────────┘  └──────────────────────┘       │
│                                                            │
│  ─────────────��──────────────────────────────────         │
│  [60+]        [1.2M]         [500+]                       │
│  Users        Tokens         Bets                         │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Footer: 🛡️ Sécurisé          © 2026 SIGambling           │
└────────────────────────────────────────────────────────────┘
```

---

## ✨ Points d'attention

1. ✅ **Accessibilité**: Utiliser `lucide-react` pour les icônes SVG accessibles
2. ✅ **Performance**: Lazy loading avec React Router
3. ✅ **UX**: Redirection automatique si déjà connecté
4. ✅ **Animations subtiles**: `animate-pulse`, `hover:shadow-xl`, transitions
5. ⚠️ **Sécurité**: Implémenter OAuth côté backend (pas frontend only)
6. ⚠️ **Persistence**: Stocker tokens sécurisés (httpOnly cookies recommandés)

---

## 🎬 Comportement attendu

1. **Non connecté** → Affiche `/login`
2. **Click "Se connecter avec Microsoft"** → OAuth flow (à implémenter)
3. **Authentification réussie** → Redirect vers `/` (Dashboard)
4. **Déjà connecté** → Redirect automatique vers `/`

---

## 🛠️ Commandes pour tester

```bash
# Installer les dépendances
npm install

# Lancer en dev
npm run dev

# Pour tester la page de login
# → Modifier AuthContext.tsx ligne 16: useState(false)
```

---

**Date de création**: 2026-04-04  
**Stack**: React 18+ / TypeScript / Tailwind CSS v4 / React Router  
**Design inspiré de**: Polymarket, Stake.com

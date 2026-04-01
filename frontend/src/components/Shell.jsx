import { Link, NavLink } from "react-router-dom";

export function Shell({ user, notice, onCloseNotice, onLogout, children }) {
  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">S</span>
          <span>
            <strong>SIGambling</strong>
            <small>fantasy betting club</small>
          </span>
        </Link>

        <nav className="topnav">
          <NavLink to="/">Accueil</NavLink>
          <NavLink to="/events">Evenements</NavLink>
          <NavLink to="/games">Casino</NavLink>
          <NavLink to="/leaderboard">Classement</NavLink>
          <NavLink to="/profile">Profil</NavLink>
        </nav>

        <div className="user-strip">
          {user ? (
            <>
              <div className="token-pill">
                <span>{user.avatar}</span>
                <strong>{user.tokens}</strong>
                <small>tokens</small>
              </div>
              <button className="ghost-button" onClick={onLogout}>
                Deconnexion
              </button>
            </>
          ) : (
            <Link className="primary-button" to="/auth">
              Connexion
            </Link>
          )}
        </div>
      </header>

      <main className="page-frame">
        {notice ? (
          <div className="banner">
            <span>{notice}</span>
            <button onClick={onCloseNotice}>Fermer</button>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}


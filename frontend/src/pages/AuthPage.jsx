import { useState } from "react";

export function AuthPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({
    identifier: "demo@sigambling.dev",
    password: "password123",
  });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  async function submitLogin(event) {
    event.preventDefault();
    await onLogin(loginForm);
  }

  async function submitRegister(event) {
    event.preventDefault();
    await onRegister(registerForm);
  }

  return (
    <section className="auth-shell">
      <div className="auth-copy">
        <p className="eyebrow">Authentification</p>
        <h1>Connexion, inscription et bonus quotidien</h1>
        <p>Le MVP local passe par l'API Express. La couche Firebase Auth pourra se brancher ensuite sans casser l'UI.</p>
        <div className="timeline">
          <article>
            <strong>Compte demo</strong>
            <p>demo@sigambling.dev / password123</p>
          </article>
          <article>
            <strong>Compte admin</strong>
            <p>admin@sigambling.dev / admin12345</p>
          </article>
        </div>
      </div>

      <div className="panel auth-panel">
        <div className="chip-row">
          <button className={mode === "login" ? "chip active" : "chip"} onClick={() => setMode("login")}>
            Connexion
          </button>
          <button className={mode === "register" ? "chip active" : "chip"} onClick={() => setMode("register")}>
            Inscription
          </button>
        </div>
        {mode === "login" ? (
          <form className="stack" onSubmit={submitLogin}>
            <label>
              Email ou username
              <input value={loginForm.identifier} onChange={(event) => setLoginForm({ ...loginForm, identifier: event.target.value })} />
            </label>
            <label>
              Mot de passe
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
            </label>
            <button className="primary-button" type="submit">
              Se connecter
            </button>
          </form>
        ) : (
          <form className="stack" onSubmit={submitRegister}>
            <label>
              Username
              <input value={registerForm.username} onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })} required />
            </label>
            <label>
              Email
              <input type="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} required />
            </label>
            <label>
              Mot de passe
              <input type="password" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} minLength="8" required />
            </label>
            <button className="primary-button" type="submit">
              Creer un compte
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import "./Auth.css";

function AuthContainer() {
  const [mode, setMode] = useState("login");

  return (
    <div className="authContainer">
      <div className="authShell">
        <aside className="authBrandPanel">
          <span className="brandEyebrow">Финансовый ассистент</span>
          <h1>Финансовая система, которая держит фокус.</h1>
          <p>Планируйте цели, сравнивайте сценарии и смотрите прогнозы в одном спокойном рабочем пространстве.</p>
        </aside>

        <div className="authCard">
          {mode === "login" && (
            <Login onToggleMode={() => setMode("register")} onForgotPassword={() => setMode("forgot")} />
          )}
          {mode === "register" && <Register onToggleMode={() => setMode("login")} />}
          {mode === "forgot" && <ForgotPassword onBackToLogin={() => setMode("login")} />}
        </div>
      </div>
    </div>
  );
}

export default AuthContainer;

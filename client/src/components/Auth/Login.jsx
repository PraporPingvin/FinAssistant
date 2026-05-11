// src/components/Auth/Login.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

function Login({ onToggleMode, onForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const validateForm = () => {
    if (!email.trim()) {
      setError("Введите email");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Введите корректный email");
      return false;
    }
    if (!password) {
      setError("Введите пароль");
      return false;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "Ошибка входа");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="auth-form">
      <h2>Вход в FinRoad</h2>

      {error && <div className="auth-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Пароль</label>
        <div className="password-input-wrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="auth-button"
      >
        {loading ? "Вход..." : "Войти"}
      </button>

      <div className="auth-switch">
        Нет аккаунта?{" "}
        <button
          type="button"
          onClick={onToggleMode}
          className="switch-button"
          disabled={loading}
        >
          Зарегистрироваться
        </button>
        <div className="forgot-password-link">
          <button
            type="button"
            onClick={onForgotPassword}
            className="forgot-link"
          >
            Забыли пароль?
          </button>
        </div>
      </div>
    </form>
  );
}

export default Login;
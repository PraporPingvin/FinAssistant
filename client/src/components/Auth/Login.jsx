import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
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

    if (!validateForm()) return;

    setLoading(true);
    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || "Ошибка входа");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="authForm loginForm">
      <div className="authHeader">
        <div className="authLogo"><TrendingUp size={30} /></div>
        <span className="authEyebrow">Financial workspace</span>
        <h2>Добро пожаловать</h2>
        <p>Войдите в аккаунт, чтобы продолжить работу с целями, сценариями и прогнозами.</p>
      </div>

      <div className="authFeatureStrip">
        <span><ShieldCheck size={15} /> Защищённый вход</span>
        <span><Sparkles size={15} /> Умные финансы</span>
      </div>

      {error && <div className="authError">{error}</div>}

      <div className="formGroup">
        <label htmlFor="email" className="formLabel"><Mail size={16} /> Email</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
          className="formInput"
          required
        />
      </div>

      <div className="formGroup">
        <label htmlFor="password" className="formLabel"><Lock size={16} /> Пароль</label>
        <div className="passwordWrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            className="formInput"
            required
          />
          <button type="button" className="passwordToggle" onClick={() => setShowPassword(!showPassword)} tabIndex="-1">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="forgotPasswordLink">
        <button type="button" onClick={onForgotPassword} className="forgotLink">Забыли пароль?</button>
      </div>

      <button type="submit" disabled={loading} className="authButton">
        <LogIn size={18} /> {loading ? "Входим..." : "Войти"}
      </button>

      <div className="authSwitch">
        Нет аккаунта? <button type="button" onClick={onToggleMode} className="switchButton" disabled={loading}>Зарегистрироваться</button>
      </div>
    </form>
  );
}

export default Login;

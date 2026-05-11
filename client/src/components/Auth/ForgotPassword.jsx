// src/components/Auth/ForgotPassword.jsx
import React, { useState } from "react";
import { resetPassword } from "../../api/auth";
import "./Auth.css";

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    if (!email.trim()) {
      setError("Введите email");
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Введите корректный email");
      return false;
    }
    
    if (!newPassword) {
      setError("Введите новый пароль");
      return false;
    }
    
    if (newPassword.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(email, newPassword);
      
      if (result.success) {
        setSuccess(true);
        // Автоматически возвращаемся ко входу через 2 секунды
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        setError(result.error || "Ошибка при сбросе пароля");
      }
    } catch (err) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-form">
        <div className="success-message">
          <div className="success-icon">✅</div>
          <h3>Пароль успешно изменен!</h3>
          <p>Теперь вы можете войти с новым паролем.</p>
          <p className="note">Перенаправление на страницу входа...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Сброс пароля</h2>
      
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
        <label htmlFor="newPassword">Новый пароль</label>
        <div className="password-input-wrapper">
          <input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
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
      
      <div className="form-group">
        <label htmlFor="confirmPassword">Подтвердите пароль</label>
        <div className="password-input-wrapper">
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            required
          />
        </div>
      </div>
      
      <p className="form-hint">
        Пароль должен содержать не менее 6 символов
      </p>
      
      <button 
        type="submit" 
        disabled={loading}
        className="auth-button"
      >
        {loading ? "Сохранение..." : "Сбросить пароль"}
      </button>
      
      <div className="auth-switch">
        <button 
          type="button" 
          onClick={onBackToLogin} 
          className="switch-button"
          disabled={loading}
        >
          ← Вернуться ко входу
        </button>
      </div>
    </form>
  );
}

export default ForgotPassword;
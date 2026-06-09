import React, { useState } from "react";
import { resetPassword } from "../../api/auth";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Key } from "lucide-react";
import "./Auth.css";

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      <div className="authForm">
        <div className="successMessage">
          <div className="successIcon">✅</div>
          <h3>Пароль успешно изменен!</h3>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="authForm">
      <div className="authHeader">
        <h2>Сброс пароля</h2>
        <p>Введите email и новый пароль</p>
      </div>
      
      {error && <div className="authError">{error}</div>}
      
      <div className="formGroup">
        <label htmlFor="email" className="formLabel">
          <Mail size={16} />
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
          className="formInput"
          required
        />
      </div>
      
      <div className="formGroup">
        <label htmlFor="newPassword" className="formLabel">
          <Key size={16} />
          Новый пароль
        </label>
        <div className="passwordWrapper">
          <input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            className="formInput"
            required
          />
          <button
            type="button"
            className="passwordToggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      
      <div className="formGroup">
        <label htmlFor="confirmPassword" className="formLabel">
          <Lock size={16} />
          Подтвердите пароль
        </label>
        <div className="passwordWrapper">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            className="formInput"
            required
          />
          <button
            type="button"
            className="passwordToggle"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex="-1"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      
      <p className="formHint">Пароль должен содержать не менее 6 символов</p>
      
      <button type="submit" disabled={loading} className="authButton">
        {loading ? "Сохранение..." : "Сбросить пароль"}
      </button>
      
      <div className="authSwitch">
        <button type="button" onClick={onBackToLogin} className="backLink" disabled={loading}>
          <ArrowLeft size={14} />
          Вернуться ко входу
        </button>
      </div>
    </form>
  );
}

export default ForgotPassword;
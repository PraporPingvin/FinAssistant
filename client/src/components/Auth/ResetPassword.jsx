// src/components/Auth/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/auth";
import "./Auth.css";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError("Недействительная ссылка для восстановления пароля");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const validateForm = () => {
    if (!password) {
      setError("Введите новый пароль");
      return false;
    }
    
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return false;
    }
    
    if (password !== confirmPassword) {
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
      const result = await resetPassword(token, password);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(result.error || "Ошибка при сбросе пароля");
      }
    } catch (err) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-form">
            <h2>Ошибка</h2>
            <div className="auth-error">
              Недействительная или устаревшая ссылка для восстановления пароля.
            </div>
            <button 
              onClick={() => navigate("/login")}
              className="auth-button"
              style={{ marginTop: '20px' }}
            >
              Вернуться ко входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {success ? (
          <div className="auth-form">
            <div className="success-message">
              <div className="success-icon">✅</div>
              <h3>Пароль успешно изменен!</h3>
              <p>
                Теперь вы можете войти в аккаунт с новым паролем.
              </p>
              <p className="note">
                Через несколько секунд вы будете перенаправлены на страницу входа...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Установка нового пароля</h2>
            
            {error && <div className="auth-error">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="password">Новый пароль *</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <label htmlFor="confirmPassword">Подтвердите пароль *</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
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
              {loading ? "Сохранение..." : "Сохранить новый пароль"}
            </button>
            
            <div className="auth-switch">
              <button 
                type="button" 
                onClick={() => navigate("/login")}
                className="switch-button"
                disabled={loading}
              >
                ← Вернуться ко входу
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
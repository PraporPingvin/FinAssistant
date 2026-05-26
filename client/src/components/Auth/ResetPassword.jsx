import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/auth";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
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
      <div className="authContainer">
        <div className="authCard">
          <div className="authForm">
            <div className="authHeader">
              <div className="authLogo">⚠️</div>
              <h2>Ошибка</h2>
            </div>
            <div className="authError">
              Недействительная или устаревшая ссылка для восстановления пароля.
            </div>
            <button onClick={() => navigate("/login")} className="authButton" style={{ marginTop: '20px' }}>
              <ArrowLeft size={18} />
              Вернуться ко входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="authContainer">
        <div className="authCard">
          <div className="authForm">
            <div className="successMessage">
              <div className="successIcon">✅</div>
              <h3>Пароль успешно изменен!</h3>
              <p>Теперь вы можете войти в аккаунт с новым паролем.</p>
              <p className="note">Через несколько секунд вы будете перенаправлены...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="authContainer">
      <div className="authCard">
        <form onSubmit={handleSubmit} className="authForm">
          <div className="authHeader">
            <div className="authLogo">🔑</div>
            <h2>Установка нового пароля</h2>
            <p>Придумайте надежный пароль</p>
          </div>
          
          {error && <div className="authError">{error}</div>}
          
          <div className="formGroup">
            <label htmlFor="password" className="formLabel">
              <Lock size={16} />
              Новый пароль <span className="required">*</span>
            </label>
            <div className="passwordWrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              Подтвердите пароль <span className="required">*</span>
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
            {loading ? "Сохранение..." : "Сохранить новый пароль"}
          </button>
          
          <div className="authSwitch">
            <button type="button" onClick={() => navigate("/login")} className="backLink" disabled={loading}>
              <ArrowLeft size={14} />
              Вернуться ко входу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
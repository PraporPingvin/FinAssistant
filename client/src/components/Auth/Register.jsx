import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

function Register({ onToggleMode }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Очищаем ошибку при изменении полей
    if (error) setError("");
  };

  const validateForm = () => {
    const { email, password, confirmPassword } = formData;
    
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
    
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return false;
    }
    
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    const { email, password, first_name, last_name } = formData;
    const result = await register({
      email,
      password,
      first_name: first_name.trim() || undefined,
      last_name: last_name.trim() || undefined
    });
    
    if (!result.success) {
      setError(result.error || "Ошибка регистрации");
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="auth-form">
      <h2>Регистрация в FinRoad</h2>
      
      {error && <div className="auth-error">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          autoComplete="email"
          required
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="first_name">Имя</label>
          <input
            id="first_name"
            type="text"
            name="first_name"
            placeholder="Иван"
            value={formData.first_name}
            onChange={handleChange}
            disabled={loading}
            autoComplete="given-name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="last_name">Фамилия</label>
          <input
            id="last_name"
            type="text"
            name="last_name"
            placeholder="Иванов"
            value={formData.last_name}
            onChange={handleChange}
            disabled={loading}
            autoComplete="family-name"
          />
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="password">Пароль *</label>
        <div className="password-input-wrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
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
        <label htmlFor="confirmPassword">Подтверждение пароля *</label>
        <div className="password-input-wrapper">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
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
      
      <button 
        type="submit" 
        disabled={loading}
        className="auth-button"
      >
        {loading ? "Регистрация..." : "Зарегистрироваться"}
      </button>
      
      <div className="auth-switch">
        Уже есть аккаунт?{" "}
        <button 
          type="button" 
          onClick={onToggleMode} 
          className="switch-button"
          disabled={loading}
        >
          Войти
        </button>
      </div>
    </form>
  );
}

export default Register;
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";
import "./Auth.css";

function Register({ onToggleMode }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    acceptedTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value
    });
    if (error) setError("");
  };

  const validateForm = () => {
    const { email, password, confirmPassword, acceptedTerms } = formData;
    
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

    if (!acceptedTerms) {
      setError("Подтвердите согласие с условиями регистрации и обработкой персональных данных");
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
    <form onSubmit={handleRegister} className="authForm">
      <div className="authHeader">
        <h2>Создание аккаунта</h2>
        <p>Присоединяйтесь к финансовому ассистенту</p>
      </div>
      
      {error && <div className="authError">{error}</div>}
      
      <div className="formGroup">
        <label htmlFor="email" className="formLabel">
          <Mail size={16} />
          Email <span className="required">*</span>
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          autoComplete="email"
          className="formInput"
          required
        />
      </div>
      
      <div className="formRow">
        <div className="formGroup">
          <label htmlFor="first_name" className="formLabel">
            <User size={16} />
            Имя
          </label>
          <input
            id="first_name"
            type="text"
            name="first_name"
            placeholder="Иван"
            value={formData.first_name}
            onChange={handleChange}
            disabled={loading}
            autoComplete="given-name"
            className="formInput"
          />
        </div>
        
        <div className="formGroup">
          <label htmlFor="last_name" className="formLabel">
            <User size={16} />
            Фамилия
          </label>
          <input
            id="last_name"
            type="text"
            name="last_name"
            placeholder="Иванов"
            value={formData.last_name}
            onChange={handleChange}
            disabled={loading}
            autoComplete="family-name"
            className="formInput"
          />
        </div>
      </div>
      
      <div className="formGroup">
        <label htmlFor="password" className="formLabel">
          <Lock size={16} />
          Пароль <span className="required">*</span>
        </label>
        <div className="passwordWrapper">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
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
          Подтверждение пароля <span className="required">*</span>
        </label>
        <div className="passwordWrapper">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
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

      <label className={`authConsent ${formData.acceptedTerms ? "checked" : ""}`}>
        <input
          type="checkbox"
          name="acceptedTerms"
          checked={formData.acceptedTerms}
          onChange={handleChange}
          disabled={loading}
          required
        />
        <span className="authConsentBox" aria-hidden="true">
          <ShieldCheck size={16} />
        </span>
        <span>
          Я принимаю пользовательское соглашение и политику конфиденциальности,
          а также даю согласие на обработку персональных данных.
        </span>
      </label>
      
      <button type="submit" disabled={loading || !formData.acceptedTerms} className="authButton">
        <UserPlus size={18} />
        {loading ? "Регистрация..." : "Зарегистрироваться"}
      </button>
      
      <div className="authSwitch">
        Уже есть аккаунт?{" "}
        <button type="button" onClick={onToggleMode} className="switchButton" disabled={loading}>
          Войти
        </button>
      </div>
    </form>
  );
}

export default Register;

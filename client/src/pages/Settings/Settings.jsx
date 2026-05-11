// src/pages/Settings/Settings.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import "./Settings.css";

function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!currentPassword) {
      setMessage({ type: "error", text: "Введите текущий пароль" });
      return;
    }

    if (!newPassword) {
      setMessage({ type: "error", text: "Введите новый пароль" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Новый пароль должен быть не менее 6 символов" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Пароли не совпадают" });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Пароль успешно изменен!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error || "Ошибка при смене пароля" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Ошибка соединения с сервером" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="settings-container">
        <h1>Настройки</h1>
        
        <div className="settings-card">
          <h2>Смена пароля</h2>
          
          {message.text && (
            <div className={`settings-message ${message.type}`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={handleChangePassword} className="settings-form">
            <div className="form-group">
              <label>Текущий пароль</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Новый пароль</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Подтверждение нового пароля</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="show-password-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                />
                Показать пароли
              </label>
            </div>
            
            <button type="submit" disabled={loading} className="change-password-button">
              {loading ? "Сохранение..." : "Изменить пароль"}
            </button>
          </form>
        </div>
        
        <div className="settings-card">
          <h2>Информация об аккаунте</h2>
          <div className="account-info">
            <div className="info-row">
              <label>Email:</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-row">
              <label>ID:</label>
              <span>{user?.id}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Settings;
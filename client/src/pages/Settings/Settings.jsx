import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import { Eye, EyeOff, Save, Lock, Mail, User, Shield, CheckCircle, AlertCircle } from "lucide-react";
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
    const response = await fetch("http://localhost:5000/api/user/profile/change-password", {
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
    console.error("Ошибка:", error);
    setMessage({ type: "error", text: "Ошибка соединения с сервером" });
  } finally {
    setLoading(false);
  }
};

  return (
    <Layout>
      <div className="settingsPage">
        <div className="pageHeaderSetting">
          <h1>Настройки</h1>
          <p>Управление аккаунтом и безопасностью</p>
        </div>

        <div className="settingsGrid">
          <div className="settingsCard">
            <div className="cardHeader">
              <Lock size={20} />
              <h2>Смена пароля</h2>
            </div>

            {message.text && (
              <div className={`message ${message.type}`}>
                {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="settingsForm">
              <div className="formGroup">
                <label className="formLabel">
                  <Lock size={14} />
                  Текущий пароль
                </label>
                <div className="passwordWrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="formInput"
                  />
                </div>
              </div>

              <div className="formGroup">
                <label className="formLabel">
                  <Lock size={14} />
                  Новый пароль
                </label>
                <div className="passwordWrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="formInput"
                  />
                </div>
              </div>

              <div className="formGroup">
                <label className="formLabel">
                  <Lock size={14} />
                  Подтверждение нового пароля
                </label>
                <div className="passwordWrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="formInput"
                  />
                </div>
              </div>

              <div className="showPasswordCheckbox">
                <label>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  Показать пароли
                </label>
              </div>

              <button type="submit" disabled={loading} className="submitButton">
                <Save size={16} />
                {loading ? "Сохранение..." : "Изменить пароль"}
              </button>
            </form>
          </div>

          <div className="settingsCard">
            <div className="cardHeader">
              <Shield size={20} />
              <h2>Информация об аккаунте</h2>
            </div>
            <div className="accountInfo">
              <div className="infoRow">
                <div className="infoLabel">
                  <Mail size={14} />
                  Email
                </div>
                <div className="infoValue">{user?.email}</div>
              </div>
              {user?.first_name && (
                <div className="infoRow">
                  <div className="infoLabel">
                    <User size={14} />
                    Имя
                  </div>
                  <div className="infoValue">{user.first_name} {user.last_name || ""}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Settings;
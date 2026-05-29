import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Mail, Save, Shield, User } from "lucide-react";
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

    if (!currentPassword) return setMessage({ type: "error", text: "Введите текущий пароль" });
    if (!newPassword) return setMessage({ type: "error", text: "Введите новый пароль" });
    if (newPassword.length < 6) return setMessage({ type: "error", text: "Новый пароль должен быть не менее 6 символов" });
    if (newPassword !== confirmPassword) return setMessage({ type: "error", text: "Пароли не совпадают" });

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Пароль успешно изменён" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error || "Не удалось изменить пароль" });
      }
    } catch (error) {
      console.error("Ошибка:", error);
      setMessage({ type: "error", text: "Не удалось связаться с сервером" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="settingsPage">
        <section className="settingsHero">
          <div>
            <span className="settingsEyebrow">Security center</span>
            <h1>Настройки аккаунта</h1>
            <p>Управляйте безопасностью, паролем и основной информацией аккаунта в одном аккуратном пространстве.</p>
          </div>
          <div className="settingsHeroPanel">
            <Shield size={28} />
            <span>Защита</span>
            <strong>Active</strong>
          </div>
        </section>

        <section className="settingsGrid">
          <main className="settingsCard passwordCard">
            <div className="settingsCardHeader">
              <div>
                <span>Пароль</span>
                <h2>Смена пароля</h2>
              </div>
              <Lock size={24} />
            </div>

            {message.text && (
              <div className={`settingsMessage ${message.type}`}>
                {message.type === "success" ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="settingsForm">
              <PasswordField label="Текущий пароль" value={currentPassword} setValue={setCurrentPassword} show={showPassword} disabled={loading} />
              <PasswordField label="Новый пароль" value={newPassword} setValue={setNewPassword} show={showPassword} disabled={loading} />
              <PasswordField label="Подтверждение нового пароля" value={confirmPassword} setValue={setConfirmPassword} show={showPassword} disabled={loading} />

              <label className="showPasswordToggle">
                <input type="checkbox" checked={showPassword} onChange={() => setShowPassword(!showPassword)} />
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                Показать пароли
              </label>

              <button type="submit" disabled={loading} className="settingsPrimaryButton">
                <Save size={16} /> {loading ? "Сохраняем..." : "Изменить пароль"}
              </button>
            </form>
          </main>

          <aside className="settingsCard accountCard">
            <div className="settingsCardHeader">
              <div>
                <span>Аккаунт</span>
                <h2>Информация</h2>
              </div>
              <User size={24} />
            </div>
            <div className="accountInfoGrid">
              <div className="accountInfoTile">
                <span><Mail size={15} /> Email</span>
                <strong>{user?.email || "Не указан"}</strong>
              </div>
              <div className="accountInfoTile">
                <span><User size={15} /> Имя</span>
                <strong>{[user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Не указано"}</strong>
              </div>
              <div className="securityNote">
                <Shield size={18} />
                <p>Используйте надёжный пароль и не передавайте его третьим лицам. Минимальная длина нового пароля: 6 символов.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </Layout>
  );
}

function PasswordField({ label, value, setValue, show, disabled }) {
  return (
    <label className="settingsField">
      <span><Lock size={14} /> {label}</span>
      <input type={show ? "text" : "password"} value={value} onChange={(e) => setValue(e.target.value)} placeholder="••••••••" disabled={disabled} />
    </label>
  );
}

export default Settings;

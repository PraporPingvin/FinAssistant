import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import { AlertCircle, CheckCircle, Edit2, Mail, Save, Sparkles, User, X } from "lucide-react";
import "./Profile.css";

function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  if (!user) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUser = { ...user, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        user.first_name = formData.first_name;
        user.last_name = formData.last_name;
        setMessage({ type: "success", text: "Профиль успешно обновлён" });
        setIsEditing(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage({ type: "error", text: data.error || "Не удалось обновить профиль" });
      }
    } catch (error) {
      console.error("Ошибка:", error);
      setMessage({ type: "error", text: "Не удалось связаться с сервером" });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (user.first_name && user.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    if (user.first_name) return user.first_name[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "U";
  };

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Пользователь";

  return (
    <Layout>
      <div className="profilePage">
        <section className="profileHero">
          <div>
        <span className="profileEyebrow">Учетная запись</span>
            <h1>Профиль пользователя</h1>
            <p>Личные данные, контактная информация и быстрый доступ к редактированию аккаунта.</p>
          </div>
          <div className="profileHeroBadge">
            <span>Аккаунт</span>
            <strong>{getInitials()}</strong>
            <small>{user.email}</small>
          </div>
        </section>

        <section className="profileShell">
          <aside className="profileSummaryCard">
            <div className="profileAvatar">{getInitials()}</div>
            <span>Добро пожаловать</span>
            <h2>{fullName}</h2>
            <p>{user.email}</p>
            <div className="profileGlowStat"><Sparkles size={16} /> Данные аккаунта защищены</div>
          </aside>

          <main className="profileCard">
            <div className="profileCardHeader">
              <div>
                <span>Карточка профиля</span>
                <h2>{isEditing ? "Редактирование" : "Личная информация"}</h2>
              </div>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="profilePrimaryButton">
                  <Edit2 size={16} /> Редактировать
                </button>
              )}
            </div>

            {message.text && (
              <div className={`profileMessage ${message.type}`}>
                {message.type === "success" ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
                {message.text}
              </div>
            )}

            {!isEditing ? (
              <div className="profileInfoGrid">
                <InfoTile icon={<User size={16} />} label="Имя" value={user.first_name || "Не указано"} />
                <InfoTile icon={<User size={16} />} label="Фамилия" value={user.last_name || "Не указано"} />
                <InfoTile icon={<Mail size={16} />} label="Email" value={user.email} wide />
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="profileForm">
                <label>
                  <span>Имя</span>
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} placeholder="Введите имя" />
                </label>
                <label>
                  <span>Фамилия</span>
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Введите фамилию" />
                </label>
                <div className="profileFormActions">
                  <button type="button" onClick={() => setIsEditing(false)} className="profileGhostButton" disabled={loading}>
                    <X size={16} /> Отмена
                  </button>
                  <button type="submit" className="profilePrimaryButton" disabled={loading}>
                    <Save size={16} /> {loading ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              </form>
            )}
          </main>
        </section>
      </div>
    </Layout>
  );
}

function InfoTile({ icon, label, value, wide }) {
  return (
    <div className={`profileInfoTile ${wide ? "wide" : ""}`}>
      <span>{icon} {label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default Profile;

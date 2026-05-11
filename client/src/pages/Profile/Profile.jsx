// src/pages/Profile/Profile.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import "./Profile.css";

function Profile() {
  const { user, login } = useAuth(); // Добавили login для обновления контекста
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  if (!user) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      console.log("📤 Отправка запроса на обновление профиля");
      console.log("📦 Данные:", formData);
      
      const response = await fetch("http://localhost:5000/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log("📥 Ответ сервера:", data);

      if (response.ok) {
        // Обновляем данные пользователя в localStorage и контексте
        const updatedUser = { ...user, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Обновляем контекст через login с существующим токеном
        // Просто обновляем user объект
        user.first_name = formData.first_name;
        user.last_name = formData.last_name;
        
        setMessage({ type: "success", text: "Профиль успешно обновлен!" });
        setIsEditing(false);
        
        // Перезагружаем страницу через 1 секунду для обновления данных
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage({ type: "error", text: data.error || "Ошибка при обновлении" });
      }
    } catch (error) {
      console.error("❌ Ошибка:", error);
      setMessage({ type: "error", text: "Ошибка соединения с сервером" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="profile-container">
        <h1>Профиль пользователя</h1>
        
        <div className="profile-card">
          <div className="profile-avatar">
            {user.first_name?.[0] || user.email[0]}
          </div>
          
          {message.text && (
            <div className={`profile-message ${message.type}`}>
              {message.text}
            </div>
          )}
          
          {!isEditing ? (
            <>
              <div className="profile-info">
                <div className="info-row">
                  <label>Имя:</label>
                  <span>{user.first_name || "Не указано"}</span>
                </div>
                
                <div className="info-row">
                  <label>Фамилия:</label>
                  <span>{user.last_name || "Не указано"}</span>
                </div>
                
                <div className="info-row">
                  <label>Email:</label>
                  <span>{user.email}</span>
                </div>
                
                <div className="info-row">
                  <label>ID:</label>
                  <span>{user.id}</span>
                </div>
              </div>
              
              <div className="profile-actions">
                <button onClick={() => setIsEditing(true)} className="edit-button">
                  ✏️ Редактировать профиль
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group">
                <label>Имя</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Введите имя"
                />
              </div>
              
              <div className="form-group">
                <label>Фамилия</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Введите фамилию"
                />
              </div>
              
              <div className="profile-form-actions">
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? "Сохранение..." : "💾 Сохранить"}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="cancel-button">
                  ❌ Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Profile;
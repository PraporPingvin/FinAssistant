import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import { User, Mail, Edit2, Save, X, CheckCircle, AlertCircle } from "lucide-react";
import "./Profile.css";

function Profile() {
  const { user, login } = useAuth();
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
      
      const response = await fetch("http://localhost:5000/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUser = { ...user, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        user.first_name = formData.first_name;
        user.last_name = formData.last_name;
        
        setMessage({ type: "success", text: "Профиль успешно обновлен!" });
        setIsEditing(false);
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage({ type: "error", text: data.error || "Ошибка при обновлении" });
      }
    } catch (error) {
      console.error("Ошибка:", error);
      setMessage({ type: "error", text: "Ошибка соединения с сервером" });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (user.first_name) return user.first_name[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "U";
  };

  return (
    <Layout>
      <div className="profilePage">
        <div className="pageHeaderProfile">
          <h1>Профиль пользователя</h1>
          <p>Управление личной информацией</p>
        </div>

        <div className="profileCard">
          <div className="profileAvatar">
            {getInitials()}
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          {!isEditing ? (
            <>
              <div className="profileInfo">
                <div className="infoRow">
                  <div className="infoLabel">
                    <User size={14} />
                    Имя
                  </div>
                  <div className="infoValue">{user.first_name || "Не указано"}</div>
                </div>

                <div className="infoRow">
                  <div className="infoLabel">
                    <User size={14} />
                    Фамилия
                  </div>
                  <div className="infoValue">{user.last_name || "Не указано"}</div>
                </div>

                <div className="infoRow">
                  <div className="infoLabel">
                    <Mail size={14} />
                    Email
                  </div>
                  <div className="infoValue">{user.email}</div>
                </div>

                
              </div>

              <div className="profileActions">
                <button onClick={() => setIsEditing(true)} className="editButton">
                  <Edit2 size={16} />
                  Редактировать профиль
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="profileForm">
              <div className="formGroup">
                <label className="formLabel">Имя</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Введите имя"
                  className="formInput"
                />
              </div>

              <div className="formGroup">
                <label className="formLabel">Фамилия</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Введите фамилию"
                  className="formInput"
                />
              </div>

              <div className="formActions">
                <button type="button" onClick={() => setIsEditing(false)} className="cancelButton" disabled={loading}>
                  <X size={14} />
                  Отмена
                </button>
                <button type="submit" className="saveButton" disabled={loading}>
                  <Save size={14} />
                  {loading ? "Сохранение..." : "Сохранить"}
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
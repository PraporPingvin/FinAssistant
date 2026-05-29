import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./UserMenu.css";

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = (() => {
    if (user.first_name && user.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    if (user.first_name) return user.first_name[0].toUpperCase();
    return user.email?.[0]?.toUpperCase() || "U";
  })();

  const displayName = user.first_name || user.email?.split("@")[0] || "Аккаунт";

  const goTo = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="userMenu" ref={menuRef}>
      <button className="userMenuButton" onClick={() => setIsOpen(!isOpen)}>
        <span className="userAvatar">{initials}</span>
        <span className="userName">{displayName}</span>
        <ChevronDown size={14} className={`userMenuArrow ${isOpen ? "open" : ""}`} />
      </button>

      {isOpen && (
        <div className="userDropdown">
          <div className="userInfo">
            <div className="userInfoName">{[user.first_name, user.last_name].filter(Boolean).join(" ") || displayName}</div>
            <div className="userInfoEmail">{user.email}</div>
          </div>
          <button className="dropdownItem" onClick={() => goTo("/profile")}><User size={16} /> Профиль</button>
          <button className="dropdownItem" onClick={() => goTo("/settings")}><Settings size={16} /> Настройки</button>
          <div className="dropdownDivider" />
          <button className="dropdownItem logout" onClick={handleLogout}><LogOut size={16} /> Выйти</button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;

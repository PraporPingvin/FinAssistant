import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut, ChevronDown, UserCircle } from "lucide-react";
import "./UserMenu.css";

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!user) return null;

  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const displayName = user.first_name || user.email.split('@')[0];

  return (
    <div className="userMenu" ref={menuRef}>
      <button className="userMenuButton" onClick={toggleMenu}>
        <div className="userAvatar">
          {getInitials()}
        </div>
        <span className="userName">{displayName}</span>
        <ChevronDown size={14} className={`userMenuArrow ${isOpen ? "open" : ""}`} />
      </button>

      {isOpen && (
        <div className="userDropdown">
          <div className="userInfo">
            <div className="userInfoName">
              {user.first_name} {user.last_name}
            </div>
            <div className="userInfoEmail">{user.email}</div>
          </div>
          <div className="dropdownDivider" />
          <button className="dropdownItem" onClick={() => navigate('/profile')}>
            <User size={16} />
            Профиль
          </button>
          <button className="dropdownItem" onClick={() => navigate('/settings')}>
            <Settings size={16} />
            Настройки
          </button>
          <div className="dropdownDivider" />
          <button className="dropdownItem logout" onClick={handleLogout}>
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
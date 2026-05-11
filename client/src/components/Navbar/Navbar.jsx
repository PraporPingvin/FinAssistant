// src/components/Navbar/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import UserMenu from "../UserMenu/UserMenu";
import "./Navbar.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Закрываем меню при изменении маршрута
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Определяем активную ссылку
  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="navbar">
      <div className="navbarHeader">

        <div className="navbar-right">
          <UserMenu />
          <button
            className="menuToggle"
            onClick={toggleMenu}
            aria-label="Открыть меню"
          >
            {isMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <nav>
        <ul className={`navLinks ${isMenuOpen ? 'navLinksOpen' : ''}`}>
          <li className="navItem">
            <Link
              to="/"
              className={`navLink ${isActive("/") ? 'navLinkActive' : ''}`}
            >
              📊 Обзор
            </Link>
          </li>
          <li className="navItem">
            <Link
              to="/goals"
              className={`navLink ${isActive("/goals") ? 'navLinkActive' : ''}`}
            >
              🎯 Цели
            </Link>
          </li>
          <li className="navItem">
            <Link
              to="/scenarios"
              className={`navLink ${isActive("/scenarios") ? 'navLinkActive' : ''}`}
            >
              📈 Сценарии
            </Link>
          </li>
          <li className="navItem">
            <Link
              to="/forecast"
              className={`navLink ${isActive("/forecast") ? 'navLinkActive' : ''}`}
            >
              🔮 Прогнозы
            </Link>
          </li>
          <li className="navItem">
            <Link
              to="/checkpoints"
              className={`navLink ${isActive("/checkpoints") ? 'navLinkActive' : ''}`}
            >
              ⏱️ Контроль
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
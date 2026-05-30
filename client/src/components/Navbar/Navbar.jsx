import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Clock, LayoutDashboard, LineChart, Menu, Target, TrendingUp, X } from "lucide-react";
import UserMenu from "../UserMenu/UserMenu";
import "./Navbar.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const isActive = (path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path));

  const navItems = [
    { to: "/", label: "Обзор", icon: <LayoutDashboard size={18} /> },
    { to: "/goals", label: "Цели", icon: <Target size={18} /> },
    { to: "/scenarios", label: "Сценарии", icon: <LineChart size={18} /> },
    { to: "/forecast", label: "Прогнозы", icon: <TrendingUp size={18} /> },
    { to: "/checkpoints", label: "Контроль", icon: <Clock size={18} /> },
  ];

  return (
    <header className="navbar">
      <div className="navbarContainer">
        <Link to="/" className="logo">
          <span className="logoMark"><BarChart3 size={22} /></span>
          <span className="logoText">Финансовый ассистент</span>
        </Link>

        <nav className="desktopNav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className={`navLink ${isActive(item.to) ? "active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="navbarRight">
          <UserMenu />
          <button className="menuToggle" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Меню">
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <nav className={`mobileNav ${isMenuOpen ? "open" : ""}`} aria-label="Мобильная навигация">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} className={`navLink ${isActive(item.to) ? "active" : ""}`}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

export default Navbar;

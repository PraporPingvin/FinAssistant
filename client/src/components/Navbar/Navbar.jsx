import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Target, LineChart, TrendingUp, Clock, Menu, X } from "lucide-react";
import UserMenu from "../UserMenu/UserMenu";
import "./Navbar.css";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

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
      <div className="navbarContainer">
        <Link to="/" className="logo">
          <Target size={24} />
          <span>Финансовый ассистент</span>
        </Link>

        <div className="navbarRight">
          <UserMenu />
          <button className="menuToggle" onClick={toggleMenu} aria-label="Меню">
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <nav className={`navMenu ${isMenuOpen ? "open" : ""}`}>
        <ul className="navLinks">
          <li className="navItem">
            <Link to="/" className={`navLink ${isActive("/") ? "active" : ""}`}>
              <LayoutDashboard size={18} />
              <span>Обзор</span>
            </Link>
          </li>
          <li className="navItem">
            <Link to="/goals" className={`navLink ${isActive("/goals") ? "active" : ""}`}>
              <Target size={18} />
              <span>Цели</span>
            </Link>
          </li>
          <li className="navItem">
            <Link to="/scenarios" className={`navLink ${isActive("/scenarios") ? "active" : ""}`}>
              <LineChart size={18} />
              <span>Сценарии</span>
            </Link>
          </li>
          <li className="navItem">
            <Link to="/forecast" className={`navLink ${isActive("/forecast") ? "active" : ""}`}>
              <TrendingUp size={18} />
              <span>Прогнозы</span>
            </Link>
          </li>
          <li className="navItem">
            <Link to="/checkpoints" className={`navLink ${isActive("/checkpoints") ? "active" : ""}`}>
              <Clock size={18} />
              <span>Контроль</span>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export default Navbar;
import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import Navbar from "./Navbar/Navbar";
import PaymentReminder from "./PaymentReminder/PaymentReminder";

function Layout({ children }) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 360);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="appShell">
      <Navbar />
      <main className="appMain">
        <PaymentReminder />
        {children}
      </main>
      <button
        type="button"
        className={`appScrollTop ${showScrollTop ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Наверх"
        title="Наверх"
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}

export default Layout;

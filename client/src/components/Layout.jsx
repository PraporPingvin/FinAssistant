import React from "react";
import Navbar from "./Navbar/Navbar";
import PaymentReminder from "./PaymentReminder/PaymentReminder";

function Layout({ children }) {
  return (
    <div className="appShell">
      <Navbar />
      <main className="appMain">
        <PaymentReminder />
        {children}
      </main>
    </div>
  );
}

export default Layout;

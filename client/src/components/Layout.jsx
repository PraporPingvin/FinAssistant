import React from "react";
import Navbar from "./Navbar/Navbar";

function Layout({ children }) {
  return (
    <div className="appShell">
      <Navbar />
      <main className="appMain">
        {children}
      </main>
    </div>
  );
}

export default Layout;

import React from "react";
import Navbar from "./Navbar/Navbar";

function Layout({ children }) {
  return (
    <div>
      <Navbar />
      <main style={{ padding: "20px" }}>
        {children}
      </main>
    </div>
  );
}

export default Layout;

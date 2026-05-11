import React, { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async e => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Заполните все поля");
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Введите корректный email");
      return;
    }
    
    setLoading(true);
    
    // Имитация запроса к API
    setTimeout(() => {
      if (email === "demo@example.com" && password === "demo123") {
        alert(`Вход выполнен: ${email}`);
        if (onLogin) onLogin();
      } else {
        setError("Неверный email или пароль");
      }
      setLoading(false);
    }, 1000);
  };

  const styles = {
    container: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f5f5f5",
    },
    form: {
      width: "100%",
      maxWidth: "400px",
      padding: "40px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    },
    title: {
      textAlign: "center",
      marginBottom: "30px",
      color: "#333",
    },
    input: {
      width: "100%",
      padding: "12px",
      marginBottom: "20px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      fontSize: "16px",
    },
    button: {
      width: "100%",
      padding: "12px",
      backgroundColor: "#2196f3",
      color: "white",
      border: "none",
      borderRadius: "4px",
      fontSize: "16px",
      fontWeight: "bold",
      cursor: "pointer",
      opacity: loading ? 0.7 : 1,
    },
    error: {
      color: "#f44336",
      textAlign: "center",
      marginBottom: "20px",
    },
    demoNote: {
      marginTop: "20px",
      padding: "10px",
      backgroundColor: "#e8f5e9",
      borderRadius: "4px",
      fontSize: "14px",
      color: "#2e7d32",
    },
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.form}>
        <h2 style={styles.title}>Вход в FinRoad</h2>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
          style={styles.input}
        />
        
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          style={styles.input}
        />
        
        <button 
          type="submit" 
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Вход..." : "Войти"}
        </button>
        
        <div style={styles.demoNote}>
          Для демо используйте:<br />
          Email: demo@example.com<br />
          Пароль: demo123
        </div>
      </form>
    </div>
  );
}

export default Login;
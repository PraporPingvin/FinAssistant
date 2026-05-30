import React, { useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import ModernDialog from "../components/ModernDialog/ModernDialog";

function NewGoalPage() {
  const [formData, setFormData] = useState({
    title: "",
    target_amount: "",
    monthly_contribution: "",
  });
  const [loading, setLoading] = useState(false);
  const [createdGoalTitle, setCreatedGoalTitle] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Имитация создания цели
    setTimeout(() => {
      setCreatedGoalTitle(formData.title);
      setLoading(false);
    }, 1000);
  };

  const styles = {
    container: {
      maxWidth: "600px",
      margin: "0 auto",
      padding: "20px",
    },
    form: {
      backgroundColor: "#fff",
      padding: "30px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    },
    inputGroup: {
      marginBottom: "20px",
    },
    label: {
      display: "block",
      marginBottom: "5px",
      fontWeight: "bold",
    },
    input: {
      width: "100%",
      padding: "10px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      fontSize: "16px",
    },
    button: {
      padding: "12px 24px",
      backgroundColor: "#4caf50",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "16px",
      width: "100%",
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  };

  return (
    <Layout>
      <div style={styles.container}>
        <h1>Создание новой цели</h1>
        
        <div style={styles.form}>
          <form onSubmit={handleSubmit}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Название цели *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Например: Накопить на машину"
                required
                style={styles.input}
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Целевая сумма (₽) *</label>
              <input
                type="number"
                name="target_amount"
                value={formData.target_amount}
                onChange={handleChange}
                placeholder="1000000"
                required
                min="1000"
                style={styles.input}
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Ежемесячный взнос (₽) *</label>
              <input
                type="number"
                name="monthly_contribution"
                value={formData.monthly_contribution}
                onChange={handleChange}
                placeholder="15000"
                required
                min="1000"
                style={styles.input}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              style={{
                ...styles.button,
                ...(loading && styles.buttonDisabled)
              }}
            >
              {loading ? "Создание..." : "Создать цель"}
            </button>
          </form>
        </div>
        
        <div style={{ marginTop: "20px" }}>
          <a 
            href="/goals" 
            style={{ color: "#2196f3", textDecoration: "none" }}
          >
            ← Назад к списку целей
          </a>
        </div>

        <ModernDialog
          open={Boolean(createdGoalTitle)}
          variant="success"
          eyebrow="Цель создана"
          title="Готово"
          description={`Цель "${createdGoalTitle}" создана успешно.`}
          confirmText="К списку целей"
          onClose={() => navigate("/goals")}
          onConfirm={() => navigate("/goals")}
        />
      </div>
    </Layout>
  );
}

export default NewGoalPage;

// client/src/components/PaymentStats.jsx
import React from 'react';

function PaymentStats({ stats, goal }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

  const calculateTimeToGoal = () => {
    if (!goal || !stats.monthlyAverage || stats.monthlyAverage <= 0) {
      return null;
    }
    
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    const months = Math.ceil(remaining / stats.monthlyAverage);
    
    if (months <= 0) return null;
    
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() + months);
    
    return {
      months,
      targetDate: targetDate.toLocaleDateString('ru-RU'),
      daily: Math.ceil(stats.monthlyAverage / 30),
      weekly: Math.ceil(stats.monthlyAverage / 4),
    };
  };

  const timeToGoal = calculateTimeToGoal();

  const styles = {
    container: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    statHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '15px',
    },
    statIcon: {
      fontSize: '24px',
    },
    statTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#333',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '5px',
    },
    statSubtitle: {
      fontSize: '14px',
      color: '#666',
    },
    progressSection: {
      backgroundColor: '#f5f5f5',
      borderRadius: '12px',
      padding: '25px',
      marginTop: '20px',
    },
    progressTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#333',
    },
    progressItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
      padding: '10px 0',
      borderBottom: '1px solid #eee',
    },
    progressLabel: {
      fontSize: '14px',
      color: '#666',
    },
    progressValue: {
      fontSize: '16px',
      fontWeight: '600',
    },
    timeEstimate: {
      backgroundColor: '#fff3e0',
      borderLeft: '4px solid #ff9800',
      padding: '15px',
      borderRadius: '8px',
      marginTop: '20px',
    },
    timeEstimateTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '10px',
      color: '#333',
    },
    timeEstimateItem: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '5px',
    },
  };

  if (!stats) return null;

  return (
    <>
      <div style={styles.container}>
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>💰</span>
            <div>
              <div style={styles.statTitle}>Всего внесено</div>
              <div style={{ ...styles.statValue, color: '#2e7d32' }}>
                {formatCurrency(stats.totalAmount)} ₽
              </div>
            </div>
          </div>
          <div style={styles.statSubtitle}>
            Из {formatCurrency(goal?.target_amount || 0)} ₽
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>📊</span>
            <div>
              <div style={styles.statTitle}>Средний платеж</div>
              <div style={{ ...styles.statValue, color: '#2196f3' }}>
                {formatCurrency(stats.averageAmount)} ₽
              </div>
            </div>
          </div>
          <div style={styles.statSubtitle}>
            Всего платежей: {stats.paymentsCount}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>📈</span>
            <div>
              <div style={styles.statTitle}>В месяц</div>
              <div style={{ ...styles.statValue, color: '#9c27b0' }}>
                {formatCurrency(stats.monthlyAverage)} ₽
              </div>
            </div>
          </div>
          <div style={styles.statSubtitle}>
            Средняя сумма в месяц
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statIcon}>⚡</span>
            <div>
              <div style={styles.statTitle}>Темп накопления</div>
              <div style={{ ...styles.statValue, color: '#ff9800' }}>
                {goal && stats.totalAmount > 0 
                  ? `${((stats.totalAmount / goal.target_amount) * 100).toFixed(1)}%` 
                  : '0%'}
              </div>
            </div>
          </div>
          <div style={styles.statSubtitle}>
            Отношение внесенного к цели
          </div>
        </div>
      </div>

      {timeToGoal && (
        <div style={styles.timeEstimate}>
          <div style={styles.timeEstimateTitle}>
            ⏱️ Прогноз достижения цели
          </div>
          
          <div style={styles.progressItem}>
            <span style={styles.progressLabel}>Месяцев до цели:</span>
            <span style={{ ...styles.progressValue, color: '#2196f3' }}>
              {timeToGoal.months}
            </span>
          </div>
          
          <div style={styles.progressItem}>
            <span style={styles.progressLabel}>Предполагаемая дата:</span>
            <span style={{ ...styles.progressValue, color: '#4caf50' }}>
              {timeToGoal.targetDate}
            </span>
          </div>
          
          <div style={styles.progressItem}>
            <span style={styles.progressLabel}>Ежедневно нужно:</span>
            <span style={{ ...styles.progressValue, color: '#ff9800' }}>
              {formatCurrency(timeToGoal.daily)} ₽
            </span>
          </div>
          
          <div style={styles.progressItem}>
            <span style={styles.progressLabel}>Еженедельно нужно:</span>
            <span style={{ ...styles.progressValue, color: '#9c27b0' }}>
              {formatCurrency(timeToGoal.weekly)} ₽
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default PaymentStats;
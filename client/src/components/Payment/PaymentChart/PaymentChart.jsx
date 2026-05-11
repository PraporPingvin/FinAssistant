// client/src/components/PaymentChart.jsx
import React, { useEffect, useRef } from 'react';


function PaymentChart({ payments }) {
  const chartRef = useRef();

  useEffect(() => {
    if (!payments || payments.length === 0) return;

    // Очищаем предыдущий график
    d3.select(chartRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Создаем SVG элемент
    const svg = d3.select(chartRef.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Группируем платежи по месяцам
    const monthlyData = {};
    payments.forEach(payment => {
      const date = new Date(payment.payment_date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total: 0,
          count: 0,
          date: date
        };
      }
      monthlyData[monthKey].total += payment.amount;
      monthlyData[monthKey].count += 1;
    });

    const data = Object.values(monthlyData)
      .sort((a, b) => a.date - b.date);

    // Шкалы
    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.total)])
      .nice()
      .range([height, 0]);

    // Оси
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickFormat(d => {
          const [year, month] = d.split('-');
          const monthNames = [
            'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
            'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
          ];
          return `${monthNames[parseInt(month) - 1]} ${year}`;
        }))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    svg.append("g")
      .call(d3.axisLeft(y)
        .tickFormat(d => {
          if (d >= 1000000) return `${(d / 1000000).toFixed(1)}M`;
          if (d >= 1000) return `${(d / 1000).toFixed(0)}K`;
          return d;
        }));

    // Столбцы
    svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.total))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.total))
      .attr("fill", "#4caf50")
      .attr("opacity", 0.8)
      .on("mouseover", function(event, d) {
        // Подсветка при наведении
        d3.select(this).attr("opacity", 1);
        
        // Всплывающая подсказка
        tooltip.style("opacity", 1)
          .html(`
            <strong>${d.month}</strong><br/>
            Всего: ${d.total.toLocaleString('ru-RU')} ₽<br/>
            Платежей: ${d.count}<br/>
            Средний: ${Math.round(d.total / d.count).toLocaleString('ru-RU')} ₽
          `);
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.8);
        tooltip.style("opacity", 0);
      });

    // Линия тренда
    const line = d3.line()
      .x(d => x(d.month) + x.bandwidth() / 2)
      .y(d => y(d.total));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#2196f3")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Подписи осей
    svg.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.top + 20})`)
      .style("text-anchor", "middle")
      .text("Месяц");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Сумма (₽)");

    // Всплывающая подсказка
    const tooltip = d3.select(chartRef.current)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "10px")
      .style("pointer-events", "none")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)");

  }, [payments]);

  const styles = {
    container: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '25px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '30px',
    },
    header: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '20px',
      color: '#333',
    },
    chartContainer: {
      width: '100%',
      overflowX: 'auto',
    },
  };

  if (!payments || payments.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>📈 График платежей</div>
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Добавьте платежи для построения графика
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>📈 График платежей</div>
      <div style={styles.chartContainer}>
        <div ref={chartRef} style={{ minWidth: '800px' }} />
      </div>
    </div>
  );
}

export default PaymentChart;
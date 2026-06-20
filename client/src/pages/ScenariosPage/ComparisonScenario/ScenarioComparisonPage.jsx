import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Home,
  Plus,
  RefreshCw,
  Target,
  Trophy,
  X,
  Zap,
  Shield,
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { getGoals, getPayments, getScenarios } from "../../../api/api";
import { calculateScenarioMetrics, formatPercent } from "../../../utils/scenarioCalculations";
import "./ScenarioComparisonPage.css";

function ScenarioComparisonPage() {
  const navigate = useNavigate();
  const { goalId } = useParams();

  const [goals, setGoals] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(goalId || "");
  const [selectedScenarios, setSelectedScenarios] = useState(["", ""]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const goalsData = await getGoals();
      setGoals(goalsData || []);

      const scenarioGroups = await Promise.all(
        (goalsData || []).map((goal) => getScenarios(goal.goal_id).catch(() => []))
      );
      const paymentGroups = await Promise.all(
        (goalsData || []).map((goal) => getPayments(goal.goal_id).catch(() => []))
      );

      const allScenarios = [];
      (goalsData || []).forEach((goal, index) => {
        const payments = paymentGroups[index] || [];
        const current = calculateScenarioMetrics({ goal, payments, scenario: { monthly_contribution: 1 } }).current;
        (scenarioGroups[index] || []).forEach((scenario) => {
          allScenarios.push({
            ...scenario,
            goal_id: goal.goal_id,
            goal_title: goal.title,
            goal_target: goal.target_amount,
            goal_current: current,
            goal_payments: payments,
            goal_progress: goal.target_amount > 0
              ? Math.round((current / parseFloat(goal.target_amount)) * 100)
              : 0,
          });
        });
      });

      setScenarios(allScenarios);

      const activeGoalId = goalId || selectedGoal;
      const available = allScenarios.filter((scenario) => scenario.goal_id?.toString() === activeGoalId?.toString());
      if (activeGoalId && available.length >= 2) {
        setSelectedScenarios([available[0].scenario_id.toString(), available[1].scenario_id.toString()]);
      }
    } catch (error) {
      console.error("Ошибка загрузки сравнения:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ru-RU").format(parseFloat(amount) || 0);

  const filteredScenarios = useMemo(() => {
    if (!selectedGoal) return scenarios;
    return scenarios.filter((scenario) => scenario.goal_id?.toString() === selectedGoal.toString());
  }, [scenarios, selectedGoal]);

  const currentGoal = useMemo(() => {
    const goal = goals.find((item) => item.goal_id?.toString() === selectedGoal?.toString());
    if (!goal) return null;
    const scenarioForGoal = scenarios.find((scenario) => scenario.goal_id?.toString() === selectedGoal?.toString());
    return {
      ...goal,
      computed_current: scenarioForGoal?.goal_current ?? goal.current_amount,
    };
  }, [goals, scenarios, selectedGoal]);

  useEffect(() => {
    if (!selectedGoal) return;
    const available = scenarios.filter((scenario) => scenario.goal_id?.toString() === selectedGoal.toString());
    if (available.length >= 2) setSelectedScenarios([available[0].scenario_id.toString(), available[1].scenario_id.toString()]);
    else if (available.length === 1) setSelectedScenarios([available[0].scenario_id.toString(), ""]);
    else setSelectedScenarios(["", ""]);
  }, [selectedGoal, scenarios]);

  const comparisonData = useMemo(() => {
    const selected = selectedScenarios
      .filter(Boolean)
      .map((id) => scenarios.find((scenario) => scenario.scenario_id?.toString() === id?.toString()))
      .filter(Boolean);

    return selected.map((scenario) => {
      const metrics = calculateScenarioMetrics({
        goal: {
          target_amount: scenario.goal_target,
          initial_amount: scenario.goal_current,
        },
        scenario,
        payments: [],
      });
      const remaining = metrics.remaining;
      const monthsToGoal = metrics.monthsToGoal;
      const riskBase = metrics.risk;
      const risk = {
        label: riskBase.label,
        score: riskBase.score,
        className: riskBase.className,
        icon: riskBase.className === "low" ? <Shield size={14} /> : riskBase.className === "medium" ? <Activity size={14} /> : <Zap size={14} />,
      };
      const effectiveReturn = metrics.effectiveReturn;
      const probability = metrics.probability;
      const monthlyLoad = metrics.monthlyLoad;
      const rating = metrics.rating;

      return { ...scenario, monthsToGoal, risk, effectiveReturn, probability, monthlyLoad, rating, remaining };
    });
  }, [selectedScenarios, scenarios]);

  const analysis = useMemo(() => {
    if (comparisonData.length < 2) return null;
    const sorted = [...comparisonData].sort((a, b) => b.rating - a.rating);
    const reachable = comparisonData.filter((scenario) => Number.isFinite(scenario.monthsToGoal));
    const fastest = reachable.length
      ? [...reachable].sort((a, b) => a.monthsToGoal - b.monthsToGoal)[0]
      : null;
    const safest = [...comparisonData].sort((a, b) => a.risk.score - b.risk.score || b.probability - a.probability)[0];
    const lowestPayment = [...comparisonData].sort((a, b) => (parseFloat(a.monthly_contribution) || 0) - (parseFloat(b.monthly_contribution) || 0))[0];
    const highestProbability = [...comparisonData].sort((a, b) => b.probability - a.probability)[0];
    const best = sorted[0];
    const weakest = sorted[sorted.length - 1];
    const recommendations = buildRecommendations({ best, weakest, fastest, safest, lowestPayment, highestProbability, scenarios: comparisonData });
    return {
      best,
      weakest,
      fastest,
      safest,
      lowestPayment,
      highestProbability,
      averageRating: Math.round(comparisonData.reduce((sum, scenario) => sum + scenario.rating, 0) / comparisonData.length),
      recommendations,
    };
  }, [comparisonData]);

  const selectedCount = selectedScenarios.filter(Boolean).length;

  const handleGoalChange = (goalIdValue) => {
    setSelectedGoal(goalIdValue);
    if (goalIdValue) navigate(`/scenarios/compare/${goalIdValue}`, { replace: true });
  };

  const handleScenarioChange = (index, scenarioId) => {
    const next = [...selectedScenarios];
    next[index] = scenarioId;
    setSelectedScenarios(next);
  };

  const handleAddScenario = () => {
    if (selectedScenarios.length < 5) setSelectedScenarios([...selectedScenarios, ""]);
  };

  const handleRemoveScenario = (index) => {
    const next = selectedScenarios.filter((_, currentIndex) => currentIndex !== index);
    setSelectedScenarios(next.length ? next : [""]);
  };

  const exportTitle = currentGoal?.title ? `Сравнение сценариев - ${currentGoal.title}` : "Сравнение сценариев";

  const exportRows = useMemo(() => {
    if (comparisonData.length < 2) return [];

    return [
      ["Цель", ...comparisonData.map((scenario) => `${formatCurrency(scenario.goal_target)} ₽`)],
      ["Ежемесячный взнос", ...comparisonData.map((scenario) => `${formatCurrency(scenario.monthly_contribution)} ₽`)],
      ["Дополнительный рост", ...comparisonData.map((scenario) => `${formatPercent(scenario.expected_return)}%`)],
      ["Инфляция", ...comparisonData.map((scenario) => `${formatPercent(scenario.inflation_rate)}%`)],
      ["Рост после инфляции", ...comparisonData.map((scenario) => `${scenario.effectiveReturn.toFixed(1)}%`)],
      ["Осталось накопить", ...comparisonData.map((scenario) => `${formatCurrency(scenario.remaining)} ₽`)],
      ["Срок", ...comparisonData.map((scenario) => Number.isFinite(scenario.monthsToGoal) ? `${scenario.monthsToGoal} мес.` : "Недостижимо")],
      ["Риск", ...comparisonData.map((scenario) => scenario.risk.label)],
      ["Вероятность", ...comparisonData.map((scenario) => `${scenario.probability}%`)],
      ["Рейтинг", ...comparisonData.map((scenario) => `${scenario.rating}/100`)],
    ];
  }, [comparisonData]);

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const buildExportTable = ({ printable = false } = {}) => {
    const headers = ["Параметр", ...comparisonData.map((scenario) => scenario.name)];
    const generatedAt = new Date().toLocaleString("ru-RU");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(exportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #172014; margin: ${printable ? "18mm" : "24px"}; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            p { margin: 0 0 18px; color: #66715c; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #cfd8bf; padding: 10px 12px; text-align: left; vertical-align: top; }
            th { background: #e8f45d; font-weight: 700; }
            td:first-child { width: 28%; font-weight: 700; background: #f5f7eb; }
            tr:nth-child(even) td:not(:first-child) { background: #fbfcf5; }
            .meta { font-size: 12px; color: #66715c; }
            @media print {
              body { margin: 12mm; }
              button { display: none; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(exportTitle)}</h1>
          <p class="meta">Сформировано: ${escapeHtml(generatedAt)}</p>
          <table>
            <thead>
              <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${exportRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const downloadTable = (content, filename, type) => {
    const blob = new Blob([`\uFEFF${content}`], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildFilename = (extension) => {
    const safeGoal = (currentGoal?.title || selectedGoal || "comparison")
      .toString()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60);
    return `scenario-comparison-${safeGoal}.${extension}`;
  };

  const escapeXml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const columnName = (index) => {
    let name = "";
    let current = index + 1;
    while (current > 0) {
      const remainder = (current - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      current = Math.floor((current - 1) / 26);
    }
    return name;
  };

  const crcTable = useMemo(() => {
    const table = [];
    for (let i = 0; i < 256; i += 1) {
      let crc = i;
      for (let j = 0; j < 8; j += 1) {
        crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
      table[i] = crc >>> 0;
    }
    return table;
  }, []);

  const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  const writeUint16 = (target, offset, value) => {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
  };

  const writeUint32 = (target, offset, value) => {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
  };

  const concatBytes = (parts) => {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    parts.forEach((part) => {
      result.set(part, offset);
      offset += part.length;
    });
    return result;
  };

  const createZip = (files) => {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

    files.forEach(({ path, content }) => {
      const nameBytes = encoder.encode(path);
      const contentBytes = typeof content === "string" ? encoder.encode(content) : content;
      const checksum = crc32(contentBytes);

      const localHeader = new Uint8Array(30 + nameBytes.length);
      writeUint32(localHeader, 0, 0x04034b50);
      writeUint16(localHeader, 4, 20);
      writeUint16(localHeader, 6, 0x0800);
      writeUint16(localHeader, 8, 0);
      writeUint16(localHeader, 10, dosTime);
      writeUint16(localHeader, 12, dosDate);
      writeUint32(localHeader, 14, checksum);
      writeUint32(localHeader, 18, contentBytes.length);
      writeUint32(localHeader, 22, contentBytes.length);
      writeUint16(localHeader, 26, nameBytes.length);
      writeUint16(localHeader, 28, 0);
      localHeader.set(nameBytes, 30);

      localParts.push(localHeader, contentBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      writeUint32(centralHeader, 0, 0x02014b50);
      writeUint16(centralHeader, 4, 20);
      writeUint16(centralHeader, 6, 20);
      writeUint16(centralHeader, 8, 0x0800);
      writeUint16(centralHeader, 10, 0);
      writeUint16(centralHeader, 12, dosTime);
      writeUint16(centralHeader, 14, dosDate);
      writeUint32(centralHeader, 16, checksum);
      writeUint32(centralHeader, 20, contentBytes.length);
      writeUint32(centralHeader, 24, contentBytes.length);
      writeUint16(centralHeader, 28, nameBytes.length);
      writeUint16(centralHeader, 30, 0);
      writeUint16(centralHeader, 32, 0);
      writeUint16(centralHeader, 34, 0);
      writeUint16(centralHeader, 36, 0);
      writeUint32(centralHeader, 38, 0);
      writeUint32(centralHeader, 42, offset);
      centralHeader.set(nameBytes, 46);
      centralParts.push(centralHeader);

      offset += localHeader.length + contentBytes.length;
    });

    const centralDirectory = concatBytes(centralParts);
    const endRecord = new Uint8Array(22);
    writeUint32(endRecord, 0, 0x06054b50);
    writeUint16(endRecord, 8, files.length);
    writeUint16(endRecord, 10, files.length);
    writeUint32(endRecord, 12, centralDirectory.length);
    writeUint32(endRecord, 16, offset);

    return concatBytes([...localParts, centralDirectory, endRecord]);
  };

  const buildXlsxWorkbook = () => {
    const table = [["Параметр", ...comparisonData.map((scenario) => scenario.name)], ...exportRows];
    const rowsXml = table.map((row, rowIndex) => {
      const cellsXml = row.map((cell, cellIndex) => {
        const ref = `${columnName(cellIndex)}${rowIndex + 1}`;
        const style = rowIndex === 0 ? 1 : cellIndex === 0 ? 2 : 0;
        return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${escapeXml(cell)}</t></is></c>`;
      }).join("");
      return `<row r="${rowIndex + 1}">${cellsXml}</row>`;
    }).join("");
    const lastCell = `${columnName(table[0].length - 1)}${table.length}`;

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="26" customWidth="1"/>
    <col min="2" max="${table[0].length}" width="22" customWidth="1"/>
  </cols>
  <sheetData>${rowsXml}</sheetData>
  <pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
</worksheet>`;

    return createZip([
      {
        path: "[Content_Types].xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
      },
      {
        path: "_rels/.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
      },
      {
        path: "xl/workbook.xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Сравнение" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
      },
      {
        path: "xl/_rels/workbook.xml.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
      },
      {
        path: "xl/styles.xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F45D"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCFD8BF"/></left><right style="thin"><color rgb="FFCFD8BF"/></right><top style="thin"><color rgb="FFCFD8BF"/></top><bottom style="thin"><color rgb="FFCFD8BF"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`,
      },
      { path: "xl/worksheets/sheet1.xml", content: sheetXml },
    ]);
  };

  const handleExcelExport = () => {
    const workbook = buildXlsxWorkbook();
    const blob = new Blob([workbook], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildFilename("xlsx");
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleWordExport = () => {
    downloadTable(
      buildExportTable(),
      buildFilename("doc"),
      "application/msword;charset=utf-8"
    );
  };

  const handlePrintTable = () => {
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      alert("Не удалось открыть окно печати. Разрешите всплывающие окна для этого сайта.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildExportTable({ printable: true }));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const selectedScenarioIds = selectedScenarios.filter(Boolean);
  const fastestMonths = analysis?.fastest?.monthsToGoal;

  if (loading) {
    return (
      <Layout>
        <div className="comparisonLoading"><div className="comparisonSpinner" /><p>Готовим сравнение сценариев...</p></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="scenarioComparisonContainer">
        <nav className="comparisonBreadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link><span>/</span>
          <Link to="/scenarios"><BarChart3 size={14} /> Сценарии</Link><span>/</span><span>Сравнение</span>
        </nav>

        <section className="comparisonHero">
          <div>
          <span className="comparisonEyebrow">Центр принятия решений</span>
            <h1>Сравнение сценариев</h1>
            <p>Выберите цель и несколько стратегий, чтобы увидеть сроки, риск, вероятность успеха и общий рейтинг в одном месте.</p>
          </div>
          <div className="comparisonHeroPanel">
            <span>Выбрано</span><strong>{selectedCount}</strong><small>из {filteredScenarios.length} доступных сценариев</small>
          </div>
        </section>

        {error && <div className="comparisonError"><AlertCircle size={18} /> {error}</div>}

        <section className="comparisonControlPanel">
          <div className="controlHeader">
            <div><span>Цель</span><h2>Настройка сравнения</h2></div>
            <button onClick={loadData} className="comparisonUtilityButton"><RefreshCw size={15} /> Обновить</button>
          </div>

          <select value={selectedGoal || ""} onChange={(e) => handleGoalChange(e.target.value)} className="goalSelectModern">
            <option value="">Выберите цель</option>
            {goals.map((goal) => (
              <option key={goal.goal_id} value={goal.goal_id}>{goal.title} ({scenarios.filter((s) => s.goal_id === goal.goal_id).length} сценариев)</option>
            ))}
          </select>

          {currentGoal && (
            <div className="selectedGoalCard">
              <div><span>Цель</span><strong>{currentGoal.title}</strong></div>
              <div><span>Накоплено</span><strong>{formatCurrency(currentGoal.computed_current)} ₽</strong></div>
              <div><span>Нужно</span><strong>{formatCurrency(currentGoal.target_amount)} ₽</strong></div>
              <div><span>Сценариев</span><strong>{filteredScenarios.length}</strong></div>
            </div>
          )}
        </section>

        <section className="scenarioPickerPanel">
          <div className="controlHeader">
            <div><span>Сценарии</span><h2>Что сравниваем</h2></div>
            <button onClick={handleAddScenario} className="comparisonUtilityButton" disabled={selectedScenarios.length >= 5}><Plus size={15} /> Добавить</button>
          </div>

          <div className="scenarioPickerGrid">
            {selectedScenarios.map((selectedId, index) => {
              const selected = filteredScenarios.find((scenario) => scenario.scenario_id?.toString() === selectedId?.toString());
              return (
                <article key={index} className="scenarioPickerCard">
                  <div className="pickerCardHeader">
                    <div><span>Сценарий {index + 1}</span><strong>{selected?.name || "Не выбран"}</strong></div>
                    {index > 1 && <button onClick={() => handleRemoveScenario(index)}><X size={15} /></button>}
                  </div>
                  <select value={selectedId || ""} onChange={(e) => handleScenarioChange(index, e.target.value)} disabled={!selectedGoal || filteredScenarios.length === 0}>
                    <option value="">Выберите сценарий</option>
                    {filteredScenarios.map((scenario) => (
                      <option
                        key={scenario.scenario_id}
                        value={scenario.scenario_id}
                        disabled={selectedScenarioIds.includes(scenario.scenario_id?.toString()) && scenario.scenario_id?.toString() !== selectedId?.toString()}
                      >
                        {scenario.name} ({formatCurrency(scenario.monthly_contribution)} ₽)
                      </option>
                    ))}
                  </select>
                  {selected && <div className="scenarioMiniPreview"><span>{formatCurrency(selected.monthly_contribution)} ₽/мес</span><span>{formatPercent(selected.expected_return)}% доп. рост</span></div>}
                </article>
              );
            })}

            {selectedGoal && filteredScenarios.length < 2 && (
              <div className="comparisonEmptyCard">
                <AlertCircle size={34} /><h3>Недостаточно сценариев</h3>
                <p>Для сравнения нужно минимум два сценария по выбранной цели.</p>
                <Link to={`/scenarios/new/${selectedGoal}`} className="comparisonPrimaryButton"><Plus size={16} /> Создать сценарий</Link>
              </div>
            )}
          </div>
        </section>

        {comparisonData.length >= 2 && (
          <>
            <section className="comparisonSummaryGrid">
              <article className="summaryScoreCard accent"><Trophy size={24} /><span>Лучший сценарий</span><strong>{analysis.best.name}</strong><small>Рейтинг {analysis.best.rating}/100</small></article>
              <article className="summaryScoreCard"><BarChart3 size={24} /><span>Средний рейтинг</span><strong>{analysis.averageRating}/100</strong><small>по выбранным стратегиям</small></article>
              <article className="summaryScoreCard"><Clock size={24} /><span>Самый быстрый срок</span><strong>{Number.isFinite(fastestMonths) ? `${fastestMonths} мес.` : "Нет"}</strong><small>{analysis.fastest ? analysis.fastest.name : "нет достижимых сценариев"}</small></article>
            </section>

            <section className="comparisonTableWrapper">
              <div className="comparisonTableHeader">
                <div><span>Матрица</span><h2>Параметры сценариев</h2></div>
                <div className="comparisonExportActions" aria-label="Экспорт и печать таблицы">
                  <button onClick={handleExcelExport} className="comparisonPrimaryButton"><FileSpreadsheet size={15} /> Excel</button>
                  <button onClick={handleWordExport} className="comparisonUtilityButton"><FileText size={15} /> Word</button>
                  <button onClick={handlePrintTable} className="comparisonUtilityButton"><Printer size={15} /> Печать</button>
                </div>
              </div>
              <div className="modernTableScroll">
                <table className="comparisonTable">
                  <thead><tr><th>Параметр</th>{comparisonData.map((scenario) => <th key={scenario.scenario_id}>{scenario.name}</th>)}</tr></thead>
                  <tbody>
                    <tr><td><Target size={14} /> Цель</td>{comparisonData.map((s) => <td key={s.scenario_id}>{formatCurrency(s.goal_target)} ₽</td>)}</tr>
                    <tr><td><DollarSign size={14} /> Ежемесячный взнос</td>{comparisonData.map((s) => <td key={s.scenario_id}><strong>{formatCurrency(s.monthly_contribution)} ₽</strong></td>)}</tr>
                    <tr><td><TrendingUp size={14} /> Доп. рост</td>{comparisonData.map((s) => <td key={s.scenario_id}>{formatPercent(s.expected_return)}%</td>)}</tr>
                    <tr><td><Activity size={14} /> Инфляция</td>{comparisonData.map((s) => <td key={s.scenario_id}>{formatPercent(s.inflation_rate)}%</td>)}</tr>
                    <tr><td><TrendingUp size={14} /> Рост после инфляции</td>{comparisonData.map((s) => <td key={s.scenario_id}>{s.effectiveReturn.toFixed(1)}%</td>)}</tr>
                    <tr><td><Target size={14} /> Осталось накопить</td>{comparisonData.map((s) => <td key={s.scenario_id}>{formatCurrency(s.remaining)} ₽</td>)}</tr>
                    <tr><td><Clock size={14} /> Срок</td>{comparisonData.map((s) => <td key={s.scenario_id}>{Number.isFinite(s.monthsToGoal) ? `${s.monthsToGoal} мес.` : "Недостижимо"}</td>)}</tr>
                    <tr><td><Shield size={14} /> Риск</td>{comparisonData.map((s) => <td key={s.scenario_id}><span className={`riskBadge ${s.risk.className}`}>{s.risk.icon}{s.risk.label}</span></td>)}</tr>
                    <tr><td><Activity size={14} /> Вероятность</td>{comparisonData.map((s) => <td key={s.scenario_id}><div className="probabilityBar"><div style={{ width: `${s.probability}%` }} /><span>{s.probability}%</span></div></td>)}</tr>
                    <tr><td><Trophy size={14} /> Рейтинг</td>{comparisonData.map((s) => <td key={s.scenario_id}><strong>{s.rating}/100</strong></td>)}</tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="analysisSection">
              <article className="bestScenarioCard"><Trophy size={24} /><span>Рекомендуемый выбор</span><h2>{analysis.best.name}</h2><p>Лучший баланс срока, риска, нагрузки и дополнительного роста среди выбранных сценариев.</p></article>
              <article className="worstScenarioCard"><AlertCircle size={24} /><span>Слабее остальных</span><h2>{analysis.weakest.name}</h2><p>Этот сценарий уступает по итоговому рейтингу. Его стоит пересмотреть или использовать как запасной вариант.</p></article>
            </section>

            <section className="recommendationsPanel">
              <div className="comparisonTableHeader">
                <div><span>Рекомендации</span><h2>Как читать сравнение</h2></div>
              </div>
              <div className="recommendationsGrid">
                {analysis.recommendations.map((item, index) => (
                  <article key={index} className={`recommendationCard ${item.tone || ""}`}>
                    {item.icon}
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

function buildRecommendations({ best, weakest, fastest, safest, lowestPayment, highestProbability, scenarios }) {
  const items = [];
  const unreachable = scenarios.filter((scenario) => !Number.isFinite(scenario.monthsToGoal));
  const highRisk = scenarios.filter((scenario) => scenario.risk.className === "high");
  const negativeGrowth = scenarios.filter((scenario) => scenario.effectiveReturn < 0);

  items.push({
    tone: "success",
    icon: <Trophy size={22} />,
    title: `Основной выбор: ${best.name}`,
    text: `У него лучший общий рейтинг ${best.rating}/100. Это не просто самый быстрый вариант, а баланс срока, вероятности, риска и размера взноса.`,
  });

  if (fastest) {
    items.push({
      icon: <Clock size={22} />,
      title: `Самый быстрый: ${fastest.name}`,
      text: `Этот сценарий доводит цель примерно за ${fastest.monthsToGoal} мес. Если скорость важнее нагрузки и риска, его стоит рассмотреть первым.`,
    });
  }

  if (safest) {
    items.push({
      icon: <Shield size={22} />,
      title: `Самый осторожный: ${safest.name}`,
      text: `У него риск "${safest.risk.label}". Такой сценарий лучше подходит, если вы не хотите закладывать слишком оптимистичный дополнительный рост.`,
    });
  }

  if (lowestPayment) {
    items.push({
      icon: <DollarSign size={22} />,
      title: `Минимальная нагрузка: ${lowestPayment.name}`,
      text: `Здесь самый небольшой ежемесячный взнос: ${new Intl.NumberFormat("ru-RU").format(parseFloat(lowestPayment.monthly_contribution) || 0)} ₽. Подходит, если важнее комфортный платёж, а не максимальная скорость.`,
    });
  }

  if (highestProbability && highestProbability.scenario_id !== best.scenario_id) {
    items.push({
      icon: <Activity size={22} />,
      title: `Самая высокая вероятность: ${highestProbability.name}`,
      text: `Вероятность ${highestProbability.probability}%. Если хотите более устойчивый план, сравните его с рекомендованным сценарием.`,
    });
  }

  if (negativeGrowth.length > 0) {
    items.push({
      tone: "warning",
      icon: <AlertCircle size={22} />,
      title: "Инфляция выше роста",
      text: `В ${negativeGrowth.length} сценарии(ях) рост после инфляции отрицательный. Это значит, что инфляция замедляет достижение цели, и срок может стать длиннее.`,
    });
  }

  if (highRisk.length > 0) {
    items.push({
      tone: "warning",
      icon: <Zap size={22} />,
      title: "Есть сценарии с высоким риском",
      text: `Высокий риск появляется, когда дополнительный рост 10% в год или выше. Такие сценарии могут выглядеть быстрее, но они более оптимистичные.`,
    });
  }

  if (unreachable.length > 0) {
    items.push({
      tone: "danger",
      icon: <AlertCircle size={22} />,
      title: "Есть недостижимые варианты",
      text: `В ${unreachable.length} сценарии(ях) цель не достигается в разумный срок. Увеличьте взнос или снизьте влияние инфляции/ожидания.`,
    });
  }

  if (weakest && weakest.scenario_id !== best.scenario_id) {
    items.push({
      tone: "muted",
      icon: <X size={22} />,
      title: `Что пересмотреть: ${weakest.name}`,
      text: `У этого сценария самый слабый рейтинг среди выбранных. Проверьте взнос, срок и рост после инфляции.`,
    });
  }

  items.push({
    tone: "muted",
    icon: <CheckCircle size={22} />,
    title: "Практический совет",
    text: "Для дипломной логики лучше считать базовым сценарий с доп. ростом 0%. Остальные сценарии показывают, как изменится срок, если добавить более оптимистичные условия.",
  });

  return items;
}

export default ScenarioComparisonPage;

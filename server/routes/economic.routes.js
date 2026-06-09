// server/routes/economic.routes.js
const express = require('express');

const router = express.Router();

const CBR_INFLATION_URLS = [
  'https://www.cbr.ru/',
  'https://www.cbr.ru/dkp/about_inflation/',
];

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_REASONABLE_ANNUAL_INFLATION = 25;

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&thinsp;/g, ' ')
    .replace(/&laquo;|&raquo;|&quot;/g, '"')
    .replace(/&#37;/g, '%')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function normalizeNumber(value) {
  const number = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(number) ? Number(number.toFixed(1)) : null;
}

function isReasonableInflation(value) {
  return value !== null && value > 0 && value <= MAX_REASONABLE_ANNUAL_INFLATION;
}

function stripHtml(html) {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractInflation(html) {
  const indicatorMatch = html.match(/hd_base\/infl\/[\s\S]{0,900}?indicator_el_value">\s*(\d{1,2}(?:[,.]\d{1,2})?)\s*%/i);
  const indicatorValue = indicatorMatch ? normalizeNumber(indicatorMatch[1]) : null;
  if (isReasonableInflation(indicatorValue)) {
    return indicatorValue;
  }

  const text = stripHtml(html);
  const lowerText = text.toLowerCase();
  const candidates = [];
  const percentPattern = /(\d{1,2}(?:[,.]\d{1,2})?)\s*%/g;
  let match;

  while ((match = percentPattern.exec(text)) !== null) {
    const start = Math.max(0, match.index - 160);
    const end = Math.min(text.length, match.index + 160);
    const context = text.slice(start, end).toLowerCase();

    if (!context.includes('инфляц')) continue;
    if (/(цель|целев|таргет|ориентир|прогноз|ключев|ставк)/i.test(context)) continue;

    const value = normalizeNumber(match[1]);
    if (!isReasonableInflation(value)) continue;

    let score = 0;
    if (/(годов|текущ|факт|состав|уровень|потребительск)/i.test(context)) score += 2;
    if (match.index > lowerText.indexOf('инфляц')) score += 1;

    candidates.push({ value, score, index: match.index });
  }

  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  return candidates[0]?.value || null;
}

async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FinAssistant/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

router.get('/inflation/russia', async (req, res) => {
  try {
    if (typeof fetch !== 'function') {
      return res.status(503).json({ error: 'Сервер не поддерживает загрузку внешних данных' });
    }

    let inflationRate = null;
    let sourceUrl = null;

    for (const url of CBR_INFLATION_URLS) {
      const response = await fetchWithTimeout(url);
      if (!response.ok) continue;

      const html = await response.text();
      inflationRate = extractInflation(html);

      if (inflationRate !== null) {
        sourceUrl = url;
        break;
      }
    }

    if (inflationRate === null) {
      return res.status(502).json({ error: 'Не удалось надежно определить текущую инфляцию' });
    }

    res.json({
      country: 'RU',
      inflation_rate: inflationRate,
      source: 'Банк России',
      source_url: sourceUrl,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Ошибка загрузки инфляции:', error);
    res.status(502).json({ error: 'Не удалось загрузить актуальную инфляцию' });
  }
});

module.exports = router;

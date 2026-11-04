/**
 * charts.js — Chart.js global defaults and helper functions
 * Used across admin_dashboard, coach_dashboard, player_dashboard
 */

/* ── CHART.JS GLOBAL DEFAULTS ───────────────────────────────── */
if (typeof Chart !== 'undefined') {

  Chart.defaults.color = '#9ea8c5';
  Chart.defaults.font.family = "'Rajdhani', sans-serif";
  Chart.defaults.font.weight = '600';
  Chart.defaults.font.size = 13;
  Chart.defaults.animation.duration = 800;
  Chart.defaults.animation.easing  = 'easeInOutQuart';

  Chart.defaults.plugins.tooltip.backgroundColor  = '#1e2a40';
  Chart.defaults.plugins.tooltip.borderColor      = '#2e3f5c';
  Chart.defaults.plugins.tooltip.borderWidth      = 1;
  Chart.defaults.plugins.tooltip.padding          = 10;
  Chart.defaults.plugins.tooltip.titleColor       = '#e8eaf6';
  Chart.defaults.plugins.tooltip.bodyColor        = '#9ea8c5';
  Chart.defaults.plugins.tooltip.titleFont        = { family: "'Bebas Neue', sans-serif", size: 14, weight: 'normal' };
  Chart.defaults.plugins.tooltip.cornerRadius     = 6;

  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle    = 'circle';
  Chart.defaults.plugins.legend.labels.padding       = 18;
  Chart.defaults.plugins.legend.labels.color         = '#9ea8c5';

  Chart.defaults.scale.grid.color         = 'rgba(30, 42, 64, 0.9)';
  Chart.defaults.scale.grid.borderColor   = 'rgba(30, 42, 64, 0)';
  Chart.defaults.scale.ticks.color        = '#5a6480';
  Chart.defaults.scale.ticks.padding      = 8;
}

/* ── COLOR PALETTE ──────────────────────────────────────────── */
const CHART_COLORS = {
  green:  '#00c853',
  gold:   '#ffc107',
  blue:   '#2979ff',
  red:    '#ff1744',
  purple: '#aa00ff',
  cyan:   '#00e5ff',

  greenAlpha: (a) => `rgba(0,200,83,${a})`,
  goldAlpha:  (a) => `rgba(255,193,7,${a})`,
  blueAlpha:  (a) => `rgba(41,121,255,${a})`,
  redAlpha:   (a) => `rgba(255,23,68,${a})`,
};

const SHOT_COLORS = {
  'Cover Drive': CHART_COLORS.green,
  'Pull Shot':   CHART_COLORS.red,
  'Sweep':       CHART_COLORS.gold,
  'Defensive':   CHART_COLORS.blue,
};

function getShotColor(shotName) {
  return SHOT_COLORS[shotName] || '#9ea8c5';
}

/* ── HELPERS ────────────────────────────────────────────────── */

/**
 * Build a doughnut chart for shot distribution
 * @param {string} canvasId
 * @param {Array<{predicted_shot: string, cnt: number}>} data
 */
function buildShotDoughnut(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data || !data.length) return null;

  const labels = data.map(s => s.predicted_shot);
  const values = data.map(s => s.cnt);
  const colors = labels.map(getShotColor);

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Build a bar chart for model accuracy comparison
 * @param {string} canvasId
 * @param {Array<{model: string, accuracy: number, cv: number}>} data
 */
function buildModelBar(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data || !data.length) return null;

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.map(m => m.model),
      datasets: [
        {
          label: 'Test Accuracy %',
          data: data.map(m => m.accuracy),
          backgroundColor: CHART_COLORS.greenAlpha(0.7),
          borderColor: CHART_COLORS.green,
          borderWidth: 1,
          borderRadius: 5,
          borderSkipped: false,
        },
        {
          label: 'CV Accuracy %',
          data: data.map(m => m.cv),
          backgroundColor: CHART_COLORS.goldAlpha(0.55),
          borderColor: CHART_COLORS.gold,
          borderWidth: 1,
          borderRadius: 5,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
          min: 95,
          max: 100,
          ticks: { callback: v => v + '%' }
        }
      },
      plugins: {
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}%` }
        }
      }
    }
  });
}

/**
 * Build a line chart for daily prediction trend
 * @param {string} canvasId
 * @param {Array<{day: string, cnt: number}>} data
 */
function buildDailyLine(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels = data.map(d => {
    const raw = d.day ? String(d.day).split('T')[0] : '';
    if (!raw) return '';
    const date = new Date(raw + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  });

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{
        label: 'Predictions',
        data: data.length ? data.map(d => d.cnt) : [0],
        borderColor: CHART_COLORS.green,
        backgroundColor: CHART_COLORS.greenAlpha(0.08),
        tension: 0.4,
        fill: true,
        pointBackgroundColor: CHART_COLORS.green,
        pointBorderColor: '#141929',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

/**
 * Build a polar area chart for player dashboard
 * @param {string} canvasId
 * @param {Array<{predicted_shot: string, cnt: number}>} data
 */
function buildPolarArea(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !data || !data.length) return null;

  const labels = data.map(s => s.predicted_shot);
  const values = data.map(s => s.cnt);
  const colors = labels.map(getShotColor);

  return new Chart(canvas, {
    type: 'polarArea',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'aa'),
        borderColor: colors,
        borderWidth: 2,
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { padding: 14, boxWidth: 12 } }
      },
      scales: {
        r: {
          ticks:  { color: '#5a6480', backdropColor: 'transparent' },
          grid:   { color: 'rgba(30,42,64,.9)' },
          pointLabels: { color: '#9ea8c5' }
        }
      }
    }
  });
}

/**
 * Animate probability bars after page load
 */
function animateProbaBars() {
  document.querySelectorAll('.proba-bar-fill[data-width]').forEach((bar, i) => {
    bar.style.width = '0%';
    setTimeout(() => {
      bar.style.width = bar.getAttribute('data-width') + '%';
    }, 100 + i * 80);
  });
}

document.addEventListener('DOMContentLoaded', animateProbaBars);
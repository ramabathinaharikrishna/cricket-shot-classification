/**
 * main.js — Smart Cricket Shot Classification
 * Global JS: flash messages, sidebar, tooltips, utilities
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. AUTO-DISMISS FLASH MESSAGES ─────────────────────── */
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'alert-close';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => dismissAlert(alert));
    alert.appendChild(closeBtn);

    // Auto-dismiss after 5 seconds
    setTimeout(() => dismissAlert(alert), 5000);
  });

  function dismissAlert(alert) {
    if (!alert || alert._dismissing) return;
    alert._dismissing = true;
    alert.style.transition = 'opacity 0.3s ease, transform 0.3s ease, max-height 0.3s ease, padding 0.3s ease, margin 0.3s ease';
    alert.style.opacity = '0';
    alert.style.transform = 'translateX(20px)';
    alert.style.maxHeight = '0';
    alert.style.padding = '0';
    alert.style.marginBottom = '0';
    alert.style.overflow = 'hidden';
    setTimeout(() => alert.remove(), 350);
  }

  /* ── 2. SIDEBAR ACTIVE STATE ─────────────────────────────── */
  const currentPath = window.location.pathname;
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  sidebarLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath === href) {
      link.classList.add('active');
    } else if (href && currentPath.startsWith(href) && href !== '/') {
      link.classList.add('active');
    }
  });

  /* ── 3. CONFIRM DIALOGS ──────────────────────────────────── */
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', e => {
      const msg = el.getAttribute('data-confirm') || 'Are you sure?';
      if (!confirm(msg)) e.preventDefault();
    });
  });

  /* ── 4. PROGRESS BAR ANIMATION ON LOAD ───────────────────── */
  const progBars = document.querySelectorAll('.prog-bar[data-width]');
  progBars.forEach(bar => {
    bar.style.width = '0%';
    setTimeout(() => {
      bar.style.width = bar.getAttribute('data-width') + '%';
    }, 100);
  });

  /* ── 5. NUMBER COUNTER ANIMATION ────────────────────────── */
  const statValues = document.querySelectorAll('.stat-value[data-count]');
  statValues.forEach(el => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString();
      if (current >= target) clearInterval(timer);
    }, 30);
  });

  /* ── 6. FORM VALIDATION HIGHLIGHT ───────────────────────── */
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', e => {
      const required = form.querySelectorAll('[required]');
      let hasError = false;
      required.forEach(field => {
        if (!field.value.trim()) {
          field.style.borderColor = 'var(--red)';
          field.style.boxShadow = '0 0 0 3px rgba(255,23,68,0.12)';
          hasError = true;
          field.addEventListener('input', () => {
            field.style.borderColor = '';
            field.style.boxShadow = '';
          }, { once: true });
        }
      });
      if (hasError) e.preventDefault();
    });
  });

  /* ── 7. TOOLTIP (data-tip attribute) ────────────────────── */
  const tipped = document.querySelectorAll('[data-tip]');
  let tipEl = null;
  tipped.forEach(el => {
    el.addEventListener('mouseenter', e => {
      tipEl = document.createElement('div');
      tipEl.className = 'tooltip-bubble';
      tipEl.textContent = el.getAttribute('data-tip');
      tipEl.style.cssText = `
        position: fixed; z-index: 9000;
        background: #1e2a40; color: #e8eaf6;
        font-family: 'Rajdhani', sans-serif;
        font-size: 0.78rem; font-weight: 600;
        padding: 5px 10px; border-radius: 5px;
        border: 1px solid #2e3f5c;
        pointer-events: none;
        white-space: nowrap;
        animation: fadeIn 0.15s ease;
      `;
      document.body.appendChild(tipEl);
      positionTip(e);
    });
    el.addEventListener('mousemove', positionTip);
    el.addEventListener('mouseleave', () => {
      if (tipEl) { tipEl.remove(); tipEl = null; }
    });
  });
  function positionTip(e) {
    if (!tipEl) return;
    tipEl.style.left = (e.clientX + 12) + 'px';
    tipEl.style.top  = (e.clientY - 28) + 'px';
  }

  /* ── 8. MOBILE SIDEBAR TOGGLE ────────────────────────────── */
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar       = document.querySelector('.sidebar');
  const overlay       = document.getElementById('sidebarOverlay');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-open');
      if (overlay) overlay.classList.toggle('d-none');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('sidebar-open');
      overlay.classList.add('d-none');
    });
  }

  /* ── 9. TABLE ROW HIGHLIGHT ON CLICK ─────────────────────── */
  document.querySelectorAll('tbody tr').forEach(row => {
    row.style.cursor = 'default';
    row.addEventListener('click', function () {
      const wasSelected = this.classList.contains('row-selected');
      document.querySelectorAll('tbody tr').forEach(r => r.classList.remove('row-selected'));
      if (!wasSelected) {
        this.classList.add('row-selected');
        this.style.background = 'rgba(0,200,83,0.05)';
      } else {
        this.style.background = '';
      }
    });
  });

  /* ── 10. INPUT: NUMBER only (no negatives for sensor data) ── */
  document.querySelectorAll('input.sensor-input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
    });
  });

});

/* ── GLOBAL UTILITY FUNCTIONS ──────────────────────────────── */

/**
 * Show a toast notification programmatically
 * @param {string} message
 * @param {'success'|'danger'|'warning'|'info'} type
 */
window.showToast = function(message, type = 'success') {
  const icons = { success: '✓', danger: '✗', warning: '⚠', info: 'ℹ' };
  const container = document.querySelector('.flash-container')
    || (() => {
      const c = document.createElement('div');
      c.className = 'flash-container';
      document.querySelector('.main-content').prepend(c);
      return c;
    })();

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <span class="alert-icon">${icons[type] || 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(alert);

  // Re-run dismiss logic
  setTimeout(() => {
    alert.style.transition = 'opacity 0.3s ease, max-height 0.3s ease, padding 0.3s ease, margin 0.3s ease';
    alert.style.opacity = '0';
    alert.style.maxHeight = '0';
    alert.style.padding = '0';
    alert.style.marginBottom = '0';
    setTimeout(() => alert.remove(), 350);
  }, 4000);
};

/**
 * Format a number with commas
 * @param {number} n
 * @returns {string}
 */
window.formatNumber = function(n) {
  return n.toLocaleString();
};

/**
 * Debounce utility
 */
window.debounce = function(fn, delay = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};
/**
 * admin.js — Admin panel JS
 * Handles: user search, role change confirm, predictions filter, export
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── USER TABLE SEARCH ───────────────────────────────────── */
  const userSearch = document.getElementById('userSearch');
  if (userSearch) {
    userSearch.addEventListener('input', window.debounce ? window.debounce(filterUsers, 200) : filterUsers);
  }

  function filterUsers() {
    const q = userSearch.value.trim().toLowerCase();
    const rows = document.querySelectorAll('#usersTable tbody tr');
    let visible = 0;
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const show = !q || text.includes(q);
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    const noResults = document.getElementById('noUsersResult');
    if (noResults) noResults.style.display = visible === 0 ? '' : 'none';
  }

  /* ── ROLE CHANGE CONFIRM ─────────────────────────────────── */
  document.querySelectorAll('.role-change-form').forEach(form => {
    form.addEventListener('submit', e => {
      const select = form.querySelector('select[name="role"]');
      const name   = form.closest('tr')?.querySelector('strong')?.textContent || 'this user';
      if (select) {
        const newRole = select.value;
        const msg = `Change ${name}'s role to ${newRole.toUpperCase()}?`;
        if (!confirm(msg)) e.preventDefault();
      }
    });
  });

  /* ── PREDICTIONS SHOT FILTER ─────────────────────────────── */
  const filterShot = document.getElementById('filterShot');
  if (filterShot) {
    filterShot.addEventListener('change', function () {
      const val = this.value;
      const rows = document.querySelectorAll('[data-shot]');
      let visible = 0;
      rows.forEach(row => {
        const show = !val || row.getAttribute('data-shot') === val;
        row.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      updateTableCount(visible);
    });
  }

  /* ── MODEL FILTER ────────────────────────────────────────── */
  const filterModel = document.getElementById('filterModel');
  if (filterModel) {
    filterModel.addEventListener('change', function () {
      const val = this.value;
      const rows = document.querySelectorAll('[data-model]');
      rows.forEach(row => {
        row.style.display = (!val || row.getAttribute('data-model') === val) ? '' : 'none';
      });
    });
  }

  function updateTableCount(n) {
    const counter = document.getElementById('tableCount');
    if (counter) counter.textContent = `(${n} shown)`;
  }

  /* ── EXPORT TABLE TO CSV ─────────────────────────────────── */
  const exportBtn = document.getElementById('exportCsv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const table = document.querySelector('table');
      if (!table) return;

      const rows = Array.from(table.querySelectorAll('tr'));
      const csv  = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => {
          const text = cell.textContent.replace(/\s+/g, ' ').trim().replace(/"/g, '""');
          return `"${text}"`;
        }).join(',');
      }).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `cricket_predictions_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      if (window.showToast) window.showToast('Table exported as CSV', 'success');
    });
  }

  /* ── DASHBOARD CHART RESIZE ──────────────────────────────── */
  window.addEventListener('resize', () => {
    if (typeof Chart !== 'undefined') {
      Chart.instances && Object.values(Chart.instances).forEach(c => c.resize());
    }
  });

});
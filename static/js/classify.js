/**
 * classify.js — Shot Classification Page JS
 * Handles: sample data fill, input validation, UI feedback
 */

/* ── SAMPLE DATA (one per shot class) ───────────────────────── */
const SAMPLE_DATA = {
  cover: {
    mean_acc_x: 8.50, mean_acc_y: 3.00, mean_acc_z: 4.50,
    std_acc_x:  2.80, std_acc_y:  1.20, std_acc_z:  1.50,
    mean_gyro_x: 5.20, mean_gyro_y: 6.80, mean_gyro_z: 3.50,
    std_gyro_x:  1.50, std_gyro_y:  1.80, std_gyro_z:  1.00,
    max_acc_magnitude: 14.20, min_acc_magnitude: 2.00, peak_angular_vel: 8.50,
    label: 'Cover Drive', icon: '🏏'
  },
  pull: {
    mean_acc_x: 4.00, mean_acc_y: 3.50, mean_acc_z: 12.00,
    std_acc_x:  1.80, std_acc_y:  1.50, std_acc_z:   3.20,
    mean_gyro_x: 9.50, mean_gyro_y: 8.20, mean_gyro_z: 7.00,
    std_gyro_x:  2.80, std_gyro_y:  2.50, std_gyro_z:  2.20,
    max_acc_magnitude: 19.50, min_acc_magnitude: 3.50, peak_angular_vel: 14.00,
    label: 'Pull Shot', icon: '💥'
  },
  sweep: {
    mean_acc_x: 6.80, mean_acc_y: 1.50, mean_acc_z: 5.50,
    std_acc_x:  2.00, std_acc_y:  0.80, std_acc_z:  1.80,
    mean_gyro_x: 3.50, mean_gyro_y: 4.00, mean_gyro_z: 9.50,
    std_gyro_x:  1.00, std_gyro_y:  1.20, std_gyro_z:  2.80,
    max_acc_magnitude: 12.50, min_acc_magnitude: 1.50, peak_angular_vel: 10.50,
    label: 'Sweep', icon: '↩️'
  },
  defensive: {
    mean_acc_x: 1.50, mean_acc_y: 1.20, mean_acc_z: 2.00,
    std_acc_x:  0.50, std_acc_y:  0.40, std_acc_z:  0.70,
    mean_gyro_x: 1.80, mean_gyro_y: 1.50, mean_gyro_z: 2.00,
    std_gyro_x:  0.50, std_gyro_y:  0.40, std_gyro_z:  0.60,
    max_acc_magnitude: 5.50, min_acc_magnitude: 0.80, peak_angular_vel: 3.50,
    label: 'Defensive', icon: '🛡️'
  }
};

/**
 * Fill the classification form with sample values for a given shot
 * @param {string} shotKey - 'cover' | 'pull' | 'sweep' | 'defensive'
 */
function fillSample(shotKey) {
  const data = SAMPLE_DATA[shotKey];
  if (!data) return;

  const FEATURE_KEYS = [
    'mean_acc_x','mean_acc_y','mean_acc_z',
    'std_acc_x', 'std_acc_y', 'std_acc_z',
    'mean_gyro_x','mean_gyro_y','mean_gyro_z',
    'std_gyro_x', 'std_gyro_y', 'std_gyro_z',
    'max_acc_magnitude','min_acc_magnitude','peak_angular_vel'
  ];

  let filledCount = 0;
  FEATURE_KEYS.forEach(key => {
    const el = document.querySelector(`[name="${key}"]`);
    if (el && data[key] !== undefined) {
      // Animate the fill with a brief flash
      el.style.transition = 'background 0.3s ease, border-color 0.3s ease';
      el.value = data[key];
      el.style.background = 'rgba(0,200,83,.12)';
      el.style.borderColor = 'var(--green)';
      setTimeout(() => {
        el.style.background = '';
        el.style.borderColor = '';
      }, 600 + filledCount * 20);
      filledCount++;
    }
  });

  // Show toast
  if (window.showToast) {
    window.showToast(`Loaded ${data.icon} ${data.label} sample data`, 'success');
  }

  // Update active state on sample buttons
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.classList.remove('btn-green');
    btn.classList.add('btn-outline');
  });
  const activeBtn = document.querySelector(`.sample-btn[data-shot="${shotKey}"]`);
  if (activeBtn) {
    activeBtn.classList.remove('btn-outline');
    activeBtn.classList.add('btn-green');
  }
}

/**
 * Clear all input fields
 */
function clearForm() {
  document.querySelectorAll('.classify-form input[type="number"]').forEach(el => {
    el.value = '';
    el.style.background = '';
    el.style.borderColor = '';
  });
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.classList.remove('btn-green');
    btn.classList.add('btn-outline');
  });
  if (window.showToast) window.showToast('Form cleared', 'info');
}

/**
 * Validate all 15 sensor inputs before submission
 * @returns {boolean}
 */
function validateClassifyForm() {
  const inputs = document.querySelectorAll('.classify-form input[type="number"]');
  let valid = true;

  inputs.forEach(input => {
    const val = parseFloat(input.value);
    // Clear previous error style
    input.style.borderColor = '';
    input.style.boxShadow  = '';

    if (input.value.trim() === '' || isNaN(val)) {
      input.style.borderColor = 'var(--red)';
      input.style.boxShadow  = '0 0 0 3px rgba(255,23,68,0.12)';
      valid = false;
      input.addEventListener('input', () => {
        input.style.borderColor = '';
        input.style.boxShadow   = '';
      }, { once: true });
    }
  });

  if (!valid && window.showToast) {
    window.showToast('Please fill in all 15 sensor fields.', 'danger');
  }
  return valid;
}

/**
 * Animate result card on load
 */
function animateResult() {
  const resultCard = document.querySelector('.result-card');
  if (!resultCard) return;

  resultCard.style.opacity = '0';
  resultCard.style.transform = 'translateY(20px)';
  resultCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

  setTimeout(() => {
    resultCard.style.opacity = '1';
    resultCard.style.transform = 'translateY(0)';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

/**
 * Show loading state on form submit
 */
function handleFormSubmit(e) {
  if (!validateClassifyForm()) {
    e.preventDefault();
    return;
  }
  const btn = document.querySelector('.classify-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> &nbsp; CLASSIFYING...';
    btn.style.opacity = '0.8';
  }
}

/* ── INIT ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Hook form submit
  const form = document.querySelector('.classify-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Animate result if present
  animateResult();

  // Wire sample buttons (fallback if onclick not used in HTML)
  document.querySelectorAll('.sample-btn[data-shot]').forEach(btn => {
    btn.addEventListener('click', () => fillSample(btn.getAttribute('data-shot')));
  });

  // Clear button
  const clearBtn = document.getElementById('clearFormBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearForm);
  }

  // Live magnitude preview (optional — shows running sqrt of acc columns)
  const accInputs = ['mean_acc_x','mean_acc_y','mean_acc_z'].map(
    k => document.querySelector(`[name="${k}"]`)
  ).filter(Boolean);

  function updateMagnitudePreview() {
    const vals = accInputs.map(i => parseFloat(i.value) || 0);
    const mag = Math.sqrt(vals.reduce((s, v) => s + v * v, 0));
    const preview = document.getElementById('magPreview');
    if (preview) preview.textContent = mag.toFixed(3) + ' m/s²';
  }
  accInputs.forEach(i => i.addEventListener('input', updateMagnitudePreview));

});
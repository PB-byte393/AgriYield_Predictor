'use strict';
document.addEventListener('DOMContentLoaded', () => {

  /**
   * 1. THEME MANAGER
   * Manages light/dark mode persistence.
   */
  const themeManager = (() => {
    const htmlEl = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const storedTheme = localStorage.getItem('app-theme') || 'light';

    function setTheme(theme) {
      htmlEl.setAttribute('data-bs-theme', theme);
      localStorage.setItem('app-theme', theme);
      if (themeToggle) {
        themeToggle.checked = (theme === 'dark');
      }
    }
    setTheme(storedTheme);
    if (themeToggle) {
      themeToggle.addEventListener('change', () => {
        setTheme(themeToggle.checked ? 'dark' : 'light');
      });
    }
  })();

  /**
   * NEW: 2. HISTORY MANAGER
   * Saves predictions to localStorage and renders them in the off-canvas panel.
   */
  const historyManager = (() => {
    const HISTORY_KEY = 'agriYieldHistory';
    const historyBtn = document.getElementById('history-btn');
    const panelBody = document.getElementById('history-panel-body');
    const emptyState = document.getElementById('history-empty-state');

    function getHistory() {
      try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
      } catch (e) {
        console.error("Failed to parse history:", e);
        return [];
      }
    }

    function savePrediction(prediction) {
      try {
        const history = getHistory();
        history.unshift(prediction); // Add new prediction to the top
        if (history.length > 10) {
          history.pop(); // Keep only the last 10 predictions
        }
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch (e) {
        console.error("Failed to save history:", e);
      }
    }

    function renderHistory() {
      const history = getHistory();
      if (history.length === 0) {
        emptyState.style.display = 'block';
        panelBody.innerHTML = ''; // Clear old items
        panelBody.appendChild(emptyState);
      } else {
        emptyState.style.display = 'none';
        panelBody.innerHTML = ''; // Clear old items
        history.forEach(item => {
          const itemEl = document.createElement('div');
          itemEl.className = 'history-item';
          itemEl.innerHTML = `
            <div class="history-item-info">
              ${item.crop}
              <small>${new Date(item.timestamp).toLocaleString()}</small>
            </div>
            <div class="history-item-value">
              ${item.value.toFixed(2)} <small>${item.unit}</small>
            </div>
          `;
          panelBody.appendChild(itemEl);
        });
      }
    }

    historyBtn.addEventListener('click', renderHistory);

    // Public API
    return {
      save: savePrediction
    };
  })();


  /**
   * 3. WIZARD MANAGER
   * Manages the multi-step form, validation, and API submission.
   */
  const wizardManager = (() => {
    let currentStep = 1;
    const totalSteps = 3;
    const form = document.getElementById('prediction-form');
    if (!form) return; 
    
    // Form Elements
    const panels = form.querySelectorAll('.wizard-step-panel');
    const progressTabs = document.querySelectorAll('.wizard-progress-step');
    
    // Control Buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const submitBtnSpinner = submitBtn.querySelector('.spinner-border');
    const newPredictionBtn = document.getElementById('new-prediction-btn'); // NEW
    
    // Result Card Elements
    const resultContainer = document.getElementById('result-container');
    const resultCard = document.getElementById('result-card');
    const resultTitle = resultCard.querySelector('.result-title');
    const resultSubtitle = document.getElementById('result-subtitle');
    const resultIcon = resultCard.querySelector('.bi');
    const resultValue = document.getElementById('result-value');
    const resultUnit = document.getElementById('result-unit');
    

    /**
     * Updates the entire UI to reflect the new step.
     */
    function updateWizardUI(newStep) {
      currentStep = newStep;
      progressTabs.forEach((tab, index) => {
        tab.setAttribute('aria-selected', (index + 1) === currentStep);
      });
      panels.forEach(panel => {
        panel.hidden = (parseInt(panel.dataset.step) !== currentStep);
      });
      prevBtn.style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
      nextBtn.style.display = (currentStep === totalSteps) ? 'none' : 'block';
      submitBtn.style.display = (currentStep === totalSteps) ? 'block' : 'none';
    }

    /**
     * Validates all required fields within a specific step panel.
     */
    function validateStep(step) {
      let isStepValid = true;
      const currentPanel = form.querySelector(`.wizard-step-panel[data-step="${step}"]`);
      const inputs = currentPanel.querySelectorAll('input[required], select[required]');

      inputs.forEach(input => {
        const errorEl = document.getElementById(`${input.id}-error`);
        if (!errorEl) return;
        if (!input.checkValidity()) {
          isStepValid = false;
          let message = input.validationMessage; 
          if (input.validity.valueMissing) {
            message = 'This field is required.';
          } else if (input.validity.rangeUnderflow) {
            message = `Value must be at least ${input.min}.`;
          } else if (input.validity.rangeOverflow) {
            message = `Value cannot be more than ${input.max}.`;
          }
          input.classList.add('is-invalid');
          input.classList.remove('is-valid');
          errorEl.textContent = message;
        } else {
          input.classList.remove('is-invalid');
          input.classList.add('is-valid'); 
          errorEl.textContent = '';
        }
      });
      return isStepValid;
    }

    /**
     * Clears validation classes and messages from all form fields.
     */
    function clearAllValidation() {
      form.querySelectorAll('.is-invalid, .is-valid').forEach(input => {
        input.classList.remove('is-invalid', 'is-valid');
      });
      form.querySelectorAll('.invalid-feedback').forEach(errorEl => {
        errorEl.textContent = '';
      });
    }

    /**
     * Gathers all form data into a plain JavaScript object.
     */
    function getFormData() {
      const formData = new FormData(form);
      return Object.fromEntries(formData.entries());
    }

    /**
     * Manages the UI state during API call (loading).
     */
    function showLoadingState(isLoading) {
      submitBtn.disabled = isLoading;
      submitBtnSpinner.style.display = isLoading ? 'inline-block' : 'none';
      if (isLoading) {
        resultContainer.style.display = 'none';
        resultCard.style.opacity = '0';
        resultCard.style.transform = 'translateY(20px)';
      }
    }
    
    /**
     * NEW: Resets the entire form and wizard to its initial state.
     */
    function resetWizard() {
      resultContainer.style.display = 'none';
      resultCard.style.opacity = '0';
      resultCard.style.transform = 'translateY(20px)';
      
      form.reset();
      clearAllValidation();
      updateWizardUI(1);
    }

    /**
     * NEW: Animates the result value with a count-up effect.
     */
    function animateCountUp(el, toValue) {
      const duration = 1500; // 1.5 seconds
      const frameRate = 1000 / 60; // 60fps
      const totalFrames = Math.round(duration / frameRate);
      let frame = 0;
      
      const easeOutQuad = t => t * (2 - t); // Easing function
      
      const counter = setInterval(() => {
        frame++;
        const progress = easeOutQuad(frame / totalFrames);
        const currentValue = (toValue * progress).toFixed(2);
        
        el.textContent = currentValue;
        
        if (frame === totalFrames) {
          clearInterval(counter);
          el.textContent = toValue.toFixed(2); // Ensure final value is exact
        }
      }, frameRate);
    }

    /**
     * Renders the result (success or error) in the result component.
     */
    function showResult({ type, title, subtitle, value, unit = '', formData = {} }) {
      resultCard.className = `result-card is-${type}`;
      resultTitle.textContent = title;
      resultSubtitle.textContent = subtitle;
      resultUnit.textContent = unit;
      resultIcon.className = (type === 'success') 
        ? 'bi bi-check-circle-fill' 
        : 'bi bi-exclamation-triangle-fill';

      if (type === 'success') {
        animateCountUp(resultValue, value);
        // Save to history
        historyManager.save({
          crop: formData.crop || 'Unknown Crop',
          value: value,
          unit: unit,
          timestamp: new Date().toISOString()
        });
      } else {
        resultValue.textContent = value;
      }
      
      resultContainer.style.display = 'block';
      setTimeout(() => {
        resultCard.style.opacity = '1';
        resultCard.style.transform = 'translateY(0)';
      }, 10);
    }
    
    // --- Event Listeners ---
    
    function handleNext() {
      // Clear previous step's validation before validating current
      if (currentStep > 1) {
        validateStep(currentStep - 1);
      }
      if (validateStep(currentStep)) {
        updateWizardUI(currentStep + 1);
      }
    }

    function handlePrev() {
      clearAllValidation(); // Clear validation when going back
      updateWizardUI(currentStep - 1);
    }

    async function handleSubmit(event) {
      event.preventDefault();
      // Clear validation from previous attempts
      clearAllValidation(); 
      if (!validateStep(currentStep)) {
        return;
      }
      
      showLoadingState(true);
      const formData = getFormData();

      try {
        const response = await fetch('/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.error?.message || `Server error: ${response.status}`);
        }

        if (result.data) {
          showResult({
            type: 'success',
            title: 'Prediction Successful',
            subtitle: `For ${formData.crop_year} ${formData.crop} in ${formData.state}`,
            value: result.data.prediction, 
            unit: result.data.unit,
            formData: formData
          });
        } else {
          throw new Error(result.error?.message || 'An unknown error occurred.');
        }

      } catch (error) {
        console.error('Prediction failed:', error);
        showResult({
          type: 'error',
          title: 'Prediction Failed',
          subtitle: error.message,
          value: 'Error',
        });
      } finally {
        showLoadingState(false);
      }
    }
    
    // Attach all main event listeners
    nextBtn.addEventListener('click', handleNext);
    prevBtn.addEventListener('click', handlePrev);
    newPredictionBtn.addEventListener('click', resetWizard); // NEW
    form.addEventListener('submit', handleSubmit);
    
    // Initial setup
    updateWizardUI(1);

  })(); 

});
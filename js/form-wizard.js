import { showToast } from './toast-enhanced.js';

/**
 * FormWizard - Reusable multi-step form wizard for mobile UX
 * Breaks long forms into digestible steps with progress tracking
 */
export class FormWizard {
    constructor(options = {}) {
        this.formElement = options.formElement;
        this.currentStep = 1;
        this.totalSteps = options.totalSteps || 3;
        this.onStepChange = options.onStepChange || (() => { });
        this.onComplete = options.onComplete || (() => { });

        this.init();
    }

    init() {
        this.createWizardUI();
        this.setupNavigation();
        this.updateUI();
    }

    createWizardUI() {
        // Wrap form content in wizard structure
        const formContent = this.formElement.innerHTML;

        this.formElement.innerHTML = `
            <div class="form-wizard">
                <!-- Progress indicator -->
                <div class="wizard-progress">
                    <div class="wizard-step active" data-step="1">
                        <span class="step-number">1</span>
                        <span class="step-label">Basics</span>
                    </div>
                    <div class="wizard-step" data-step="2">
                        <span class="step-number">2</span>
                        <span class="step-label">Pricing</span>
                    </div>
                    <div class="wizard-step" data-step="3">
                        <span class="step-number">3</span>
                        <span class="step-label">Images</span>
                    </div>
                </div>

                <!-- Form steps container -->
                <div class="wizard-content">
                    ${formContent}
                </div>

                <!-- Navigation buttons -->
                <div class="wizard-actions">
                    <button type="button" class="btn btn-outline wizard-prev" style="display:none;">
                        <i class="fa-solid fa-arrow-left"></i> Back
                    </button>
                    <button type="button" class="btn btn-primary wizard-next">
                        Next <i class="fa-solid fa-arrow-right"></i>
                    </button>
                    <button type="submit" class="btn btn-primary wizard-submit" style="display:none;">
                        <i class="fa-solid fa-check"></i> Submit
                    </button>
                </div>
            </div>
        `;

        // Group fields into panels based on data-step attribute
        this.groupFieldsIntoPanels();
    }

    groupFieldsIntoPanels() {
        const wizardContent = this.formElement.querySelector('.wizard-content');
        const allFields = Array.from(wizardContent.children);

        // Create panels for each step
        for (let i = 1; i <= this.totalSteps; i++) {
            const panel = document.createElement('div');
            panel.className = 'wizard-panel';
            panel.dataset.panel = i;
            panel.style.display = i === 1 ? 'block' : 'none';
            wizardContent.appendChild(panel);
        }

        // Move fields to appropriate panels based on data-wizard-step attribute
        allFields.forEach(field => {
            const stepNumber = parseInt(field.dataset.wizardStep) || 1;
            const panel = wizardContent.querySelector(`.wizard-panel[data-panel="${stepNumber}"]`);
            if (panel) {
                panel.appendChild(field);
            }
        });
    }

    setupNavigation() {
        const nextBtn = this.formElement.querySelector('.wizard-next');
        const prevBtn = this.formElement.querySelector('.wizard-prev');

        nextBtn?.addEventListener('click', () => this.nextStep());
        prevBtn?.addEventListener('click', () => this.prevStep());

        // Allow clicking on step indicators to jump to steps
        this.formElement.querySelectorAll('.wizard-step').forEach((step, index) => {
            step.addEventListener('click', () => {
                const targetStep = index + 1;
                if (targetStep < this.currentStep) {
                    // Allow going back
                    this.goToStep(targetStep);
                }
            });
        });
    }

    nextStep() {
        if (!this.validateCurrentStep()) {
            return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateUI();
            this.onStepChange(this.currentStep);
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateUI();
            this.onStepChange(this.currentStep);
        }
    }

    validateCurrentStep() {
        const currentPanel = this.formElement.querySelector(`.wizard-panel[data-panel="${this.currentStep}"]`);
        const requiredInputs = currentPanel.querySelectorAll('input[required], select[required], textarea[required]');

        let isValid = true;
        let firstInvalidField = null;

        requiredInputs.forEach(input => {
            const value = input.type === 'checkbox' ? input.checked : input.value.trim();

            if (!value) {
                input.classList.add('error');
                isValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = input;
                }
            } else {
                input.classList.remove('error');
            }
        });

        if (!isValid) {
            showToast('Please fill in all required fields', 'warning');
            firstInvalidField?.focus();
        }

        return isValid;
    }

    updateUI() {
        // Update panels visibility
        this.formElement.querySelectorAll('.wizard-panel').forEach((panel, index) => {
            const isActive = index + 1 === this.currentStep;
            panel.style.display = isActive ? 'block' : 'none';
            panel.classList.toggle('active', isActive);
        });

        // Update progress indicators
        this.formElement.querySelectorAll('.wizard-step').forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.toggle('active', stepNum === this.currentStep);
            step.classList.toggle('completed', stepNum < this.currentStep);

            // Update step number to checkmark for completed steps
            const stepNumber = step.querySelector('.step-number');
            if (stepNum < this.currentStep) {
                stepNumber.innerHTML = '<i class="fa-solid fa-check"></i>';
            } else {
                stepNumber.textContent = stepNum;
            }
        });

        // Update navigation buttons
        const prevBtn = this.formElement.querySelector('.wizard-prev');
        const nextBtn = this.formElement.querySelector('.wizard-next');
        const submitBtn = this.formElement.querySelector('.wizard-submit');

        prevBtn.style.display = this.currentStep === 1 ? 'none' : 'flex';
        nextBtn.style.display = this.currentStep === this.totalSteps ? 'none' : 'flex';
        submitBtn.style.display = this.currentStep === this.totalSteps ? 'flex' : 'none';

        // Scroll to top on mobile for better UX
        if (window.innerWidth <= 768) {
            const wizardElement = this.formElement.querySelector('.form-wizard');
            wizardElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    goToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
            this.currentStep = stepNumber;
            this.updateUI();
            this.onStepChange(this.currentStep);
        }
    }

    reset() {
        this.currentStep = 1;
        this.updateUI();
        this.formElement.reset();
    }
}

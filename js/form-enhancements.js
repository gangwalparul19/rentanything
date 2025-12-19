/**
 * Form Enhancements
 * Floating labels, validation, password strength, character counters
 */

// ============ Floating Labels ============

class FloatingLabel {
    constructor(input) {
        this.input = input;
        this.init();
    }

    init() {
        const wrapper = document.createElement('div');
        wrapper.className = 'floating-label-wrapper';

        const label = this.input.labels?.[0] || this.createLabel();

        this.input.parentNode.insertBefore(wrapper, this.input);
        wrapper.appendChild(label);
        wrapper.appendChild(this.input);

        // Add events
        this.input.addEventListener('focus', () => wrapper.classList.add('focused'));
        this.input.addEventListener('blur', () => {
            if (!this.input.value) {
                wrapper.classList.remove('focused');
            }
        });

        // Check initial value
        if (this.input.value) {
            wrapper.classList.add('focused');
        }
    }

    createLabel() {
        const label = document.createElement('label');
        label.textContent = this.input.placeholder || 'Input';
        label.setAttribute('for', this.input.id);
        return label;
    }
}

// ============ Real-time Validation ============

class FormValidator {
    constructor(form) {
        this.form = form;
        this.rules = new Map();
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.validateForm(e));

        // Real-time validation on blur
        this.form.querySelectorAll('input, textarea, select').forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => {
                if (field.classList.contains('invalid')) {
                    this.validateField(field);
                }
            });
        });
    }

    addRule(fieldName, validator, errorMessage) {
        this.rules.set(fieldName, { validator, errorMessage });
    }

    validateField(field) {
        const rule = this.rules.get(field.name);
        if (!rule) return true;

        const isValid = rule.validator(field.value, field);

        if (isValid) {
            this.showSuccess(field);
        } else {
            this.showError(field, rule.errorMessage);
        }

        return isValid;
    }

    validateForm(e) {
        let isValid = true;

        this.form.querySelectorAll('input, textarea, select').forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        if (!isValid) {
            e.preventDefault();

            // Focus first invalid field
            const firstInvalid = this.form.querySelector('.invalid');
            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return isValid;
    }

    showError(field, message) {
        field.classList.add('invalid');
        field.classList.remove('valid');
        field.setAttribute('aria-invalid', 'true');

        let errorEl = field.parentNode.querySelector('.validation-message');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'validation-message error';
            field.parentNode.appendChild(errorEl);
        }

        errorEl.textContent = message;
        errorEl.className = 'validation-message error';

        if (typeof window.announceFormError === 'function') {
            window.announceFormError(field.name, message);
        }
    }

    showSuccess(field) {
        field.classList.remove('invalid');
        field.classList.add('valid');
        field.setAttribute('aria-invalid', 'false');

        const errorEl = field.parentNode.querySelector('.validation-message');
        if (errorEl) {
            errorEl.remove();
        }
    }
}

// ============ Password Strength Meter ============

class PasswordStrength {
    constructor(input) {
        this.input = input;
        this.init();
    }

    init() {
        const meter = document.createElement('div');
        meter.className = 'password-strength-meter';
        meter.innerHTML = `
            <div class="strength-bar">
                <div class="strength-fill"></div>
            </div>
            <div class="strength-text">Weak</div>
        `;

        this.input.parentNode.insertBefore(meter, this.input.nextSibling);
        this.meter = meter;

        this.input.addEventListener('input', () => this.updateStrength());
    }

    calculateStrength(password) {
        let strength = 0;

        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 25;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
        if (/\d/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

        return strength;
    }

    updateStrength() {
        const password = this.input.value;
        const strength = this.calculateStrength(password);

        const fill = this.meter.querySelector('.strength-fill');
        const text = this.meter.querySelector('.strength-text');

        fill.style.width = `${strength}%`;

        if (strength < 40) {
            fill.className = 'strength-fill weak';
            text.textContent = 'Weak';
        } else if (strength < 70) {
            fill.className = 'strength-fill medium';
            text.textContent = 'Medium';
        } else {
            fill.className = 'strength-fill strong';
            text.textContent = 'Strong';
        }
    }
}

// ============ Character Counter ============

class CharacterCounter {
    constructor(input, maxLength) {
        this.input = input;
        this.maxLength = maxLength || input.maxLength || 100;
        this.init();
    }

    init() {
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.textContent = `0 / ${this.maxLength}`;

        this.input.parentNode.insertBefore(counter, this.input.nextSibling);
        this.counter = counter;

        this.input.addEventListener('input', () => this.updateCount());
        this.updateCount();
    }

    updateCount() {
        const length = this.input.value.length;
        this.counter.textContent = `${length} / ${this.maxLength}`;

        if (length > this.maxLength * 0.9) {
            this.counter.classList.add('warning');
        } else {
            this.counter.classList.remove('warning');
        }
    }
}

// ============ Auto-enhance Forms ============

function enhanceForms() {
    // Floating labels
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea').forEach(input => {
        if (!input.closest('.floating-label-wrapper')) {
            new FloatingLabel(input);
        }
    });

    // Password strength
    document.querySelectorAll('input[type="password"]').forEach(input => {
        if (!input.nextElementSibling?.classList.contains('password-strength-meter')) {
            new PasswordStrength(input);
        }
    });

    // Character counters for textareas
    document.querySelectorAll('textarea[maxlength]').forEach(textarea => {
        if (!textarea.nextElementSibling?.classList.contains('char-counter')) {
            new CharacterCounter(textarea);
        }
    });
}

// Export
window.FloatingLabel = FloatingLabel;
window.FormValidator = FormValidator;
window.PasswordStrength = PasswordStrength;
window.CharacterCounter = CharacterCounter;
window.enhanceForms = enhanceForms;

export {
    FloatingLabel,
    FormValidator,
    PasswordStrength,
    CharacterCounter,
    enhanceForms
};

// Auto-enhance on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceForms);
} else {
    enhanceForms();
}

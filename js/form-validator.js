/**
 * Form Validation Utility
 * Real-time inline validation with visual feedback
 */

export class FormValidator {
    constructor(formElement, rules) {
        this.form = formElement;
        this.rules = rules;
        this.errors = {};
        this.init();
    }

    init() {
        // Add validation listeners to all fields
        Object.keys(this.rules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldName));
                field.addEventListener('input', () => this.clearFieldError(fieldName));
            }
        });

        // Prevent form submission if invalid
        this.form.addEventListener('submit', (e) => {
            if (!this.validateAll()) {
                e.preventDefault();
                // Focus first invalid field
                const firstError = Object.keys(this.errors)[0];
                if (firstError) {
                    this.form.querySelector(`[name="${firstError}"]`)?.focus();
                }
            }
        });
    }

    validateField(fieldName) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (!field) return true;

        const rules = this.rules[fieldName];
        const value = field.value.trim();

        // Check required
        if (rules.required && !value) {
            this.setFieldError(fieldName, rules.messages?.required || 'This field is required');
            return false;
        }

        // If field is empty and not required, skip other validations
        if (!value && !rules.required) {
            this.setFieldSuccess(fieldName);
            return true;
        }

        // Check min length
        if (rules.minLength && value.length < rules.minLength) {
            this.setFieldError(fieldName, rules.messages?.minLength || `Minimum ${rules.minLength} characters required`);
            return false;
        }

        // Check max length
        if (rules.maxLength && value.length > rules.maxLength) {
            this.setFieldError(fieldName, rules.messages?.maxLength || `Maximum ${rules.maxLength} characters allowed`);
            return false;
        }

        // Check email
        if (rules.email && !this.isValidEmail(value)) {
            this.setFieldError(fieldName, rules.messages?.email || 'Please enter a valid email');
            return false;
        }

        // Check number
        if (rules.number && isNaN(value)) {
            this.setFieldError(fieldName, rules.messages?.number || 'Please enter a valid number');
            return false;
        }

        // Check min value
        if (rules.min !== undefined && Number(value) < rules.min) {
            this.setFieldError(fieldName, rules.messages?.min || `Minimum value is ${rules.min}`);
            return false;
        }

        // Check max value
        if (rules.max !== undefined && Number(value) > rules.max) {
            this.setFieldError(fieldName, rules.messages?.max || `Maximum value is ${rules.max}`);
            return false;
        }

        // Check pattern
        if (rules.pattern && !rules.pattern.test(value)) {
            this.setFieldError(fieldName, rules.messages?.pattern || 'Invalid format');
            return false;
        }

        // Check custom validator
        if (rules.custom) {
            const customError = rules.custom(value, field);
            if (customError) {
                this.setFieldError(fieldName, customError);
                return false;
            }
        }

        // All validations passed
        this.setFieldSuccess(fieldName);
        return true;
    }

    validateAll() {
        let isValid = true;
        Object.keys(this.rules).forEach(fieldName => {
            if (!this.validateField(fieldName)) {
                isValid = false;
            }
        });
        return isValid;
    }

    setFieldError(fieldName, message) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        const formGroup = field.closest('.form-group') || field.parentElement;

        // Remove success state
        field.classList.remove('valid');
        field.setAttribute('aria-invalid', 'true');
        formGroup?.querySelector('.validation-success')?.remove();

        // Add error state
        field.classList.add('invalid');

        // Add/update error message
        let errorEl = formGroup?.querySelector('.validation-error');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'validation-error';
            errorEl.setAttribute('role', 'alert');
            formGroup?.appendChild(errorEl);
        }
        errorEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;

        this.errors[fieldName] = message;
    }

    setFieldSuccess(fieldName) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        const formGroup = field.closest('.form-group') || field.parentElement;

        // Remove error state
        field.classList.remove('invalid');
        field.removeAttribute('aria-invalid');
        formGroup?.querySelector('.validation-error')?.remove();

        // Add success state
        field.classList.add('valid');

        // Add success icon
        if (formGroup && formGroup.classList.contains('form-group')) {
            let successEl = formGroup.querySelector('.validation-success');
            if (!successEl) {
                successEl = document.createElement('span');
                successEl.className = 'validation-success';
                formGroup.appendChild(successEl);
            }
            successEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        }

        delete this.errors[fieldName];
    }

    clearFieldError(fieldName) {
        const field = this.form.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        field.classList.remove('invalid');
        field.removeAttribute('aria-invalid');

        const formGroup = field.closest('.form-group') || field.parentElement;
        formGroup?.querySelector('.validation-error')?.remove();

        delete this.errors[fieldName];
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    reset() {
        this.errors = {};
        Object.keys(this.rules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.classList.remove('valid', 'invalid');
                field.removeAttribute('aria-invalid');

                const formGroup = field.closest('.form-group') || field.parentElement;
                formGroup?.querySelector('.validation-error')?.remove();
                formGroup?.querySelector('.validation-success')?.remove();
            }
        });
    }
}

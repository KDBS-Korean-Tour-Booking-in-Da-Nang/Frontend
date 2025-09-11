/**
 * Email validation utility following Gmail-compatible standards
 * Supports multi-level domains like .edu.vn, .co.uk, etc.
 */

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  // Trim whitespace
  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  // Check total length (≤ 254 characters)
  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email too long (max 254 characters)' };
  }

  // Check for @ symbol
  const atIndex = trimmedEmail.indexOf('@');
  if (atIndex === -1) {
    return { isValid: false, error: 'Email must contain @ symbol' };
  }

  // Split into local and domain parts
  const localPart = trimmedEmail.substring(0, atIndex);
  const domainPart = trimmedEmail.substring(atIndex + 1);

  // Validate local part
  const localValidation = validateLocalPart(localPart);
  if (!localValidation.isValid) {
    return localValidation;
  }

  // Validate domain part
  const domainValidation = validateDomainPart(domainPart);
  if (!domainValidation.isValid) {
    return domainValidation;
  }

  return { isValid: true, error: null };
};

const validateLocalPart = (localPart) => {
  // Check length (≤ 64 characters)
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email username too long (max 64 characters)' };
  }

  if (localPart.length === 0) {
    return { isValid: false, error: 'Email username cannot be empty' };
  }

  // Check for consecutive dots
  if (localPart.includes('..')) {
    return { isValid: false, error: 'Email cannot have consecutive dots' };
  }

  // Check if starts or ends with dot
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { isValid: false, error: 'Email username cannot start or end with dot' };
  }

  // Check for valid characters: a-z, A-Z, 0-9, .!#$%&'*+/=?^_{|}~-`
  const validLocalRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_{|}~`-]+$/;
  if (!validLocalRegex.test(localPart)) {
    return { isValid: false, error: 'Email username contains invalid characters' };
  }

  return { isValid: true, error: null };
};

const validateDomainPart = (domainPart) => {
  if (domainPart.length === 0) {
    return { isValid: false, error: 'Email domain cannot be empty' };
  }

  // Check for consecutive dots
  if (domainPart.includes('..')) {
    return { isValid: false, error: 'Email domain cannot have consecutive dots' };
  }

  // Check if starts or ends with dot
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return { isValid: false, error: 'Email domain cannot start or end with dot' };
  }

  // Split domain into labels
  const labels = domainPart.split('.');
  
  if (labels.length < 2) {
    return { isValid: false, error: 'Email domain must have at least one dot' };
  }

  // Validate each label
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    
    // Check label length (1-63 characters)
    if (label.length === 0 || label.length > 63) {
      return { isValid: false, error: 'Email domain label must be 1-63 characters' };
    }

    // Check if starts or ends with hyphen
    if (label.startsWith('-') || label.endsWith('-')) {
      return { isValid: false, error: 'Email domain label cannot start or end with hyphen' };
    }

    // Check for valid characters: a-z, A-Z, 0-9, -
    const validDomainRegex = /^[a-zA-Z0-9-]+$/;
    if (!validDomainRegex.test(label)) {
      return { isValid: false, error: 'Email domain contains invalid characters' };
    }
  }

  // Check TLD (last label must be ≥ 2 characters and letters only)
  const tld = labels[labels.length - 1];
  if (tld.length < 2) {
    return { isValid: false, error: 'Email domain TLD must be at least 2 characters' };
  }

  const validTldRegex = /^[a-zA-Z]+$/;
  if (!validTldRegex.test(tld)) {
    return { isValid: false, error: 'Email domain TLD must contain only letters' };
  }

  return { isValid: true, error: null };
};

// Simple validation for common cases (returns boolean)
export const isValidEmail = (email) => {
  const result = validateEmail(email);
  return result.isValid;
};

// Get user-friendly error message
export const getEmailErrorMessage = (email) => {
  const result = validateEmail(email);
  return result.error;
};

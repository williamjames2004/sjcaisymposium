/* =========================
   SIMPLE VALIDATION HELPERS
========================= */

// Strong Password Validation
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  
  if (password.length > 128) {
    return "Password must not exceed 128 characters";
  }
  
  if (/\s/.test(password)) {
    return "Password cannot contain spaces";
  }
  
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one special character (!@#$%^&*...)";
  }
  
  return null; // Valid
};

// Email Validation
const validateEmail = (email) => {
  if (!email) {
    return "Email is required";
  }
  
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address";
  }
  
  return null; // Valid
};

// Mobile Number Validation (Indian format)
const validateMobileNumber = (mobilenumber) => {
  if (!mobilenumber) {
    return "Mobile number is required";
  }
  
  const cleanNumber = String(mobilenumber).replace(/\D/g, '');
  const mobileRegex = /^[6-9]\d{9}$/;
  
  if (!mobileRegex.test(cleanNumber)) {
    return "Please enter a valid 10-digit mobile number starting with 6-9";
  }
  
  return null; // Valid
};

// Name Validation
const validateName = (name) => {
  if (!name || name.trim().length < 2) {
    return "Name must be at least 2 characters long";
  }
  
  if (name.trim().length > 100) {
    return "Name must not exceed 100 characters";
  }
  
  const nameRegex = /^[a-zA-Z\s.\-']+$/;
  
  if (!nameRegex.test(name.trim())) {
    return "Name can only contain letters, spaces, dots, and hyphens";
  }
  
  return null; // Valid
};

// Generic Field Validation
const validateField = (value, fieldName) => {
  if (!value || value.trim().length < 2) {
    return `${fieldName} must be at least 2 characters long`;
  }
  
  if (value.trim().length > 100) {
    return `${fieldName} must not exceed 100 characters`;
  }
  
  return null; // Valid
};

module.exports = {
  validatePassword,
  validateEmail,
  validateMobileNumber,
  validateName,
  validateField
};

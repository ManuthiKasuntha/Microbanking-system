// Keep these rules in sync with backend/middleware/validation.js and the DB CHECK constraints
export const PATTERNS = {
  nic: /^([0-9]{12}|[0-9]{9}V)$/,
  phone: /^\+?[0-9]{9,14}$/,
  email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  name: /^[A-Za-z][A-Za-z .'-]*$/,
  username: /^[A-Za-z0-9_.]+$/,
  password: /^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/,
};

export type FormErrors = Record<string, string>;

export const NIC_HINT = '12 digits, or 9 digits followed by V';

export const validateName = (value: string, label: string): string | undefined => {
  const v = value.trim();
  if (!v) return `${label} is required`;
  if (v.length < 2 || v.length > 50) return `${label} must be 2-50 characters`;
  if (!PATTERNS.name.test(v)) return `${label} can only contain letters, spaces, apostrophes and hyphens`;
  return undefined;
};

export const validateNic = (value: string): string | undefined => {
  const v = value.trim();
  if (!v) return 'NIC/Birth Certificate number is required';
  if (!PATTERNS.nic.test(v)) return `NIC must be ${NIC_HINT}`;
  return undefined;
};

export const validatePhone = (value: string, { required = true } = {}): string | undefined => {
  const v = value.trim();
  if (!v) return required ? 'Contact number is required' : undefined;
  if (!PATTERNS.phone.test(v)) return 'Use 9-14 digits, optionally starting with +';
  return undefined;
};

export const validateEmail = (value: string): string | undefined => {
  const v = value.trim();
  if (!v) return 'Email is required';
  if (!PATTERNS.email.test(v) || v.length > 50) return 'Enter a valid email address (max 50 characters)';
  return undefined;
};

export const validateAddress = (value: string): string | undefined => {
  const v = value.trim();
  if (!v) return 'Address is required';
  if (v.length < 5 || v.length > 100) return 'Address must be 5-100 characters';
  return undefined;
};

export const validatePassword = (value: string): string | undefined => {
  if (!value) return 'Password is required';
  if (!PATTERNS.password.test(value)) return 'Use at least 8 characters with a letter and a number';
  return undefined;
};

export const ageOn = (dateOfBirth: string, today = new Date()): number => {
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age;
};

export const validateDateOfBirth = (value: string, { minAge = 0 } = {}): string | undefined => {
  if (!value) return 'Date of birth is required';
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return 'Enter a valid date';
  if (dob > new Date()) return 'Date of birth cannot be in the future';
  if (dob.getFullYear() < 1900) return 'Date of birth is not realistic';
  if (minAge && ageOn(value) < minAge) return `Must be at least ${minAge} years old`;
  return undefined;
};

export interface ContactFields {
  contact_no_1: string;
  contact_no_2?: string;
  address: string;
  email: string;
}

export const validateContact = (data: ContactFields): FormErrors => {
  const errors: FormErrors = {};
  const entries: [keyof ContactFields, string | undefined][] = [
    ['contact_no_1', validatePhone(data.contact_no_1)],
    ['contact_no_2', validatePhone(data.contact_no_2 || '', { required: false })],
    ['address', validateAddress(data.address)],
    ['email', validateEmail(data.email)],
  ];
  for (const [field, error] of entries) if (error) errors[field] = error;
  return errors;
};

// Drops undefined entries so `Object.keys(errors).length === 0` means valid
export const collectErrors = (entries: Record<string, string | undefined>): FormErrors =>
  Object.fromEntries(Object.entries(entries).filter(([, v]) => v)) as FormErrors;

import {
  ageOn,
  collectErrors,
  validateContact,
  validateDateOfBirth,
  validateEmail,
  validateName,
  validateNic,
  validatePassword,
  validatePhone,
} from './validation';
import { confirmAction, subscribeToConfirms, subscribeToToasts, toast, ToastMessage } from './notify';

describe('validateNic', () => {
  it.each(['199012345678', '901234567V'])('accepts %s', (nic) => {
    expect(validateNic(nic)).toBeUndefined();
  });

  it.each(['', '12345', '901234567v', '19901234567X'])('rejects "%s"', (nic) => {
    expect(validateNic(nic)).toBeDefined();
  });
});

describe('validatePhone', () => {
  it('accepts local and international numbers', () => {
    expect(validatePhone('0771234567')).toBeUndefined();
    expect(validatePhone('+94771234567')).toBeUndefined();
  });

  it('rejects letters and short numbers', () => {
    expect(validatePhone('07712abc')).toBeDefined();
    expect(validatePhone('12345')).toBeDefined();
  });

  it('allows an empty optional number', () => {
    expect(validatePhone('', { required: false })).toBeUndefined();
    expect(validatePhone('')).toBeDefined();
  });
});

describe('validateName', () => {
  it('accepts common name formats', () => {
    expect(validateName("D'Silva", 'Last name')).toBeUndefined();
    expect(validateName('Jaya-Sekara', 'Last name')).toBeUndefined();
  });

  it('rejects digits and single letters', () => {
    expect(validateName('N1mal', 'First name')).toMatch(/only contain letters/);
    expect(validateName('A', 'First name')).toMatch(/2-50/);
  });
});

describe('validateEmail', () => {
  it('accepts a normal address and rejects malformed ones', () => {
    expect(validateEmail('nimal@example.com')).toBeUndefined();
    expect(validateEmail('nimal@example')).toBeDefined();
    expect(validateEmail(`${'a'.repeat(45)}@x.com`)).toBeDefined();
  });
});

describe('validatePassword', () => {
  it('requires 8+ characters with a letter and a number', () => {
    expect(validatePassword('Demo1234')).toBeUndefined();
    expect(validatePassword('password')).toBeDefined();
    expect(validatePassword('12345678')).toBeDefined();
    expect(validatePassword('Ab1')).toBeDefined();
  });
});

describe('dates of birth', () => {
  it('computes age correctly around birthdays', () => {
    expect(ageOn('2000-06-15', new Date('2026-06-14'))).toBe(25);
    expect(ageOn('2000-06-15', new Date('2026-06-15'))).toBe(26);
  });

  it('rejects future dates and enforces minimum age', () => {
    expect(validateDateOfBirth('2999-01-01')).toMatch(/future/);
    expect(validateDateOfBirth('2015-01-01', { minAge: 18 })).toMatch(/at least 18/);
    expect(validateDateOfBirth('1990-01-01', { minAge: 18 })).toBeUndefined();
  });
});

describe('validateContact', () => {
  it('returns one error per invalid field', () => {
    const errors = validateContact({ contact_no_1: 'x', contact_no_2: '', address: 'abc', email: 'bad' });
    expect(Object.keys(errors).sort()).toEqual(['address', 'contact_no_1', 'email']);
  });

  it('returns no errors for valid contact details', () => {
    const errors = validateContact({ contact_no_1: '0771234567', address: '12 Galle Road, Colombo', email: 'a@b.lk' });
    expect(errors).toEqual({});
  });
});

describe('collectErrors', () => {
  it('drops fields without an error', () => {
    expect(collectErrors({ a: undefined, b: 'bad' })).toEqual({ b: 'bad' });
  });
});

describe('notify', () => {
  it('delivers toasts to subscribers', () => {
    const received: ToastMessage[] = [];
    const unsubscribe = subscribeToToasts((t) => received.push(t));
    toast.success('Saved');
    toast.error('Failed');
    unsubscribe();
    toast.info('ignored');
    expect(received.map((t) => [t.kind, t.text])).toEqual([['success', 'Saved'], ['error', 'Failed']]);
  });

  it('resolves confirmations with the user choice', async () => {
    const unsubscribe = subscribeToConfirms((request) => request.resolve(request.danger === true));
    await expect(confirmAction('Delete?', { danger: true })).resolves.toBe(true);
    await expect(confirmAction('Continue?')).resolves.toBe(false);
    unsubscribe();
  });
});

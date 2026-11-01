const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' });

export const formatCurrency = (amount: number | string): string => currencyFormatter.format(Number(amount) || 0);

export const formatDate = (value: string, month: 'short' | 'long' = 'short'): string =>
  new Date(value).toLocaleDateString('en-US', { year: 'numeric', month, day: 'numeric' });

export const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

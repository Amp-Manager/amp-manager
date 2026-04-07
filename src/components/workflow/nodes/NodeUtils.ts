export const getStatusClasses = (status?: string) => {
  if (status === 'running') return 'ring-4 ring-indigo-500 animate-pulse';
  if (status === 'success') return 'ring-4 ring-green-500';
  if (status === 'error') return 'ring-4 ring-red-500';
  return '';
};

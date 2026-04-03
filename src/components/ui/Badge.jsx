const variants = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
  blue:   'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  gray:   'bg-gray-100 text-gray-600',
  orange: 'bg-orange-100 text-orange-800',
  teal:   'bg-teal-100 text-teal-800',
};

export function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant] || variants.gray} ${className}`}>
      {children}
    </span>
  );
}

// Map worker status → badge variant
export function statusVariant(status) {
  switch (status) {
    case 'Active':                  return 'green';
    case 'Pending':                 return 'yellow';
    case 'Wait List':               return 'blue';
    case 'Furlough':                return 'purple';
    case 'T/H':                     return 'teal';
    case 'Termed':                  return 'orange';
    case 'DNA':                     return 'red';
    case 'Inactive - No Response':  return 'gray';
    default:                        return 'gray';
  }
}

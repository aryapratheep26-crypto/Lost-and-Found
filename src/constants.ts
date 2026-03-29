
export const CATEGORIES = ['Phone', 'Wallet', 'Keys', 'Documents', 'Electronics', 'Bag', 'Jewelry', 'Other'];

export const POLICE_STATIONS = [
  { id: 'station-1', name: 'Central Police Station', lat: 37.42, lng: -122.08, address: '123 Main St, Central City' },
  { id: 'station-2', name: 'North District Station', lat: 37.45, lng: -122.10, address: '456 North Ave, North District' },
  { id: 'station-3', name: 'South Sector Police', lat: 37.38, lng: -122.05, address: '789 South Blvd, South Sector' },
];

export const ADMIN_EMAILS = ["aryapratheep26@gmail.com", "admin@police.gov", "ganga@police.com"];

export const isDefaultAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  return (
    ADMIN_EMAILS.includes(lowerEmail) ||
    lowerEmail.endsWith('@police.com') ||
    lowerEmail.endsWith('@police.gov')
  );
};

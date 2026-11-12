export interface Contact {
  _id?: string;
  username: string;
  email: string;
  telephone: { mobile: string; home: string };
}

export function emptyContact(): Contact {
  return { username: '', email: '', telephone: { mobile: '', home: '' } };
}

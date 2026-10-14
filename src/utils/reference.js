const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no I,L,O,U,0,1

export function generateBookingReference() {
  let out = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `BK-${out}`;
}
/**
 * Cryptographic utilities supporting SHA-256, salted hashes, and NIST Post-Quantum Cryptography simulation.
 */

export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateRandomHex(byteCount = 16): string {
  const arr = new Uint8Array(byteCount);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generate6DigitOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  // Ensure exactly 6 digits (100000 to 999999)
  const code = (100000 + (arr[0] % 900000)).toString();
  return code;
}

export interface PqcExecutionResult {
  kemAlgorithm: string;
  signatureAlgorithm: string;
  nistLevel: number;
  sharedSecretBytes: number;
  publicKeyHex: string;
  ciphertextSample: string;
  signatureHex: string;
  verified: boolean;
  executionStatus: string;
}

/**
 * Simulates NIST PQC ML-KEM key encapsulation and ML-DSA signature verification.
 */
export function simulatePqcExecution(risk: 'LOW' | 'MEDIUM' | 'HIGH'): PqcExecutionResult {
  let kem = 'ML-KEM-512';
  let sig = 'ML-DSA-44';
  let level = 1;
  let keyBytes = 800; // ML-KEM-512 pubkey ~800B

  if (risk === 'MEDIUM') {
    kem = 'ML-KEM-768';
    sig = 'ML-DSA-65';
    level = 3;
    keyBytes = 1184;
  } else if (risk === 'HIGH') {
    kem = 'ML-KEM-1024';
    sig = 'ML-DSA-87';
    level = 5;
    keyBytes = 1568;
  }

  const pubKey = `pqc_pk_${generateRandomHex(16)}`;
  const ciphertext = `pqc_ct_${generateRandomHex(24)}`;
  const signature = `pqc_sig_${generateRandomHex(32)}`;

  return {
    kemAlgorithm: kem,
    signatureAlgorithm: sig,
    nistLevel: level,
    sharedSecretBytes: 32,
    publicKeyHex: pubKey,
    ciphertextSample: ciphertext,
    signatureHex: signature,
    verified: true,
    executionStatus: `Adaptive NIST Post-Quantum Cryptex (${kem} / ${sig}) Verified`,
  };
}

export class CryptoService {
  private keyPair: CryptoKeyPair | null = null;
  private sharedKeys: Map<string, CryptoKey> = new Map();

  public async initialize(): Promise<string> {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('WebCrypto API desteklenmiyor.');
    }

    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    const exported = await window.crypto.subtle.exportKey('jwk', this.keyPair.publicKey);
    return JSON.stringify(exported);
  }

  public async deriveSharedKeyForPeer(peerId: string, peerPublicKeyJwk: string): Promise<CryptoKey> {
    if (!this.keyPair) {
      await this.initialize();
    }

    const importedPeerKey = await window.crypto.subtle.importKey(
      'jwk',
      JSON.parse(peerPublicKeyJwk),
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      []
    );

    const sharedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: importedPeerKey
      },
      this.keyPair!.privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );

    this.sharedKeys.set(peerId, sharedKey);
    return sharedKey;
  }

  public getSharedKey(peerId: string): CryptoKey | null {
    return this.sharedKeys.get(peerId) || null;
  }

  public removePeerKey(peerId: string): void {
    this.sharedKeys.delete(peerId);
  }

  public async encryptChunk(
    chunkBase64: string,
    key: CryptoKey
  ): Promise<{ cipher: string; iv: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(chunkBase64);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      dataBuffer
    );

    const cipherBytes = new Uint8Array(encryptedBuffer);
    let cipherBinary = '';
    for (let i = 0; i < cipherBytes.length; i++) {
      cipherBinary += String.fromCharCode(cipherBytes[i]);
    }
    const cipher = window.btoa(cipherBinary);

    let ivBinary = '';
    for (let i = 0; i < iv.length; i++) {
      ivBinary += String.fromCharCode(iv[i]);
    }
    const ivBase64 = window.btoa(ivBinary);

    return { cipher, iv: ivBase64 };
  }

  public async decryptChunk(
    cipherBase64: string,
    ivBase64: string,
    key: CryptoKey
  ): Promise<string> {
    const cipherBinary = window.atob(cipherBase64);
    const cipherBytes = new Uint8Array(cipherBinary.length);
    for (let i = 0; i < cipherBinary.length; i++) {
      cipherBytes[i] = cipherBinary.charCodeAt(i);
    }

    const ivBinary = window.atob(ivBase64);
    const ivBytes = new Uint8Array(ivBinary.length);
    for (let i = 0; i < ivBinary.length; i++) {
      ivBytes[i] = ivBinary.charCodeAt(i);
    }

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      key,
      cipherBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  public async encryptText(text: string, key: CryptoKey): Promise<{ cipher: string; iv: string }> {
    return this.encryptChunk(text, key);
  }

  public async decryptText(cipher: string, iv: string, key: CryptoKey): Promise<string> {
    return this.decryptChunk(cipher, iv, key);
  }
}

export const cryptoService = new CryptoService();

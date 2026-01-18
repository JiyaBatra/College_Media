/**
 * Client-side Encryption Utilities
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * Browser-based encryption for end-to-end messaging.
 */

// Use Web Crypto API for browser-based encryption
const subtle = window.crypto.subtle;

class EncryptionUtils {

    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.localKeyStore = new Map();
    }

    /**
     * Generate new key pair for ECDH key exchange
     */
    async generateKeyPair() {
        try {
            const keyPair = await subtle.generateKey(
                {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                },
                true,
                ['deriveKey', 'deriveBits']
            );

            // Export public key
            const publicKeyBuffer = await subtle.exportKey('spki', keyPair.publicKey);
            const publicKey = this.arrayBufferToBase64(publicKeyBuffer);

            // Store private key locally
            const privateKeyBuffer = await subtle.exportKey('pkcs8', keyPair.privateKey);
            const privateKey = this.arrayBufferToBase64(privateKeyBuffer);

            return { publicKey, privateKey, keyPair };
        } catch (error) {
            console.error('[Encryption] Key generation error:', error);
            throw error;
        }
    }

    /**
     * Derive shared secret from key exchange
     */
    async deriveSharedKey(privateKey, otherPublicKey) {
        try {
            // Import private key
            const privateKeyBuffer = this.base64ToArrayBuffer(privateKey);
            const importedPrivateKey = await subtle.importKey(
                'pkcs8',
                privateKeyBuffer,
                { name: 'ECDH', namedCurve: 'P-256' },
                false,
                ['deriveKey', 'deriveBits']
            );

            // Import public key
            const publicKeyBuffer = this.base64ToArrayBuffer(otherPublicKey);
            const importedPublicKey = await subtle.importKey(
                'spki',
                publicKeyBuffer,
                { name: 'ECDH', namedCurve: 'P-256' },
                false,
                []
            );

            // Derive shared key
            const sharedKey = await subtle.deriveKey(
                {
                    name: 'ECDH',
                    public: importedPublicKey
                },
                importedPrivateKey,
                {
                    name: this.algorithm,
                    length: this.keyLength
                },
                true,
                ['encrypt', 'decrypt']
            );

            return sharedKey;
        } catch (error) {
            console.error('[Encryption] Key derivation error:', error);
            throw error;
        }
    }

    /**
     * Generate random encryption key
     */
    async generateEncryptionKey() {
        try {
            const key = await subtle.generateKey(
                {
                    name: this.algorithm,
                    length: this.keyLength
                },
                true,
                ['encrypt', 'decrypt']
            );

            return key;
        } catch (error) {
            console.error('[Encryption] Key generation error:', error);
            throw error;
        }
    }

    /**
     * Export key to base64
     */
    async exportKey(key) {
        const exported = await subtle.exportKey('raw', key);
        return this.arrayBufferToBase64(exported);
    }

    /**
     * Import key from base64
     */
    async importKey(keyBase64) {
        const keyBuffer = this.base64ToArrayBuffer(keyBase64);
        return subtle.importKey(
            'raw',
            keyBuffer,
            { name: this.algorithm, length: this.keyLength },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt message
     */
    async encrypt(plaintext, key) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);

            const iv = window.crypto.getRandomValues(new Uint8Array(this.ivLength));

            const encrypted = await subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                data
            );

            return {
                encrypted: this.arrayBufferToBase64(encrypted),
                iv: this.arrayBufferToBase64(iv)
            };
        } catch (error) {
            console.error('[Encryption] Encrypt error:', error);
            throw error;
        }
    }

    /**
     * Decrypt message
     */
    async decrypt(encryptedData, key) {
        try {
            const encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);
            const iv = this.base64ToArrayBuffer(encryptedData.iv);

            const decrypted = await subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('[Encryption] Decrypt error:', error);
            throw error;
        }
    }

    /**
     * Store key for conversation
     */
    storeKey(conversationId, key) {
        this.localKeyStore.set(conversationId, key);

        // Also store in localStorage (encrypted with user's password)
        try {
            const keys = JSON.parse(localStorage.getItem('e2e_keys') || '{}');
            keys[conversationId] = { stored: true }; // Don't store actual key in localStorage
            localStorage.setItem('e2e_keys', JSON.stringify(keys));
        } catch (error) {
            console.error('[Encryption] Key storage error:', error);
        }
    }

    /**
     * Get key for conversation
     */
    getKey(conversationId) {
        return this.localKeyStore.get(conversationId);
    }

    /**
     * Check if key exists for conversation
     */
    hasKey(conversationId) {
        return this.localKeyStore.has(conversationId);
    }

    /**
     * Clear all keys
     */
    clearKeys() {
        this.localKeyStore.clear();
        localStorage.removeItem('e2e_keys');
    }

    // Utility functions

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Generate random ID
     */
    generateId() {
        return this.arrayBufferToBase64(
            window.crypto.getRandomValues(new Uint8Array(16))
        );
    }
}

export const encryption = new EncryptionUtils();
export default encryption;

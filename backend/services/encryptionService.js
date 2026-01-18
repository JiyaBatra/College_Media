/**
 * Encryption Service
 * Issue #933: Real-time WebSocket-Based Messaging with E2E Encryption
 * 
 * Server-side encryption utilities for message handling.
 */

const crypto = require('crypto');

class EncryptionService {

    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.authTagLength = 16;
        this.saltLength = 64;
        this.iterations = 100000;
    }

    /**
     * Generate a random encryption key
     */
    generateKey() {
        return crypto.randomBytes(this.keyLength).toString('base64');
    }

    /**
     * Generate initialization vector
     */
    generateIV() {
        return crypto.randomBytes(this.ivLength);
    }

    /**
     * Derive key from password
     */
    deriveKey(password, salt) {
        const saltBuffer = salt ? Buffer.from(salt, 'base64') : crypto.randomBytes(this.saltLength);

        const key = crypto.pbkdf2Sync(
            password,
            saltBuffer,
            this.iterations,
            this.keyLength,
            'sha512'
        );

        return {
            key,
            salt: saltBuffer.toString('base64')
        };
    }

    /**
     * Encrypt message content
     */
    encrypt(plaintext, key) {
        try {
            const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'base64') : key;
            const iv = this.generateIV();

            const cipher = crypto.createCipheriv(this.algorithm, keyBuffer, iv);

            let encrypted = cipher.update(plaintext, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            const authTag = cipher.getAuthTag();

            return {
                encrypted,
                iv: iv.toString('base64'),
                authTag: authTag.toString('base64'),
                algorithm: this.algorithm
            };
        } catch (error) {
            console.error('[Encryption] Encrypt error:', error);
            throw new Error('Encryption failed');
        }
    }

    /**
     * Decrypt message content
     */
    decrypt(encryptedData, key) {
        try {
            const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'base64') : key;
            const iv = Buffer.from(encryptedData.iv, 'base64');
            const authTag = Buffer.from(encryptedData.authTag, 'base64');

            const decipher = crypto.createDecipheriv(this.algorithm, keyBuffer, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('[Encryption] Decrypt error:', error);
            throw new Error('Decryption failed');
        }
    }

    /**
     * Generate RSA key pair for key exchange
     */
    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        return { publicKey, privateKey };
    }

    /**
     * Encrypt symmetric key with public key (for key exchange)
     */
    encryptWithPublicKey(data, publicKey) {
        try {
            const encrypted = crypto.publicEncrypt(
                {
                    key: publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(data)
            );

            return encrypted.toString('base64');
        } catch (error) {
            console.error('[Encryption] Public key encrypt error:', error);
            throw new Error('Key encryption failed');
        }
    }

    /**
     * Decrypt symmetric key with private key
     */
    decryptWithPrivateKey(encryptedData, privateKey) {
        try {
            const decrypted = crypto.privateDecrypt(
                {
                    key: privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(encryptedData, 'base64')
            );

            return decrypted.toString();
        } catch (error) {
            console.error('[Encryption] Private key decrypt error:', error);
            throw new Error('Key decryption failed');
        }
    }

    /**
     * Generate Diffie-Hellman key pair for E2E
     */
    generateDHKeyPair() {
        const ecdh = crypto.createECDH('prime256v1');
        ecdh.generateKeys();

        return {
            publicKey: ecdh.getPublicKey('base64'),
            privateKey: ecdh.getPrivateKey('base64')
        };
    }

    /**
     * Compute shared secret from DH exchange
     */
    computeSharedSecret(privateKey, otherPublicKey) {
        try {
            const ecdh = crypto.createECDH('prime256v1');
            ecdh.setPrivateKey(Buffer.from(privateKey, 'base64'));

            const sharedSecret = ecdh.computeSecret(Buffer.from(otherPublicKey, 'base64'));

            // Derive a key from the shared secret
            const derivedKey = crypto.createHash('sha256').update(sharedSecret).digest();

            return derivedKey.toString('base64');
        } catch (error) {
            console.error('[Encryption] Shared secret error:', error);
            throw new Error('Key exchange failed');
        }
    }

    /**
     * Hash message for integrity
     */
    hashMessage(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Generate secure random token
     */
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Create message signature
     */
    sign(message, privateKey) {
        const sign = crypto.createSign('SHA256');
        sign.update(message);
        return sign.sign(privateKey, 'base64');
    }

    /**
     * Verify message signature
     */
    verify(message, signature, publicKey) {
        const verify = crypto.createVerify('SHA256');
        verify.update(message);
        return verify.verify(publicKey, signature, 'base64');
    }
}

module.exports = new EncryptionService();

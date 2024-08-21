import hashlib
import hmac
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from base64 import urlsafe_b64encode, urlsafe_b64decode

from admyral.config.config import WEBHOOK_SIGNING_SECRET, SECRETS_ENCRYPTION_KEY


def _generate_hs256(secret: bytes, data: str) -> str:
    return hmac.new(secret, data.encode(), hashlib.sha256).hexdigest()


def generate_hs256(data: str) -> str:
    return _generate_hs256(WEBHOOK_SIGNING_SECRET, data)


def encrypt_aes256_gcm(secret_key: bytes, plaintext: str) -> str:
    # Generate a random 96-bit IV (Initialization Vector)
    iv = os.urandom(12)

    # Create AES-GCM cipher object
    aes_gcm = AESGCM(secret_key)

    # Encrypt the plaintext and get the associated ciphertext
    ciphertext = aes_gcm.encrypt(iv, plaintext.encode(), None)

    # Concatenate IV and ciphertext and encode to base64
    iv_ciphertext = iv + ciphertext
    iv_ciphertext_b64 = urlsafe_b64encode(iv_ciphertext)

    return iv_ciphertext_b64.decode()


def encrypt_secret(plaintext: str) -> str:
    return encrypt_aes256_gcm(SECRETS_ENCRYPTION_KEY, plaintext)


def decrypt_aes256_gcm(secret_key: bytes, iv_ciphertext_b64: str) -> str:
    # Decode the base64 encoded IV and ciphertext
    iv_ciphertext = urlsafe_b64decode(iv_ciphertext_b64)

    # Extract the IV (first 12 bytes) and the ciphertext
    iv = iv_ciphertext[:12]
    ciphertext = iv_ciphertext[12:]

    # Create AES-GCM cipher object
    aes_gcm = AESGCM(secret_key)

    # Decrypt the ciphertext
    plaintext = aes_gcm.decrypt(iv, ciphertext, None)

    return plaintext.decode()


def decrypt_secret(ciphertext: str) -> str:
    return decrypt_aes256_gcm(SECRETS_ENCRYPTION_KEY, ciphertext)

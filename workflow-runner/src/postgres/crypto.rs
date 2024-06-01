use aes_gcm::{
    aead::{Aead, AeadCore, AeadMut, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use anyhow::{anyhow, Result};
use async_once::AsyncOnce;
use lazy_static::lazy_static;

lazy_static! {
    static ref CREDENTIALS_SECRET: AsyncOnce<[u8; 32]> = AsyncOnce::new(async {
        let secret = std::env::var("CREDENTIALS_SECRET")
            .expect("Missing environment variable CREDENTIALS_SECRET");
        let mut result = [0; 32];
        hex::decode_to_slice(&secret, &mut result)
            .expect("CREDENTIALS_SECRET not a valid hex string!");
        result
    });
}

fn decrypt_aes256_gcm_impl(cipher_in_hex: &str, key: &[u8; 32]) -> Result<String> {
    const AES_256_GCM_KEY_LEN: usize = 32;
    assert_eq!(key.len(), AES_256_GCM_KEY_LEN);

    let num_bytes = cipher_in_hex.len() / 2;
    let mut cipher_bytes = vec![0 as u8; num_bytes];
    hex::decode_to_slice(cipher_in_hex, &mut cipher_bytes[..])?;

    // Extract nonce
    const NONCE_NUM_BYTES: usize = 12;
    let raw_nonce = &cipher_bytes[..NONCE_NUM_BYTES];
    assert_eq!(raw_nonce.len(), NONCE_NUM_BYTES);
    let nonce = Nonce::from_slice(raw_nonce);

    // Extract ciphertext
    let ciphertext = &cipher_bytes[NONCE_NUM_BYTES..];

    let key: &Key<Aes256Gcm> = key.into();
    let cipher = Aes256Gcm::new(key);

    let message = cipher.decrypt(nonce, ciphertext).map_err(|e| {
        tracing::error!("Failed to decrypt: {e}");
        anyhow!(e)
    })?;
    let message = String::from_utf8(message)?;

    Ok(message)
}

pub async fn decrypt_aes256_gcm(cipher_in_hex: &str) -> Result<String> {
    decrypt_aes256_gcm_impl(cipher_in_hex, CREDENTIALS_SECRET.get().await)
}

fn encrypt_aes256_gcm_impl(message: &str, key: &[u8; 32]) -> Result<String> {
    const AES_256_GCM_KEY_LEN: usize = 32;
    assert_eq!(key.len(), AES_256_GCM_KEY_LEN);

    let key: &Key<Aes256Gcm> = key.into();
    let cipher = Aes256Gcm::new(key);

    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, message.as_bytes())
        .map_err(|e| anyhow!(e))?;

    // nonce|ciphertext|tag
    let mut result = nonce.to_vec();
    result.extend(ciphertext.iter());

    Ok(hex::encode(result))
}

pub async fn encrypt_aes256_gcm(message: &str) -> Result<String> {
    encrypt_aes256_gcm_impl(message, CREDENTIALS_SECRET.get().await)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decrypt() {
        let cipher = "c559435bf727d348d196126f72956846eca6067b59c8edc71f8194b507693dbec2fadc15a0effe77089cc218";
        let secret = "5c9997afdd1a5aff0dafbb268ce432894226736ac833b912b0e3705688a99882";
        let mut key = [0; 32];
        hex::decode_to_slice(secret, &mut key).unwrap();

        let expected = "hello what's up?";

        let result = decrypt_aes256_gcm_impl(cipher, &key).expect("should not fail");
        assert_eq!(&result, expected);
    }

    #[test]
    fn test_encrypt_decrypt() {
        let message = "hello what's up?";
        let secret = "5c9997afdd1a5aff0dafbb268ce432894226736ac833b912b0e3705688a99882";
        let mut key = [0; 32];
        hex::decode_to_slice(secret, &mut key).unwrap();

        let encrypted = encrypt_aes256_gcm_impl(message, &key).expect("should not fail");
        let decrypted = decrypt_aes256_gcm_impl(&encrypted, &key).expect("should not fail");

        assert_eq!(decrypted, message);
    }
}

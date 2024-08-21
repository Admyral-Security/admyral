from admyral.utils.crypto import encrypt_aes256_gcm, decrypt_aes256_gcm, _generate_hs256


TEST_SECRET = bytes.fromhex("834f01cf391c972f1e6def3d7f315f8194bb10048e5cf282aa4cba63b239d8fb")


def test_encrypt_decrypt():
    msg = "this is my encrypted message - hello world!"
    ciphertext = encrypt_aes256_gcm(TEST_SECRET, "this is my encrypted message - hello world!")
    deciphered = decrypt_aes256_gcm(TEST_SECRET, ciphertext)
    assert deciphered == msg


def test_hs256():
    h = _generate_hs256(TEST_SECRET, "this is my securely hashed message - hello world!")
    assert h is not None

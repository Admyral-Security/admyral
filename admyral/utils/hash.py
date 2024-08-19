from hashlib import sha256


def calculate_sha256(s: str) -> str:
    return sha256(s.encode()).hexdigest()

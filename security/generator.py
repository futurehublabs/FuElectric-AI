import secrets
import string


def generate_strong_password(length: int = 16) -> str:

    if length < 12:
        length = 12

    characters = (
        string.ascii_letters
        + string.digits
        + "!@#$%^&*"
    )

    password = "".join(
        secrets.choice(characters)
        for _ in range(length)
    )

    return password
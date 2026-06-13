import random
import string

# Exclude visually-ambiguous characters (0/O, 1/I/l)
SAFE_CHARS = "".join(
    c for c in (string.ascii_uppercase + string.digits)
    if c not in "0O1I"
)


def generate_captcha(length=5):
    """Generate a random alphanumeric CAPTCHA string."""
    return "".join(random.choice(SAFE_CHARS) for _ in range(length))

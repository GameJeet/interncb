import time
from flask import session

# Global in-memory stores (reset when the Flask app restarts)
ACCOUNT_FAILURES = {}   # username -> consecutive failed attempt count
ACCOUNT_LOCKS = {}      # username -> unix timestamp when lock expires


def is_account_locked(username):
    """Return True if the given account is currently locked."""
    if not username:
        return False

    unlock_time = ACCOUNT_LOCKS.get(username)
    if unlock_time is None:
        return False

    if time.time() < unlock_time:
        return True

    # Lock has expired -> clean up
    ACCOUNT_LOCKS.pop(username, None)
    ACCOUNT_FAILURES[username] = 0
    return False


def get_lockout_remaining(username):
    """Return remaining lockout time in whole seconds (0 if not locked)."""
    unlock_time = ACCOUNT_LOCKS.get(username)
    if not unlock_time:
        return 0
    return max(0, int(unlock_time - time.time()))


def register_failure(username, threshold, lock_seconds):
    """
    Register a failed login attempt for an account.
    If the number of consecutive failures reaches `threshold`,
    lock the account for `lock_seconds` and return True.
    """
    if not username:
        return False

    ACCOUNT_FAILURES[username] = ACCOUNT_FAILURES.get(username, 0) + 1

    if ACCOUNT_FAILURES[username] >= threshold:
        ACCOUNT_LOCKS[username] = time.time() + lock_seconds
        ACCOUNT_FAILURES[username] = 0
        return True

    return False


def reset_failures(username):
    """Clear failure counters/locks for a username (called on success)."""
    if username:
        ACCOUNT_FAILURES[username] = 0
        ACCOUNT_LOCKS.pop(username, None)


def is_rate_limited():
    """Return True if the current session is under a rate-limit cooldown."""
    until = session.get("rate_limit_until")
    if until and time.time() < until:
        return True
    return False


def set_rate_limit(seconds):
    """Place the current session under a rate-limit cooldown."""
    session["rate_limit_until"] = time.time() + seconds


def get_ratelimit_remaining():
    """Return remaining rate-limit cooldown time in whole seconds."""
    until = session.get("rate_limit_until", 0)
    return max(0, int(until - time.time()))

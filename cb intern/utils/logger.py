from datetime import datetime

# In-memory log store (most recent first)
LOGS = []

# In-memory statistics counters for the dashboard
STATS = {
    "total_attempts": 0,
    "successful_logins": 0,
    "failed_logins": 0,
    "accounts_locked": 0,
    "captcha_triggers": 0,
    "dictionary_attacks": 0,
    "brute_force_attacks": 0,
}

MAX_LOGS = 500


def add_log(username, event_type, result):
    """Add a new entry to the attack/event log."""
    LOGS.insert(0, {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "username": username or "unknown",
        "event": event_type,
        "result": result,
    })
    if len(LOGS) > MAX_LOGS:
        LOGS.pop()


def get_logs(search="", event_filter=""):
    """Return logs, optionally filtered by a search term and/or event type."""
    results = LOGS

    if search:
        s = search.lower()
        results = [
            log for log in results
            if s in log["username"].lower()
            or s in log["event"].lower()
            or s in log["result"].lower()
            or s in log["timestamp"].lower()
        ]

    if event_filter:
        results = [log for log in results if log["event"] == event_filter]

    return results


def clear_logs():
    """Remove all log entries."""
    LOGS.clear()


def increment_stat(key, amount=1):
    """Increment a named statistic counter."""
    if key in STATS:
        STATS[key] += amount


def get_stats():
    """Return the current statistics dictionary."""
    return STATS


def get_event_types():
    """Return a sorted list of unique event types currently in the logs."""
    return sorted({log["event"] for log in LOGS})

import csv
import io

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, Response

from utils.captcha import generate_captcha
from utils.attacks import WORDLIST, BRUTE_FORCE_LIST, run_dictionary_attack, run_brute_force
from utils.defenses import (
    is_account_locked,
    get_lockout_remaining,
    register_failure,
    reset_failures,
    is_rate_limited,
    set_rate_limit,
    get_ratelimit_remaining,
)
from utils.logger import add_log, get_logs, clear_logs, get_stats, increment_stat, get_event_types


app = Flask(__name__)
app.secret_key = "authlab-lite-demo-secret-key"  # Demo only - not for production

 
# Demo accounts (in-memory only - NO DATABASE)
 
USERS = {
    "admin": "Admin@123",
    "student": "Student@123",
    "intern": "Intern@123",
}

 
# Security policy constants
 
CAPTCHA_THRESHOLD = 3          # show CAPTCHA after this many failed attempts
RATE_LIMIT_THRESHOLD = 5       # cooldown after this many failed attempts (session)
RATE_LIMIT_SECONDS = 30        # cooldown duration
ACCOUNT_LOCK_THRESHOLD = 5     # lock account after this many consecutive failures
ACCOUNT_LOCK_SECONDS = 120     # account lock duration (2 minutes)


@app.context_processor
def inject_globals():
    """Make the current user available to every template."""
    return dict(current_user=session.get("user"))


 
# Core pages
 
@app.route("/")
def index():
    if session.get("user"):
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        captcha_input = request.form.get("captcha", "").strip()

        # 1) Account lockout check (defensive control #6)
        if is_account_locked(username):
            remaining = get_lockout_remaining(username)
            error = (
                "Account temporarily locked due to suspicious activity. "
                f"Try again in {remaining} seconds."
            )
            add_log(username or "unknown", "Account Lockout", "Blocked - account locked")

        # 2) Rate limiting check (defensive control #5)
        elif is_rate_limited():
            remaining = get_ratelimit_remaining()
            error = f"Too many attempts. Please wait {remaining} seconds."

        else:
            # 3) CAPTCHA check (defensive control #7)
            captcha_ok = True
            if session.get("show_captcha"):
                expected = session.get("captcha_text", "")
                if captcha_input.upper() != expected.upper():
                    captcha_ok = False
                    error = "Incorrect CAPTCHA verification. Please try again."
                    add_log(username or "unknown", "CAPTCHA Triggered", "Verification failed")
                    session["captcha_text"] = generate_captcha()

            if captcha_ok:
                # 4) Credential check against demo users (NO DATABASE)
                if username in USERS and USERS[username] == password:
                    session.clear()
                    session["user"] = username
                    reset_failures(username)

                    add_log(username, "Successful Login", "Success")
                    increment_stat("successful_logins")
                    increment_stat("total_attempts")

                    return redirect(url_for("dashboard"))

                # --- Failed login ---
                add_log(username or "unknown", "Failed Login", "Failure")
                increment_stat("failed_logins")
                increment_stat("total_attempts")

                session["failed_attempts"] = session.get("failed_attempts", 0) + 1

                # Per-account lockout tracking
                if username:
                    locked_now = register_failure(
                        username, ACCOUNT_LOCK_THRESHOLD, ACCOUNT_LOCK_SECONDS
                    )
                    if locked_now:
                        add_log(username, "Account Lockout", "Account locked for 2 minutes")
                        increment_stat("accounts_locked")
                        error = "Account temporarily locked due to suspicious activity."

                if not error:
                    if session["failed_attempts"] >= RATE_LIMIT_THRESHOLD:
                        set_rate_limit(RATE_LIMIT_SECONDS)
                        session["failed_attempts"] = 0
                        error = f"Too many attempts. Please wait {RATE_LIMIT_SECONDS} seconds."
                    elif session["failed_attempts"] >= CAPTCHA_THRESHOLD:
                        if not session.get("show_captcha"):
                            add_log(username or "unknown", "CAPTCHA Triggered", "Required after repeated failures")
                            increment_stat("captcha_triggers")
                        session["show_captcha"] = True
                        session["captcha_text"] = generate_captcha()
                        error = "Invalid username or password."
                    else:
                        error = "Invalid username or password."

    # Build template context
    show_captcha = bool(session.get("show_captcha"))
    captcha_text = session.get("captcha_text") if show_captcha else None
    rate_limited = is_rate_limited()
    rate_remaining = get_ratelimit_remaining() if rate_limited else 0

    return render_template(
        "login.html",
        error=error,
        show_captcha=show_captcha,
        captcha_text=captcha_text,
        rate_limited=rate_limited,
        rate_remaining=rate_remaining,
    )


@app.route("/api/captcha/refresh")
def refresh_captcha():
    """Generate a new CAPTCHA string and store it in the session."""
    session["captcha_text"] = generate_captcha()
    return jsonify({"captcha": session["captcha_text"]})


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/dashboard")
def dashboard():
    if not session.get("user"):
        return redirect(url_for("login"))
    return render_template("dashboard.html")


@app.route("/attacks")
def attacks_page():
    if not session.get("user"):
        return redirect(url_for("login"))
    return render_template(
        "attacks.html",
        demo_users=list(USERS.keys()),
        wordlist=WORDLIST,
        bruteforce_list=BRUTE_FORCE_LIST,
    )


@app.route("/logs")
def logs_page():
    if not session.get("user"):
        return redirect(url_for("login"))
    return render_template("logs.html", event_types=get_event_types())


 
# JSON API endpoints (used by static/js/*.js)
 
@app.route("/api/dictionary-attack", methods=["POST"])
def api_dictionary_attack():
    if not session.get("user"):
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    target = data.get("username", "")

    if target not in USERS:
        return jsonify({"error": "invalid target"}), 400

    add_log(target, "Dictionary Attack Simulation", "Started")
    increment_stat("dictionary_attacks")

    result = run_dictionary_attack(target, USERS)

    add_log(
        target,
        "Dictionary Attack Simulation",
        "Credentials found" if result["cracked"] else "No match found",
    )

    return jsonify(result)


@app.route("/api/brute-force", methods=["POST"])
def api_brute_force():
    if not session.get("user"):
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    target = data.get("username", "")

    if target not in USERS:
        return jsonify({"error": "invalid target"}), 400

    add_log(target, "Brute-force Simulation Started", "Started")
    increment_stat("brute_force_attacks")

    result = run_brute_force(target, USERS)

    add_log(
        target,
        "Brute-force Simulation Stopped",
        "Credentials found" if result["cracked"] else "No match found",
    )

    return jsonify(result)


@app.route("/api/logs")
def api_logs():
    if not session.get("user"):
        return jsonify({"error": "unauthorized"}), 401

    search = request.args.get("search", "")
    event_filter = request.args.get("event", "")
    return jsonify({
        "logs": get_logs(search, event_filter),
        "event_types": get_event_types(),
    })


@app.route("/api/logs/clear", methods=["POST"])
def api_logs_clear():
    if not session.get("user"):
        return jsonify({"error": "unauthorized"}), 401
    clear_logs()
    return jsonify({"status": "cleared"})


@app.route("/api/logs/export")
def api_logs_export():
    if not session.get("user"):
        return jsonify({"error": "unauthorized"}), 401

    search = request.args.get("search", "")
    event_filter = request.args.get("event", "")
    logs = get_logs(search, event_filter)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Timestamp", "Username", "Event", "Result"])
    for log in logs:
        writer.writerow([log["timestamp"], log["username"], log["event"], log["result"]])

    csv_data = buffer.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=authlab_logs.csv"},
    )


@app.route("/api/stats")
def api_stats():
    if not session.get("user"):
        return jsonify({"error": "unauthorized"}), 401
    stats = dict(get_stats())
    stats["threat_score"] = (
        stats.get("failed_logins", 0) * 1
        + stats.get("captcha_triggers", 0) * 2
        + stats.get("accounts_locked", 0) * 6
        + stats.get("dictionary_attacks", 0) * 3
        + stats.get("brute_force_attacks", 0) * 3
    )
    return jsonify(stats)


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
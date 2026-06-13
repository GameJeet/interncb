# Internal wordlist used for the Dictionary Attack Simulator
WORDLIST = [
    "password",
    "password123",
    "welcome",
    "admin123",
    "qwerty",
    "123456",
    "letmein",
    "123456789",
    "12345678",
    "abc123",
    "iloveyou",
    "monkey",
    "dragon",
    "111111",
    "123123",
    "admin",
    "root",
    "test",
    "user",
    "login",
    "passw0rd",
    "master",
    "hello",
    "freedom",
    "whatever",
    "qazwsx",
    "trustno1",
    "654321",
    "superman",
    "1q2w3e4r",
    "sunshine",
    "princess",
    "football",
    "baseball",
    "starwars",
    "welcome1",
    "zaq12wsx",
    "password1",
    "1234",
    "000000",
    "Student@123",
    "Intern@123",
    "Admin@123"
]


# Extended candidate list used for the Brute Force Demonstration.
# This purposefully includes near-miss and correct demo passwords so
# the simulation can "succeed" against the weak demo accounts.
BRUTE_FORCE_LIST = [
    "aaaaaa", "aaaaab", "aaaaac", "111111", "123123", "abc123",
    "letmein1", "qwerty123", "password1", "Welcome1", "Pass@1234", "Test@1234", "P@ssw0rd",
    "qwerty", "iloveyou", "sunshine", "princess", "dragon",
    "football", "baseball", "superman", "starwars", "monkey",
    "trustno1", "654321", "zaq12wsx", "hello123", "freedom1",
    "master123", "login123", "root123", "user123", "system123",
    "welcome123", "admin2024", "admin2025", "admin2026",
    "India@123", "India@2024", "India@2025", "India@2026",
    "Test@2024", "Test@2025", "Test@2026",
    "Password@123", "Password@2024", "Password@2025",
    "qwertyuiop", "asdfgh", "zxcvbn", "1q2w3e4r", "1qaz2wsx",
    "Student@123", "Intern@123", "Admin@123"
]



def run_dictionary_attack(username, users):

    attempts = []
    cracked = False
    actual_password = users.get(username)

    for pwd in WORDLIST:
        success = actual_password is not None and pwd == actual_password
        attempts.append({"password": pwd, "success": success})
        if success:
            cracked = True
            break

    return {
        "username": username,
        "attempts": attempts,
        "cracked": cracked,
        "total_tried": len(attempts),
    }


def run_brute_force(username, users):

    attempts = []
    cracked = False
    actual_password = users.get(username)

    candidates = BRUTE_FORCE_LIST.copy()
    if actual_password and actual_password not in candidates:
        candidates.append(actual_password)

    for pwd in candidates:
        success = actual_password is not None and pwd == actual_password
        attempts.append({"password": pwd, "success": success})
        if success:
            cracked = True
            break

    return {
        "username": username,
        "attempts": attempts,
        "cracked": cracked,
        "total_tried": len(attempts),
    }

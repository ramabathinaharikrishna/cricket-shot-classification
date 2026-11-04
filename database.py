"""
database.py
===========
Run ONCE to create database, all tables, and seed demo accounts.
Make sure XAMPP MySQL is running first.

    python database.py
"""

import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash

DB_HOST     = "localhost"
DB_USER     = "root"
DB_PASSWORD = ""
DB_NAME     = "cricket_shot_db"

TABLES = {
    "users": """
        CREATE TABLE IF NOT EXISTS users (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            full_name    VARCHAR(150) NOT NULL,
            email        VARCHAR(180) NOT NULL UNIQUE,
            password     VARCHAR(512) NOT NULL,
            role         ENUM('admin','coach','player') NOT NULL DEFAULT 'player',
            coach_code   VARCHAR(20)  DEFAULT NULL,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """,
    "coach_players": """
        CREATE TABLE IF NOT EXISTS coach_players (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            coach_id    INT NOT NULL,
            player_id   INT NOT NULL,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (coach_id)  REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY uq_cp (coach_id, player_id)
        );
    """,
    "predictions": """
        CREATE TABLE IF NOT EXISTS predictions (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            user_id           INT NOT NULL,
            mean_acc_x        FLOAT NOT NULL,
            mean_acc_y        FLOAT NOT NULL,
            mean_acc_z        FLOAT NOT NULL,
            std_acc_x         FLOAT NOT NULL,
            std_acc_y         FLOAT NOT NULL,
            std_acc_z         FLOAT NOT NULL,
            mean_gyro_x       FLOAT NOT NULL,
            mean_gyro_y       FLOAT NOT NULL,
            mean_gyro_z       FLOAT NOT NULL,
            std_gyro_x        FLOAT NOT NULL,
            std_gyro_y        FLOAT NOT NULL,
            std_gyro_z        FLOAT NOT NULL,
            max_acc_magnitude FLOAT NOT NULL,
            min_acc_magnitude FLOAT NOT NULL,
            peak_angular_vel  FLOAT NOT NULL,
            predicted_shot    VARCHAR(60) NOT NULL,
            confidence        FLOAT NOT NULL,
            model_used        VARCHAR(40) NOT NULL,
            dt_prediction     VARCHAR(60),
            rf_prediction     VARCHAR(60),
            svm_prediction    VARCHAR(60),
            knn_prediction    VARCHAR(60),
            created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """,
    "feedback": """
        CREATE TABLE IF NOT EXISTS feedback (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            prediction_id INT NOT NULL,
            user_id       INT NOT NULL,
            actual_shot   VARCHAR(60),
            rating        TINYINT,
            comments      TEXT,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prediction_id) REFERENCES predictions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE
        );
    """,
    "app_config": """
        CREATE TABLE IF NOT EXISTS app_config (
            config_key   VARCHAR(80) PRIMARY KEY,
            config_value VARCHAR(255) NOT NULL
        );
    """,
}

COACH_SECRET = "COACH2024"

SEED_ACCOUNTS = [
    ("Administrator", "admin@cricket.com",  "admin123",  "admin",  None),
    ("Demo Coach",    "coach@cricket.com",  "coach123",  "coach",  "TCH-0001"),
    ("Demo Player",   "player@cricket.com", "player123", "player", None),
]


def run():
    try:
        conn = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD)
        cur  = conn.cursor()

        cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        cur.execute(f"USE {DB_NAME};")
        print(f"[OK] Database '{DB_NAME}' ready.\n")

        for tname, ddl in TABLES.items():
            cur.execute(ddl)
            print(f"[OK] Table '{tname}' created / verified.")
        conn.commit()

        # Add coach_code column if it doesn't exist (for upgrades)
        try:
            cur.execute("ALTER TABLE users ADD COLUMN coach_code VARCHAR(20) DEFAULT NULL;")
            conn.commit()
            print("[OK] Added coach_code column to users table.")
        except Exception:
            pass  # Column already exists

        print("\n--- Seeding accounts ---")
        for full_name, email, raw_pwd, role, coach_code in SEED_ACCOUNTS:
            cur.execute("DELETE FROM users WHERE email = %s", (email,))
            hashed = generate_password_hash(raw_pwd, method="pbkdf2:sha256")
            cur.execute(
                "INSERT INTO users (full_name, email, password, role, coach_code) VALUES (%s,%s,%s,%s,%s)",
                (full_name, email, hashed, role, coach_code)
            )
            code_str = f"  code: {coach_code}" if coach_code else ""
            print(f"  [{role.upper():<7}]  {email:<32} password: {raw_pwd}{code_str}")
        conn.commit()

        # Seed app config
        cur.execute("""
            INSERT INTO app_config (config_key, config_value)
            VALUES ('coach_secret', %s)
            ON DUPLICATE KEY UPDATE config_value = %s
        """, (COACH_SECRET, COACH_SECRET))
        conn.commit()

        cur.close()
        conn.close()

        print("\n" + "="*55)
        print("  DATABASE SETUP COMPLETE")
        print("="*55)
        print("  Admin  → admin@cricket.com   / admin123")
        print("  Coach  → coach@cricket.com   / coach123  (TCH-0001)")
        print("  Player → player@cricket.com  / player123")
        print(f"  Coach registration code: {COACH_SECRET}")
        print("="*55)
        print("\n  Next: python train_model.py  →  python app.py\n")

    except Error as e:
        print(f"\n[ERROR] {e}")
        print("  → Make sure XAMPP MySQL is running on port 3306.\n")


if __name__ == "__main__":
    run()
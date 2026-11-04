"""
app.py — Smart Cricket Shot Classification System
"""
import os, joblib, numpy as np
from functools import wraps
from flask import (Flask, render_template, request, redirect,
                   url_for, session, flash, jsonify)
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
app.secret_key = "cricket_shot_secret_2024_xK9pL#mQ"
app.config["PERMANENT_SESSION_LIFETIME"] = 86400
app.config["SESSION_COOKIE_SAMESITE"]    = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"]    = True

# ── DB CONFIG ─────────────────────────────────────────────────
DB_CFG = dict(host="localhost", user="root", password="", database="cricket_shot_db")
COACH_SECRET_DEFAULT = "COACH2024"

def get_db():
    return mysql.connector.connect(**DB_CFG)

def qdb(sql, params=(), one=False, commit=False):
    conn = None
    try:
        conn = get_db()
        cur  = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        if commit:
            conn.commit()
            return cur.lastrowid
        return cur.fetchone() if one else cur.fetchall()
    except Error as e:
        print(f"[DB] {e}")
        return None if one else []
    finally:
        if conn and conn.is_connected():
            conn.close()

def get_coach_secret():
    row = qdb("SELECT config_value FROM app_config WHERE config_key='coach_secret'", one=True)
    return row["config_value"] if row else COACH_SECRET_DEFAULT

def generate_coach_code():
    """Auto-generate next TCH-XXXX code."""
    row = qdb(
        "SELECT coach_code FROM users WHERE coach_code IS NOT NULL ORDER BY id DESC LIMIT 1",
        one=True
    )
    if row and row["coach_code"]:
        try:
            num = int(row["coach_code"].split("-")[1]) + 1
        except Exception:
            num = 1
    else:
        num = 1
    return f"TCH-{num:04d}"

# ── MODELS ────────────────────────────────────────────────────
MODELS, SCALER, SHOTS, FEAT_NAMES, TRAIN_RES = {}, None, [], [], {}

def load_models():
    global MODELS, SCALER, SHOTS, FEAT_NAMES, TRAIN_RES
    try:
        MODELS = {
            "Decision Tree": joblib.load("models/decision_tree.pkl"),
            "Random Forest": joblib.load("models/random_forest.pkl"),
            "SVM":           joblib.load("models/svm.pkl"),
            "KNN":           joblib.load("models/knn.pkl"),
        }
        SCALER     = joblib.load("models/scaler.pkl")
        SHOTS      = joblib.load("models/shots_labels.pkl")
        FEAT_NAMES = joblib.load("models/feature_names.pkl")
        TRAIN_RES  = joblib.load("models/training_results.pkl")
        print("[OK] Models loaded.")
    except FileNotFoundError:
        print("[!] Models missing — run train_model.py first.")

load_models()

# ── DECORATORS ────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def w(*a, **kw):
        if "uid" not in session:
            flash("Please log in first.", "warning")
            return redirect(url_for("login"))
        return f(*a, **kw)
    return w

def role_required(*roles):
    def dec(f):
        @wraps(f)
        def w(*a, **kw):
            if session.get("role") not in roles:
                session.clear()
                flash("Access denied.", "danger")
                return redirect(url_for("login"))
            return f(*a, **kw)
        return w
    return dec

def dash_for(role):
    return {"admin": "admin_dashboard",
            "coach": "coach_dashboard",
            "player": "player_dashboard"}.get(role)

# ═══════════════════════════════════════════════════════════════
# PUBLIC ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/")
def index():
    if "uid" in session:
        ep = dash_for(session.get("role"))
        if ep:
            return redirect(url_for(ep))
        session.clear()
    return render_template("index.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if "uid" in session:
        ep = dash_for(session.get("role"))
        if ep:
            return redirect(url_for(ep))
        session.clear()

    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        pwd   = request.form.get("password", "")

        if not email or not pwd:
            error = "Email and password are required."
        else:
            try:
                user = qdb("SELECT * FROM users WHERE email=%s", (email,), one=True)
            except Exception as e:
                error = "Database error. Make sure XAMPP MySQL is running."
                return render_template("login.html", error=error)

            if user and check_password_hash(user["password"], pwd):
                session.permanent = True
                session["uid"]       = user["id"]
                session["user_name"] = user["full_name"]
                session["role"]      = user["role"]
                session["coach_code"] = user.get("coach_code") or ""
                ep = dash_for(user["role"])
                return redirect(url_for(ep))
            else:
                error = "Invalid email or password."

    return render_template("login.html", error=error)


@app.route("/register", methods=["GET", "POST"])
def register():
    error = None
    if request.method == "POST":
        name   = request.form.get("full_name", "").strip()
        email  = request.form.get("email", "").strip().lower()
        pwd    = request.form.get("password", "")
        cpwd   = request.form.get("confirm_password", "")
        role   = request.form.get("role", "player")
        secret = request.form.get("secret_code", "").strip()

        if not all([name, email, pwd, cpwd]):
            error = "All fields are required."
        elif pwd != cpwd:
            error = "Passwords do not match."
        elif len(pwd) < 6:
            error = "Password must be at least 6 characters."
        elif role == "coach" and secret != get_coach_secret():
            error = "Invalid coach secret code."
        elif role == "admin":
            error = "Admin accounts cannot be self-registered."
        else:
            existing = qdb("SELECT id FROM users WHERE email=%s", (email,), one=True)
            if existing:
                error = "Email already registered."
            else:
                coach_code = generate_coach_code() if role == "coach" else None
                qdb(
                    "INSERT INTO users (full_name,email,password,role,coach_code) VALUES(%s,%s,%s,%s,%s)",
                    (name, email, generate_password_hash(pwd, method="pbkdf2:sha256"),
                     role, coach_code),
                    commit=True
                )
                flash("Account created! Please log in.", "success")
                return redirect(url_for("login"))

    return render_template("register.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out successfully.", "info")
    return redirect(url_for("login"))


# ═══════════════════════════════════════════════════════════════
# ADMIN ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/admin/dashboard")
@login_required
@role_required("admin")
def admin_dashboard():
    total_users   = (qdb("SELECT COUNT(*) c FROM users", one=True) or {}).get("c", 0)
    total_coaches = (qdb("SELECT COUNT(*) c FROM users WHERE role='coach'", one=True) or {}).get("c", 0)
    total_players = (qdb("SELECT COUNT(*) c FROM users WHERE role='player'", one=True) or {}).get("c", 0)
    total_preds   = (qdb("SELECT COUNT(*) c FROM predictions", one=True) or {}).get("c", 0)

    shot_dist  = qdb("SELECT predicted_shot, COUNT(*) cnt FROM predictions GROUP BY predicted_shot")
    model_accs = [{"model": k, "accuracy": v["accuracy"], "cv": v["cv_accuracy"]}
                  for k, v in TRAIN_RES.items()] if TRAIN_RES else []
    recent_preds = qdb("""
        SELECT p.*, u.full_name FROM predictions p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC LIMIT 10
    """)
    daily_data = qdb("""
        SELECT DATE(created_at) day, COUNT(*) cnt FROM predictions
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at) ORDER BY day
    """)

    return render_template("admin_dashboard.html",
        total_users=total_users, total_coaches=total_coaches,
        total_players=total_players, total_preds=total_preds,
        shot_dist=shot_dist, model_accs=model_accs,
        recent_preds=recent_preds, daily_data=daily_data)


@app.route("/admin/users")
@login_required
@role_required("admin")
def admin_users():
    users        = qdb("SELECT * FROM users ORDER BY role, created_at DESC")
    coach_secret = get_coach_secret()
    coaches      = [u for u in users if u["role"] == "coach"]
    return render_template("admin_users.html",
                           users=users,
                           coaches=coaches,
                           coach_secret=coach_secret)


@app.route("/admin/delete_user/<int:uid>", methods=["POST"])
@login_required
@role_required("admin")
def admin_delete_user(uid):
    if uid == session["uid"]:
        flash("Cannot delete your own account.", "danger")
    else:
        target = qdb("SELECT role FROM users WHERE id=%s", (uid,), one=True)
        if target and target["role"] == "admin":
            flash("Cannot delete admin accounts.", "danger")
        else:
            qdb("DELETE FROM users WHERE id=%s", (uid,), commit=True)
            flash("User deleted.", "success")
    return redirect(url_for("admin_users"))


@app.route("/admin/toggle_role/<int:uid>", methods=["POST"])
@login_required
@role_required("admin")
def admin_toggle_role(uid):
    new_role = request.form.get("role")
    if new_role not in ("coach", "player"):
        flash("Invalid role.", "danger")
        return redirect(url_for("admin_users"))

    user = qdb("SELECT * FROM users WHERE id=%s", (uid,), one=True)
    if not user:
        flash("User not found.", "danger")
        return redirect(url_for("admin_users"))

    # Assign coach code if upgrading to coach
    coach_code = user.get("coach_code")
    if new_role == "coach" and not coach_code:
        coach_code = generate_coach_code()

    # Remove coach code if downgrading to player
    if new_role == "player":
        coach_code = None

    qdb("UPDATE users SET role=%s, coach_code=%s WHERE id=%s",
        (new_role, coach_code, uid), commit=True)
    flash(f"Role updated to {new_role}.", "success")
    return redirect(url_for("admin_users"))


@app.route("/admin/predictions")
@login_required
@role_required("admin")
def admin_predictions():
    preds = qdb("""
        SELECT p.*, u.full_name, u.email FROM predictions p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
    """)
    return render_template("admin_predictions.html", preds=preds)


# ═══════════════════════════════════════════════════════════════
# COACH ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/coach/dashboard")
@login_required
@role_required("coach")
def coach_dashboard():
    cid = session["uid"]
    my_players = qdb("""
        SELECT u.id, u.full_name, u.email,
               COUNT(p.id) pred_count, MAX(p.created_at) last_active
        FROM coach_players cp
        JOIN users u ON cp.player_id = u.id
        LEFT JOIN predictions p ON p.user_id = u.id
        WHERE cp.coach_id = %s
        GROUP BY u.id, u.full_name, u.email
    """, (cid,))
    shot_dist = qdb("""
        SELECT p.predicted_shot, COUNT(*) cnt
        FROM predictions p
        JOIN coach_players cp ON cp.player_id = p.user_id
        WHERE cp.coach_id = %s
        GROUP BY p.predicted_shot
    """, (cid,))
    total_preds = (qdb("""
        SELECT COUNT(*) c FROM predictions p
        JOIN coach_players cp ON cp.player_id = p.user_id
        WHERE cp.coach_id = %s
    """, (cid,), one=True) or {}).get("c", 0)

    return render_template("coach_dashboard.html",
        my_players=my_players, shot_dist=shot_dist, total_preds=total_preds)


@app.route("/coach/players")
@login_required
@role_required("coach")
def coach_players():
    cid = session["uid"]
    all_players = qdb("""
        SELECT id, full_name, email FROM users
        WHERE role='player'
        AND id NOT IN (SELECT player_id FROM coach_players WHERE coach_id=%s)
    """, (cid,))
    my_players = qdb("""
        SELECT u.id, u.full_name, u.email, COUNT(p.id) pred_count
        FROM coach_players cp
        JOIN users u ON cp.player_id = u.id
        LEFT JOIN predictions p ON p.user_id = u.id
        WHERE cp.coach_id = %s
        GROUP BY u.id, u.full_name, u.email
    """, (cid,))
    return render_template("coach_players.html",
                           all_players=all_players, my_players=my_players)


@app.route("/coach/assign_player", methods=["POST"])
@login_required
@role_required("coach")
def coach_assign_player():
    qdb("INSERT IGNORE INTO coach_players (coach_id,player_id) VALUES(%s,%s)",
        (session["uid"], int(request.form.get("player_id"))), commit=True)
    flash("Player assigned.", "success")
    return redirect(url_for("coach_players"))


@app.route("/coach/remove_player/<int:player_id>", methods=["POST"])
@login_required
@role_required("coach")
def coach_remove_player(player_id):
    qdb("DELETE FROM coach_players WHERE coach_id=%s AND player_id=%s",
        (session["uid"], player_id), commit=True)
    flash("Player removed.", "info")
    return redirect(url_for("coach_players"))


@app.route("/coach/player_history/<int:player_id>")
@login_required
@role_required("coach")
def coach_player_history(player_id):
    if not qdb("SELECT id FROM coach_players WHERE coach_id=%s AND player_id=%s",
               (session["uid"], player_id), one=True):
        flash("Player not in your roster.", "danger")
        return redirect(url_for("coach_players"))
    player = qdb("SELECT * FROM users WHERE id=%s", (player_id,), one=True)
    preds  = qdb("SELECT * FROM predictions WHERE user_id=%s ORDER BY created_at DESC", (player_id,))
    return render_template("coach_player_history.html", player=player, preds=preds)


# ═══════════════════════════════════════════════════════════════
# PLAYER ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/player/dashboard")
@login_required
@role_required("player")
def player_dashboard():
    uid = session["uid"]
    total_shots = (qdb("SELECT COUNT(*) c FROM predictions WHERE user_id=%s", (uid,), one=True) or {}).get("c", 0)
    shot_dist   = qdb("SELECT predicted_shot, COUNT(*) cnt FROM predictions WHERE user_id=%s GROUP BY predicted_shot", (uid,))
    recent      = qdb("SELECT * FROM predictions WHERE user_id=%s ORDER BY created_at DESC LIMIT 5", (uid,))
    return render_template("player_dashboard.html",
                           total_shots=total_shots, shot_dist=shot_dist, recent=recent)


@app.route("/player/classify", methods=["GET", "POST"])
@login_required
@role_required("player")
def player_classify():
    result = None
    if request.method == "POST":
        if not MODELS:
            flash("Models not loaded. Run train_model.py first.", "danger")
            return render_template("classify.html", result=None,
                                   shots=SHOTS, model_names=list(MODELS.keys()))
        try:
            feat_keys = [
                "mean_acc_x","mean_acc_y","mean_acc_z",
                "std_acc_x","std_acc_y","std_acc_z",
                "mean_gyro_x","mean_gyro_y","mean_gyro_z",
                "std_gyro_x","std_gyro_y","std_gyro_z",
                "max_acc_magnitude","min_acc_magnitude","peak_angular_vel"
            ]
            features = [float(request.form[k]) for k in feat_keys]
        except (KeyError, ValueError):
            flash("Please fill all fields with valid numbers.", "danger")
            return render_template("classify.html", result=None,
                                   shots=SHOTS, model_names=list(MODELS.keys()))

        X_raw    = np.array(features).reshape(1, -1)
        X_scaled = SCALER.transform(X_raw)
        sel      = request.form.get("model_select", "Random Forest")

        # Run all 4 models
        individual = {}
        for mname, model in MODELS.items():
            Xin = X_scaled if mname in ("SVM", "KNN") else X_raw
            individual[mname] = SHOTS[model.predict(Xin)[0]]

        # Primary model result
        pm    = MODELS.get(sel, MODELS["Random Forest"])
        Xprim = X_scaled if sel in ("SVM", "KNN") else X_raw
        pidx  = pm.predict(Xprim)[0]
        label = SHOTS[pidx]

        if hasattr(pm, "predict_proba"):
            proba      = pm.predict_proba(Xprim)[0]
            conf       = round(float(proba[pidx]) * 100, 2)
            proba_dict = {SHOTS[i]: round(float(p) * 100, 2) for i, p in enumerate(proba)}
        else:
            conf       = 90.0
            proba_dict = {label: 90.0}

        qdb("""
            INSERT INTO predictions
            (user_id, mean_acc_x, mean_acc_y, mean_acc_z,
             std_acc_x, std_acc_y, std_acc_z,
             mean_gyro_x, mean_gyro_y, mean_gyro_z,
             std_gyro_x, std_gyro_y, std_gyro_z,
             max_acc_magnitude, min_acc_magnitude, peak_angular_vel,
             predicted_shot, confidence, model_used,
             dt_prediction, rf_prediction, svm_prediction, knn_prediction)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (session["uid"], *features, label, conf, sel,
              individual.get("Decision Tree"), individual.get("Random Forest"),
              individual.get("SVM"), individual.get("KNN")), commit=True)

        result = {"shot": label, "confidence": conf, "model": sel,
                  "all_models": individual, "proba": proba_dict}

    return render_template("classify.html", result=result,
                           shots=SHOTS, model_names=list(MODELS.keys()))


@app.route("/player/history")
@login_required
@role_required("player")
def player_history():
    preds = qdb("SELECT * FROM predictions WHERE user_id=%s ORDER BY created_at DESC",
                (session["uid"],))
    return render_template("player_history.html", preds=preds)


@app.route("/player/delete_prediction/<int:pid>", methods=["POST"])
@login_required
@role_required("player")
def player_delete_prediction(pid):
    qdb("DELETE FROM predictions WHERE id=%s AND user_id=%s",
        (pid, session["uid"]), commit=True)
    flash("Prediction deleted.", "info")
    return redirect(url_for("player_history"))


# ── API ───────────────────────────────────────────────────────
@app.route("/api/model_accuracy")
@login_required
def api_model_accuracy():
    return jsonify(TRAIN_RES)


# ── ERROR HANDLERS ────────────────────────────────────────────
@app.errorhandler(404)
def page_not_found(e):
    return render_template("login.html", error="Page not found."), 404

@app.errorhandler(500)
def server_error(e):
    return render_template("login.html", error=f"Server error: {e}"), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
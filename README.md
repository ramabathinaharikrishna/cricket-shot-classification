# 🏏 Smart Cricket Shot Classification Using Minimal Hardware and Machine Learning

A low-cost machine learning system that classifies cricket batting shots from
**accelerometer and gyroscope sensor data**, wrapped in a **Flask + MySQL web
application** with separate dashboards for players, coaches and admins.

It is designed for academies, schools and amateur players who cannot afford
camera-based analytics or expensive motion-capture setups: only a bat-mounted
low-cost motion sensor is needed.
## Screenshots
![Login](screenshots/login.png)
![Classify](screenshots/classify.png)
![Admin Dashboard](screenshots/dashboard.png)
![History](screenshots/history.png)

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Objectives](#objectives)
3. [Key Features](#key-features)
4. [Shots Classified](#shots-classified)
5. [System Architecture](#system-architecture)
6. [Tech Stack](#tech-stack)
7. [Dataset and Features](#dataset-and-features)
8. [Machine Learning Pipeline](#machine-learning-pipeline)
9. [Results](#results)
10. [Web Application](#web-application)
11. [Database Design](#database-design)
12. [Project Structure](#project-structure)
13. [Installation and Setup](#installation-and-setup)
14. [Demo Accounts](#demo-accounts)
15. [Configuration](#configuration)
16. [Limitations](#limitations)
17. [Future Work](#future-work)
18. [Author](#author)
19. [License](#license)

---

## Problem Statement
Analysing a batter's technique normally needs high-speed cameras, motion-capture
labs or a trained coach watching every shot. These options are expensive and
hard to access for schools, local academies and rural players. This project
shows that a small, cheap wearable motion sensor combined with classical machine
learning can recognise the type of shot automatically and give instant feedback.

## Objectives
- Classify four common batting shots from accelerometer and gyroscope readings
- Compare four classical ML algorithms on the same data
- Provide a simple web interface to enter sensor readings and get a prediction with confidence scores
- Store prediction history so players and coaches can track technique over time
- Support three user roles (player, coach, admin) with role-based access

## Key Features
- **Shot classification** with a probability for every shot class
- **Four models side by side**: Decision Tree, Random Forest, SVM and KNN all run on every prediction, and the user picks the primary result
- **Player portal**: dashboard with shot-distribution chart, classify page with quick-fill sample values, history with filtering and delete
- **Coach portal**: assign or remove players, view each player's prediction history, shot-distribution chart
- **Admin portal**: user management (change role, delete), all-predictions log with filters, model accuracy chart, daily activity chart, coach registration code
- **Secure authentication**: hashed passwords (PBKDF2-SHA256), session-based login, role-protected routes
- **Auto-generated coach IDs** in the format `TCH-0001`

## Shots Classified
| Shot | Typical sensor signature (dataset averages) |
|---|---|
| **Cover Drive** | high acceleration on X, smooth arc (max acc. magnitude ≈ 14.2, peak angular velocity ≈ 8.5) |
| **Pull Shot** | high acceleration on Z, aggressive swing (≈ 19.5, ≈ 14.0) |
| **Sweep** | low trajectory, high rotation on Z (≈ 12.5, ≈ 10.5) |
| **Defensive** | minimal movement (≈ 5.5, ≈ 3.5) |

## System Architecture
```
  Bat-mounted accelerometer + gyroscope
                  │
                  ▼
   15 statistical features per shot
                  │
                  ▼
      ┌───────────────────────┐
      │  Flask web application │──► MySQL (users, predictions, coach–player links)
      │  (role-based access)   │
      └───────────┬───────────┘
                  │ loads saved models
                  ▼
   Decision Tree · Random Forest · SVM · KNN
                  │
                  ▼
   Predicted shot + confidence + all-model verdicts
```

## Tech Stack
| Area | Tools |
|---|---|
| Language | Python 3 |
| Machine learning | Scikit-learn, Pandas, NumPy, Joblib |
| Backend | Flask, Werkzeug (password hashing) |
| Database | MySQL (via XAMPP), `mysql-connector-python` |
| Frontend | HTML, CSS, JavaScript, Jinja2 templates, Chart.js |

## Dataset and Features
`cricket_sensor_dataset.csv` contains **10,000 samples, balanced at 2,500 per
shot**. Each row is one shot summarised by **15 statistical features** from the
accelerometer and gyroscope:

| Group | Features |
|---|---|
| Accelerometer mean | `mean_acc_x`, `mean_acc_y`, `mean_acc_z` |
| Accelerometer std. deviation | `std_acc_x`, `std_acc_y`, `std_acc_z` |
| Gyroscope mean | `mean_gyro_x`, `mean_gyro_y`, `mean_gyro_z` |
| Gyroscope std. deviation | `std_gyro_x`, `std_gyro_y`, `std_gyro_z` |
| Derived | `max_acc_magnitude`, `min_acc_magnitude`, `peak_angular_vel` |

## Machine Learning Pipeline
`train_model.py` runs the full training workflow:

1. **Load** the CSV and encode the shot labels with `LabelEncoder`
2. **Add noise** (see the note under Results)
3. **Split** 80% train / 20% test, stratified by shot class
4. **Scale** features with `StandardScaler` (used for SVM and KNN)
5. **Train** four models:
   - Decision Tree (`max_depth=10`)
   - Random Forest (150 trees, `max_depth=12`)
   - SVM (RBF kernel, `C=5`, probability estimates enabled)
   - KNN (`k=9`, distance-weighted)
6. **Evaluate** with test accuracy, 5-fold stratified cross-validation and a per-class classification report
7. **Save** the models, scaler, label encoder and results into `models/` as `.pkl` files

## Results
| Model | Test accuracy | 5-fold CV accuracy |
|---|---|---|
| Decision Tree | 97.80% | 97.94% |
| Random Forest | 97.95% | 98.26% |
| SVM | 97.95% | 98.26% |
| KNN | 97.95% | 98.26% |

> **Note:** before the train/test split, `train_model.py` adds Gaussian noise to
> some samples and randomly swaps about 1.8% of the labels to simulate sensor
> noise and ambiguous shots. This is why the scores stop near 98%. On the
> original, unmodified data the same models score close to 100%, which shows the
> four shot classes are very well separated in this dataset.

## Web Application

### User roles
| Role | What they can do |
|---|---|
| **Player** | Classify shots, view personal dashboard and history, delete own predictions |
| **Coach** | Assign or remove players, view each player's history and shot distribution |
| **Admin** | Manage users and roles, view all predictions, see model accuracy and activity charts |

Coaches register with a secret code supplied by the admin and get an automatic
ID such as `TCH-0001`. The admin account is protected from deletion and role changes.

### Main routes
| Route | Access | Purpose |
|---|---|---|
| `/`, `/login`, `/register`, `/logout` | public | Landing page and authentication |
| `/player/dashboard`, `/player/classify`, `/player/history` | player | Dashboard, shot classification, history |
| `/coach/dashboard`, `/coach/players`, `/coach/player_history/<id>` | coach | Roster and player analysis |
| `/admin/dashboard`, `/admin/users`, `/admin/predictions` | admin | System overview and management |
| `/api/model_accuracy` | logged in | Model accuracy data used by the charts |

## Database Design
MySQL database `cricket_shot_db`, created by `database.py`:

| Table | Purpose |
|---|---|
| `users` | accounts with name, email, hashed password, role and coach code |
| `coach_players` | links each coach to their assigned players |
| `predictions` | the 15 input features, predicted shot, confidence, model used and each model's verdict |
| `feedback` | schema for player feedback on predictions |
| `app_config` | application settings such as the coach registration code |

## Project Structure
```
cricket-shot-classification/
├── app.py                      # Flask application (routes, auth, prediction)
├── database.py                 # creates MySQL database, tables and demo accounts
├── train_model.py              # trains and saves the four models
├── cricket_sensor_dataset.csv  # dataset (10,000 samples)
├── requirements.txt
├── models/                     # saved .pkl models, scaler and encoders
├── static/
│   ├── css/style.css
│   └── js/                     # main.js, charts.js, classify.js, admin.js
└── templates/                  # 13 HTML pages (auth, admin, coach, player)
```

## Installation and Setup

### Requirements
- Python 3.9 or newer
- XAMPP (or any MySQL server) running on port 3306

### Steps
```bash
# 1. Clone the repository
git clone https://github.com/ramabathinaharikrishna/cricket-shot-classification.git
cd cricket-shot-classification

# 2. (Optional) create a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start MySQL in XAMPP, then create the database, tables and demo accounts
python database.py

# 5. Train the models (creates the models/ folder)
python train_model.py

# 6. Run the web app
python app.py
```
Open **http://127.0.0.1:5000** in your browser.

## Demo Accounts
For local testing only, created by `database.py`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@cricket.com | admin123 |
| Coach | coach@cricket.com | coach123 |
| Player | player@cricket.com | player123 |

The default coach registration code is `COACH2024`. Change these before any real deployment.

## Configuration
- **Secret key:** set the `SECRET_KEY` environment variable (a development fallback is used if it is not set)
- **Debug mode:** off by default
- **Database:** connection settings (host, user, password) are in `DB_CFG` in `app.py` and at the top of `database.py`. The defaults match a local XAMPP install.

## Limitations
- The model works on summarised sensor features, not raw sensor streams or video
- Only four shot types are supported
- The dataset's results come with an added noise step, so real-world accuracy with new players and sensors has not been measured
- The app is a local demo: it uses demo credentials and the Flask development server

## Future Work
- Record real sensor data from more players and test on unseen users
- Add more shots (straight drive, cut, hook, etc.)
- Add video-based pose estimation to combine with sensor data
- Try deep learning (CNN / LSTM) on raw sensor time series
- Build a mobile app with live Bluetooth sensor input
- Deploy online with production-grade security

## Author
**Harikrishna Ramabathina**
[LinkedIn](https://www.linkedin.com/in/harikrishna-ramabathina) · ramabathinaharikrishna@gmail.com

## License
This project is released under the MIT License.

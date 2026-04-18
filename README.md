# ROI - Financial Simulation Game

**ROI** (formerly FinSecure Quest) is a modern, story-based financial simulation web application designed to teach better financial decision-making through interactive narrative gameplay.

![Game Preview](src/assets/office.png)

## 🎯 Objective
Experience a character-driven journey where your financial choices (Salary, Budgeting, Investment, and Security) directly impact your **Money**, **Happiness**, and **Risk** levels. Navigate tricky scenarios, avoid scams, and maximize your ROI with the help of a built-in AI Counselor.

## ✨ Features
- **Modern UI**: A premium, mobile-first design system utilizing glassmorphism and smooth CSS animations.
- **Full-Stack Architecture**: Powered by a Flask backend and SQLite database for persistent user states.
- **Dynamic Storytelling**: Branching narrative chapters loaded from a server-side JSON engine.
- **AI Mentor**: Real-time advisor feedback based on your current financial standing.
- **Dynamic Backgrounds**: Immersive environments (Office, Trading Floor, Restaurant) that change with the story.
- **Asset Integration**: Smart real-time background removal for character avatars to ensure seamless integration into any scene.

## 🛠️ Technology Stack
- **Frontend**: HTML5, Vanilla CSS3, Javascript (ES6 Modules)
- **Backend**: Python, Flask, Flask-SQLAlchemy, Flask-CORS
- **Database**: SQLite
- **Environment**: Python Virtual Environment (venv)

## 🚀 Getting Started

### Prerequisites
- Python 3.8+ (Use `py` launcher on Windows if `python` is not in PATH)
- A modern web browser

### Setup & Run
1. **Clone/Open the project directory** and open a terminal.
2. **Create and activate a Virtual Environment**:
   ```powershell
   # Windows (using py launcher)
   py -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Start the Backend server**:
   ```bash
   python app.py
   ```
   *The backend will run on `http://localhost:5001`.*

5. **Start the Frontend server** (in a new terminal):
   ```bash
   # Use Python's built-in server
   python -m http.server 8080
   ```
6. **Play the game**:
   Open your browser and navigate to `http://localhost:8080`.

## 📂 Project Structure
```text
ROI/
├── app.py              # Main Flask application & Routes
├── models.py           # User database schema
├── scenarios.json      # Story chapters & choices
├── requirements.txt    # Python dependencies
├── index.html          # Main frontend entry point
├── src/
│   ├── assets/         # Character & Background images
│   ├── js/
│   │   ├── components/ # View-specific UI components
│   │   └── app.js      # Core SPA controller & API client
│   └── style/          # Global CSS & Design system
└── venv/               # (Created after setup)
```

## 🎮 How to Play
1. **Persona**: Choose your gender and enter your name to start.
2. **Scenarios**: Read carefully and make decisions by clicking choice buttons.
3. **Feedback**: Review the AI Mentor's insight after every choice.
4. **Dashboard**: Track your progress and final stats on the endgame dashboard.

---
*Created with ❤️ for Financial Literacy.*

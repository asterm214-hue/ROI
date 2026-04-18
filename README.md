# ROI - Financial Simulation Game

**ROI** is a modern, story-based financial simulation web application designed to teach better financial decision-making through interactive narrative gameplay.

![Game Preview](src/assets/office.png)

## 🎯 Objective
Experience a character-driven journey where your financial choices directly impact your **Money**, **Happiness**, and **Risk** levels. Navigate scenarios, avoid scams, and maximize your ROI with the help of an AI Mentor.

## ✨ Features
- **Unified Server**: The entire game (Frontend + Backend) runs from a single Python command.
- **Modern UI**: Dark-mode glassmorphism design with smooth CSS animations.
- **Dynamic Story**: Branching narrative engine with real-time AI feedback.
- **Persistence**: User accounts and progress are saved in an SQLite database.
- **Aesthetics**: High-quality city backgrounds and character avatars.

## 🚀 Quick Start (One Command)

1. **Activate the Environment**:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
2. **Launch the Game**:
   ```bash
   python app.py
   ```
3. **Play**:
   Open **[http://127.0.0.1:5001](http://127.0.0.1:5001)** in your browser.

## 📂 Project Structure
```text
ROI/
├── app.py              # Unified Server (Serves HTML + API)
├── models.py           # Database Schema
├── scenarios.json      # Game Content
├── index.html          # Main Page
├── src/                # Static Assets & Logic
└── database.db         # Saved Progress
```

---
*Created with ❤️ for Financial Literacy.*

import os
import json
import random
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from models import db, User

# Initialize Flask with the root directory as the static folder to serve frontend files
app = Flask(__name__, static_folder='.', static_url_path='')
# Enable CORS just in case, though not strictly needed if served from same port
CORS(app)

# base directory for absolute paths
_base_dir = os.path.dirname(os.path.abspath(__file__))

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(_base_dir, 'database.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
app.config['JSON_AS_ASCII'] = False

# Create database if it doesn't exist
with app.app_context():
    db.create_all()

# --- FRONTEND ROUTES ---

@app.route('/')
def index():
    """Serve the main index.html file."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve any other static files (js, css, assets)."""
    return send_from_directory(app.static_folder, path)

# --- API ROUTES ---

@app.route('/api/status')
def status():
    return jsonify({"status": "online", "message": "ROI API is running"})

# Load Scenarios
with open(os.path.join(_base_dir, 'scenarios.json'), 'r') as f:
    SCENARIOS = json.load(f)

def get_mentor_feedback(user):
    """Rule-based AI Mentor feedback logic."""
    if user.money < 5000:
        return "You are running low on savings. Every dollar counts right now."
    if user.risk > 50:
        return "Your financial decisions are very risky. Consider diversifying into safer assets."
    if user.happiness < 20:
        return "Don't forget that money is a tool for happiness. Balance your spending."
    if user.money > 50000:
        return "Impressive wealth accumulation! You're well on your way to becoming a financial pro."
    return "Good financial management! Keep balancing your stats."

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    gender = data.get('gender', 'male')

    if not email or not password or not name:
        return jsonify({"error": "Missing required fields"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    new_user = User(name=name, email=email, gender=gender)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "status": "success",
        "user": new_user.to_dict(),
        "first_scenario": SCENARIOS['start']
    })

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({
        "status": "success",
        "user": user.to_dict(),
        "current_scenario": SCENARIOS.get(user.current_chapter, SCENARIOS['start'])
    })

@app.route('/start', methods=['POST'])
def start_game():
    data = request.json
    name = data.get('name', 'Adam')
    email = data.get('email', f"guest_{random.randint(1000,9999)}@example.com")
    gender = data.get('gender', 'male')
    
    new_user = User(name=name, email=email, gender=gender)
    new_user.set_password("guest_pass")
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        "user": new_user.to_dict(),
        "first_scenario": SCENARIOS['start']
    })

@app.route('/scenario/<chapter_id>', methods=['GET'])
def get_scenario(chapter_id):
    scenario = SCENARIOS.get(chapter_id)
    if not scenario:
        return jsonify({"error": "Scenario not found"}), 404
    return jsonify(scenario)

@app.route('/start-level', methods=['POST'])
def start_level_sync():
    data = request.json
    user_id = data.get('user_id')
    chapter_id = data.get('chapter_id')
    stats = data.get('stats', {})
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user.current_chapter = chapter_id
    user.money = stats.get('money', user.money)
    user.happiness = stats.get('happiness', user.happiness)
    user.risk = stats.get('risk', user.risk)
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "user": user.to_dict(),
        "scenario": SCENARIOS.get(chapter_id)
    })

@app.route('/choice', methods=['POST'])
def submit_choice():
    data = request.json
    user_id = data.get('user_id')
    choice_id = data.get('choice_id')
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    current_scenario = SCENARIOS.get(user.current_chapter)
    selected_choice = next((c for c in current_scenario['choices'] if c['id'] == choice_id), None)
    
    if not selected_choice:
        return jsonify({"error": "Choice not found"}), 404
    
    # Process Impact
    impact = selected_choice.get('impact', {})
    
    # Special Logic: Randomness for Investment
    if selected_choice.get('is_random'):
        range_data = selected_choice.get('impact_range', {})
        impact = {
            "money": random.randint(range_data['money'][0], range_data['money'][1]),
            "happiness": random.randint(range_data['happiness'][0], range_data['happiness'][1]),
            "risk": random.randint(range_data['risk'][0], range_data['risk'][1])
        }

    # Update User State
    user.money += impact.get('money', 0)
    user.happiness = max(0, min(100, user.happiness + impact.get('happiness', 0)))
    user.risk = max(0, min(100, user.risk + impact.get('risk', 0)))
    
    # Update Chapter
    next_node = selected_choice['next_chapter']
    
    # Check if a level is being completed
    if next_node == 'start' or next_node == 'final_summary':
        # Identify which level was completed
        current = user.current_chapter
        if current.startswith('lvl1'):
            completed_lvl = 'lvl1'
        elif current.startswith('lvl2'):
            completed_lvl = 'lvl2'
        elif current.startswith('lvl3'):
            completed_lvl = 'lvl3'
        elif current.startswith('lvl4'):
            completed_lvl = 'lvl4'
        elif current.startswith('lvl5'):
            completed_lvl = 'lvl5'
        else:
            completed_lvl = None
            
        if completed_lvl:
            completed_list = json.loads(user.completed_levels)
            if completed_lvl not in completed_list:
                completed_list.append(completed_lvl)
                user.completed_levels = json.dumps(completed_list)
        
        # Reset current chapter if going back to start
        if next_node == 'start':
            user.current_chapter = 'start'
        else:
            user.current_chapter = next_node
    else:
        user.current_chapter = next_node
        
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "user": user.to_dict(),
        "impact": impact,
        "mentor_opinion": selected_choice.get('mentorText'),
        "ai_feedback": get_mentor_feedback(user),
        "next_scenario": SCENARIOS.get(next_node)
    })

@app.route('/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())

if __name__ == '__main__':
    # Running on 5001 for both Frontend and Backend
    print("\n" + "="*50)
    print("ROI GAME IS STARTING!")
    print("Open your browser at: http://127.0.0.1:5001")
    print("="*50 + "\n")
    app.run(debug=True, port=5001)

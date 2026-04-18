import os
import json
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, User

app = Flask(__name__)
# Enable CORS for frontend integration
CORS(app)

# Database configuration
# base directory for absolute paths
_base_dir = os.path.dirname(os.path.abspath(__file__))

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(_base_dir, 'database.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Create database if it doesn't exist
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "message": "ROI Backend API is running. Please access the game via the frontend server (usually port 8080 or 5500)."
    })

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

@app.route('/start', methods=['POST'])
def start_game():
    data = request.json
    name = data.get('name', 'Adam')
    gender = data.get('gender', 'male')
    
    # Create new user
    new_user = User(name=name, gender=gender)
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
    # Running on 5001 to avoid clash with common ports
    app.run(debug=True, port=5001)

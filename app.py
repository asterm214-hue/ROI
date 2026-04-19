import os
import json
import random
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from models import db, User, UserQuestProgress
from engine import GameEngine

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

@app.route('/quests', methods=['GET'])
def list_quests():
    user_id = request.args.get('user_id', type=int)
    progress_by_quest = {}

    if user_id:
        progress_rows = UserQuestProgress.query.filter_by(user_id=user_id).all()
        progress_by_quest = {row.quest_id: row for row in progress_rows}

    return jsonify({
        "quests": [
            summarize_quest(quest, progress_by_quest.get(quest["id"]))
            for quest in QUEST_DATA.get("quests", [])
        ]
    })

@app.route('/quests/<quest_id>', methods=['GET'])
def get_quest(quest_id):
    quest, error = get_quest_or_404(quest_id)
    if error:
        return error

    user_id = request.args.get('user_id', type=int)
    progress = get_existing_progress(user_id, quest_id) if user_id else None

    return jsonify({
        "quest": quest,
        "progress": progress.to_dict() if progress else empty_quest_progress(quest)
    })

@app.route('/quests/<quest_id>/start', methods=['POST'])
def start_quest(quest_id):
    quest, error = get_quest_or_404(quest_id)
    if error:
        return error

    data = get_json_payload()
    user_id, error = require_user_id(data)
    if error:
        return error

    _, progress, error = get_or_create_progress(user_id, quest_id)
    if error:
        return error

    should_reset = data.get('replay', False) or not progress.started or progress.completed
    if should_reset:
        progress.reset_for_replay(get_first_scene_id(quest))
    else:
        progress.started = True
        if not progress.current_scene_id:
            progress.current_scene_id = get_first_scene_id(quest)

    db.session.commit()
    return jsonify({
        "status": "success",
        "quest": quest,
        "progress": progress.to_dict()
    })

@app.route('/quests/<quest_id>/choice', methods=['POST'])
def submit_quest_choice(quest_id):
    quest, error = get_quest_or_404(quest_id)
    if error:
        return error

    data = get_json_payload()
    user_id, error = require_user_id(data)
    if error:
        return error

    scene_id = data.get('scene_id')
    choice_id = data.get('choice_id')
    scene = find_quest_scene(quest, scene_id)
    if not scene or scene.get('type') != 'choice':
        return jsonify({"error": "Choice scene not found"}), 404

    selected_choice = find_scene_choice(scene, choice_id)
    if not selected_choice:
        return jsonify({"error": "Choice not found"}), 404

    _, progress, error = get_or_create_progress(user_id, quest_id)
    if error:
        return error
    if not progress.started:
        progress.reset_for_replay(get_first_scene_id(quest))

    choices = json.loads(progress.choices_json) if progress.choices_json else []
    choices = [choice for choice in choices if choice.get("scene_id") != scene_id]
    choices.append({
        "scene_id": scene_id,
        "choice_id": choice_id,
        "choice_text": selected_choice.get("text"),
        "risk_points": selected_choice.get("risk_points", 0),
        "outcome_hint": selected_choice.get("outcome_hint")
    })

    progress.choices_json = json.dumps(choices)
    progress.risk_score = sum(choice.get("risk_points", 0) for choice in choices)
    progress.current_scene_id = selected_choice.get("next") or scene.get("next")
    db.session.commit()

    return jsonify({
        "status": "success",
        "progress": progress.to_dict(),
        "next_scene_id": progress.current_scene_id,
        "selected_choice": selected_choice
    })

@app.route('/quests/<quest_id>/quiz', methods=['POST'])
def submit_quest_quiz(quest_id):
    quest, error = get_quest_or_404(quest_id)
    if error:
        return error

    data = get_json_payload()
    user_id, error = require_user_id(data)
    if error:
        return error

    scene_id = data.get('scene_id')
    answers = data.get('answers', {})
    scene = find_quest_scene(quest, scene_id)
    if not scene or scene.get('type') != 'quiz':
        return jsonify({"error": "Quiz scene not found"}), 404

    items = scene.get("items", [])
    score = 0
    item_results = []
    for item in items:
        selected_answer = answers.get(item["id"])
        is_correct = selected_answer == item.get("answer")
        if is_correct:
            score += 1
        item_results.append({
            "id": item["id"],
            "text": item["text"],
            "selected_answer": selected_answer,
            "correct_answer": item.get("answer"),
            "correct": is_correct
        })

    total = len(items)
    passing_score = scene.get("passing_score", total)
    passed = score >= passing_score

    _, progress, error = get_or_create_progress(user_id, quest_id)
    if error:
        return error
    if not progress.started:
        progress.reset_for_replay(get_first_scene_id(quest))

    progress.quiz_answers_json = json.dumps(answers)
    progress.quiz_score = score
    progress.quiz_total = total
    if passed:
        progress.current_scene_id = scene.get("next")
    else:
        progress.current_scene_id = scene_id

    db.session.commit()

    return jsonify({
        "status": "success",
        "progress": progress.to_dict(),
        "score": score,
        "total": total,
        "passed": passed,
        "item_results": item_results,
        "feedback": scene.get("feedback_correct") if passed else scene.get("feedback_retry")
    })

@app.route('/quests/<quest_id>/progress', methods=['GET'])
def get_quest_progress(quest_id):
    quest, error = get_quest_or_404(quest_id)
    if error:
        return error

    user_id = request.args.get('user_id', type=int)
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    progress = get_existing_progress(user_id, quest_id)
    return jsonify({
        "progress": progress.to_dict() if progress else empty_quest_progress(quest)
    })

@app.route('/quests/<quest_id>/complete', methods=['POST'])
def complete_quest(quest_id):
    quest, error = get_quest_or_404(quest_id)
    if error:
        return error

    data = get_json_payload()
    user_id, error = require_user_id(data)
    if error:
        return error

    _, progress, error = get_or_create_progress(user_id, quest_id)
    if error:
        return error
    if not progress.started:
        progress.reset_for_replay(get_first_scene_id(quest))

    result_path = data.get("result_path") or resolve_quest_result_path(quest, progress)
    progress.completed = True
    progress.result_path = result_path
    progress.current_scene_id = data.get("current_scene_id") or progress.current_scene_id
    progress.reward_title = quest.get("reward", {}).get("title")
    db.session.commit()

    return jsonify({
        "status": "success",
        "progress": progress.to_dict(),
        "reward": quest.get("reward"),
        "outcome": quest.get("outcomes", {}).get(result_path)
    })

# Load Scenarios (Added UTF-8 encoding for currency symbols)
with open(os.path.join(_base_dir, 'scenarios.json'), 'r', encoding='utf-8') as f:
    SCENARIOS = json.load(f)

# Load Quest Mode content
with open(os.path.join(_base_dir, 'quests.json'), 'r', encoding='utf-8') as f:
    QUEST_DATA = json.load(f)

QUESTS_BY_ID = {quest['id']: quest for quest in QUEST_DATA.get('quests', [])}

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

def get_quest_or_404(quest_id):
    quest = QUESTS_BY_ID.get(quest_id)
    if not quest:
        return None, (jsonify({"error": "Quest not found"}), 404)
    return quest, None

def get_first_scene_id(quest):
    return quest['scenes'][0]['id'] if quest.get('scenes') else None

def find_quest_scene(quest, scene_id):
    return next((scene for scene in quest.get('scenes', []) if scene.get('id') == scene_id), None)

def find_scene_choice(scene, choice_id):
    return next((choice for choice in scene.get('choices', []) if choice.get('id') == choice_id), None)

def empty_quest_progress(quest):
    return {
        "quest_id": quest["id"],
        "started": False,
        "completed": False,
        "current_scene_id": get_first_scene_id(quest),
        "result_path": None,
        "risk_score": 0,
        "quiz_score": 0,
        "quiz_total": 0,
        "choices": [],
        "quiz_answers": {},
        "reward_title": None,
        "updated_at": None
    }

def get_existing_progress(user_id, quest_id):
    if not user_id:
        return None
    return UserQuestProgress.query.filter_by(user_id=user_id, quest_id=quest_id).first()

def get_or_create_progress(user_id, quest_id):
    user = User.query.get(user_id)
    if not user:
        return None, None, (jsonify({"error": "User not found"}), 404)

    progress = get_existing_progress(user_id, quest_id)
    if not progress:
        progress = UserQuestProgress(user_id=user_id, quest_id=quest_id)
        db.session.add(progress)
    return user, progress, None

def summarize_quest(quest, progress=None):
    return {
        "id": quest["id"],
        "title": quest["title"],
        "subtitle": quest.get("subtitle"),
        "theme": quest.get("theme"),
        "description": quest.get("description"),
        "reward": quest.get("reward"),
        "completion_badge": quest.get("completion_badge"),
        "status": "available",
        "progress": progress.to_dict() if progress else empty_quest_progress(quest)
    }

def resolve_quest_result_path(quest, progress):
    rule = quest.get("branch_rule", {})
    threshold = rule.get("falls_for_scam_at_risk_score", 2)
    return "falls_for_scam" if progress.risk_score >= threshold else "avoids_scam"

def get_json_payload():
    return request.get_json(silent=True) or {}

def require_user_id(data):
    user_id = data.get('user_id')
    if not user_id:
        return None, (jsonify({"error": "Missing user_id"}), 400)
    return user_id, None

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

@app.route('/start_game', methods=['POST'])
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
    user.xp = stats.get('xp', user.xp)
    db.session.commit()
    
    return jsonify({
        "status": "success",
        "user": user.to_dict(),
        "scenario": SCENARIOS.get(chapter_id)
    })

@app.route('/make_choice', methods=['POST'])
def submit_choice():
    data = request.json
    user_id = data.get('user_id')
    choice_id = data.get('choice_id')
    custom_text = data.get('custom_text')
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    current_scenario = SCENARIOS.get(user.current_chapter)
    if not current_scenario:
        return jsonify({"error": "Scenario not found"}), 404

    selected_choice = None
    if choice_id != 'custom_input':
        selected_choice = next((c for c in current_scenario.get('choices', []) if c['id'] == choice_id), None)
        if not selected_choice:
            return jsonify({"error": "Choice not found"}), 404
    else:
        # For custom input, we simulate a choice and pick a default next chapter
        current_scenario['custom_text'] = custom_text
        default_next = "start"
        if current_scenario.get('choices'):
            default_next = current_scenario['choices'][0]['next_chapter']
        
        selected_choice = {
            "id": "custom_input",
            "next_chapter": default_next,
            "impact": {"xp": 20}
        }
    
    # Process Impact
    impact = selected_choice.get('impact', {})
    
    # Use GameEngine
    engine = GameEngine(user)
    impact, outcome_money, story, lesson = engine.process_choice(choice_id, current_scenario, impact)
    
    # Special Logic: Randomness for Investment
    if selected_choice.get('is_random'):
        range_data = selected_choice.get('impact_range', {})
        impact = {
            "money": random.randint(range_data['money'][0], range_data['money'][1]),
            "happiness": random.randint(range_data['happiness'][0], range_data['happiness'][1]),
            "risk": random.randint(range_data['risk'][0], range_data['risk'][1]),
            "xp": random.randint(10, 20)
        }

    # Update User State
    user.money += impact.get('money', 0)
    user.happiness = max(0, min(100, user.happiness + impact.get('happiness', 0)))
    user.risk = max(0, min(100, user.risk + impact.get('risk', 0)))
    user.xp += impact.get('xp', 0)
    
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
        "mentor_opinion": lesson if lesson else selected_choice.get('mentorText'),
        "ai_feedback": get_mentor_feedback(user),
        "next_scenario": SCENARIOS.get(next_node),
        "story_outcome": story
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

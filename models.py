import json
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    money = db.Column(db.Integer, default=30000)
    happiness = db.Column(db.Integer, default=50)
    risk = db.Column(db.Integer, default=10)
    current_chapter = db.Column(db.String(50), default='start')
    completed_levels = db.Column(db.String(200), default='[]')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "gender": self.gender,
            "money": self.money,
            "happiness": self.happiness,
            "risk": self.risk,
            "current_chapter": self.current_chapter,
            "completed_levels": json.loads(self.completed_levels) if self.completed_levels else []
        }


class UserQuestProgress(db.Model):
    __tablename__ = 'user_quest_progress'
    __table_args__ = (
        UniqueConstraint('user_id', 'quest_id', name='uq_user_quest_progress'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    quest_id = db.Column(db.String(80), nullable=False)
    started = db.Column(db.Boolean, default=False)
    completed = db.Column(db.Boolean, default=False)
    current_scene_id = db.Column(db.String(120), nullable=True)
    result_path = db.Column(db.String(40), nullable=True)
    risk_score = db.Column(db.Integer, default=0)
    quiz_score = db.Column(db.Integer, default=0)
    quiz_total = db.Column(db.Integer, default=0)
    choices_json = db.Column(db.Text, default='[]')
    quiz_answers_json = db.Column(db.Text, default='{}')
    reward_title = db.Column(db.String(160), nullable=True)
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    user = db.relationship('User', backref=db.backref('quest_progress', lazy=True))

    def reset_for_replay(self, first_scene_id):
        self.started = True
        self.completed = False
        self.current_scene_id = first_scene_id
        self.result_path = None
        self.risk_score = 0
        self.quiz_score = 0
        self.quiz_total = 0
        self.choices_json = '[]'
        self.quiz_answers_json = '{}'
        self.reward_title = None

    def to_dict(self):
        return {
            "quest_id": self.quest_id,
            "started": self.started,
            "completed": self.completed,
            "current_scene_id": self.current_scene_id,
            "result_path": self.result_path,
            "risk_score": self.risk_score,
            "quiz_score": self.quiz_score,
            "quiz_total": self.quiz_total,
            "choices": json.loads(self.choices_json) if self.choices_json else [],
            "quiz_answers": json.loads(self.quiz_answers_json) if self.quiz_answers_json else {},
            "reward_title": self.reward_title,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

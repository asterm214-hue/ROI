from flask_sqlalchemy import SQLAlchemy
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
            "current_chapter": self.current_chapter
        }

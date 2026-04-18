from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    money = db.Column(db.Integer, default=30000)
    happiness = db.Column(db.Integer, default=50)
    risk = db.Column(db.Integer, default=10)
    current_chapter = db.Column(db.String(50), default='start')
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "gender": self.gender,
            "money": self.money,
            "happiness": self.happiness,
            "risk": self.risk,
            "current_chapter": self.current_chapter
        }

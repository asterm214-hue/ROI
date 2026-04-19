import random

class GameEngine:
    def __init__(self, user):
        self.user = user

    def calculate_roi(self, amount, strategy):
        """
        Dynamic ROI calculation based on chosen strategy.
        Returns the profit/loss and a lesson string.
        """
        if strategy == 'save':
            # Safe ROI: +4% to +6%
            roi_percent = random.uniform(0.04, 0.06)
            profit = int(amount * roi_percent)
            lesson = "Saving guarantees safe, steady returns, but growth is slow."
            return profit, lesson
            
        elif strategy == 'invest_stocks':
            # High Risk ROI: -15% to +25%
            roi_percent = random.uniform(-0.15, 0.25)
            profit = int(amount * roi_percent)
            if profit >= 0:
                lesson = "Higher risk can lead to higher returns! Your stock went up."
            else:
                lesson = "Investing carries risks. Your portfolio value temporarily dropped."
            return profit, lesson
            
        elif strategy == 'spend_all':
            # Loss of all invested money basically
            return -amount, "Spending everything leaves you with no emergency cushion."
            
        return 0, "No return generated."

    def process_choice(self, choice_id, current_scenario, base_impact):
        """
        Determine outcomes based on the choice explicitly.
        """
        amount = 10000  # Based on stipend for Level 1

        if choice_id == 'spend_all':
            impact = {'money': -amount, 'xp': 5}
            outcome_money = -amount
            story = "You spent all your stipend on immediate wants."
            _, lesson = self.calculate_roi(amount, 'spend_all')
        
        elif choice_id == 'save_bank':
            profit, lesson = self.calculate_roi(amount, 'save')
            impact = {'money': profit, 'xp': 15}  # Kept the base amount, added profit
            outcome_money = profit
            story = f"You saved ₹{amount} in the bank and earned safe interest."
            
        elif choice_id == 'invest_stocks':
            profit, lesson = self.calculate_roi(amount, 'invest_stocks')
            impact = {'money': profit, 'xp': 25}
            outcome_money = profit
            story = f"You invested ₹{amount} in stocks. The market reacted dynamically."
        
        else:
            # Fallback for other scenarios
            impact = base_impact.copy()
            if 'xp' not in impact:
                impact['xp'] = 10  # default XP gain
            outcome_money = impact.get('money', 0)
            story = "Choice recorded."
            lesson = ""

        return impact, outcome_money, story, lesson

    def update_money(self, impact_money):
        self.user.money += impact_money

    def add_xp(self, xp_gained):
        self.user.xp += xp_gained

    def generate_outcome(self):
        return {
            "money": self.user.money,
            "xp": self.user.xp,
            "level": self.user.current_chapter
        }

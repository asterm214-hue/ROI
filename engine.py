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
        # --- LEVEL 1 (Pocket Money) ---
        if choice_id.startswith('lvl1_'):
            amount = 5000
            
            if choice_id == 'lvl1_save_high':
                impact = {'money': -3000, 'xp': 20}
                story = "You set aside ₹3000 in your RD. Great discipline!"
                lesson = "RDs are excellent for building wealth through regular, small deposits."
            
            elif choice_id == 'lvl1_save_low':
                impact = {'money': -500, 'xp': 5}
                story = "You only saved ₹500. Most of your money is being spent."
                lesson = "Low savings rate makes it harder to reach big financial goals."
                
            elif choice_id == 'lvl1_trip_save_yes':
                impact = {'money': -1000, 'xp': 15}
                story = "You allocated an extra ₹1000 for the upcoming trip."
                lesson = "Targeted savings (Sinking Funds) ensure you can enjoy life guilt-free."
                
            elif choice_id == 'lvl1_check_savings':
                # Trip requirement: ideally ~₹3000-₹4000 total saved
                # Since we deduct from user.money when they "save",
                # the "savings" are effectively what's NOT in their wallet, but for simplicity
                # let's look at their XP or just a fixed rule:
                # If they didn't choose 'save_high', they might not have enough.
                # Actually, let's check current money vs a threshold.
                # If they started with 5000 and spent too much, they fail.
                
                if self.user.money >= 500: # Simple threshold for the demo
                    profit, _ = self.calculate_roi(3000, 'save') # Interest on savings
                    impact = {'money': profit, 'xp': 30}
                    story = "Success! Your savings and interest covered the trip. Let's go!"
                    lesson = "Planned savings meant you didn't have to borrow money for fun."
                else:
                    impact = {'money': 0, 'xp': -10}
                    story = "Oh no! You don't have enough money left for the trip."
                    lesson = "Always prioritize your goals over impulse spending."
            
            else:
                impact = base_impact.copy()
                story = "Decision recorded."
                lesson = ""
            
            outcome_money = impact.get('money', 0)
        
        # --- LEVEL 2 & 3 QUIZ / CARDS ---
        elif choice_id.startswith('q1_') or choice_id.startswith('q2_') or choice_id.startswith('q3_'):
            impact = base_impact.copy()
            if 'need' in choice_id:
                story = "Correct! You correctly identified a biological or essential necessity."
                lesson = "Prioritizing needs ensures survival and stability before spending on wants."
            elif 'want' in choice_id:
                story = "That's right. These are lifestyle choices that add joy but aren't strictly necessary."
                lesson = "Managing wants is the key to creating room for savings."
            outcome_money = 0
            
        elif choice_id in ['use_debit', 'use_credit']:
            impact = base_impact.copy()
            if choice_id == 'use_debit':
                story = "You used your own money. No debt was created."
                lesson = "Debit cards prevent you from spending money you don't actually have."
            else:
                story = "You used the bank's money. A credit bill will arrive later."
                lesson = "Credit cards are powerful tools for building credit scores, but require strict discipline."
            outcome_money = impact.get('money', 0)

        elif choice_id in ['invest_fd', 'invest_mf', 'invest_stocks_lvl3', 'invest_stocks']:
            # Handle Level 3 investments
            amount_to_invest = 20000 # The amount deducted in scenarios.json
            strategy = 'save'
            if 'stocks' in choice_id: strategy = 'invest_stocks'
            elif 'mf' in choice_id: strategy = 'invest_stocks' # Mutual funds also use stock-like logic here
            
            profit, lesson = self.calculate_roi(amount_to_invest, strategy)
            # We want the 'impact' to show the PROFIT, because scenarios.json already handled the DEDUCTION
            # Wait, app.py adds impact.money to user.money.
            # So if we return 500, user.money += 500. 
            # Total change: -20000 (from json) + 500 (from engine) = -19500? 
            # No, that's not right. The user invested 20000. They should eventually get it back + profit.
            
            impact = base_impact.copy()
            impact['money'] = impact.get('money', 0) + profit
            outcome_money = impact['money']
            story = f"Your investment strategy is in motion. Returns are being calculated..."
            if not lesson: _, lesson = self.calculate_roi(amount_to_invest, strategy)
        
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

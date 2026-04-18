export const storyData = {
    start: {
        id: 'start',
        text: "You just landed your first job as a Financial Analyst! Your first paycheck of $3,000 just hit your account. This is the moment you've been waiting for. What's your first move?",
        speaker: "Narrator",
        background: "src/assets/office.png",
        choices: [
            { 
                text: "Celebrate! Fancy dinner for the squad", 
                next: 'celebration',
                impact: { money: -400, happiness: 15, risk: 2 },
                mentorText: "Celebration is fine, but $400 is a big chunk of your first paycheck. Be careful with 'lifestyle creep'!"
            },
            { 
                text: "Play it safe: Move $1,000 to Savings", 
                next: 'savings_intro',
                impact: { money: 0, happiness: -5, risk: -10 },
                mentorText: "Smart move! Building an emergency fund early is the foundation of financial security."
            },
            { 
                text: "High risk, high reward: Invest in Crypto", 
                next: 'crypto_move',
                impact: { money: 0, happiness: 10, risk: 25 },
                mentorText: "Investing is good, but going all-in on volatile assets like crypto as your first move is very risky."
            }
        ]
    },
    celebration: {
        id: 'celebration',
        text: "The dinner was amazing! Everyone is impressed. But now you're looking at your balance and it's lower than you expected for day one. A friend mentions a 'Get Rich Quick' trading app.",
        speaker: "Narrator",
        background: "src/assets/restaurant.png",
        choices: [
            { 
                text: "Try the app with $500", 
                next: 'trading_fail',
                impact: { money: -500, happiness: -10, risk: 30 },
                mentorText: "Ouch. 'Get rich quick' schemes usually make you 'get poor quick'. Stick to proven strategies."
            },
            { 
                text: "Regret the dinner and start saving now", 
                next: 'savings_intro',
                impact: { money: 0, happiness: -5, risk: -5 },
                mentorText: "It's never too late to start saving. Better late than never!"
            }
        ]
    },
    savings_intro: {
        id: 'savings_intro',
        text: "You feel a sense of relief seeing that $1,000 in your savings. Your mentor visits your desk. 'Good job,' they say. 'Now, how about we talk about diversifying?'",
        speaker: "Mentor",
        background: "src/assets/office.png",
        choices: [
            { 
                text: "Tell me more about Index Funds", 
                next: 'index_funds',
                impact: { money: 0, happiness: 5, risk: 5 },
                mentorText: "Index funds are great for long-term growth with moderate risk. You're thinking like a pro."
            },
            { 
                text: "I'll stick to my savings account for now", 
                next: 'game_end_safe',
                impact: { money: 0, happiness: 0, risk: -5 },
                mentorText: "Conservative is fine, but inflation might eat your purchasing power over time."
            }
        ]
    },
    crypto_move: {
        id: 'crypto_move',
        text: "You bought some 'MoonCoin'. Your phone is buzzing with notifications. The market is crashing! You're losing money fast.",
        speaker: "Narrator",
        background: "src/assets/trading.png",
        choices: [
            { 
                text: "Panic sell everything", 
                next: 'panic_sold',
                impact: { money: -800, happiness: -20, risk: -10 },
                mentorText: "Selling during a crash locks in your losses. Emotional regulation is key to investing."
            },
            { 
                text: "Diamond hands! Hold on for dear life", 
                next: 'hold_on',
                impact: { money: 100, happiness: 5, risk: 10 },
                mentorText: "You got lucky this time, but volatility is a double-edged sword."
            }
        ]
    },
    trading_fail: {
        id: 'trading_fail',
        text: "The app was a scam. You lost the $500. This is a hard lesson. What's your next move to recover?",
        speaker: "Narrator",
        background: "src/assets/office.png",
        choices: [
            { text: "Start over with a strict budget", next: 'savings_intro', impact: { money: 0, happiness: -5, risk: -10 } },
            { text: "Borrow money to try and win it back", next: 'debt_spiral', impact: { money: 0, happiness: -30, risk: 50 } }
        ]
    },
    // More nodes can be added...
    game_end_safe: {
        id: 'game_end_safe',
        text: "You've finished your first month with a solid foundation. You're on your way to maximizing your ROI!",
        speaker: "Narrator",
        background: "src/assets/office.png",
        choices: []
    }
};

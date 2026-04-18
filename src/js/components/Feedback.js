export const Feedback = (app, historyItem) => {
    const div = document.createElement('div');
    div.className = 'feedback-view glass fade-in';
    div.style.maxWidth = '500px';
    div.style.padding = '40px';
    div.style.textAlign = 'center';

    const impact = historyItem.impact;
    const isPositive = impact.money >= 0 && impact.happiness >= 0;

    div.innerHTML = `
        <h2 style="color: var(--accent); margin-bottom: 10px;">Outcome: ${historyItem.choice}</h2>
        
        <div class="stats-change" style="display: flex; justify-content: space-around; padding: 20px; background: rgba(0,0,0,0.05); border-radius: var(--radius-md); margin-bottom: 30px;">
            <div style="color: ${(impact.money || 0) >= 0 ? 'green' : 'red'}; font-weight: 700;">
                Money: ${(impact.money || 0) >= 0 ? '+' : ''}${impact.money || 0}
            </div>
            <div style="color: ${(impact.happiness || 0) >= 0 ? 'green' : 'red'}; font-weight: 700;">
                Happiness: ${(impact.happiness || 0) >= 0 ? '+' : ''}${impact.happiness || 0}%
            </div>
            <div style="color: ${(impact.risk || 0) <= 0 ? 'green' : 'red'}; font-weight: 700;">
                Risk: ${(impact.risk || 0) >= 0 ? '+' : ''}${impact.risk || 0}%
            </div>
        </div>

        <div class="mentor-box" style="text-align: left; border-left: 4px solid var(--primary); padding-left: 20px; margin-bottom: 20px;">
            <div style="font-weight: 700; color: var(--primary); margin-bottom: 5px;">AI Mentor says:</div>
            <p style="font-style: italic; color: var(--dark);">${historyItem.mentor || "Great choice! Keep balancing your stats."}</p>
        </div>

        <div class="ai-status-box" style="text-align: left; background: rgba(23, 190, 187, 0.1); border-radius: var(--radius-sm); padding: 15px; margin-bottom: 30px;">
            <div style="font-size: 0.8em; text-transform: uppercase; color: var(--primary); font-weight: 700; margin-bottom: 5px;">Global Advisor Insight:</div>
            <p style="margin: 0; color: var(--accent); font-size: 0.95em;">"${historyItem.ai_feedback}"</p>
        </div>

        <button id="continue-story" class="btn btn-primary" style="width: 100%;">Continue Story</button>
    `;

    div.querySelector('#continue-story').onclick = () => {
        app.continueStory();
    };

    return div;
};

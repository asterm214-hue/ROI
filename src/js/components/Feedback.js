export const Feedback = (app, historyItem) => {
    const div = document.createElement('div');
    div.className = 'feedback-overlay fade-in';
    
    const impact = historyItem.impact;
    const isLoss = (impact.money || 0) < 0;
    const isProfit = (impact.money || 0) > 0;
    
    // Play appropriate sound
    if (isProfit) app.sound.playSFX('profit');
    else if (isLoss) app.sound.playSFX('loss');
    else app.sound.playSFX('click');

    // Character emoji feedback
    let emoji = '😎'; 
    if (isLoss) emoji = '😟';
    else if (impact.money > 5000) emoji = '🚀';
    else if (impact.money > 0) emoji = '😊';

    div.innerHTML = `
        <div class="feedback-card glass">
            <div class="feedback-header">
                <span class="decision-emoji">${emoji}</span>
                <h2>Decision Outcome</h2>
            </div>
            
            <div class="feedback-body">
                <div class="impact-summary">
                    <div class="impact-item ${isLoss ? 'negative' : 'positive'}">
                        <span class="impact-label">Balance Change</span>
                        <span class="impact-value" id="money-value">₹${historyItem.oldMoney}</span>
                        <span class="impact-diff">${impact.money >= 0 ? '+' : ''}${impact.money}</span>
                    </div>
                    <div class="impact-item positive">
                        <span class="impact-label">Experience</span>
                        <span class="impact-value">+${impact.xp || 0} XP</span>
                    </div>
                </div>

                <div class="outcome-story">
                    <p>${historyItem.story_outcome || "Your decision has been processed."}</p>
                </div>

                <div class="mentor-lesson">
                    <div class="mentor-badge">AI MENTOR</div>
                    <p>${historyItem.mentor || "Strategic thinking is key to high ROI."}</p>
                </div>
                
                ${historyItem.ai_feedback ? `
                <div class="why-happened-container">
                    <button id="toggle-why" class="btn-link">Why did this happen? ▾</button>
                    <div id="ai-insight" class="ai-insight-box hidden">
                        <p>${historyItem.ai_feedback}</p>
                    </div>
                </div>
                ` : ''}
            </div>

            <button id="continue-story" class="btn btn-primary continue-btn">Continue Journey</button>
        </div>
    `;

    // Money Count Animation
    const moneyVal = div.querySelector('#money-value');
    if (moneyVal && impact.money !== 0) {
        const start = historyItem.oldMoney;
        const end = app.state.stats.money;
        const duration = 1000;
        let startTime = null;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const current = Math.floor(progress * (end - start) + start);
            moneyVal.innerHTML = `₹${current}`;
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                moneyVal.classList.add('pulse');
            }
        };
        setTimeout(() => requestAnimationFrame(animate), 500);
    }

    // Toggle Why This Happened
    const toggleBtn = div.querySelector('#toggle-why');
    const insightBox = div.querySelector('#ai-insight');
    if (toggleBtn && insightBox) {
        toggleBtn.onclick = () => {
            insightBox.classList.toggle('hidden');
            toggleBtn.innerHTML = insightBox.classList.contains('hidden') ? 'Why did this happen? ▾' : 'Hide insight ▴';
        };
    }

    div.querySelector('#continue-story').onclick = () => {
        app.continueStory();
    };

    return div;
};

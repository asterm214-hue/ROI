export const Dashboard = (app) => {
    const div = document.createElement('div');
    div.className = 'dashboard-view glass fade-in';
    div.style.maxWidth = '800px';
    div.style.padding = '40px';
    div.style.width = '100%';

    div.innerHTML = `
        <h1 style="color: var(--accent); margin-bottom: 25px; border-bottom: 2px solid var(--secondary); padding-bottom: 10px;">Player Dashboard</h1>
        
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
            <div class="stat-card glass" style="padding: 20px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 10px;">💰</div>
                <div style="color: var(--neutral); font-size: 0.9rem;">Total Balance</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent);">$${app.state.stats.money}</div>
            </div>
            <div class="stat-card glass" style="padding: 20px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 10px;">😊</div>
                <div style="color: var(--neutral); font-size: 0.9rem;">Happiness Level</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent);">${app.state.stats.happiness}%</div>
            </div>
            <div class="stat-card glass" style="padding: 20px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                <div style="color: var(--neutral); font-size: 0.9rem;">Risk Profile</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent);">${app.state.stats.risk}%</div>
            </div>
        </div>

        <div class="history-section">
            <h3 style="margin-bottom: 15px; color: var(--accent);">Quest History</h3>
            <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.03); border-radius: var(--radius-md); padding: 15px;">
                ${app.state.history.length === 0 ? '<p style="color: var(--neutral);">No history yet.</p>' : 
                    app.state.history.map(item => `
                        <div style="padding: 10px; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 0.9rem;">
                            <strong>${item.choice}</strong> - Money: ${item.impact.money >= 0 ? '+' : ''}${item.impact.money}
                        </div>
                    `).join('')
                }
            </div>
        </div>

        <button id="resume-story" class="btn btn-primary" style="width: 100%; margin-top: 30px;">Resume Quest</button>
    `;

    div.querySelector('#resume-story').onclick = () => {
        app.setView('gameplay');
    };

    return div;
};

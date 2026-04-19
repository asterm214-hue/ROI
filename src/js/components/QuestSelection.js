const escapeHTML = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderQuestCards = (app, container, quests) => {
    if (!quests.length) {
        container.innerHTML = `
            <div class="quest-empty glass">
                <h2>No quests found</h2>
                <p>Quest data could not be loaded right now.</p>
                <button class="btn btn-primary" id="quest-empty-back">Back to Map</button>
            </div>
        `;
        container.querySelector('#quest-empty-back').onclick = () => app.setView('map');
        return;
    }

    container.innerHTML = quests.map((quest, index) => {
        const progress = quest.progress || {};
        const completed = Boolean(progress.completed);
        const started = Boolean(progress.started);
        const locked = quest.status === 'locked';
        const statusLabel = locked ? 'Locked' : (completed ? 'Completed' : (started ? 'In progress' : 'Available'));
        const actionLabel = completed ? 'Replay Quest' : (started ? 'Continue Quest' : 'Start Quest');
        const scoreText = progress.quiz_total
            ? `Quiz ${progress.quiz_score || 0}/${progress.quiz_total}`
            : 'Quiz not attempted';

        return `
            <article class="quest-select-card ${locked ? 'locked' : ''}" data-quest-id="${escapeHTML(quest.id)}">
                <div class="quest-card-topline">
                    <span class="quest-number">Quest ${index + 1}</span>
                    <span class="quest-status ${completed ? 'completed' : ''}">${statusLabel}</span>
                </div>
                <h2>${escapeHTML(quest.title)}</h2>
                <h3>${escapeHTML(quest.subtitle || quest.theme || '')}</h3>
                <p>${escapeHTML(quest.description || '')}</p>
                <div class="quest-card-meta">
                    <span>${escapeHTML(quest.theme || '')}</span>
                    <span>${escapeHTML(scoreText)}</span>
                </div>
                <div class="quest-reward-chip">${escapeHTML(quest.completion_badge || quest.reward?.title || '')}</div>
                <button class="quest-card-action" data-action="${completed ? 'replay' : 'start'}" ${locked ? 'disabled' : ''}>
                    ${actionLabel}
                </button>
            </article>
        `;
    }).join('');

    container.querySelectorAll('.quest-card-action').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.quest-select-card');
            const questId = card.dataset.questId;
            const replay = button.dataset.action === 'replay';
            app.startQuest(questId, replay);
        });
    });
};

export const QuestSelection = (app) => {
    const div = document.createElement('div');
    div.className = 'quest-selection-view fade-in';

    div.innerHTML = `
        <div class="quest-selection-bg"></div>
        <header class="quest-selection-header">
            <button class="quest-back-btn" id="quest-selection-back">Back to Map</button>
            <div>
                <div class="quest-eyebrow">Scam Awareness</div>
                <h1>Quest Mode</h1>
            </div>
            <div class="quest-user-pill">${escapeHTML(app.state.user?.name || 'Player')}</div>
        </header>

        <main class="quest-selection-shell">
            <section class="quest-selection-intro">
                <h2>Choose a scam scenario</h2>
                <p>Practice the pause: listen, verify, and decide before a scammer can rush you.</p>
            </section>
            <section class="quest-grid" id="quest-grid">
                <div class="quest-loading glass">Loading quests...</div>
            </section>
        </main>
    `;

    div.querySelector('#quest-selection-back').onclick = () => app.setView('map');

    const grid = div.querySelector('#quest-grid');
    app.fetchQuestSummaries()
        .then(quests => renderQuestCards(app, grid, quests))
        .catch(error => {
            console.error('Failed to render quests:', error);
            grid.innerHTML = `
                <div class="quest-empty glass">
                    <h2>Quest Mode is unavailable</h2>
                    <p>Try again after restarting the Flask server.</p>
                    <button class="btn btn-primary" id="quest-error-back">Back to Map</button>
                </div>
            `;
            grid.querySelector('#quest-error-back').onclick = () => app.setView('map');
        });

    return div;
};

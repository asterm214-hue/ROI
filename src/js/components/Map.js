export const Map = (app) => {
    const div = document.createElement('div');
    div.className = 'map-view';

    // Levels data
    const levels = [
        { id: 'start', num: 1, label: 'Pocket Money', chapter: 'lvl1_scene1' },
        { id: 'lvl2', num: 2, label: 'Salary Life', chapter: 'lvl2_scene1' },
        { id: 'lvl3', num: 3, label: 'Investments', chapter: 'lvl3_scene1', locked: true },
        { id: 'lvl4', num: 4, label: 'Wealth building', chapter: 'lvl4_scene1', locked: true }
    ];

    const currentChapter = app.state.user.current_chapter || 'start';
    
    // Simple logic to determine what is unlocked/completed
    // If user is beyond start, level 1 is completed. 
    // If user is at lvl2 scenes, level 2 is active.
    
    div.innerHTML = `
        <div class="top-bar glass">
            <div class="brand" style="color: var(--primary); font-size: 1.2rem;">ROI MAP</div>
            <div class="stats-container">
                <div class="stat-item glass">💰 ₹${app.state.stats.money}</div>
                <button id="logout-btn" class="btn glass-btn" style="padding: 5px 12px; font-size: 0.8rem; color: #d63031;">Logout</button>
            </div>
        </div>

        <div class="map-scroll">
            <div class="map-path-container">
                <div class="map-path-line"></div>
                ${levels.map((lvl, index) => {
                    let status = '';
                    if (lvl.locked) status = 'locked';
                    else if (currentChapter.startsWith('lvl' + (lvl.num+1)) || currentChapter === 'final_summary') status = 'completed';
                    else if (currentChapter.startsWith('lvl' + lvl.num) || (lvl.num === 1 && currentChapter === 'start')) status = 'active';
                    else status = 'locked';

                    return `
                        <div class="level-node ${status}" 
                             data-chapter="${lvl.chapter}" 
                             data-num="${lvl.num}"
                             data-label="${lvl.label}">
                            ${status === 'completed' ? '✔' : lvl.num}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div style="position: fixed; bottom: 20px; text-align: center; width: 100%; color: white; opacity: 0.6; font-size: 0.8rem;">
            Scroll to see more levels
        </div>
    `;

    // Attach events
    div.querySelectorAll('.level-node:not(.locked)').forEach(node => {
        node.onclick = () => {
            const chapter = node.dataset.chapter;
            app.startLevel(chapter);
        };
    });

    div.querySelector('#logout-btn').onclick = () => app.logout();

    return div;
};

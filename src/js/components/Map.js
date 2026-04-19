import { removeImageBackground } from '../app.js';
import { getPlayerAvatarSrc, isPlayerAvatarCheckerboard } from '../playerText.js';

export const Map = (app) => {
    const div = document.createElement('div');
    div.className = 'map-view fade-in';

    // Levels data with visual coordinates (x, y percentages)
    const levels = [
        { id: 'start', num: 1, label: 'Pocket Money', chapter: 'lvl1_scene1', x: 25, y: 75, desc: 'You just received your pocket money. Time to decide what to do with it!' },
        { id: 'lvl2', num: 2, label: 'First Salary', chapter: 'lvl2_scene1', x: 55, y: 60, desc: 'Your first paycheck is here! Apply the 50-30-20 rule to manage it wisely.' },
        { id: 'lvl3', num: 3, label: 'First Investment', chapter: 'lvl3_scene1', x: 35, y: 45, locked: true, desc: 'Learn how to make your money work for you through smart investments.' },
        { id: 'lvl4', num: 4, label: 'Monthly Expenses', chapter: 'lvl4_scene1', x: 65, y: 30, locked: true, desc: 'Navigate through unexpected bills and learn to optimize your spending.' },
        { id: 'lvl5', num: 5, label: 'Cyber Scam', chapter: 'lvl5_scene1', x: 45, y: 15, locked: true, desc: 'Protect your hard-earned wealth from sophisticated digital threats.' }
    ];

    const currentChapter = app.state.user.current_chapter || 'start';
    const completedLevels = app.state.completed_levels || [];
    
    // Determine active level
    let activeLevel = levels.find(l => {
        if (currentChapter.startsWith('lvl' + l.num)) return true;
        if (l.num === 1 && currentChapter === 'start') return true;
        return false;
    }) || levels[0];

    const avatarImg = getPlayerAvatarSrc(app);

    div.innerHTML = `
        <div class="map-view-bg"></div>

        <div class="map-top-bar">
            <button class="map-back-btn" id="map-back-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                Back
            </button>
            <div class="map-title-pill">ROI <span style="font-style: italic; color: var(--primary);">Quest</span></div>
            <div class="map-stats-bar">
                <button class="map-logout-btn" id="map-logout-btn">Logout</button>
                <div class="map-stat-item">💰 <span>₹${app.state.stats.money}</span></div>
                <div class="map-stat-item">⭐ <span>${app.state.stats.xp || 0} XP</span></div>
            </div>
        </div>

        <div class="map-character-section" style="position: absolute; bottom: 15%; left: 5%; width: 300px; z-index: 10; display: flex; flex-direction: column; align-items: center;">
            <img id="map-avatar" src="${avatarImg}" alt="Avatar" style="width: 100%; height: auto; filter: drop-shadow(0 0 20px rgba(23, 190, 187, 0.5)); opacity: 0; transition: opacity 0.5s ease;">
            <div class="map-char-platform" style="width: 200px; height: 50px; background: radial-gradient(ellipse at center, rgba(23, 190, 187, 0.6) 0%, transparent 70%); border-radius: 50%; margin-top: -30px;"></div>
        </div>

        <svg class="map-path-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path id="map-path" d="M 25 75 Q 55 75 55 60 T 35 45 T 65 30 T 45 15" fill="none" stroke="rgba(23, 190, 187, 0.4)" stroke-width="0.5" stroke-dasharray="1,1" />
        </svg>

        <div class="map-levels-wrapper">
            ${levels.map((lvl) => {
                let status = 'locked';
                if (completedLevels.includes('lvl' + lvl.num)) status = 'completed';
                else if (lvl.num === 1 || completedLevels.includes('lvl' + (lvl.num - 1))) status = 'active';
                if (lvl.num > 3) status = 'locked'; 

                return `
                    <div class="map-level-node ${status} ${activeLevel.num === lvl.num ? 'active' : ''}" 
                         style="left: ${lvl.x}%; top: ${lvl.y}%;"
                         data-chapter="${lvl.chapter}"
                         data-num="${lvl.num}"
                         data-label="${lvl.label}"
                         data-desc="${lvl.desc}">
                        ${status === 'locked' ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' : (status === 'completed' ? '✔' : lvl.num)}
                        <div class="map-level-label">${lvl.label}</div>
                    </div>
                `;
            }).join('')}
        </div>

        <div class="map-info-card" id="map-info-card">
            <div class="map-info-chapter">Chapter ${activeLevel.num}</div>
            <div class="map-info-title" id="info-title">${activeLevel.label}</div>
            <div class="map-info-desc" id="info-desc">${activeLevel.desc}</div>
            <button class="map-resume-btn" id="resume-btn">Resume Story</button>
        </div>

        <div class="map-quest-card" id="map-quest-card">
            <div class="map-quest-kicker">Scam Awareness</div>
            <div class="map-quest-title">Quest Mode</div>
            <button class="map-quest-open-btn" id="quest-mode-btn">Open Quests</button>
        </div>
    `;

    // Process Avatar Background Removal
    const avatarElement = div.querySelector('#map-avatar');
    removeImageBackground(avatarImg, isPlayerAvatarCheckerboard(app)).then(processedSrc => {
        avatarElement.src = processedSrc;
        avatarElement.style.opacity = '1';
    });

    // Interaction logic
    div.querySelectorAll('.map-level-node:not(.locked)').forEach(node => {
        node.onclick = () => {
            app.sound.playSFX('click');
            const num = parseInt(node.dataset.num);
            const label = node.dataset.label;
            const desc = node.dataset.desc;
            const chapter = node.dataset.chapter;

            // Update info card
            div.querySelector('.map-info-chapter').textContent = `Chapter ${num}`;
            div.querySelector('#info-title').textContent = label;
            div.querySelector('#info-desc').textContent = desc;
            
            // Update stats bar to reflect actual state
            const statsBar = div.querySelector('.map-stats-bar');
            statsBar.innerHTML = `
                <button class="map-logout-btn" id="map-logout-btn">Logout</button>
                <div class="map-stat-item">💰 <span>₹${app.state.stats.money}</span></div>
                <div class="map-stat-item">⭐ <span>${app.state.stats.xp || 0} XP</span></div>
            `;
            statsBar.querySelector('#map-logout-btn').onclick = () => {
                app.logout();
            };
            
            // Set active state
            div.querySelectorAll('.map-level-node').forEach(n => n.classList.remove('active'));
            node.classList.add('active');

            activeLevel = levels.find(l => l.num === num);
        };
    });

    div.querySelector('#resume-btn').onclick = () => {
        app.sound.playSFX('click');
        app.startLevel(activeLevel.chapter);
    };

    div.querySelector('#map-quest-card').onclick = () => {
        app.sound.playSFX('click');
        app.setView('questSelection');
    };

    div.querySelector('#quest-mode-btn').onclick = (event) => {
        event.stopPropagation();
        app.setView('questSelection');
    };

    div.querySelector('#map-back-btn').onclick = () => {
        app.setView('auth');
    };

    div.querySelector('#map-logout-btn').onclick = () => {
        app.logout();
    };

    return div;
};

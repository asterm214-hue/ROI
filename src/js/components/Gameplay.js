import { typewriter, removeImageBackground } from '../app.js';

export const Gameplay = (app, node) => {
    const div = document.createElement('div');
    div.className = 'gameplay-view';
    div.style.width = '100%';
    div.style.height = '100vh';

    const avatarImg = app.state.user.gender === 'male' ? 'src/assets/avatar_male.png' : 'src/assets/avatar_female.png';

    div.innerHTML = `
        <div class="game-bg" style="background-image: url('${node.background}');"></div>
        
        <div class="top-bar glass">
            <div class="brand" style="color: var(--primary); font-size: 1.2rem;">ROI</div>
            <div class="stats-container">
                <div class="stat-item glass" title="Money">
                    💰 <span>Money:</span> $${app.state.stats.money}
                </div>
                <div class="stat-item glass" title="Happiness">
                    😊 <span>Happiness:</span> ${app.state.stats.happiness}%
                </div>
                <div class="stat-item glass" title="Risk">
                    ⚠️ <span>Risk:</span> ${app.state.stats.risk}%
                </div>
                <button id="logout-btn" class="btn glass-btn" style="padding: 5px 12px; font-size: 0.8rem; background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); color: #d63031;">Logout</button>
            </div>
        </div>

        <div class="avatar-display" style="position: fixed; bottom: 0; left: 5%; width: 500px; z-index: 5; pointer-events: none;">
            <img id="avatar-img" src="${avatarImg}" alt="Avatar" style="width: 100%; height: auto; transform: scaleX(${app.state.user.gender === 'female' ? -1 : 1}); filter: drop-shadow(0 10px 30px rgba(0,0,0,0.4)); opacity: 0; transition: opacity 0.5s ease;">
        </div>

        <div class="dialogue-box-container fade-in">
            <div class="dialogue-box glass">
                <div class="speaker-name" style="font-weight: 700; color: var(--primary); margin-bottom: 5px; font-family: 'Outfit';">${node.speaker}</div>
                <div id="typewriter-text" class="story-text" style="font-size: 1.1rem; min-height: 60px;"></div>
                
                <div id="choices-container" class="choices-container" style="display: none;">
                    ${node.choices.map((choice, index) => `
                        <button class="btn choice-btn glass-btn" data-index="${index}" style="background: rgba(255,255,255,0.2); border: 1px solid var(--white); color: var(--dark); text-align: center;">
                            ${choice.text}
                        </button>
                    `).join('')}
                </div>

                ${node.choices.length === 0 ? `
                    <button id="restart-btn" class="btn btn-primary" style="margin-top: 20px;">The End - Restart Quest</button>
                ` : ''}
            </div>
        </div>
    `;

    // Process Background Removal
    const avatarImgElement = div.querySelector('#avatar-img');
    const isFemale = app.state.user.gender === 'female';
    removeImageBackground(avatarImg, isFemale).then(processedSrc => {
        avatarImgElement.src = processedSrc;
        avatarImgElement.style.opacity = '1';
    });

    // Start typewriter effect
    const textElement = div.querySelector('#typewriter-text');
    const choicesContainer = div.querySelector('#choices-container');
    
    setTimeout(() => {
        typewriter(textElement, node.text, 25);
        // Show choices after text is mostly done
        setTimeout(() => {
            choicesContainer.style.display = 'flex';
            choicesContainer.classList.add('fade-in');
        }, node.text.length * 25 + 500);
    }, 300);

    // Event Delegation for choices
    const buttons = div.querySelectorAll('.choice-btn');
    buttons.forEach(btn => {
        btn.onclick = () => {
            const index = btn.dataset.index;
            app.handleChoice(node.choices[index].id);
        };
    });

    if (div.querySelector('#restart-btn')) {
        div.querySelector('#restart-btn').onclick = () => {
            location.reload();
        };
    }

    div.querySelector('#logout-btn').onclick = () => app.logout();

    return div;
};

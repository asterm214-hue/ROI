import { typewriter, removeImageBackground } from '../app.js';
import { getPlayerAvatarSrc, getPlayerGender, isPlayerAvatarCheckerboard, personalizePlayerText } from '../playerText.js';
import { getQuestSpeechController } from '../speech.js';

export const Gameplay = (app, node) => {
    const div = document.createElement('div');
    div.className = 'gameplay-view';
    div.style.width = '100%';
    div.style.height = '100vh';

    // Always use player's gender-based avatar as primary character
    const playerAvatarImg = getPlayerAvatarSrc(app);
    // NPC avatar only shown if node has one
    const npcAvatarImg = node && node.avatar ? node.avatar : null;

    if (!node) {
        return Intro(app); // Fallback to intro if node is missing
    }

    const speech = getQuestSpeechController(app);
    const storyText = personalizePlayerText(node.text, app);
    const speakerName = personalizePlayerText(node.speaker, app);
    let speechFallbackTimer = null;

    div.innerHTML = `
        <div class="game-bg" style="background-image: url('${node.background}');"></div>
        
        <div class="top-bar glass">
            <div class="brand" style="color: var(--primary); font-size: 1.25rem; letter-spacing: 1px;">ROI QUEST</div>
            <div class="stats-container">
                <div class="stat-item glass" title="Money">
                    <span class="icon">💰</span> <span class="label">Budget:</span> <span class="value">₹${app.state.stats.money}</span>
                </div>
                <div class="stat-item glass" title="Story Level">
                    <span class="icon">📜</span> <span class="label">Level ${node.id.startsWith('lvl1') ? '1' : (node.id.startsWith('lvl2') ? '2' : '3')}:</span>
                    <div class="xp-bar-container" title="Current XP: ${app.state.stats.xp || 0}">
                        <div class="xp-bar-fill" style="width: ${(app.state.stats.xp || 0) % 100}%"></div>
                    </div>
                </div>
            </div>
            <div class="top-bar-actions">
                <button id="skip-scene-btn" class="btn logout-btn" title="Skip Scene">⏭️</button>
                <button id="nav-map-btn" class="btn logout-btn" title="Back to Map">🗺️</button>
                <button id="logout-btn" class="btn logout-btn" title="Logout">🚪</button>
            </div>
        </div>

        <div class="avatar-display" id="player-avatar-wrap" style="position: fixed; bottom: 0; left: 5%; width: 500px; z-index: 5; pointer-events: none;">
            <img id="player-avatar-img" src="${playerAvatarImg}" alt="Player Avatar" style="width: 100%; height: auto; transform: scaleX(${getPlayerGender(app) === 'female' ? -1 : 1}); filter: drop-shadow(0 10px 30px rgba(0,0,0,0.4)); opacity: 0; transition: opacity 0.5s ease;">
        </div>

        ${npcAvatarImg ? `
        <div class="npc-avatar-display" id="npc-avatar-wrap" style="position: fixed; bottom: 0; right: 5%; width: 500px; z-index: 5; pointer-events: none;">
            <img id="npc-avatar-img" src="${npcAvatarImg}" alt="NPC Avatar" style="width: 100%; height: auto; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.4)); opacity: 0; transition: opacity 0.5s ease;">
        </div>
        ` : ''}

        <div class="dialogue-box-container fade-in">
            <div class="dialogue-box glass">
                <div class="speaker-name" style="font-weight: 700; color: var(--primary); margin-bottom: 5px; font-family: 'Outfit';">${speakerName}</div>
                <div id="typewriter-text" class="story-text" style="font-size: 1.1rem; min-height: 60px;"></div>
                
                <div id="choices-container" class="choices-container" style="display: none;">
                    <div class="predefined-choices" style="width: 100%; display: flex; flex-direction: column; gap: 10px;">
                        ${node.choices.map((choice, index) => `
                            <button class="btn choice-btn glass-btn" data-index="${index}" style="background: rgba(255,255,255,0.2); border: 1px solid var(--white); color: var(--dark); text-align: center;">
                                ${personalizePlayerText(choice.text, app)}
                            </button>
                        `).join('')}
                    </div>

                    ${node.choices.length > 0 ? `
                    <div class="custom-input-container" style="margin-top: 15px; width: 100%; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 15px;">
                        <div style="font-size: 0.8rem; color: var(--accent); margin-bottom: 8px; font-weight: 600;">OR TYPE YOUR OWN ACTION:</div>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="custom-action-input" placeholder="e.g. Try to negotiate a discount..." class="glass-input" style="flex: 1; height: 44px; border-radius: 22px;">
                            <button id="submit-custom-btn" class="btn btn-primary" style="padding: 0 20px; border-radius: 22px;">Send</button>
                        </div>
                    </div>
                    ` : ''}
                </div>

                ${node.choices.length === 0 ? `
                    <button id="map-btn" class="btn btn-primary" style="margin-top: 20px;">Return to Map</button>
                    <button id="restart-btn" class="btn glass-btn" style="margin-top: 10px; opacity: 0.6;">Restart Quest</button>
                ` : ''}
            </div>
        </div>
    `;

    // Process Player Avatar Background Removal
    const playerAvatarElement = div.querySelector('#player-avatar-img');
    const playerAvatarWrap = div.querySelector('#player-avatar-wrap');
    const npcAvatarWrap = div.querySelector('#npc-avatar-wrap');
    removeImageBackground(playerAvatarImg, isPlayerAvatarCheckerboard(app)).then(processedSrc => {
        playerAvatarElement.src = processedSrc;
        playerAvatarElement.style.opacity = '1';
    });

    // Process NPC Avatar Background Removal if exists
    if (npcAvatarImg) {
        const npcAvatarElement = div.querySelector('#npc-avatar-img');
        removeImageBackground(npcAvatarImg, false).then(processedSrc => {
            npcAvatarElement.src = processedSrc;
            npcAvatarElement.style.opacity = '1';
        });
    }

    const getActiveSpeakerWrap = () => {
        const speaker = String(node.speaker || '').toLowerCase();
        const playerName = String(app.state.user?.name || '').toLowerCase();
        const isPlayer = speaker.includes('adam/eve') || (playerName && speaker === playerName);

        if (isPlayer) return playerAvatarWrap;
        if (npcAvatarWrap && !speaker.includes('system')) return npcAvatarWrap;
        return playerAvatarWrap;
    };

    const setSpeakingAnimation = (isSpeaking) => {
        [playerAvatarWrap, npcAvatarWrap].forEach(wrap => wrap?.classList.remove('gameplay-speaking'));
        if (isSpeaking) getActiveSpeakerWrap()?.classList.add('gameplay-speaking');
    };

    const speakStoryText = () => {
        clearTimeout(speechFallbackTimer);
        setSpeakingAnimation(true);
        speech.speak(storyText, {
            onStart: () => setSpeakingAnimation(true),
            onEnd: () => {
                clearTimeout(speechFallbackTimer);
                setSpeakingAnimation(false);
            }
        });
        speechFallbackTimer = setTimeout(() => {
            setSpeakingAnimation(false);
        }, Math.min(12000, Math.max(1800, storyText.length * 60)));
    };

    // Start typewriter effect
    const textElement = div.querySelector('#typewriter-text');
    const choicesContainer = div.querySelector('#choices-container');
    
    setTimeout(() => {
        typewriter(textElement, storyText, 25);
        speakStoryText();
        // Show choices after text is mostly done
        setTimeout(() => {
            choicesContainer.style.display = 'flex';
            choicesContainer.classList.add('fade-in');
        }, storyText.length * 25 + 500);
    }, 300);

    // Event Delegation for choices
    const buttons = div.querySelectorAll('.choice-btn');
    buttons.forEach(btn => {
        btn.onclick = () => {
            // Logic handled in app.handleChoice
            clearTimeout(speechFallbackTimer);
            speech.stop();
            const index = btn.dataset.index;
            app.handleChoice(node.choices[index].id);
        };
    });

    if (div.querySelector('#map-btn')) {
        div.querySelector('#map-btn').onclick = () => {
            clearTimeout(speechFallbackTimer);
            speech.stop();
            app.setView('map');
        };
    }

    if (div.querySelector('#restart-btn')) {
        div.querySelector('#restart-btn').onclick = () => {
            clearTimeout(speechFallbackTimer);
            speech.stop();
            app.state.currentChapter = app.state.view === 'gameplay' && node.id.startsWith('lvl1') ? 'lvl1_scene1' : 'lvl2_scene1';
            app.startLevel(app.state.currentChapter);
        };
    }

    div.querySelector('#skip-scene-btn').onclick = () => {
        app.sound.playSFX('click');
        clearInterval(typingTimer);
        const textEl = div.querySelector('#typewriter-text');
        if (textEl) textEl.innerHTML = storyText;
        
        const choicesContainer = div.querySelector('#choices-container');
        if (choicesContainer && choicesContainer.style.display === 'none') {
            // If still typing/showing dialogue, show choices immediately
            choicesContainer.style.display = 'flex';
            div.querySelectorAll('.choice-btn').forEach((btn, i) => {
                setTimeout(() => btn.classList.add('fade-in-up'), i * 100);
            });
        } else if (node.choices && node.choices.length > 0) {
            // If already at choices, pick the first one as default
            app.handleChoice(node.choices[0].id);
        } else if (node.choices.length === 0) {
            app.setView('map');
        }
    };

    const submitCustomAction = () => {
        const input = div.querySelector('#custom-action-input');
        if (input && input.value.trim()) {
            app.sound.playSFX('click');
            app.handleChoice('custom_input', input.value.trim());
        }
    };

    const customBtn = div.querySelector('#submit-custom-btn');
    if (customBtn) customBtn.onclick = submitCustomAction;

    const customInput = div.querySelector('#custom-action-input');
    if (customInput) {
        customInput.onkeypress = (e) => {
            if (e.key === 'Enter') submitCustomAction();
        };
    }

    div.querySelector('#nav-map-btn').onclick = () => {
        clearTimeout(speechFallbackTimer);
        speech.stop();
        app.setView('map');
    };

    div.querySelector('#logout-btn').onclick = () => {
        clearTimeout(speechFallbackTimer);
        speech.stop();
        app.logout();
    };

    return div;
};

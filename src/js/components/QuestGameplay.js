import { removeImageBackground } from '../app.js';
import { getQuestSpeechController } from '../speech.js';
import { getPlayerAvatarSrc, personalizePlayerText } from '../playerText.js';
import {
    getFirstSceneId,
    getSceneById,
    getSceneProgressLabel,
    normalizeSpeakerKey,
    resolveNextSceneId,
    resolveQuestResultPath
} from '../questEngine.js';

const escapeHTML = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const speakerDisplayName = (speaker, app) => {
    return personalizePlayerText(speaker || 'System', app);
};

const moodLabel = (mood = 'idle') => {
    const labels = {
        idle: 'Listening',
        speaking: 'Speaking',
        happy: 'Confident',
        worried: 'Worried',
        sad: 'Upset',
        shocked: 'Alert'
    };
    return labels[mood] || labels.idle;
};

export const QuestGameplay = (app) => {
    const div = document.createElement('div');
    div.className = 'quest-gameplay-view fade-in';

    let quest = app.state.activeQuest;
    let progress = app.state.activeQuestProgress;
    let scene = null;
    let lineIndex = 0;
    let typingTimer = null;
    let speechFallbackTimer = null;
    let currentLineText = '';
    let currentSpeaker = 'System';

    const speech = getQuestSpeechController(app);
    app.questAvatarCache = app.questAvatarCache || {};

    const renderLoading = (message = 'Loading Quest Mode...') => {
        div.innerHTML = `
            <div class="quest-selection-bg"></div>
            <div class="quest-loading glass">${escapeHTML(message)}</div>
        `;
    };

    if (!quest && app.state.currentQuestId) {
        renderLoading();
        app.loadQuest(app.state.currentQuestId)
            .then(() => {
                if (div.isConnected) app.render();
            })
            .catch(() => {
                if (div.isConnected) {
                    renderLoading('Unable to load this quest.');
                }
            });
        return div;
    }

    if (!quest) {
        renderLoading('Pick a quest to begin.');
        setTimeout(() => app.setView('questSelection'), 0);
        return div;
    }

    progress = progress || {
        quest_id: quest.id,
        started: true,
        completed: false,
        current_scene_id: getFirstSceneId(quest),
        choices: [],
        risk_score: 0,
        quiz_score: 0,
        quiz_total: 0
    };

    const playerAvatar = getPlayerAvatarSrc(app);

    const actorAssets = {
        player: playerAvatar,
        scammer: 'src/assets/char_friend_1_m.png',
        friend: 'src/assets/char_friend_2_f.png',
        system: 'src/assets/char_mother.png'
    };

    div.innerHTML = `
        <div class="quest-scene-bg" id="quest-scene-bg"></div>
        <div class="quest-overlay"></div>

        <header class="quest-game-topbar">
            <button class="quest-back-btn" id="quest-back-map">Back to Quests</button>
            <div class="quest-game-title">
                <span>${escapeHTML(quest.title)}</span>
                <strong>${escapeHTML(quest.subtitle)}</strong>
            </div>
            <div class="quest-top-actions">
                <span class="quest-progress-pill" id="quest-progress-pill">Scene 1/1</span>
            </div>
        </header>

        <main class="quest-stage">
            <aside class="quest-character-panel">
                <div class="quest-avatar-shell state-idle mood-idle" id="quest-avatar-shell">
                    <img id="quest-speaker-avatar" src="${actorAssets.system}" alt="Quest character">
                </div>
                <div class="quest-speaker-pill" id="quest-speaker-pill">System</div>
                <div class="quest-mood-pill" id="quest-mood-pill">Listening</div>
            </aside>

            <section class="quest-main-panel" id="quest-main-panel"></section>
        </main>
    `;

    const bg = div.querySelector('#quest-scene-bg');
    const panel = div.querySelector('#quest-main-panel');
    const progressPill = div.querySelector('#quest-progress-pill');
    const avatarShell = div.querySelector('#quest-avatar-shell');
    const avatarImg = div.querySelector('#quest-speaker-avatar');
    const speakerPill = div.querySelector('#quest-speaker-pill');
    const moodPill = div.querySelector('#quest-mood-pill');

    const saveProgressState = () => {
        app.state.activeQuestProgress = progress;
        app.saveState();
    };

    const setSceneId = (sceneId) => {
        progress = {
            ...progress,
            current_scene_id: sceneId
        };
        saveProgressState();
        renderScene();
    };

    const typeText = (element, text, done) => {
        clearInterval(typingTimer);
        element.textContent = '';
        let index = 0;
        typingTimer = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index += 1;
                return;
            }

            clearInterval(typingTimer);
            typingTimer = null;
            if (done) done();
        }, 24);
    };

    const setAvatarState = async (speaker, mood = 'idle') => {
        const key = normalizeSpeakerKey(speaker);
        const src = actorAssets[key] || actorAssets.system;
        const checkerboard = src.includes('avatar_female');

        currentSpeaker = speaker;
        speakerPill.textContent = speakerDisplayName(speaker, app);
        moodPill.textContent = moodLabel(mood);
        avatarShell.className = `quest-avatar-shell state-idle mood-${mood || 'idle'}`;

        if (app.questAvatarCache[src]) {
            avatarImg.src = app.questAvatarCache[src];
            return;
        }

        avatarImg.src = src;
        const processed = await removeImageBackground(src, checkerboard);
        app.questAvatarCache[src] = processed;
        if (normalizeSpeakerKey(currentSpeaker) === key) {
            avatarImg.src = processed;
        }
    };

    const speakText = (text) => {
        currentLineText = text;
        clearTimeout(speechFallbackTimer);
        avatarShell.classList.remove('state-idle');
        avatarShell.classList.add('state-speaking');
        speech.speak(text, {
            onStart: () => {
                avatarShell.classList.remove('state-idle');
                avatarShell.classList.add('state-speaking');
            },
            onEnd: () => {
                clearTimeout(speechFallbackTimer);
                avatarShell.classList.remove('state-speaking');
                avatarShell.classList.add('state-idle');
            }
        });
        speechFallbackTimer = setTimeout(() => {
            avatarShell.classList.remove('state-speaking');
            avatarShell.classList.add('state-idle');
        }, Math.min(12000, Math.max(1800, String(text || '').length * 60)));
    };

    const renderDialogueScene = (activeScene) => {
        lineIndex = 0;
        panel.className = `quest-main-panel dialogue ${activeScene.result_path || ''}`;
        panel.innerHTML = `
            <div class="quest-dialogue-card">
                <div class="quest-dialogue-meta">
                    <span>${escapeHTML(activeScene.stage || 'story')}</span>
                    ${activeScene.result_path ? `<strong>${activeScene.result_path === 'avoids_scam' ? 'Avoided Scam' : 'Scam Outcome'}</strong>` : ''}
                </div>
                <h2 id="quest-line-speaker">System</h2>
                <p id="quest-line-text" class="quest-line-text"></p>
                <button class="quest-next-btn" id="quest-line-next">Next</button>
            </div>
        `;

        const speakerEl = panel.querySelector('#quest-line-speaker');
        const textEl = panel.querySelector('#quest-line-text');
        const nextBtn = panel.querySelector('#quest-line-next');

        const showLine = () => {
            const line = activeScene.lines[lineIndex];
            const isLastLine = lineIndex === activeScene.lines.length - 1;
            nextBtn.disabled = true;
            nextBtn.textContent = isLastLine ? 'Continue' : 'Next';
            speakerEl.textContent = speakerDisplayName(line.speaker, app);
            setAvatarState(line.speaker, line.mood || 'idle');
            const displayText = personalizePlayerText(line.text, app);
            typeText(textEl, displayText, () => {
                nextBtn.disabled = false;
            });
            speakText(displayText);
        };

        nextBtn.onclick = () => {
            speech.stop();
            if (lineIndex < activeScene.lines.length - 1) {
                lineIndex += 1;
                showLine();
                return;
            }

            if (activeScene.result_path) {
                progress = {
                    ...progress,
                    result_path: activeScene.result_path
                };
                saveProgressState();
            }

            const nextSceneId = resolveNextSceneId(quest, activeScene, progress);
            setSceneId(nextSceneId);
        };

        showLine();
    };

    const renderChoiceScene = (activeScene) => {
        panel.className = 'quest-main-panel choices';
        panel.innerHTML = `
            <div class="quest-choice-card">
                <div class="quest-dialogue-meta">
                    <span>${escapeHTML(activeScene.decision_title || 'Decision')}</span>
                </div>
                <h2>${escapeHTML(personalizePlayerText(activeScene.prompt || 'What would you do?', app))}</h2>
                <div class="quest-choice-list">
                    ${(activeScene.choices || []).map(choice => `
                        <button class="quest-choice-btn" data-choice-id="${escapeHTML(choice.id)}">
                            ${escapeHTML(personalizePlayerText(choice.text, app))}
                        </button>
                    `).join('')}
                </div>
                <div class="quest-choice-feedback" id="quest-choice-feedback"></div>
            </div>
        `;

        setAvatarState(activeScene.speaker || 'System', 'speaking');
        speakText(personalizePlayerText(activeScene.prompt || 'What would you do?', app));

        const feedback = panel.querySelector('#quest-choice-feedback');
        panel.querySelectorAll('.quest-choice-btn').forEach(button => {
            button.onclick = async () => {
                speech.stop();
                const selectedChoice = activeScene.choices.find(choice => choice.id === button.dataset.choiceId);
                panel.querySelectorAll('.quest-choice-btn').forEach(item => {
                    item.disabled = true;
                    item.classList.toggle('selected', item === button);
                });
                button.classList.add((selectedChoice.risk_points || 0) > 0 ? 'risky' : 'safe');

                const result = await app.submitQuestChoice(activeScene, selectedChoice);
                progress = result.progress;
                const hint = result.selected_choice?.outcome_hint || selectedChoice.outcome_hint || 'Choice saved.';
                feedback.innerHTML = `
                    <p>${escapeHTML(hint)}</p>
                    <button class="quest-next-btn" id="quest-choice-next">Continue</button>
                `;
                feedback.querySelector('#quest-choice-next').onclick = () => {
                    setSceneId(progress.current_scene_id);
                };
            };
        });
    };

    const renderQuizScene = (activeScene) => {
        const answers = {};
        panel.className = 'quest-main-panel quiz';
        panel.innerHTML = `
            <div class="quest-quiz-card">
                <div class="quest-dialogue-meta">
                    <span>${escapeHTML(activeScene.title || 'Mini Quiz')}</span>
                </div>
                <h2>${escapeHTML(personalizePlayerText(activeScene.prompt, app))}</h2>
                <div class="quest-quiz-items">
                    ${(activeScene.items || []).map(item => `
                        <div class="quest-quiz-item" data-item-id="${escapeHTML(item.id)}">
                            <p>${escapeHTML(personalizePlayerText(item.text, app))}</p>
                            <div class="quest-answer-row">
                                <button data-answer="safe">Safe</button>
                                <button data-answer="suspicious">Suspicious</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="quest-next-btn" id="quest-submit-quiz" disabled>Submit Answers</button>
                <div class="quest-quiz-feedback" id="quest-quiz-feedback"></div>
            </div>
        `;

        setAvatarState(activeScene.speaker || 'System', 'speaking');
        speakText(personalizePlayerText(activeScene.prompt, app));

        const submitBtn = panel.querySelector('#quest-submit-quiz');
        const feedback = panel.querySelector('#quest-quiz-feedback');
        const syncSubmitState = () => {
            submitBtn.disabled = Object.keys(answers).length !== (activeScene.items || []).length;
        };

        panel.querySelectorAll('.quest-quiz-item').forEach(itemEl => {
            itemEl.querySelectorAll('button[data-answer]').forEach(button => {
                button.onclick = () => {
                    const itemId = itemEl.dataset.itemId;
                    answers[itemId] = button.dataset.answer;
                    itemEl.querySelectorAll('button[data-answer]').forEach(item => item.classList.remove('selected'));
                    button.classList.add('selected');
                    syncSubmitState();
                };
            });
        });

        submitBtn.onclick = async () => {
            speech.stop();
            submitBtn.disabled = true;
            const result = await app.submitQuestQuiz(activeScene, answers);
            progress = result.progress;

            (result.item_results || []).forEach(item => {
                const itemEl = panel.querySelector(`[data-item-id="${item.id}"]`);
                if (itemEl) itemEl.classList.add(item.correct ? 'correct' : 'incorrect');
            });

            feedback.innerHTML = `
                <p>${escapeHTML(result.feedback || '')}</p>
                <div class="quest-score-chip">Score ${result.score}/${result.total}</div>
                ${result.passed
                    ? '<button class="quest-next-btn" id="quest-quiz-next">Continue</button>'
                    : '<button class="quest-next-btn secondary" id="quest-quiz-retry">Retry Quiz</button>'}
            `;
            setAvatarState('System', result.passed ? 'happy' : 'worried');
            speakText(result.feedback || '');

            if (result.passed) {
                feedback.querySelector('#quest-quiz-next').onclick = () => {
                    setSceneId(progress.current_scene_id);
                };
            } else {
                feedback.querySelector('#quest-quiz-retry').onclick = () => {
                    renderQuizScene(activeScene);
                };
            }
        };
    };

    const renderLessonScene = (activeScene) => {
        const resultPath = progress.result_path || resolveQuestResultPath(quest, progress);
        const outcome = quest.outcomes?.[resultPath];
        panel.className = `quest-main-panel lesson ${resultPath}`;
        panel.innerHTML = `
            <div class="quest-lesson-card">
                <div class="quest-reward-big">${escapeHTML(quest.reward?.badge || '★')}</div>
                <div class="quest-dialogue-meta">
                    <span>${escapeHTML(outcome?.label || 'Result')}</span>
                    <strong>${escapeHTML(progress.quiz_total ? `Quiz ${progress.quiz_score}/${progress.quiz_total}` : 'Quiz complete')}</strong>
                </div>
                <h2>${escapeHTML(activeScene.title || 'Key Takeaways:')}</h2>
                <ul class="quest-takeaways">
                    ${(activeScene.takeaways || []).map(item => `<li>${escapeHTML(personalizePlayerText(item, app))}</li>`).join('')}
                </ul>
                <div class="quest-complete-banner">${escapeHTML(personalizePlayerText(activeScene.complete_text || quest.reward?.title || 'Quest Completed', app))}</div>
                <div class="quest-lesson-actions">
                    <button class="quest-next-btn" id="quest-complete-btn">Complete Quest</button>
                    <button class="quest-next-btn secondary" id="quest-replay-btn">Replay</button>
                </div>
            </div>
        `;

        setAvatarState(activeScene.speaker || 'System', 'happy');
        speakText(personalizePlayerText(activeScene.complete_text || quest.reward?.title || 'Quest completed.', app));

        panel.querySelector('#quest-complete-btn').onclick = async () => {
            speech.stop();
            await app.completeQuest(activeScene.id, resultPath);
            app.setView('questSelection');
        };

        panel.querySelector('#quest-replay-btn').onclick = () => {
            speech.stop();
            app.startQuest(quest.id, true);
        };
    };

    const renderScene = () => {
        scene = getSceneById(quest, progress.current_scene_id) || getSceneById(quest, getFirstSceneId(quest));
        if (!scene) {
            panel.innerHTML = '<div class="quest-empty glass">Quest scene not found.</div>';
            return;
        }

        clearInterval(typingTimer);
        clearTimeout(speechFallbackTimer);
        speech.stop();
        bg.style.backgroundImage = `url('${scene.background || 'src/assets/login_bg.png'}')`;
        progressPill.textContent = getSceneProgressLabel(quest, scene.id);

        if (scene.type === 'choice') {
            renderChoiceScene(scene);
        } else if (scene.type === 'quiz') {
            renderQuizScene(scene);
        } else if (scene.type === 'lesson') {
            renderLessonScene(scene);
        } else {
            renderDialogueScene(scene);
        }
    };

    div.querySelector('#quest-back-map').onclick = () => {
        clearInterval(typingTimer);
        clearTimeout(speechFallbackTimer);
        speech.stop();
        app.setView('questSelection');
    };

    renderScene();

    return div;
};

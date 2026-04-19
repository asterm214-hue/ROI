import { Auth } from './components/Auth.js';
import { Map } from './components/Map.js';
import { Intro } from './components/Intro.js';
import { Gameplay } from './components/Gameplay.js';
import { Feedback } from './components/Feedback.js';
import { Dashboard } from './components/Dashboard.js';
import { QuestSelection } from './components/QuestSelection.js';
import { QuestGameplay } from './components/QuestGameplay.js';
import {
    completeLocalQuest,
    createEmptyQuestProgress,
    loadLocalQuestProgress,
    recordLocalQuestChoice,
    recordLocalQuestQuiz,
    resetLocalQuestProgress,
    saveLocalQuestProgress
} from './questEngine.js';
import { soundEngine } from './soundEngine.js';

class App {
    constructor() {
        this.container = document.getElementById('view-container');
        this.state = {
            view: 'auth',
            user: null,
            stats: {
                money: 0,
                xp: 0
            },
            currentChapter: 'start',
            currentScenario: null,
            completed_levels: [],
            questSummaries: [],
            activeQuest: null,
            activeQuestProgress: null,
            currentQuestId: null,
            history: []
        };
        
        this.apiBase = window.location.origin;
        this.sound = soundEngine;
        this.loadState();
        this.init();
    }

    saveState() {
        localStorage.setItem('roi_state', JSON.stringify({
            user: this.state.user,
            stats: this.state.stats,
            currentChapter: this.state.currentChapter,
            currentScenario: this.state.currentScenario,
            completed_levels: this.state.completed_levels,
            currentQuestId: this.state.currentQuestId,
            activeQuestProgress: this.state.activeQuestProgress
        }));
    }

    loadState() {
        const saved = localStorage.getItem('roi_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.state.user = parsed.user;
            this.state.stats = parsed.stats;
            this.state.currentChapter = parsed.currentChapter;
            this.state.currentScenario = parsed.currentScenario;
            this.state.completed_levels = parsed.completed_levels || [];
            this.state.currentQuestId = parsed.currentQuestId || null;
            this.state.activeQuestProgress = parsed.activeQuestProgress || null;
        }
    }

    init() {
        this.render();
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.setView(e.state.view, false);
            }
        });
    }

    setView(view, pushHistory = true) {
        this.state.view = view;
        if (pushHistory) {
            history.pushState({ view }, '', `#${view}`);
        }
        this.saveState();
        this.render();
        window.scrollTo(0, 0);
    }

    async startLevel(chapterId) {
        try {
            // Only set starting stats if we're moving to a NEW level or starting fresh
            let startStats = null;
            
            const isLevelEntry = ['lvl1_scene1', 'lvl2_scene1', 'lvl3_scene1'].includes(chapterId);
            const isDifferentLevel = !this.state.currentChapter || !this.state.currentChapter.startsWith(chapterId.substring(0, 4));
            const isNewLevel = isLevelEntry || isDifferentLevel;
            
            if (isNewLevel || this.state.stats.money === 0) {
                startStats = { money: 0, xp: this.state.stats.xp || 0 };
                if (chapterId.startsWith('lvl1')) startStats.money = 5000;
                else if (chapterId.startsWith('lvl2')) startStats.money = 50000;
                else if (chapterId.startsWith('lvl3')) startStats.money = 500000;
            } else {
                // Keep current stats for resuming
                startStats = {
                    money: this.state.stats.money,
                    xp: this.state.stats.xp || 0
                };
            }

            const response = await fetch(`${this.apiBase}/start_game`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.state.user.id,
                    chapter_id: chapterId,
                    stats: startStats
                })
            });
            const data = await response.json();
            
            this.state.currentScenario = data.scenario;
            this.state.currentChapter = chapterId;
            this.state.stats = {
                money: data.user.money,
                xp: data.user.xp || 0
            };
            this.saveState();
            this.setView('intro');
        } catch (error) {
            console.error('Failed to load level:', error);
        }
    }

    async fetchQuestSummaries() {
        try {
            const response = await fetch(`${this.apiBase}/quests?user_id=${this.state.user.id}`);
            if (!response.ok) throw new Error('Quest list request failed');

            const data = await response.json();
            this.state.questSummaries = data.quests || [];
            return this.state.questSummaries;
        } catch (error) {
            console.warn('Using local quest list fallback:', error);
            const response = await fetch(`${this.apiBase}/quests.json`);
            const data = await response.json();
            this.state.questSummaries = (data.quests || []).map(quest => ({
                id: quest.id,
                title: quest.title,
                subtitle: quest.subtitle,
                theme: quest.theme,
                description: quest.description,
                reward: quest.reward,
                completion_badge: quest.completion_badge,
                status: 'available',
                progress: loadLocalQuestProgress(this.state.user.id, quest)
            }));
            return this.state.questSummaries;
        }
    }

    async loadQuest(questId) {
        try {
            const response = await fetch(`${this.apiBase}/quests/${questId}?user_id=${this.state.user.id}`);
            if (!response.ok) throw new Error('Quest detail request failed');

            const data = await response.json();
            this.state.activeQuest = data.quest;
            this.state.activeQuestProgress = data.progress;
            this.state.currentQuestId = questId;
            this.saveState();
            return data;
        } catch (error) {
            console.warn('Using local quest detail fallback:', error);
            const response = await fetch(`${this.apiBase}/quests.json`);
            const data = await response.json();
            const quest = (data.quests || []).find(item => item.id === questId);
            if (!quest) throw new Error('Quest not found');

            const progress = loadLocalQuestProgress(this.state.user.id, quest);
            this.state.activeQuest = quest;
            this.state.activeQuestProgress = progress;
            this.state.currentQuestId = questId;
            this.saveState();
            return { quest, progress };
        }
    }

    async startQuest(questId, replay = false) {
        try {
            const response = await fetch(`${this.apiBase}/quests/${questId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.state.user.id,
                    replay
                })
            });
            if (!response.ok) throw new Error('Quest start request failed');

            const data = await response.json();
            this.state.activeQuest = data.quest;
            this.state.activeQuestProgress = data.progress;
            this.state.currentQuestId = questId;
            this.saveState();
            this.setView('questGameplay');
        } catch (error) {
            console.warn('Starting quest locally:', error);
            const { quest } = await this.loadQuest(questId);
            const progress = replay
                ? resetLocalQuestProgress(this.state.user.id, quest)
                : {
                    ...loadLocalQuestProgress(this.state.user.id, quest),
                    started: true
                };

            if (!progress.current_scene_id) {
                progress.current_scene_id = quest.scenes[0].id;
            }
            saveLocalQuestProgress(this.state.user.id, progress);
            this.state.activeQuest = quest;
            this.state.activeQuestProgress = progress;
            this.state.currentQuestId = questId;
            this.saveState();
            this.setView('questGameplay');
        }
    }

    async submitQuestChoice(scene, choice) {
        try {
            const response = await fetch(`${this.apiBase}/quests/${this.state.currentQuestId}/choice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.state.user.id,
                    scene_id: scene.id,
                    choice_id: choice.id
                })
            });
            if (!response.ok) throw new Error('Quest choice request failed');

            const data = await response.json();
            this.state.activeQuestProgress = data.progress;
            this.saveState();
            return data;
        } catch (error) {
            console.warn('Saving quest choice locally:', error);
            const progress = this.state.activeQuestProgress || createEmptyQuestProgress(this.state.activeQuest);
            const nextProgress = recordLocalQuestChoice(this.state.user.id, progress, scene, choice);
            this.state.activeQuestProgress = nextProgress;
            this.saveState();
            return {
                status: 'local',
                progress: nextProgress,
                next_scene_id: nextProgress.current_scene_id,
                selected_choice: choice
            };
        }
    }

    async submitQuestQuiz(scene, answers) {
        try {
            const response = await fetch(`${this.apiBase}/quests/${this.state.currentQuestId}/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.state.user.id,
                    scene_id: scene.id,
                    answers
                })
            });
            if (!response.ok) throw new Error('Quest quiz request failed');

            const data = await response.json();
            this.state.activeQuestProgress = data.progress;
            this.saveState();
            return data;
        } catch (error) {
            console.warn('Saving quest quiz locally:', error);
            const progress = this.state.activeQuestProgress || createEmptyQuestProgress(this.state.activeQuest);
            const data = recordLocalQuestQuiz(this.state.user.id, progress, scene, answers);
            this.state.activeQuestProgress = data.progress;
            this.saveState();
            return {
                status: 'local',
                ...data
            };
        }
    }

    async completeQuest(currentSceneId, resultPath) {
        try {
            const response = await fetch(`${this.apiBase}/quests/${this.state.currentQuestId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.state.user.id,
                    current_scene_id: currentSceneId,
                    result_path: resultPath
                })
            });
            if (!response.ok) throw new Error('Quest completion request failed');

            const data = await response.json();
            this.state.activeQuestProgress = data.progress;
            this.saveState();
            return data;
        } catch (error) {
            console.warn('Completing quest locally:', error);
            const progress = this.state.activeQuestProgress || createEmptyQuestProgress(this.state.activeQuest);
            const nextProgress = completeLocalQuest(
                this.state.user.id,
                this.state.activeQuest,
                progress,
                currentSceneId
            );
            this.state.activeQuestProgress = nextProgress;
            this.saveState();
            return {
                status: 'local',
                progress: nextProgress,
                reward: this.state.activeQuest.reward
            };
        }
    }

    updateUser(data) {
        if (this.state.user) {
            this.state.user = { ...this.state.user, ...data };
        }
    }

    async signUp(userData) {
        try {
            const response = await fetch(`${this.apiBase}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            this.state.user = data.user;
            this.state.stats = {
                money: data.user.money,
                xp: data.user.xp || 0
            };
            this.state.completed_levels = data.user.completed_levels || [];
            this.state.currentScenario = data.first_scenario;
            this.state.currentChapter = data.user.current_chapter;
            this.setView('map');
        } catch (error) {
            console.error('Signup failed:', error);
            alert(error.message || 'Signup failed');
        }
    }

    async logIn(credentials) {
        try {
            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            this.state.user = data.user;
            this.state.stats = {
                money: data.user.money,
                xp: data.user.xp || 0
            };
            this.state.completed_levels = data.user.completed_levels || [];
            this.state.currentScenario = data.current_scenario;
            this.state.currentChapter = data.user.current_chapter;
            
            // Go to map after login
            this.setView('map');
        } catch (error) {
            console.error('Login failed:', error);
            alert(error.message || 'Login failed. Check your credentials.');
        }
    }

    logout() {
        localStorage.removeItem('roi_state');
        this.state.user = null;
        this.state.stats = { money: 0, xp: 0 };
        this.state.currentChapter = 'start';
        this.state.currentScenario = null;
        this.state.questSummaries = [];
        this.state.activeQuest = null;
        this.state.activeQuestProgress = null;
        this.state.currentQuestId = null;
        this.state.history = [];
        this.setView('auth');
    }

    async handleChoice(choiceId, customText = null) {
        try {
            this.sound.playSFX('click');
            
            // Show processing state for suspense
            const dialogueBox = document.querySelector('.dialogue-box');
            if (dialogueBox) {
                const originalContent = dialogueBox.innerHTML;
                dialogueBox.innerHTML = `
                    <div class="processing-decision">
                        <div class="spinner"></div>
                        <p>Market is fluctuating...</p>
                        <p style="font-size: 0.8rem; opacity: 0.7;">Analyzing decision impact</p>
                    </div>
                `;
                // Wait for 1.5 seconds for suspense
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const response = await fetch(`${this.apiBase}/make_choice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.state.user.id,
                    choice_id: choiceId,
                    custom_text: customText
                })
            });
            const data = await response.json();
            
            const oldMoney = this.state.stats.money;
            this.state.stats = {
                money: data.user.money,
                xp: data.user.xp || 0
            };
            this.state.completed_levels = data.user.completed_levels || [];

            this.state.history.push({
                node: this.state.currentChapter,
                choice: choiceId,
                impact: data.impact,
                mentor: data.mentor_opinion,
                ai_feedback: data.ai_feedback,
                story_outcome: data.story_outcome,
                oldMoney: oldMoney
            });

            this.state.pendingScenario = data.next_scenario;
            
            // Skip feedback if no impact and no mentor text
            const hasImpact = data.impact && (data.impact.money || data.impact.xp);
            const hasMentor = data.mentor_opinion;
            
            if (!hasImpact && !hasMentor) {
                this.continueStory();
            } else {
                this.setView('feedback');
            }
        } catch (error) {
            console.error('Failed to submit choice:', error);
        }
    }

    continueStory() {
        if (this.state.pendingScenario) {
            this.state.currentScenario = this.state.pendingScenario;
            this.state.currentChapter = this.state.pendingScenario.id;
            this.state.pendingScenario = null;
            
            // If the next scenario is the 'start' (Map) or a summary, potentially redirect
            if (this.state.currentChapter === 'start' || this.state.currentChapter === 'final_summary') {
                this.setView('map');
                return;
            }
        }
        this.setView('gameplay');
    }

    render() {
        this.container.innerHTML = '';
        
        // Redirect to auth if no user is present
        if (!this.state.user && this.state.view !== 'auth') {
            this.state.view = 'auth';
        }

        const viewMap = {
            auth: () => Auth(this),
            map: () => Map(this),
            intro: () => Intro(this),
            gameplay: () => Gameplay(this, this.state.currentScenario),
            feedback: () => Feedback(this, this.state.history[this.state.history.length - 1]),
            dashboard: () => Dashboard(this),
            questSelection: () => QuestSelection(this),
            questGameplay: () => QuestGameplay(this)
        };

        const viewElement = (viewMap[this.state.view] || viewMap.map)();
        viewElement.classList.add('fade-in');
        this.container.appendChild(viewElement);

        // Global Music Toggle in top-right
        if (this.state.view !== 'auth') {
            this.renderMusicToggle();
        }
    }

    renderMusicToggle() {
        let toggle = document.getElementById('global-music-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.id = 'global-music-toggle';
            toggle.className = 'music-toggle-btn glass';
            document.body.appendChild(toggle);
        }
        
        const isMuted = this.sound.muted;
        toggle.innerHTML = isMuted ? '🔇' : '🎵';
        toggle.title = isMuted ? 'Unmute' : 'Mute';
        
        toggle.onclick = (e) => {
            e.stopPropagation();
            const nowActive = this.sound.toggleMusic();
            toggle.innerHTML = nowActive ? '🎵' : '🔇';
            toggle.title = nowActive ? 'Mute' : 'Unmute';
        };

        // Ensure music starts on first user action if not already playing
        this.sound.startMusic();
    }
}

// Typewriter Utility
export const typewriter = (element, text, speed = 30) => {
    element.innerHTML = '';
    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(interval);
        }
    }, speed);
    return interval;
};

// Background Removal Utility (Removes white backgrounds/checkerboards)
export const removeImageBackground = (src, isCheckerboard = false) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        // Cache buster to ensure latest asset is used
        img.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                if (isCheckerboard) {
                    // Remove checkerboard: check for gray/white patterns usually found in AI generated "transparent" images
                    const isWhite = r > 235 && g > 235 && b > 235;
                    const isGray = (r > 180 && r < 210) && (g > 180 && g < 210) && (b > 180 && b < 210);
                    const isNearGray = Math.abs(r - g) < 5 && Math.abs(g - b) < 5 && r > 180;
                    const isBlack = r < 15 && g < 15 && b < 15;
                    if (isWhite || isGray || isNearGray || isBlack) data[i + 3] = 0;
                } else {
                    // Remove white/near-white or black background
                    const isWhite = r > 235 && g > 235 && b > 235;
                    const isBlack = r < 15 && g < 15 && b < 15;
                    if (isWhite || isBlack) data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = () => resolve(src);
    });
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

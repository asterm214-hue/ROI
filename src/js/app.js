import { Auth } from './components/Auth.js';
import { Map } from './components/Map.js';
import { Intro } from './components/Intro.js';
import { Gameplay } from './components/Gameplay.js';
import { Feedback } from './components/Feedback.js';
import { Dashboard } from './components/Dashboard.js';

class App {
    constructor() {
        this.container = document.getElementById('view-container');
        this.state = {
            view: 'auth',
            user: null,
            stats: {
                money: 0,
                happiness: 0,
                risk: 0
            },
            currentChapter: 'start',
            currentScenario: null,
            completed_levels: [],
            history: []
        };
        
        this.apiBase = window.location.origin;
        this.loadState();
        this.init();
    }

    saveState() {
        localStorage.setItem('roi_state', JSON.stringify({
            user: this.state.user,
            stats: this.state.stats,
            currentChapter: this.state.currentChapter,
            currentScenario: this.state.currentScenario,
            completed_levels: this.state.completed_levels
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
            // Set starting stats based on level
            let startStats = { money: 0, happiness: 50, risk: 10 };
            if (chapterId.startsWith('lvl1')) startStats.money = 5000;
            else if (chapterId.startsWith('lvl2')) startStats.money = 50000;
            else if (chapterId.startsWith('lvl3')) startStats.money = 500000;

            const response = await fetch(`${this.apiBase}/start-level`, {
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
                happiness: data.user.happiness,
                risk: data.user.risk
            };
            this.saveState();
            this.setView('intro');
        } catch (error) {
            console.error('Failed to load level:', error);
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
                happiness: data.user.happiness,
                risk: data.user.risk
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
                happiness: data.user.happiness,
                risk: data.user.risk
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
        this.state.stats = { money: 0, happiness: 0, risk: 0 };
        this.state.currentChapter = 'start';
        this.state.currentScenario = null;
        this.state.history = [];
        this.setView('auth');
    }

    async handleChoice(choiceId) {
        try {
            const response = await fetch(`${this.apiBase}/choice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.state.user.id,
                    choice_id: choiceId
                })
            });
            const data = await response.json();
            
            this.state.stats = {
                money: data.user.money,
                happiness: data.user.happiness,
                risk: data.user.risk
            };
            this.state.completed_levels = data.user.completed_levels || [];

            this.state.history.push({
                node: this.state.currentChapter,
                choice: choiceId,
                impact: data.impact,
                mentor: data.mentor_opinion,
                ai_feedback: data.ai_feedback
            });

            this.state.pendingScenario = data.next_scenario;
            
            // Skip feedback if no impact and no mentor text
            const hasImpact = data.impact && (data.impact.money || data.impact.happiness || data.impact.risk);
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
            dashboard: () => Dashboard(this)
        };

        const viewElement = viewMap[this.state.view]();
        viewElement.classList.add('fade-in');
        this.container.appendChild(viewElement);
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

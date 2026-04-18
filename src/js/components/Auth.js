import { removeImageBackground } from '../app.js';

export const Auth = (app) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'auth-scene fade-in';

    wrapper.innerHTML = `
        <!-- Fullscreen illustrated background -->
        <div class="auth-bg"></div>

        <!-- Floating teal overlay particles (decorative) -->
        <div class="auth-particles">
            <span></span><span></span><span></span><span></span><span></span>
        </div>

        <!-- Title pill -->
        <div class="auth-title-pill">
            <span class="brand-fin">FinSecure</span><span class="brand-quest"> Quest</span>
        </div>

        <!-- Main layout: character left | card | character right -->
        <div class="auth-layout">

            <!-- Left character (Female - Eve) -->
            <div class="auth-character auth-char-left">
                <img id="auth-img-female" src="src/assets/avatar_female.png" alt="Eve" draggable="false" />
            </div>

            <!-- Center glass card -->
            <div class="auth-card">
                <form id="auth-form" autocomplete="off" novalidate>

                    <div class="auth-field">
                        <input type="text" id="auth-name" placeholder="Name" required />
                    </div>

                    <div class="auth-field">
                        <input type="email" id="auth-email" placeholder="Email" required />
                    </div>

                    <div class="auth-field">
                        <input type="password" id="auth-password" placeholder="Password" />
                    </div>

                    <!-- Gender toggle -->
                    <div class="auth-gender-row">
                        <button type="button" class="gender-tile" id="gender-male" data-gender="male">
                            <svg class="gender-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                            </svg>
                            <div>
                                <div class="gender-label">Male</div>
                                <div class="gender-name">Adam</div>
                            </div>
                        </button>

                        <button type="button" class="gender-tile active" id="gender-female" data-gender="female">
                            <svg class="gender-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/>
                            </svg>
                            <div>
                                <div class="gender-label">Female</div>
                                <div class="gender-name">Eve</div>
                            </div>
                        </button>
                    </div>

                    <!-- Or divider -->
                    <div class="auth-or"><span>or</span></div>

                    <!-- Action buttons -->
                    <div class="auth-actions">
                        <button type="submit" class="auth-btn auth-btn-login" id="btn-login">Log In</button>
                        <button type="button" class="auth-btn auth-btn-signup" id="btn-signup">Sign Up</button>
                    </div>

                </form>
            </div>

            <!-- Right character (Male - Adam) -->
            <div class="auth-character auth-char-right">
                <img id="auth-img-male" src="src/assets/avatar_male.png" alt="Adam" draggable="false" />
            </div>

        </div>
    `;

    // ── Remove backgrounds from both avatar images ─────────────
    // Female PNG has a checkerboard pattern baked in → isCheckerboard = true
    removeImageBackground('src/assets/avatar_female.png', true).then(dataUrl => {
        const img = wrapper.querySelector('#auth-img-female');
        if (img) img.src = dataUrl;
    });
    // Male PNG has a plain white background → isCheckerboard = false
    removeImageBackground('src/assets/avatar_male.png', false).then(dataUrl => {
        const img = wrapper.querySelector('#auth-img-male');
        if (img) img.src = dataUrl;
    });

    // ── State ──────────────────────────────────────────────────
    let selectedGender = 'female';
    const nameInput  = wrapper.querySelector('#auth-name');
    const emailInput = wrapper.querySelector('#auth-email');
    nameInput.value  = 'Eve';

    // ── Gender toggle ──────────────────────────────────────────
    const genderTiles = wrapper.querySelectorAll('.gender-tile');
    genderTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            genderTiles.forEach(t => t.classList.remove('active'));
            tile.classList.add('active');
            selectedGender = tile.dataset.gender;
            if (nameInput.value === 'Adam' || nameInput.value === 'Eve') {
                nameInput.value = selectedGender === 'male' ? 'Adam' : 'Eve';
            }
        });
    });

    // ── Form submit ────────────────────────────────────────────
    const form = wrapper.querySelector('#auth-form');
    const doStart = () => app.startGame({
        name:   nameInput.value  || (selectedGender === 'male' ? 'Adam' : 'Eve'),
        email:  emailInput.value || 'player@finsecure.quest',
        gender: selectedGender
    });

    form.addEventListener('submit', (e) => { e.preventDefault(); doStart(); });
    wrapper.querySelector('#btn-signup').addEventListener('click', doStart);

    return wrapper;
};

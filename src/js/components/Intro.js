import { removeImageBackground } from '../app.js';

export const Intro = (app) => {
    const div = document.createElement('div');
    div.className = 'intro-view glass fade-in';
    div.style.maxWidth = '600px';
    div.style.padding = '40px';
    div.style.textAlign = 'center';

    const avatarImg = app.state.user.gender === 'male' ? 'src/assets/avatar_male.png' : 'src/assets/avatar_female.png';

    const isLvl1 = app.state.currentChapter.startsWith('lvl1');
    const questTitle = isLvl1 ? 'Student Pocket Money Quest' : 'Salary Management Quest';
    const questDesc = isLvl1 
        ? 'You have just received your pocket money. It is time to learn how to manage small savings like RD and prioritize needs over wants before your big college trip!'
        : 'Congratulations on your first salary! You are now a young professional. Learn to apply the 50-30-20 rule and avoid common debt traps like EMI offers.';

    div.innerHTML = `
        <div class="avatar-container" style="margin-bottom: 25px;">
            <img id="intro-avatar" src="${avatarImg}" alt="Character Avatar" style="width: 200px; height: 200px; border-radius: 50%; border: 6px solid var(--primary); object-fit: cover; background: var(--white); opacity: 0; transition: opacity 0.5s ease; box-shadow: var(--glass-shadow);">
        </div>
        <h2 style="color: var(--accent); margin-bottom: 5px;">${questTitle}</h2>
        <h3 style="color: var(--primary); margin-bottom: 15px; font-size: 1.1rem;">Welcome, ${app.state.user.name}</h3>
        <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 20px; border-radius: var(--radius-md); margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1);">
            <p><strong>Quest Background:</strong></p>
            <p style="margin-top: 10px;">${questDesc}</p>
            <p style="margin-top: 10px; font-style: italic; font-size: 0.9rem; opacity: 0.8;">“Financial freedom is available to those who learn about it and work for it.”</p>
        </div>
        
        <div class="input-group">
            <label>Name (You can still change it):</label>
            <input type="text" id="intro-name" value="${app.state.user.name}">
        </div>

        <button id="start-btn" class="btn btn-primary" style="width: 100%;">Start Your Quest</button>
    `;

    div.querySelector('#start-btn').onclick = () => {
        const newName = div.querySelector('#intro-name').value;
        if (newName) app.updateUser({ name: newName });
        app.setView('gameplay');
    };

    // Process Background Removal
    const avatarElement = div.querySelector('#intro-avatar');
    const isFemale = app.state.user.gender === 'female';
    removeImageBackground(avatarImg, isFemale).then(processedSrc => {
        avatarElement.src = processedSrc;
        avatarElement.style.opacity = '1';
    });

    return div;
};

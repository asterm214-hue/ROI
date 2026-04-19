export const getPlayerName = (app) => {
    const name = app?.state?.user?.name;
    return name && name.trim() ? name.trim() : 'Player';
};

export const personalizePlayerText = (value, app) => {
    return String(value || '').replace(/\bAdam\/Eve\b/g, getPlayerName(app));
};

export const getPlayerGender = (app) => {
    const name = getPlayerName(app).toLowerCase();
    if (name === 'adam') return 'male';
    if (name === 'eve') return 'female';

    const gender = String(app?.state?.user?.gender || '').trim().toLowerCase();
    if (gender.startsWith('m')) return 'male';
    if (gender.startsWith('f')) return 'female';

    return 'female';
};

export const getPlayerAvatarSrc = (app) => {
    return getPlayerGender(app) === 'male'
        ? 'src/assets/avatar_male.png'
        : 'src/assets/avatar_female.png';
};

export const isPlayerAvatarCheckerboard = (app) => {
    return getPlayerGender(app) === 'female';
};

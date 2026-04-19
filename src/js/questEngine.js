export const getSceneById = (quest, sceneId) => {
    if (!quest || !Array.isArray(quest.scenes)) return null;
    return quest.scenes.find(scene => scene.id === sceneId) || null;
};

export const getFirstSceneId = (quest) => {
    return quest && quest.scenes && quest.scenes.length ? quest.scenes[0].id : null;
};

export const getSceneProgressLabel = (quest, sceneId) => {
    if (!quest || !Array.isArray(quest.scenes)) return 'Scene 1/1';
    const index = quest.scenes.findIndex(scene => scene.id === sceneId);
    const visibleIndex = index >= 0 ? index + 1 : 1;
    return `Scene ${visibleIndex}/${quest.scenes.length}`;
};

export const getQuestProgressKey = (userId, questId) => {
    return `roi_quest_progress_${userId || 'guest'}_${questId}`;
};

export const createEmptyQuestProgress = (quest) => ({
    quest_id: quest.id,
    started: false,
    completed: false,
    current_scene_id: getFirstSceneId(quest),
    result_path: null,
    risk_score: 0,
    quiz_score: 0,
    quiz_total: 0,
    choices: [],
    quiz_answers: {},
    reward_title: null,
    updated_at: null
});

export const loadLocalQuestProgress = (userId, quest) => {
    const key = getQuestProgressKey(userId, quest.id);
    const saved = localStorage.getItem(key);
    if (!saved) return createEmptyQuestProgress(quest);

    try {
        return {
            ...createEmptyQuestProgress(quest),
            ...JSON.parse(saved)
        };
    } catch (error) {
        console.warn('Invalid local quest progress. Resetting.', error);
        return createEmptyQuestProgress(quest);
    }
};

export const saveLocalQuestProgress = (userId, progress) => {
    if (!progress || !progress.quest_id) return;
    localStorage.setItem(
        getQuestProgressKey(userId, progress.quest_id),
        JSON.stringify({
            ...progress,
            updated_at: new Date().toISOString()
        })
    );
};

export const resetLocalQuestProgress = (userId, quest) => {
    const progress = {
        ...createEmptyQuestProgress(quest),
        started: true,
        current_scene_id: getFirstSceneId(quest)
    };
    saveLocalQuestProgress(userId, progress);
    return progress;
};

export const recordLocalQuestChoice = (userId, progress, scene, choice) => {
    const choices = (progress.choices || [])
        .filter(item => item.scene_id !== scene.id)
        .concat({
            scene_id: scene.id,
            choice_id: choice.id,
            choice_text: choice.text,
            risk_points: choice.risk_points || 0,
            outcome_hint: choice.outcome_hint || ''
        });

    const nextProgress = {
        ...progress,
        started: true,
        current_scene_id: choice.next || scene.next,
        choices,
        risk_score: choices.reduce((total, item) => total + (item.risk_points || 0), 0)
    };

    saveLocalQuestProgress(userId, nextProgress);
    return nextProgress;
};

export const calculateQuizResult = (scene, answers) => {
    const items = scene.items || [];
    const itemResults = items.map(item => {
        const selectedAnswer = answers[item.id];
        return {
            id: item.id,
            text: item.text,
            selected_answer: selectedAnswer,
            correct_answer: item.answer,
            correct: selectedAnswer === item.answer
        };
    });
    const score = itemResults.filter(item => item.correct).length;
    const total = items.length;
    const passed = score >= (scene.passing_score || total);

    return {
        score,
        total,
        passed,
        item_results: itemResults,
        feedback: passed ? scene.feedback_correct : scene.feedback_retry
    };
};

export const recordLocalQuestQuiz = (userId, progress, scene, answers) => {
    const result = calculateQuizResult(scene, answers);
    const nextProgress = {
        ...progress,
        started: true,
        current_scene_id: result.passed ? scene.next : scene.id,
        quiz_answers: answers,
        quiz_score: result.score,
        quiz_total: result.total
    };

    saveLocalQuestProgress(userId, nextProgress);
    return { progress: nextProgress, ...result };
};

export const resolveQuestResultPath = (quest, progress) => {
    const threshold = quest.branch_rule?.falls_for_scam_at_risk_score ?? 2;
    return (progress.risk_score || 0) >= threshold ? 'falls_for_scam' : 'avoids_scam';
};

export const resolveNextSceneId = (quest, scene, progress) => {
    if (!scene) return getFirstSceneId(quest);
    if (scene.next_by_result) {
        const resultPath = resolveQuestResultPath(quest, progress);
        return scene.next_by_result[resultPath];
    }
    return scene.next || progress.current_scene_id || getFirstSceneId(quest);
};

export const completeLocalQuest = (userId, quest, progress, currentSceneId) => {
    const resultPath = progress.result_path || resolveQuestResultPath(quest, progress);
    const nextProgress = {
        ...progress,
        completed: true,
        result_path: resultPath,
        current_scene_id: currentSceneId || progress.current_scene_id,
        reward_title: quest.reward?.title || quest.completion_badge || null
    };

    saveLocalQuestProgress(userId, nextProgress);
    return nextProgress;
};

export const normalizeSpeakerKey = (speaker = '') => {
    const value = speaker.toLowerCase();
    if (value.includes('adam') || value.includes('eve')) return 'player';
    if (value.includes('scammer')) return 'scammer';
    if (value.includes('friend')) return 'friend';
    return 'system';
};

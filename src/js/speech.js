export class QuestSpeechController {
    constructor() {
        this.supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
        this.enabled = this.supported;
        this.activeUtterance = null;
        this.onStart = null;
        this.onEnd = null;
        this.speechToken = 0;
        this.voices = [];
        this.unlocked = false;
        this.pendingSpeech = null;

        if (this.supported) {
            this.refreshVoices();
            window.speechSynthesis.addEventListener?.('voiceschanged', () => {
                this.refreshVoices();
            });
            this.installAutoUnlock();
        }
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled) && this.supported;
        localStorage.setItem('roi_voice_enabled', this.enabled ? 'true' : 'false');
        if (this.enabled) {
            this.prime();
        } else {
            this.stop();
        }
        return this.enabled;
    }

    installAutoUnlock() {
        const unlock = () => {
            this.unlocked = true;
            this.prime();
            if (this.pendingSpeech && this.enabled) {
                const pending = this.pendingSpeech;
                this.pendingSpeech = null;
                this.speak(pending.text, pending.callbacks);
            }
        };

        ['pointerdown', 'click', 'keydown', 'touchstart'].forEach(eventName => {
            document.addEventListener(eventName, unlock, { once: true, passive: true });
        });
    }

    refreshVoices() {
        this.voices = this.supported ? window.speechSynthesis.getVoices() : [];
        return this.voices;
    }

    normalizeVoice(voice) {
        return {
            voice,
            lang: String(voice.lang || '').toLowerCase(),
            name: String(voice.name || '').toLowerCase(),
            voiceURI: String(voice.voiceURI || '').toLowerCase()
        };
    }

    findIndianVoice() {
        const normalized = this.refreshVoices().map(voice => this.normalizeVoice(voice));
        const indianVoiceNames = [
            'india',
            'indian',
            'en-in',
            '-in',
            'heera',
            'ravi',
            'neerja',
            'prabhat',
            'microsoft heera',
            'microsoft ravi',
            'microsoft neerja',
            'microsoft prabhat',
            'google हिन्दी',
            'google हिंदी'
        ];

        return normalized.find(item => item.lang === 'en-in')?.voice
            || normalized.find(item => item.lang.startsWith('en-in'))?.voice
            || normalized.find(item => item.lang.endsWith('-in'))?.voice
            || normalized.find(item => indianVoiceNames.some(name => (
                item.name.includes(name) || item.voiceURI.includes(name)
            )))?.voice
            || null;
    }

    whenIndianVoiceReady(timeout = 1500) {
        const currentVoice = this.findIndianVoice();
        if (!this.supported || currentVoice) {
            return Promise.resolve(currentVoice || this.getPreferredVoice());
        }

        return new Promise((resolve) => {
            let settled = false;
            let timeoutId = null;

            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                window.speechSynthesis.removeEventListener?.('voiceschanged', onVoicesChanged);
                resolve(this.findIndianVoice() || this.getPreferredVoice());
            };

            const onVoicesChanged = () => {
                this.refreshVoices();
                if (this.findIndianVoice()) finish();
            };

            window.speechSynthesis.addEventListener?.('voiceschanged', onVoicesChanged);
            timeoutId = setTimeout(finish, timeout);
        });
    }

    whenVoicesReady() {
        if (!this.supported || this.refreshVoices().length) {
            return Promise.resolve(this.voices);
        }

        return new Promise((resolve) => {
            const done = () => resolve(this.refreshVoices());
            window.speechSynthesis.addEventListener?.('voiceschanged', done, { once: true });
            setTimeout(done, 350);
        });
    }

    getPreferredVoice() {
        const voices = this.refreshVoices();
        const indianVoice = this.findIndianVoice();
        const normalized = voices.map(voice => this.normalizeVoice(voice));

        return indianVoice
            || voices.find(voice => voice.lang?.startsWith('en-'))
            || voices.find(voice => voice.default)
            || voices[0]
            || null;
    }

    numberToWords(number) {
        const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
        const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

        const underHundred = (value) => {
            if (value < 10) return ones[value];
            if (value < 20) return teens[value - 10];
            return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ''}`;
        };

        const underThousand = (value) => {
            if (value < 100) return underHundred(value);
            return `${ones[Math.floor(value / 100)]} hundred${value % 100 ? ` ${underHundred(value % 100)}` : ''}`;
        };

        if (!Number.isFinite(number) || number <= 0) return String(number);

        const parts = [];
        let remaining = Math.floor(number);
        const units = [
            [10000000, 'crore'],
            [100000, 'lakh'],
            [1000, 'thousand']
        ];

        units.forEach(([value, label]) => {
            if (remaining >= value) {
                const unitValue = Math.floor(remaining / value);
                parts.push(`${this.numberToWords(unitValue)} ${label}`);
                remaining %= value;
            }
        });

        if (remaining > 0) {
            parts.push(underThousand(remaining));
        }

        return parts.join(' ');
    }

    prepareSpeechText(text) {
        return String(text || '')
            .replace(/₹\s?([\d,]+)/g, (_, amount) => {
                const number = Number(amount.replace(/,/g, ''));
                return `${this.numberToWords(number)} rupees`;
            })
            .replace(/\b(\d+)x\b/gi, (_, value) => `${this.numberToWords(Number(value))} times`)
            .replace(/\bVIP\b/g, 'V I P')
            .replace(/\bAadhaar\b/gi, 'Aadhaar')
            .replace(/ma[’']am\/sir/gi, 'ma’am or sir')
            .replace(/Adam\/Eve/g, 'the player')
            .replace(/[📱🎭⏳🎯❌✅🧠🔐📊🔥]/g, '')
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")
            .replace(/…/g, ', ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    prime() {
        if (!this.supported) return;
        try {
            const utterance = new SpeechSynthesisUtterance('.');
            utterance.volume = 0;
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.warn('Speech synthesis could not be primed:', error);
        }
    }

    stop(notify = true) {
        if (!this.supported) return;
        this.speechToken += 1;
        window.speechSynthesis.cancel();
        this.activeUtterance = null;
        this.pendingSpeech = null;
        if (notify && this.onEnd) this.onEnd();
    }

    speak(text, callbacks = {}) {
        const cleanText = String(text || '').trim();
        if (!this.supported || !this.enabled || !cleanText) {
            if (callbacks.onEnd) callbacks.onEnd();
            return;
        }

        this.stop(false);
        this.pendingSpeech = { text: cleanText, callbacks };
        this.onStart = callbacks.onStart || null;
        this.onEnd = callbacks.onEnd || null;
        const token = ++this.speechToken;

        const speechText = this.prepareSpeechText(cleanText);
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'en-IN';
        utterance.rate = 0.9;
        utterance.pitch = 1.04;
        utterance.volume = 1;
        utterance.onstart = () => {
            if (token !== this.speechToken) return;
            this.pendingSpeech = null;
            if (this.onStart) this.onStart();
        };
        utterance.onend = () => {
            if (token !== this.speechToken) return;
            this.activeUtterance = null;
            if (this.onEnd) this.onEnd();
        };
        utterance.onerror = (event) => {
            if (token !== this.speechToken) return;
            console.warn('Speech synthesis failed:', event.error || event);
            this.activeUtterance = null;
            if (this.unlocked) this.pendingSpeech = null;
            if (this.onEnd) this.onEnd();
        };

        this.activeUtterance = utterance;
        this.whenIndianVoiceReady().then((voice) => {
            if (token !== this.speechToken || !this.enabled) return;
            utterance.voice = voice || this.getPreferredVoice();
            utterance.lang = utterance.voice?.lang || 'en-IN';
            setTimeout(() => {
                if (token !== this.speechToken || !this.enabled) return;
                if (window.speechSynthesis.paused) window.speechSynthesis.resume();
                window.speechSynthesis.speak(utterance);
            }, 80);
        });
    }
}

export const getQuestSpeechController = (app) => {
    if (!app.questSpeechController) {
        app.questSpeechController = new QuestSpeechController();
    }
    return app.questSpeechController;
};

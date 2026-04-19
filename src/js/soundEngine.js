/**
 * SoundEngine - Manages background music and sound effects
 */
class SoundEngine {
    constructor() {
        this.tracks = [
            'https://cdn.pixabay.com/audio/2022/03/10/audio_5ac154805c.mp3',
            'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3' // Fallback to a sound
        ];
        this.currentTrackIndex = 0;
        this.music = new Audio();
        this.music.loop = true;
        this.music.volume = 0.35; // Increased volume
        
        this.loadTrack(this.tracks[this.currentTrackIndex]);
        
        this.sfx = {
            click: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
            profit: new Audio('https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3'),
            loss: new Audio('https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3'),
            levelUp: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3')
        };

        Object.values(this.sfx).forEach(audio => {
            audio.volume = 0.5;
        });

        this.isPlaying = false;
        this.muted = localStorage.getItem('roi_muted') === 'true';
        if (this.muted) {
            this.music.muted = true;
        }

        // Handle errors and try next track
        this.music.onerror = () => {
            console.warn("Track failed to load, trying fallback...");
            this.nextTrack();
        };
    }

    loadTrack(src) {
        this.music.src = src;
        this.music.load();
    }

    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        this.loadTrack(this.tracks[this.currentTrackIndex]);
        if (this.isPlaying) this.music.play().catch(e => {});
    }

    toggleMusic() {
        if (this.isPlaying) {
            if (this.music.paused) {
                this.music.play().catch(e => console.log("Autoplay blocked", e));
                this.muted = false;
            } else {
                this.music.pause();
                this.muted = true;
            }
        } else {
            this.startMusic();
        }
        localStorage.setItem('roi_muted', this.muted);
        return !this.muted;
    }

    startMusic() {
        if (this.muted || this.isPlaying) return;
        
        const playAttempt = () => {
            this.music.play()
                .then(() => {
                    this.isPlaying = true;
                    this.music.muted = false;
                })
                .catch(e => {
                    console.log("Autoplay blocked, waiting for interaction...");
                    this.isPlaying = false;
                    // Try again on any interaction
                    const retry = () => {
                        this.music.play()
                            .then(() => {
                                this.isPlaying = true;
                                this.music.muted = false;
                                document.removeEventListener('click', retry);
                                document.removeEventListener('keydown', retry);
                            })
                            .catch(err => console.log("Still blocked", err));
                    };
                    document.addEventListener('click', retry, { once: true });
                    document.addEventListener('keydown', retry, { once: true });
                });
        };

        playAttempt();
    }

    playSFX(type) {
        if (this.muted) return;
        const sound = this.sfx[type];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => {});
        }
    }

    setMuted(muted) {
        this.muted = muted;
        this.music.muted = muted;
        localStorage.setItem('roi_muted', muted);
    }
}

export const soundEngine = new SoundEngine();

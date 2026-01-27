/**
 * music.js - Minecraft Theme Background Music Manager
 * Handles looping music, mute state persistence, and auto-play on interaction.
 */

const MusicManager = {
    audio: null,
    audioPath: 'styles/music.mp4',

    init() {
        this.createAudioElement();
        this.setupEventListeners();

        // Try auto-play (might be blocked by browser)
        this.play();
    },

    createAudioElement() {
        this.audio = new Audio(this.audioPath);
        this.audio.loop = true;
        this.audio.volume = 0.4; // Soft background music
    },

    setupEventListeners() {
        // Essential for browser auto-play policies
        const startOnInteraction = () => {
            if (this.audio.paused) {
                this.play();
            }
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('keydown', startOnInteraction);
            document.removeEventListener('touchstart', startOnInteraction);
        };

        document.addEventListener('click', startOnInteraction);
        document.addEventListener('keydown', startOnInteraction);
        document.addEventListener('touchstart', startOnInteraction);
    },

    play() {
        this.audio.play().catch(err => {
            console.log("Auto-play prevented. Music will start on interaction.", err);
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    MusicManager.init();
});

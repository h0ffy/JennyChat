// Utility functions for text-to-speech functionality

// Clean text before speaking - remove asterisks and emojis
export function cleanTextForSpeech(text) {
    // Remove asterisks
    let cleanedText = text.replace(/\*/g, '');
    
    // Remove emojis using regex
    // This regex matches most emoji characters
    cleanedText = cleanedText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    return cleanedText;
}

// Create and configure a speech utterance with custom event handlers
export function createSpeechUtterance(text, voiceSettings, callbacks) {
    // Clean text for speech
    const cleanedText = cleanTextForSpeech(text);
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = voiceSettings.language;
    utterance.pitch = voiceSettings.pitch;
    utterance.rate = voiceSettings.rate;
    utterance.volume = voiceSettings.volume;
    
    // Set event handlers if provided
    if (callbacks) {
        if (callbacks.onStart) utterance.onstart = callbacks.onStart;
        if (callbacks.onEnd) utterance.onend = callbacks.onEnd;
        if (callbacks.onBoundary) utterance.onboundary = callbacks.onBoundary;
        if (callbacks.onMark) utterance.onmark = callbacks.onMark;
        if (callbacks.onError) utterance.onerror = callbacks.onError;
        if (callbacks.onPause) utterance.onpause = callbacks.onPause;
        if (callbacks.onResume) utterance.onresume = callbacks.onResume;
    }
    
    return utterance;
}

// Speak text with the provided voice settings
export function speakWithVoice(text, voiceSettings, voices, callbacks) {
    const synth = window.speechSynthesis;
    
    if (synth && text) {
        // Stop any current speech
        synth.cancel();
        
        const utterance = createSpeechUtterance(text, voiceSettings, callbacks);
        
        // Find and set the appropriate voice
        if (voices && voices.length > 0) {
            // First try exact match by name
            const exactMatch = voices.find(voice => voice.name === voiceSettings.name);
            
            if (exactMatch) {
                console.log("Using voice:", exactMatch.name);
                utterance.voice = exactMatch;
            } else {
                // Try to find a suitable alternative
                const langVoices = voices.filter(voice => voice.lang.startsWith(voiceSettings.language));
                if (langVoices.length > 0) {
                    console.log("Using alternative voice:", langVoices[0].name);
                    utterance.voice = langVoices[0];
                }
            }
        }
        
        synth.speak(utterance);
        return true;
    }
    
    return false;
}

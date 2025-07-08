// Voice utilities for Jenny virtual assistant
import { config } from './asistant-config.js';
import { cleanTextForSpeech, speakWithVoice } from './asistant-speech-utils.js';

// Get all available voices from browser
export function getAllVoices() {
    return window.speechSynthesis.getVoices();
}

// Filter voices by language
export function filterVoicesByLanguage(voices, language) {
    return voices.filter(voice => voice.lang.startsWith(language));
}

// Filter voices by gender keywords
export function filterVoicesByGender(voices, gender) {
    if (gender === 'any') return voices;
    
    return voices.filter(voice => {
        const voiceName = voice.name.toLowerCase();
        if (gender === 'female') {
            return voiceName.includes('female') || 
                   voiceName.includes('mujer') || 
                   voiceName.includes('girl') || 
                   voiceName.includes('woman');
        } else if (gender === 'male') {
            return voiceName.includes('male') || 
                   voiceName.includes('hombre') || 
                   voiceName.includes('boy') || 
                   voiceName.includes('man');
        }
        return true;
    });
}

// Populate voice select dropdown
export function populateVoiceSelect(voiceSelect, voices, currentVoiceName) {
    // Clear existing options
    voiceSelect.innerHTML = '';
    
    // Add available voices to selector
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        
        // Select current voice if matches
        if (voice.name === currentVoiceName) {
            option.selected = true;
        }
        
        voiceSelect.appendChild(option);
    });
    
    // Select first voice if none is selected
    if (voiceSelect.selectedIndex < 0 && voices.length > 0) {
        voiceSelect.selectedIndex = 0;
    }
}

// Create and configure a speech utterance
export function createUtterance(text, voiceSettings) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceSettings.language;
    utterance.pitch = voiceSettings.pitch;
    utterance.rate = voiceSettings.rate;
    utterance.volume = voiceSettings.volume;
    return utterance;
}

// Find the appropriate voice based on settings
export function findVoice(voices, voiceSettings) {
    // First try exact match by name
    const exactMatch = voices.find(voice => voice.name === voiceSettings.name);
    if (exactMatch) return exactMatch;
    
    // Filter by language and gender
    const langFiltered = filterVoicesByLanguage(voices, voiceSettings.language);
    const genderFiltered = filterVoicesByGender(langFiltered, voiceSettings.gender);
    
    // Return first matching voice or undefined
    return genderFiltered[0];
}

// Get a sample text based on language
export function getSampleText(language) {
    if (language.startsWith('es')) {
        return "Hola, soy Sophia, tu asistente virtual. Así es como suena mi voz.";
    } else {
        return "Hi, I'm Sophia, your virtual assistant. This is how my voice sounds.";
    }
}

// Test the current voice settings
export function testVoice(voices, voiceSettings) {
    const synth = window.speechSynthesis;
    synth.cancel(); // Stop any current speech
    
    const text = getSampleText(voiceSettings.language);
    
    return speakWithVoice(text, voiceSettings, voices, null);
}

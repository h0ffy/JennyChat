// Utility functions for searching and retrieving information

// Search Wikipedia for information
export async function searchWikipedia(query, language = 'es') {
    try {
        const langPrefix = language.startsWith('es') ? 'es' : 'en';
        // First search for articles related to the query
        const searchUrl = `https://${langPrefix}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        
        if (searchData.query.search.length === 0) {
            return { success: false, message: `No encontré información sobre "${query}" en Wikipedia.` };
        }
        
        // Get the first result
        const pageId = searchData.query.search[0].pageid;
        
        // Now get an extract from the article
        const extractUrl = `https://${langPrefix}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
        const extractResponse = await fetch(extractUrl);
        const extractData = await extractResponse.json();
        
        const extract = extractData.query.pages[pageId].extract;
        
        // Limit length to avoid overloading the response
        const limitedExtract = extract.length > 800 ? 
               extract.substring(0, 800) + "..." : 
               extract;
               
        return { 
            success: true, 
            content: limitedExtract,
            title: searchData.query.search[0].title,
            source: 'Wikipedia'
        };
    } catch (error) {
        console.error("Error searching Wikipedia:", error);
        return { 
            success: false, 
            message: "Lo siento, hubo un problema al buscar la información en Wikipedia." 
        };
    }
}

// Check for current events or news (simulated)
export async function checkCurrentEvents(query, language = 'es') {
    try {
        // Simulate a current events check with a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // List of topics we'd respond to as "current"
        const currentTopics = [
            'clima', 'weather', 'tecnología', 'technology', 
            'noticias', 'news', 'actualidad', 'current events',
            'política', 'politics', 'deportes', 'sports'
        ];
        
        // Check if query contains any current topics
        const hasCurrentTopic = currentTopics.some(topic => 
            query.toLowerCase().includes(topic.toLowerCase())
        );
        
        if (hasCurrentTopic) {
            return {
                success: true,
                content: language.startsWith('es') 
                    ? "Para información actualizada sobre este tema, te recomendaría consultar fuentes de noticias recientes. Como asistente, no tengo acceso a información en tiempo real, pero puedo ayudarte a entender conceptos generales sobre el tema."
                    : "For up-to-date information on this topic, I'd recommend checking recent news sources. As an assistant, I don't have access to real-time information, but I can help you understand general concepts about the topic.",
                source: 'Current Events Notice'
            };
        }
        
        return { success: false };
    } catch (error) {
        console.error("Error checking current events:", error);
        return { success: false };
    }
}

// Determine if search is required
export function determineBusquedaRequerida(text) {
    const lowerText = text.toLowerCase();
    
    // Keywords that indicate information search
    const searchIndicators = [
        'qué es', 'quién es', 'cuándo', 'dónde', 'por qué', 'cómo funciona',
        'explica', 'información sobre', 'busca', 'encuentra', 'historia de',
        'significado', 'definición', 'datos', 'háblame de', 'cuéntame sobre',
        'sabes sobre', 'conoces', 'wiki', 'what is', 'who is', 'when', 'where', 
        'why', 'how does', 'explain', 'information about', 'search', 'find',
        'history of', 'meaning', 'definition', 'tell me about', 'do you know'
    ];
    
    // Check if text contains any search indicator
    return searchIndicators.some(indicator => lowerText.includes(indicator));
}

// Extract search terms from question
export function extractSearchTerms(text, language = 'es') {
    // Stop words to remove (articles, prepositions, etc.)
    const stopWords = language.startsWith('es') 
        ? ['que', 'quien', 'como', 'cuando', 'donde', 'por', 'para', 'con', 'sin', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'es', 'son', 'está', 'están', 'hay', 'tiene', 'tienen', 'me', 'te', 'se', 'nos', 'qué', 'quién', 'cómo', 'cuándo', 'dónde', 'cuál', 'cuáles'] 
        : ['what', 'who', 'how', 'when', 'where', 'why', 'which', 'for', 'with', 'without', 'the', 'a', 'an', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must'];
    
    // Info words that indicate information search
    const infoWords = language.startsWith('es')
        ? ['qué es', 'quién es', 'cuándo', 'dónde', 'explica', 'información', 'historia', 'significado', 'definición', 'concepto', 'busca']
        : ['what is', 'who is', 'when', 'where', 'explain', 'information', 'history', 'meaning', 'definition', 'concept', 'search'];
    
    let query = text.toLowerCase();
    
    // Remove question words and preparatory phrases
    for (const word of infoWords) {
        if (query.includes(word)) {
            query = query.replace(word, '');
        }
    }
    
    // Clean and get key terms
    const words = query.split(' ')
        .filter(word => word.length > 2 && !stopWords.includes(word))
        .map(word => word.trim());
    
    return words.join(' ');
}

// Format response from search results
export function formulateResponse(query, searchResult, language = 'es') {
    // If no information found
    if (!searchResult.success) {
        return searchResult.message || (language.startsWith('es') 
            ? `No encontré información específica sobre "${query}". ¿Hay algo más en lo que pueda ayudarte?`
            : `I couldn't find specific information about "${query}". Is there anything else I can help you with?`);
    }
    
    // Response templates
    const templates = language.startsWith('es') 
        ? [
            `Sobre tu pregunta, encontré la siguiente información: ${searchResult.content}`,
            `De acuerdo con la información que encontré: ${searchResult.content}`,
            `Según los datos que pude encontrar: ${searchResult.content}`,
            `He buscado información al respecto y encontré que: ${searchResult.content}`,
            `Investigando sobre tu consulta, puedo decirte que: ${searchResult.content}`
        ]
        : [
            `Regarding your question, I found the following information: ${searchResult.content}`,
            `According to the information I found: ${searchResult.content}`,
            `Based on the data I could find: ${searchResult.content}`,
            `I've searched for information on this and found that: ${searchResult.content}`,
            `Researching your query, I can tell you that: ${searchResult.content}`
        ];
    
    // Select a random template
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Add source attribution
    const sourceAttribution = language.startsWith('es')
        ? `\n\nFuente: ${searchResult.source}`
        : `\n\nSource: ${searchResult.source}`;
        
    return randomTemplate + sourceAttribution;
}

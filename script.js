document.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic for "Try Computer"
    const tabs = document.querySelectorAll('.tab');
    const suggestionContent = document.getElementById('suggestion-content');

    const tabData = {
        organise: [
            'Triage my inbox and draft responses',
            'Build a personal CRM to track my network',
            'Set up a weekly review system every Sunday',
            'Plan a trip with full itinerary and bookings',
            'Redesign my schedule around priorities'
        ],
        learn: [
            'Explain quantum computing in simple terms',
            'Create a study plan for learning Python',
            'Summarize the history of the industrial revolution',
            'How do neural networks actually work?',
            'Best resources for learning digital marketing'
        ],
        prototype: [
            'Code a simple weather app using React',
            'Design a landing page for a SaaS product',
            'Create a database schema for an e-commerce site',
            'Write a Python script to automate file backups',
            'Build a responsive navigation bar with CSS Grid'
        ],
        monitor: [
            'Track recent trends in artificial intelligence',
            'Monitor stock market performance for tech companies',
            'Get alerts for breaking news in cybersecurity',
            'Follow updates on space exploration missions',
            'Analyze sentiment of social media trends'
        ]
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');

            // Update suggestions with animation
            const category = tab.getAttribute('data-tab');
            const suggestions = tabData[category];
            
            suggestionContent.style.opacity = '0';
            setTimeout(() => {
                suggestionContent.innerHTML = suggestions
                    .map(item => `<div class="suggestion-item">${item}</div>`)
                    .join('');
                suggestionContent.style.opacity = '1';
                suggestionContent.style.transition = 'opacity 0.3s ease';
            }, 200);
        });
    });

    // Sidebar active state management
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (!item.classList.contains('more')) {
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });

    const newThreadBtn = document.querySelector('.new-thread-btn');
    newThreadBtn.addEventListener('click', async () => {
        // Clear UI states
        textarea.value = '';
        textarea.style.height = 'auto';
        responseContainer.style.display = 'none';
        suggestionsContainer.style.display = 'block';
        
        // Reset PDF context
        try {
            await fetch('http://localhost:5000/clear_context', { method: 'POST' });
            fileStatus.style.display = 'none';
            attachBtn.style.display = 'flex';
            fileInput.value = '';
        } catch (error) {
            console.error('Error clearing context:', error);
        }

        // Return to search mode
        navItems.forEach(i => i.classList.remove('active'));
        document.getElementById('nav-search').classList.add('active');
        
        lucide.createIcons();
    });

    // Auto-resize textarea
    const textarea = document.querySelector('.search-input');
    const sendBtn = document.querySelector('.send-btn');
    const responseContainer = document.getElementById('ai-response-container');
    const responseText = document.getElementById('ai-response-text');
    const suggestionsContainer = document.querySelector('.suggestions-container');
    const historyList = document.getElementById('history-list');

    // Dashboard State
    let searchHistory = JSON.parse(localStorage.getItem('gjs_history')) || [];
    let isIncognito = localStorage.getItem('gjs_incognito') === 'true';
    let notificationsEnabled = localStorage.getItem('gjs_notifications') !== 'false';

    function updateHistoryUI() {
        if (searchHistory.length === 0) {
            historyList.innerHTML = '<p class="recent-empty">Recent and active threads will appear here.</p>';
            return;
        }

        historyList.innerHTML = searchHistory.slice(0, 10).map(query => `
            <div class="history-item" onclick="document.querySelector('.search-input').value = '${query}'; document.querySelector('.search-input').dispatchEvent(new Event('input'));">
                <i data-lucide="message-square" size="14"></i>
                <span>${query}</span>
            </div>
        `).join('');
        lucide.createIcons();
    }

    async function performSearch() {
        const query = textarea.value.trim();
        if (!query) return;

        // UI State: Loading
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="loading-dots"></div>';
        responseContainer.style.display = 'block';
        responseText.innerHTML = 'Thinking...';
        suggestionsContainer.style.display = 'none';

        // Save to History (if not incognito)
        if (!isIncognito) {
            searchHistory.unshift(query);
            searchHistory = [...new Set(searchHistory)]; // Unique items
            localStorage.setItem('gjs_history', JSON.stringify(searchHistory));
            updateHistoryUI();
        }

        try {
            const response = await fetch('http://localhost:5000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: query })
            });

            const data = await response.json();
            if (data.success) {
                responseText.innerText = data.response;
            } else {
                responseText.innerText = "Error: " + (data.error || "Failed to get response");
            }
        } catch (error) {
            responseText.innerText = "Connection Error: Ensure the Flask server is running on port 5000.";
            console.error(error);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i data-lucide="arrow-right"></i>';
            lucide.createIcons();
        }
    }

    // Settings / Profile Modal Logic
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettings = document.getElementById('close-settings');
    const profileBtn = document.querySelector('.user-profile');
    const incognitoToggle = document.getElementById('incognito-toggle');
    const notificationsToggle = document.getElementById('notifications-toggle');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // PDF RAG Logic
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const fileStatus = document.getElementById('file-status');
    const filenameDisplay = document.getElementById('filename-display');
    const removeFileBtn = document.getElementById('remove-file');

    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !file.name.endsWith('.pdf')) {
            alert('Please select a valid PDF file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        attachBtn.style.opacity = '0.5';
        attachBtn.innerText = 'Uploading...';

        try {
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                filenameDisplay.innerText = data.filename;
                fileStatus.style.display = 'flex';
                attachBtn.style.display = 'none';
            } else {
                alert('Upload failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Connection error while uploading PDF.');
        } finally {
            attachBtn.style.opacity = '1';
            attachBtn.innerText = 'Attach';
            lucide.createIcons();
        }
    });

    removeFileBtn.addEventListener('click', async () => {
        try {
            await fetch('http://localhost:5000/clear_context', { method: 'POST' });
            fileStatus.style.display = 'none';
            attachBtn.style.display = 'flex';
            fileInput.value = '';
        } catch (error) {
            console.error('Error clearing context:', error);
        }
    });

    // Initialize Toggles
    incognitoToggle.checked = isIncognito;
    notificationsToggle.checked = notificationsEnabled;

    profileBtn.addEventListener('click', () => {
        settingsOverlay.style.display = 'flex';
    });

    closeSettings.addEventListener('click', () => {
        settingsOverlay.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) settingsOverlay.style.display = 'none';
    });

    incognitoToggle.addEventListener('change', (e) => {
        isIncognito = e.target.checked;
        localStorage.setItem('gjs_incognito', isIncognito);
    });

    notificationsToggle.addEventListener('change', (e) => {
        notificationsEnabled = e.target.checked;
        localStorage.setItem('gjs_notifications', notificationsEnabled);
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all history?')) {
            searchHistory = [];
            localStorage.removeItem('gjs_history');
            updateHistoryUI();
            alert('History cleared successfully.');
        }
    });

    // Initialize History on Load
    updateHistoryUI();

    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        if (this.value.trim().length > 0) {
            sendBtn.style.backgroundColor = '#1a1a1a';
        } else {
            sendBtn.style.backgroundColor = '#e5e5e0';
        }
    });

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            performSearch();
        }
    });

    sendBtn.addEventListener('click', performSearch);

    // Quick focus search on '/'
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== textarea) {
            e.preventDefault();
            textarea.focus();
        }
    });
});

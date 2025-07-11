export class UIManager {
    constructor() {
        this.setupTabs();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                const subtab = button.dataset.subtab;

                if (subtab) {
                    // Handle subtabs
                    const parent = button.closest('.card-content');
                    const subtabButtons = parent.querySelectorAll('.tab-button');
                    const subtabContents = parent.querySelectorAll('.tab-content');

                    subtabButtons.forEach(btn => btn.classList.remove('active'));
                    subtabContents.forEach(content => content.classList.remove('active'));

                    button.classList.add('active');
                    const targetContent = document.getElementById(`${subtab}-tab`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                } else {
                    // Handle main tabs
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    button.classList.add('active');
                    const targetContent = document.getElementById(`${tabName}-tab`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                }
            });
        });
    }
}

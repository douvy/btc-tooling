// Critical functionality script - will be moved to external file
document.addEventListener('DOMContentLoaded', function() {
    // Initialize time frame selector functionality
    initTimeFrameSelector();
    
    // Initialize price updates
    initPriceUpdates();
    
    // Initialize accessibility features
    initAccessibilityFeatures();
    
    /**
     * Initialize time frame selector buttons
     */
    function initTimeFrameSelector() {
        const timeframeButtons = document.querySelectorAll('[role="group"][aria-label="Time frame selection"] button');
        
        timeframeButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons in the same group
                const buttonGroup = this.closest('[role="group"]');
                const buttons = buttonGroup.querySelectorAll('button');
                
                buttons.forEach(btn => {
                    btn.classList.remove('bg-[#1c2232]', 'bg-[#001e3c]', 'text-primary', 'text-[#FF9900]');
                    btn.classList.add('text-gray-400');
                    btn.removeAttribute('aria-current');
                });
                
                // Add active class to clicked button based on screen size
                this.setAttribute('aria-current', 'page');
                
                if (window.innerWidth >= 1024) { // Large screens
                    this.classList.add('bg-[#1c2232]', 'text-primary');
                } else { // Medium and small screens
                    this.classList.add('bg-[#001e3c]', 'text-[#FF9900]');
                }
                this.classList.remove('text-gray-400');
                
                // In a real implementation, this would update the chart data
                updateChartData(this.textContent.trim());
            });
        });
    }
    
    /**
     * Initialize price update listeners
     */
    function initPriceUpdates() {
        // Simulated price update function - in real app would connect to websocket
        const priceElements = document.querySelectorAll('[aria-live="polite"]');
        
        // In a real implementation, would connect to WebSocket for real-time price updates
        console.log('Price update listeners initialized for', priceElements.length, 'elements');
    }
    
    /**
     * Initialize additional accessibility features
     */
    function initAccessibilityFeatures() {
        // Ensure focus outline is visible only when using keyboard
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('user-is-tabbing');
            }
        });
        
        document.addEventListener('mousedown', function() {
            document.body.classList.remove('user-is-tabbing');
        });
    }
    
    /**
     * Update chart data based on selected timeframe
     * @param {string} timeframe - Selected timeframe
     */
    function updateChartData(timeframe) {
        console.log('Timeframe changed to:', timeframe);
        // This would fetch and update chart data in a real implementation
    }
});
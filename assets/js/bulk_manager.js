document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const elements = {
        // Table elements
        challengesTable: document.getElementById('challenges-table'),
        challengesTbody: document.getElementById('challenges-tbody'),
        selectAllCheckbox: document.getElementById('select-all'),
        
        // Filter elements
        searchInput: document.getElementById('search-input'),
        categoryFilter: document.getElementById('category-filter'),
        stateFilter: document.getElementById('state-filter'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),
        
        // Bulk edit elements
        bulkEditForm: document.getElementById('bulk-edit-form'),
        selectedCount: document.getElementById('selected-count'),
        enableCategoryEdit: document.getElementById('enable-category-edit'),
        enableMaxAttemptsEdit: document.getElementById('enable-max-attempts-edit'),
        enableValueEdit: document.getElementById('enable-value-edit'),
        enableStateEdit: document.getElementById('enable-state-edit'),
        bulkCategory: document.getElementById('bulk-category'),
        bulkMaxAttempts: document.getElementById('bulk-max-attempts'),
        bulkValue: document.getElementById('bulk-value'),
        valueEditMode: document.getElementById('value-edit-mode'),
        bulkState: document.getElementById('bulk-state'),
        applyBulkEditBtn: document.getElementById('apply-bulk-edit-btn'),
        cancelBulkEditBtn: document.getElementById('cancel-bulk-edit-btn'),
        
        // Flag modal elements
        flagEditModal: document.getElementById('flag-edit-modal'),
        flagsContainer: document.getElementById('flags-container'),
        addFlagBtn: document.getElementById('add-flag-btn'),
        saveFlagsBtn: document.getElementById('save-flags-btn'),
        
        // Templates
        challengeDetailsTemplate: document.getElementById('challenge-details-template'),
        flagTemplate: document.getElementById('flag-template'),
        
        // Refresh button
        refreshBtn: document.getElementById('refresh-btn')
    };
    
    // State
    let state = {
        challenges: [],
        flagTypes: ['static'],
        currentEditingChallenge: null,
        currentFlags: [],
        selectedChallenges: new Set(),
        filters: {
            search: '',
            category: '',
            state: ''
        }
    };
    
    // ===== Event Listeners =====
    
    // Filter listeners
    elements.searchInput.addEventListener('input', debounce(function() {
        state.filters.search = this.value.trim().toLowerCase();
        loadChallenges();
    }, 300));
    
    elements.categoryFilter.addEventListener('change', function() {
        state.filters.category = this.value;
        loadChallenges();
    });
    
    elements.stateFilter.addEventListener('change', function() {
        state.filters.state = this.value;
        loadChallenges();
    });
    
    elements.resetFiltersBtn.addEventListener('click', function() {
        elements.searchInput.value = '';
        elements.categoryFilter.value = '';
        elements.stateFilter.value = '';
        state.filters = { search: '', category: '', state: '' };
        loadChallenges();
    });
    
    // Select all checkbox
    elements.selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = elements.challengesTbody.querySelectorAll('.challenge-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
            const challengeId = parseInt(checkbox.getAttribute('data-id'));
            if (this.checked) {
                state.selectedChallenges.add(challengeId);
            } else {
                state.selectedChallenges.delete(challengeId);
            }
        });
        updateBulkEditVisibility();
    });
    
    // Bulk edit form checkbox listeners
    elements.enableCategoryEdit.addEventListener('change', function() {
        elements.bulkCategory.disabled = !this.checked;
    });
    
    elements.enableMaxAttemptsEdit.addEventListener('change', function() {
        elements.bulkMaxAttempts.disabled = !this.checked;
    });
    
    elements.enableValueEdit.addEventListener('change', function() {
        elements.bulkValue.disabled = !this.checked;
    });
    
    elements.enableStateEdit.addEventListener('change', function() {
        elements.bulkState.disabled = !this.checked;
    });
    
    // Bulk edit buttons
    elements.cancelBulkEditBtn.addEventListener('click', function() {
        clearBulkEditForm();
    });
    
    elements.applyBulkEditBtn.addEventListener('click', function() {
        applyBulkEdit();
    });
    
    // Flag modal buttons
    elements.addFlagBtn.addEventListener('click', function() {
        addFlagToModal();
    });
    
    elements.saveFlagsBtn.addEventListener('click', function() {
        saveFlags();
    });
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', function() {
        fetchChallenges();
    });
    
    // ===== Functions =====
    
    /**
     * Fetches challenges from the server
     */
    async function fetchChallenges() {
        try {
            showLoadingIndicator();
            
            // Build the query string based on active filters
            const params = new URLSearchParams();
            if (state.filters.search) params.append('search', state.filters.search);
            if (state.filters.category) params.append('category', state.filters.category);
            if (state.filters.state) params.append('state', state.filters.state);
            
            const response = await fetch(`/plugins/bulk-challenge-manager/api/challenges?${params.toString()}`);
            const data = await response.json();
            
            if (data.success) {
                state.challenges = data.challenges;
                
                // Update category filter options
                if (data.categories && data.categories.length > 0) {
                    updateCategoryOptions(data.categories);
                }
                
                renderChallenges();
            } else {
                showError(data.message || 'Error loading challenges');
            }
        } catch (error) {
            showError(`Error fetching challenges: ${error.message}`);
        }
    }
    
    /**
     * Updates the category filter dropdown with available categories
     */
    function updateCategoryOptions(categories) {
        const categoryFilter = elements.categoryFilter;
        const currentValue = categoryFilter.value;
        
        // Clear existing options except the first one
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }
        
        // Add new options
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
        
        // Restore selected value if it exists in the new options
        if (currentValue && categories.includes(currentValue)) {
            categoryFilter.value = currentValue;
        }
    }
    
    /**
     * Renders the challenges in the table
     */
    function renderChallenges() {
        elements.challengesTbody.innerHTML = '';
        
        if (state.challenges.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="8" class="text-center py-4">
                    <em>No challenges found. Try adjusting your filters.</em>
                </td>
            `;
            elements.challengesTbody.appendChild(emptyRow);
            return;
        }
        
        state.challenges.forEach(challenge => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', challenge.id);
            row.className = 'challenge-row';
            
            // Determine if this challenge is selected
            const isSelected = state.selectedChallenges.has(challenge.id);
            
            row.innerHTML = `
                <td>
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input challenge-checkbox" 
                               id="challenge-${challenge.id}" data-id="${challenge.id}" 
                               ${isSelected ? 'checked' : ''}>
                        <label class="custom-control-label" for="challenge-${challenge.id}"></label>
                    </div>
                </td>
                <td>${challenge.id}</td>
                <td>${escapeHtml(challenge.name)}</td>
                <td>${escapeHtml(challenge.category || '')}</td>
                <td>${challenge.value}</td>
                <td>${challenge.max_attempts || 'Unlimited'}</td>
                <td>
                    <span class="badge badge-${challenge.state === 'visible' ? 'success' : 'secondary'}">
                        ${challenge.state}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${challenge.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <a href="/admin/challenges/${challenge.id}" class="btn btn-sm btn-info" target="_blank">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </td>
            `;
            
            elements.challengesTbody.appendChild(row);
            
            // Add event listener to the checkbox
            const checkbox = row.querySelector('.challenge-checkbox');
            checkbox.addEventListener('change', function() {
                const id = parseInt(this.getAttribute('data-id'));
                if (this.checked) {
                    state.selectedChallenges.add(id);
                } else {
                    state.selectedChallenges.delete(id);
                }
                updateBulkEditVisibility();
            });
            
            // Add event listener to the edit button
            const editBtn = row.querySelector('.edit-btn');
            editBtn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                toggleChallengeDetails(id);
            });
        });
        
        // Update the "select all" checkbox state
        updateSelectAllCheckbox();
    }
    
    /**
     * Toggles the expanded details row for a challenge
     */
    function toggleChallengeDetails(challengeId) {
        const challenge = state.challenges.find(c => c.id === challengeId);
        if (!challenge) return;
        
        // Remove any existing details rows
        elements.challengesTbody.querySelectorAll('.challenge-details').forEach(el => el.remove());
        
        // Find the challenge row
        const challengeRow = elements.challengesTbody.querySelector(`tr[data-id="${challengeId}"]`);
        if (!challengeRow) return;
        
        // Check if a details row already exists, in which case we're toggling off
        const nextRow = challengeRow.nextElementSibling;
        if (nextRow && nextRow.classList.contains('challenge-details')) {
            nextRow.remove();
            return;
        }
        
        // Clone the details template
        const detailsTemplate = elements.challengeDetailsTemplate.content.cloneNode(true);
        const detailsRow = detailsTemplate.querySelector('.challenge-details');
        
        // Fill in the form fields
        const form = detailsRow.querySelector('.challenge-edit-form');
        form.querySelector('.challenge-id').value = challenge.id;
        form.querySelector('.challenge-name').value = challenge.name;
        form.querySelector('.challenge-category').value = challenge.category || '';
        form.querySelector('.challenge-value').value = challenge.value;
        form.querySelector('.challenge-max-attempts').value = challenge.max_attempts || 0;
        form.querySelector('.challenge-description').value = challenge.description || '';
        form.querySelector('.challenge-connection-info').value = challenge.connection_info || '';
        form.querySelector('.challenge-attribution').value = challenge.attribution || '';
        form.querySelector('.challenge-state').value = challenge.state;
        
        // Update flags summary
        updateFlagsSummary(form.querySelector('.flags-summary'), challenge.flags || []);
        
        // Add event listeners
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveChallenge(this);
        });
        
        form.querySelector('.cancel-edit-btn').addEventListener('click', function() {
            detailsRow.remove();
        });
        
        form.querySelector('.edit-flags-btn').addEventListener('click', function() {
            openFlagModal(challenge);
        });
        
        // Insert the details row after the challenge row
        challengeRow.after(detailsRow);
    }

    
    /**
     * Opens the flag edit modal for a challenge
     */
    function openFlagModal(challenge) {
        state.currentEditingChallenge = challenge;
        state.currentFlags = [...(challenge.flags || [])];
        
        renderFlagsInModal();
        
        $(elements.flagEditModal).modal('show');
    }
    
    /**
     * Renders flags in the modal
     */
    function renderFlagsInModal() {
        elements.flagsContainer.innerHTML = '';
        
        if (state.currentFlags.length === 0) {
            elements.flagsContainer.innerHTML = '<div class="alert alert-info">No flags defined yet. Click "Add Flag" to add one.</div>';
            return;
        }
        
        state.currentFlags.forEach((flag, index) => {
            const flagElement = createFlagElement(flag, index);
            elements.flagsContainer.appendChild(flagElement);
        });
    }
    
    /**
     * Updates the createFlagElement function to handle the case sensitivity dropdown
     * This function should replace the existing createFlagElement function in bulk_manager.js
     */
    function createFlagElement(flag, index) {
        const template = elements.flagTemplate.content.cloneNode(true);
        const flagElement = template.querySelector('.flag-item');
        
        const titleSpan = flagElement.querySelector('.flag-title');
        titleSpan.textContent = `Flag ${index + 1}`;
        
        const idInput = flagElement.querySelector('.flag-id');
        idInput.value = flag.id || '';
        
        const typeSelect = flagElement.querySelector('.flag-type');
        typeSelect.value = flag.type || 'static';
        
        const contentInput = flagElement.querySelector('.flag-content');
        contentInput.value = flag.content || '';
        
        const dataSelect = flagElement.querySelector('.flag-data');
        // If data is "case_insensitive", select this option, otherwise leave the default value (case_sensitive)
        if (flag.data === 'case_insensitive') {
            dataSelect.value = 'case_insensitive';
        } else {
            dataSelect.value = ''; // Empty value represents case_sensitive 
        }
        
        const removeBtn = flagElement.querySelector('.remove-flag-btn');
        removeBtn.addEventListener('click', function() {
            flagElement.remove();
            state.currentFlags.splice(index, 1);
            renderFlagsInModal(); // Re-render to update indices
        });
        
        // Event listeners for flag changes
        contentInput.addEventListener('input', function() {
            state.currentFlags[index].content = this.value;
        });
        
        typeSelect.addEventListener('change', function() {
            state.currentFlags[index].type = this.value;
        });
        
        dataSelect.addEventListener('change', function() {
            state.currentFlags[index].data = this.value;
        });
        
        return flagElement;
    }

    /**
     * Updates the display of flags in the summary
     * This function should replace updateFlagsSummary
     */
    function updateFlagsSummary(container, flags) {
        if (!flags || flags.length === 0) {
            container.innerHTML = '<em>No flags defined</em>';
            return;
        }
        
        container.innerHTML = '';
        flags.forEach(flag => {
            const flagElement = document.createElement('div');
            flagElement.className = 'flag-summary-item';
            
            // Add case sensitivity information
            const caseSensitivity = flag.data === 'case_insensitive' ? 
                '<span class="badge badge-secondary mr-1">case insensitive</span>' : 
                '<span class="badge badge-warning mr-1">case sensitive</span>';
            
            flagElement.innerHTML = `
                <span class="badge badge-info mr-1">${flag.type}</span>
                ${caseSensitivity}
                <code>${escapeHtml(flag.content)}</code>
            `;
            container.appendChild(flagElement);
        });
    }

    /**
     * Adds a new flag to the modal (updated version)
     */
    function addFlagToModal() {
        const newFlag = {
            type: 'static',
            content: '',
            data: '' // By default, case sensitive (empty field)
        };
        
        state.currentFlags.push(newFlag);
        renderFlagsInModal();
        
        // Scroll to the bottom of the container
        elements.flagsContainer.scrollTop = elements.flagsContainer.scrollHeight;
    }
    
    /**
     * Saves the flags from the modal to the challenge
     */
    function saveFlags() {
        // Check if flags have content
        const emptyFlags = state.currentFlags.filter(flag => !flag.content.trim());
        if (emptyFlags.length > 0) {
            alert('All flags must have content');
            return;
        }
        
        // Update the challenge object with the new flags
        const challenge = state.challenges.find(c => c.id === state.currentEditingChallenge.id);
        if (challenge) {
            challenge.flags = [...state.currentFlags];
            
            // Update any open challenge details with the new flags
            const challengeRow = elements.challengesTbody.querySelector(`tr[data-id="${challenge.id}"]`);
            if (challengeRow) {
                const nextRow = challengeRow.nextElementSibling;
                if (nextRow && nextRow.classList.contains('challenge-details')) {
                    const flagsSummary = nextRow.querySelector('.flags-summary');
                    updateFlagsSummary(flagsSummary, challenge.flags);
                }
            }
        }
        
        // Close the modal
        $(elements.flagEditModal).modal('hide');
    }
    
    /**
     * Saves a challenge
     */
    async function saveChallenge(form) {
        try {
            const formData = new FormData(form);
            const challengeId = parseInt(formData.get('id'));
            
            const challenge = state.challenges.find(c => c.id === challengeId);
            if (!challenge) return;
            
            // Update challenge with form data
            challenge.name = formData.get('name');
            challenge.category = formData.get('category');
            challenge.value = parseInt(formData.get('value'));
            challenge.max_attempts = parseInt(formData.get('max_attempts'));
            challenge.description = formData.get('description');
            challenge.connection_info = formData.get('connection_info');
            challenge.attribution = formData.get('attribution');
            challenge.state = formData.get('state');
            
            // Send update to server
            const response = await fetch(`/plugins/bulk-challenge-manager/api/challenges/${challengeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify(challenge)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Find and update the challenge row
                const row = elements.challengesTbody.querySelector(`tr[data-id="${challengeId}"]`);
                if (row) {
                    row.querySelector('td:nth-child(3)').textContent = challenge.name;
                    row.querySelector('td:nth-child(4)').textContent = challenge.category || '';
                    row.querySelector('td:nth-child(5)').textContent = challenge.value;
                    row.querySelector('td:nth-child(6)').textContent = challenge.max_attempts || 'Unlimited';
                    
                    const stateTag = row.querySelector('td:nth-child(7) .badge');
                    stateTag.className = `badge badge-${challenge.state === 'visible' ? 'success' : 'secondary'}`;
                    stateTag.textContent = challenge.state;
                }
                
                // Remove the details row
                const detailsRow = row.nextElementSibling;
                if (detailsRow && detailsRow.classList.contains('challenge-details')) {
                    detailsRow.remove();
                }
                
                // Show success notification
                showNotification('Challenge updated successfully', 'success');
            } else {
                showNotification(data.message || 'Error updating challenge', 'danger');
            }
        } catch (error) {
            showNotification(`Error saving challenge: ${error.message}`, 'danger');
        }
    }
    
    /**
     * Updates bulk edit form visibility based on selection
     */
    function updateBulkEditVisibility() {
        const selectedCount = state.selectedChallenges.size;
        elements.selectedCount.textContent = selectedCount;
        
        if (selectedCount > 0) {
            elements.bulkEditForm.classList.remove('d-none');
        } else {
            elements.bulkEditForm.classList.add('d-none');
        }
    }
    
    /**
     * Updates the "select all" checkbox state
     */
    function updateSelectAllCheckbox() {
        const checkboxes = elements.challengesTbody.querySelectorAll('.challenge-checkbox');
        const checkedCount = elements.challengesTbody.querySelectorAll('.challenge-checkbox:checked').length;
        
        if (checkboxes.length === 0) {
            elements.selectAllCheckbox.checked = false;
            elements.selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === 0) {
            elements.selectAllCheckbox.checked = false;
            elements.selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === checkboxes.length) {
            elements.selectAllCheckbox.checked = true;
            elements.selectAllCheckbox.indeterminate = false;
        } else {
            elements.selectAllCheckbox.checked = false;
            elements.selectAllCheckbox.indeterminate = true;
        }
    }
    
    /**
     * Clears the bulk edit form
     */
    function clearBulkEditForm() {
        // Clear selected challenges
        state.selectedChallenges.clear();
        
        // Uncheck all challenge checkboxes
        elements.challengesTbody.querySelectorAll('.challenge-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Uncheck bulk edit form checkboxes
        elements.enableCategoryEdit.checked = false;
        elements.enableMaxAttemptsEdit.checked = false;
        elements.enableValueEdit.checked = false;
        elements.enableStateEdit.checked = false;
        
        // Disable form inputs
        elements.bulkCategory.disabled = true;
        elements.bulkMaxAttempts.disabled = true;
        elements.bulkValue.disabled = true;
        elements.bulkState.disabled = true;
        
        // Reset form values
        elements.bulkCategory.value = '';
        elements.bulkMaxAttempts.value = '';
        elements.bulkValue.value = '';
        elements.valueEditMode.value = 'absolute';
        elements.bulkState.value = 'visible';
        
        // Hide the form
        elements.bulkEditForm.classList.add('d-none');
        
        // Update "select all" checkbox state
        updateSelectAllCheckbox();
    }
    
    /**
     * Applies the bulk edit changes
     */
    async function applyBulkEdit() {
        try {
            if (state.selectedChallenges.size === 0) {
                showNotification('No challenges selected', 'warning');
                return;
            }
            
            // Prepare updates object
            const updates = {};
            
            if (elements.enableCategoryEdit.checked && elements.bulkCategory.value.trim()) {
                updates.category = elements.bulkCategory.value.trim();
            }
            
            if (elements.enableMaxAttemptsEdit.checked) {
                updates.max_attempts = parseInt(elements.bulkMaxAttempts.value) || 0;
            }
            
            if (elements.enableValueEdit.checked) {
                const value = parseInt(elements.bulkValue.value) || 0;
                updates.value = {
                    mode: elements.valueEditMode.value,
                    value: value
                };
            }
            
            if (elements.enableStateEdit.checked) {
                updates.state = elements.bulkState.value;
            }
            
            if (Object.keys(updates).length === 0) {
                showNotification('No changes to apply', 'warning');
                return;
            }
            
            // Send update to server
            const response = await fetch('/plugins/bulk-challenge-manager/api/bulk-update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'CSRF-Token': getCsrfToken()
                },
                body: JSON.stringify({
                    challenge_ids: Array.from(state.selectedChallenges),
                    updates: updates
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Refresh challenges to show updated data
                await fetchChallenges();
                
                // Clear bulk edit form
                clearBulkEditForm();
                
                // Show success notification
                showNotification(data.message || 'Challenges updated successfully', 'success');
            } else {
                showNotification(data.message || 'Error updating challenges', 'danger');
            }
        } catch (error) {
            showNotification(`Error applying bulk updates: ${error.message}`, 'danger');
        }
    }
    
    /**
     * Shows a loading indicator in the table
     */
    function showLoadingIndicator() {
        elements.challengesTbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                </td>
            </tr>
        `;
    }
    
    /**
     * Shows an error in the table
     */
    function showError(message) {
        elements.challengesTbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="alert alert-danger mb-0">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        ${escapeHtml(message)}
                    </div>
                </td>
            </tr>
        `;
    }
    
    /**
     * Shows a notification
     */
    function showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.top = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '9999';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} shadow-sm`;
        notification.innerHTML = message;
        notification.style.marginBottom = '10px';
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Remove after timeout
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                notification.remove();
                // Remove container if empty
                if (notificationContainer.children.length === 0) {
                    notificationContainer.remove();
                }
            }, 500);
        }, 3000);
    }
    
    /**
     * Fetches flag types from the server
     */
    async function fetchFlagTypes() {
        try {
            const response = await fetch('/plugins/bulk-challenge-manager/api/flag-types');
            const data = await response.json();
            
            if (data.success && data.types && data.types.length > 0) {
                state.flagTypes = data.types;
            }
        } catch (error) {
            console.error('Error fetching flag types:', error);
        }
    }
    
    /**
     * Loads challenges with current filters
     */
    async function loadChallenges() {
        await fetchChallenges();
    }
    
    /**
     * Helper to get CSRF token
     */
    function getCsrfToken() {
        // First try to retrieve from the global CTFd variable
        if (typeof CTFd !== 'undefined' && CTFd.csrfToken) {
            return CTFd.csrfToken;
        }
        
        // Try to retrieve from the meta element
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }
        
        // Try to retrieve from the global 'init' variable
        if (typeof init !== 'undefined' && init.csrfNonce) {
            return init.csrfNonce;
        }
        
        // If no method works, display a warning
        console.warn('CSRF token not found. Requests may fail.');
        return '';
    }
    
    /**
     * Helper to escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }
    
    /**
     * Creates a debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    // ===== Initialize =====
    
    // Fetch flag types
    fetchFlagTypes();
    
    // Initial load of challenges
    loadChallenges();
});
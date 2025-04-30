document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const elements = {
    mapContainer: document.getElementById("challenge-network"),
    categoryFilters: document.getElementById("category-filters"),
    showAllCategories: document.getElementById("show-all-categories"),
    selectedChallengeInfo: document.getElementById("selected-challenge-info"),
    saveLayoutBtn: document.getElementById("save-layout-btn"),
    resetLayoutBtn: document.getElementById("reset-layout-btn"),
    exportImageBtn: document.getElementById("export-image-btn"),
    validateBtn: document.getElementById("validate-graph-btn"),

    // Modal elements
    challengeEditModal: document.getElementById("challenge-edit-modal"),
    editChallengeId: document.getElementById("edit-challenge-id"),
    editChallengeName: document.getElementById("edit-challenge-name"),
    editChallengeValue: document.getElementById("edit-challenge-value"),
    editChallengeState: document.getElementById("edit-challenge-state"),
    editChallengeCategory: document.getElementById("edit-challenge-category"),
    editChallengePrerequisites: document.getElementById(
      "edit-challenge-prerequisites"
    ),
    saveChallengeBtn: document.getElementById("save-challenge-btn"),
  };

  // Modern color palette
  const modernPalette = {
    blue: "#4285F4", // Google Blue
    green: "#34A853", // Google Green
    yellow: "#FBBC05", // Google Yellow
    red: "#EA4335", // Google Red
    purple: "#833AB4", // Instagram Purple
    orange: "#FF9800", // Material Orange
    teal: "#00BCD4", // Material Teal
    indigo: "#3F51B5", // Material Indigo
    pink: "#E91E63", // Material Pink
    lime: "#CDDC39", // Material Lime
    brown: "#795548", // Material Brown
    grey: "#607D8B", // Material Blue Grey
    navy: "#0D47A1", // Material Blue 900
    emerald: "#2ecc71", // Flat UI Emerald
    alizarin: "#e74c3c", // Flat UI Alizarin
    amethyst: "#9b59b6", // Flat UI Amethyst
    sunflower: "#f1c40f", // Flat UI Sunflower
  };

  // State
  let state = {
    cy: null, // Cytoscape instance
    challenges: [], // List of all challenges
    categories: [], // List of categories
    categoryColors: {}, // Colors by category
    activeCategories: new Set(), // Currently visible categories
    selectedChallengeId: null, // ID of the selected challenge
    layoutSaved: false, // If the layout has been saved
    positions: {}, // Saved node positions
    addingEdge: false, // If currently adding an edge
    edgeSource: null, // Source node ID for edge addition
    draggedNode: null, // Currently dragged node
    nodeMoved: false, // If a node has been moved
    modernColors: Object.values(modernPalette), // Modern color palette
  };

  // ===== Cytoscape Setup =====

  /**
   * Initializes the Cytoscape visualization
   */
  function initCytoscape() {
    state.cy = cytoscape({
        container: elements.mapContainer,

        // Visual style of elements
        style: [
            // Node style (challenges)
            {
                selector: 'node',
                style: {
                    'shape': 'round-rectangle',
                    'background-color': 'data(color)',
                    'width': '120px',
                    'height': '50px',
                    'padding': '8px',
                    'border-width': 1,
                    'border-color': '#ddd',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px',
                    'label': ele => formatNodeLabel(ele.data()),
                    'color': '#000',
                    'font-size': '12px',
                    'font-weight': 'bold',
                    'opacity': 'data(opacity)',
                    'z-index': 1
                }
            },
            // Style for selected nodes
            {
                selector: 'node:selected',
                style: {
                    'border-width': 3,
                    'border-color': '#FFA726',
                    'border-opacity': 1,
                    'z-index': 2,
                    'background-blacken': 0.1
                }
            },
            // Style for source node when creating edges
            {
                selector: '.edge-source',
                style: {
                    'border-width': 3,
                    'border-color': '#FF5722',
                    'border-opacity': 1,
                    'z-index': 2,
                    'background-blacken': 0.2
                }
            },
            // Style for isolated nodes (orphans)
            {
                selector: '.orphan',
                style: {
                    'border-width': 3,
                    'border-color': '#FF5252',
                    'border-opacity': 0.8,
                    'border-style': 'dashed'
                }
            },
            // Style for nodes in a cycle
            {
                selector: '.cycle',
                style: {
                    'border-width': 3,
                    'border-color': '#FFEB3B',
                    'border-opacity': 0.8,
                    'border-style': 'double'
                }
            },
            // Edge style (dependencies)
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#757575',
                    'target-arrow-color': '#757575',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 1.2,
                    'opacity': 0.7,
                    'z-index': 0
                }
            },
            // Style for selected edges
            {
                selector: 'edge:selected',
                style: {
                    'width': 3,
                    'line-color': '#FF5252',
                    'target-arrow-color': '#FF5252',
                    'opacity': 1,
                    'z-index': 1
                }
            },
            // Style for cyclic edges
            {
                selector: '.cycle-edge',
                style: {
                    'line-color': '#FFEB3B',
                    'target-arrow-color': '#FFEB3B',
                    'line-style': 'dashed',
                    'opacity': 0.8
                }
            }
        ],

        // General options
        minZoom: 0.2,
        maxZoom: 3,
        autoungrabify: false,
        autounselectify: false,
        selectionType: 'single',
        boxSelectionEnabled: false
    });

    // Initialize event handlers
    setupEventListeners();

    // Add tooltips to nodes
    setupNodeTooltips();
  }

  /**
   * Formats a node label with the category above the name
   */
  function formatNodeLabel(nodeData) {
    const challenge = nodeData.challenge;
    if (!challenge) return "";
    
    const name = challenge.name;
    const value = challenge.value;
    
    // Concise format with point value
    return `${name}\n${value} pts`;
  }

  /**
   * Adds manual tooltips to nodes
   */
  function setupNodeTooltips() {
    // Remove old tooltip if it exists
    let oldTooltip = document.getElementById('cytoscape-tooltip');
    if (oldTooltip) {
        oldTooltip.remove();
    }
    // We no longer add new tooltips
  }

  /**
   * Sets up event handlers for Cytoscape
   */
  function setupEventListeners() {
    // Node selection
    state.cy.on("tap", "node", function (evt) {
      // Ignore the event if a node was just moved
      if (state.nodeMoved) {
        state.nodeMoved = false;
        return;
      }

      const node = evt.target;
      const challengeId = parseInt(node.id());

      // Update the info panel
      state.selectedChallengeId = challengeId;
      updateSelectedChallengeInfo(getChallengeById(challengeId));

      // If in edge adding mode, process edge creation
      if (state.addingEdge && state.edgeSource) {
        const sourceId = state.edgeSource;
        const targetId = challengeId;

        if (sourceId === targetId) {
          showNotification(
            "Cannot create a dependency on the same challenge",
            "warning"
          );
          resetEdgeCreation();
          return;
        }

        // Check if the edge already exists
        const existingEdge = state.cy.edges(
          `[source = "${sourceId}"][target = "${targetId}"]`
        );
        if (existingEdge.length > 0) {
          showNotification("This dependency already exists", "warning");
          resetEdgeCreation();
          return;
        }

        // Check if this would create a circular dependency
        if (wouldCreateCycle(sourceId, targetId)) {
          showNotification(
            "Cannot create this dependency: it would create a circular reference",
            "error"
          );
          resetEdgeCreation();
          return;
        }

        // Create the edge
        state.cy.add({
          group: "edges",
          data: {
            id: `${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
          },
        });

        // Update the prerequisites
        updateChallengePrerequisites(targetId, sourceId);

        // Reset edge adding mode
        resetEdgeCreation();
      }
    });

    // Right-click on a node (start edge creation)
    state.cy.on("cxttap", "node", function (evt) {
      evt.preventDefault();

      // If already in edge creation mode, reset
      if (state.addingEdge) {
        resetEdgeCreation();
      }

      // Set up edge creation mode
      const node = evt.target;
      const challengeId = parseInt(node.id());
      state.edgeSource = challengeId;
      state.addingEdge = true;

      // Highlight the source node
      node.addClass("edge-source");

      // Challenge for the message
      const challenge = getChallengeById(challengeId);
      showNotification(
        `Click on another challenge to create a dependency from <strong>${challenge.name}</strong>`,
        "info"
      );

      return false;
    });

    // Edge selection
    state.cy.on("tap", "edge", function (evt) {
      const edge = evt.target;

      if (confirm("Delete this dependency?")) {
        const sourceId = edge.source().id();
        const targetId = edge.target().id();

        // Remove the edge from the graph
        state.cy.remove(edge);

        // Update prerequisites
        removePrerequisite(targetId, sourceId);
      } else {
        // Deselect the edge if the user cancels
        edge.unselect();
      }
    });

    // Click on background (to deselect)
    state.cy.on("tap", function (evt) {
      if (evt.target === state.cy) {
        // Click on background
        updateSelectedChallengeInfo(null);

        // If in edge adding mode, cancel
        if (state.addingEdge) {
          resetEdgeCreation();
        }
      }
    });

    // Start of drag-and-drop
    state.cy.on("dragstart", "node", function (evt) {
      state.draggedNode = evt.target;
    });

    // During movement
    state.cy.on("drag", "node", function () {
      state.nodeMoved = true;
    });

    // End of drag-and-drop
    state.cy.on("dragfree", "node", function (evt) {
      const node = evt.target;
      const challengeId = parseInt(node.id());

      // Save the position
      state.positions[challengeId] = {
        x: node.position("x"),
        y: node.position("y"),
      };

      // Mark as unsaved
      state.layoutSaved = false;

      // Apply overlap prevention
      setTimeout(() => {
        preventOverlap();
      }, 50);

      // Reset the dragged node after a delay to avoid unwanted clicks
      setTimeout(() => {
        state.draggedNode = null;
        state.nodeMoved = false;
      }, 100);
    });
  }

  /**
   * Resets the edge creation mode
   */
  function resetEdgeCreation() {
    if (state.edgeSource) {
      // Reset the source node style
      state.cy.getElementById(state.edgeSource).removeClass("edge-source");
    }

    state.addingEdge = false;
    state.edgeSource = null;
  }

  /**
   * Checks if adding an edge would create a cycle
   */
  function wouldCreateCycle(sourceId, targetId) {
    // Check if a reverse edge already exists (direct cycle)
    const reverseEdge = state.cy.edges(
      `[source = "${targetId}"][target = "${sourceId}"]`
    );
    if (reverseEdge.length > 0) {
      return true;
    }

    // Check for indirect cycles with a cycle detection algorithm
    const tempEdge = {
      group: "edges",
      data: {
        id: `temp-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
      },
    };

    // Temporarily add the edge for testing
    state.cy.add(tempEdge);

    // Use BFS algorithm to detect a cycle
    const hasCycle = detectCycle();

    // Remove the temporary edge
    state.cy.remove(`#temp-${sourceId}-${targetId}`);

    return hasCycle;
  }

  /**
   * Detects cycles in the graph with the BFS algorithm
   */
  function detectCycle() {
    const nodes = state.cy.nodes();
    const visited = new Set();
    const visiting = new Set();

    // Traverse all nodes to find cycles
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!visited.has(node.id())) {
        if (detectCycleUtil(node, visited, visiting)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Recursive utility function to detect cycles
   */
  function detectCycleUtil(node, visited, visiting) {
    visiting.add(node.id());

    // Check all outgoing neighbors (target nodes of edges)
    const outgoers = node.outgoers("node");
    for (let i = 0; i < outgoers.length; i++) {
      const neighbor = outgoers[i];

      // If the neighbor is being visited, we have a cycle
      if (visiting.has(neighbor.id())) {
        return true;
      }

      // If the neighbor has not been visited, continue DFS
      if (!visited.has(neighbor.id())) {
        if (detectCycleUtil(neighbor, visited, visiting)) {
          return true;
        }
      }
    }

    // Mark the node as visited and remove it from nodes being visited
    visiting.delete(node.id());
    visited.add(node.id());

    return false;
  }

  /**
   * Validates the graph structure and identifies problems
   */
  function validateGraph() {
    // Reset styles
    state.cy.nodes().removeClass("orphan cycle");
    state.cy.edges().removeClass("cycle-edge");

    // Find orphan challenges (without prerequisites and without dependents)
    const orphans = state.cy.nodes().filter((node) => {
      return node.degree() === 0;
    });

    // Find dependency cycles
    const cycles = findCycles();

    // Display results
    if (orphans.length === 0 && cycles.length === 0) {
      showNotification(
        "No issues detected in the challenge structure",
        "success"
      );
      return;
    }

    // Highlight orphan challenges
    if (orphans.length > 0) {
      orphans.addClass("orphan");
      const orphanNames = orphans
        .map((node) => node.data("challenge").name)
        .join(", ");
      showNotification(`Isolated challenges detected: ${orphanNames}`, "warning");
    }

    // Highlight cycles
    if (cycles.length > 0) {
      cycles.forEach((cycle) => {
        // Highlight cycle nodes
        cycle.nodes.forEach((nodeId) => {
          state.cy.getElementById(nodeId).addClass("cycle");
        });

        // Highlight cycle edges
        cycle.edges.forEach((edgeData) => {
          const edgeId = `${edgeData.source}-${edgeData.target}`;
          state.cy.getElementById(edgeId).addClass("cycle-edge");
        });

        const cycleNames = cycle.nodes
          .map((nodeId) => {
            const challenge = getChallengeById(parseInt(nodeId));
            return challenge ? challenge.name : nodeId;
          })
          .join(" → ");

        showNotification(
          `Circular dependency detected: ${cycleNames}`,
          "error"
        );
      });
    }
  }

  /**
   * Finds all cycles in the graph
   * @returns {Array} List of cycles
   */
  function findCycles() {
    const cycles = [];
    const visited = new Set();
    const path = [];
    const pathSet = new Set();

    // For each node, start DFS to find cycles
    state.cy.nodes().forEach((node) => {
      if (!visited.has(node.id())) {
        dfsForCycles(node, visited, path, pathSet, cycles);
      }
    });

    return cycles;
  }

  /**
   * DFS to find cycles
   */
  function dfsForCycles(node, visited, path, pathSet, cycles) {
    visited.add(node.id());
    path.push(node.id());
    pathSet.add(node.id());

    // Explore all outgoing neighbors
    node.outgoers("node").forEach((neighbor) => {
      // If the neighbor is on the current path, it's a cycle
      if (pathSet.has(neighbor.id())) {
        const cycleStart = path.indexOf(neighbor.id());
        const cycleNodes = path.slice(cycleStart);
        cycleNodes.push(neighbor.id()); // Close the cycle

        // Create cycle edges
        const cycleEdges = [];
        for (let i = 0; i < cycleNodes.length - 1; i++) {
          cycleEdges.push({
            source: cycleNodes[i],
            target: cycleNodes[i + 1],
          });
        }

        cycles.push({
          nodes: cycleNodes,
          edges: cycleEdges,
        });
      } else if (!visited.has(neighbor.id())) {
        dfsForCycles(neighbor, visited, path, pathSet, cycles);
      }
    });

    // Remove the node from the current path
    path.pop();
    pathSet.delete(node.id());
  }

  /**
   * Updates the selected challenge info panel
   */
  function updateSelectedChallengeInfo(challenge) {
      const infoContainer = elements.selectedChallengeInfo;
    
      if (!challenge) {
        infoContainer.innerHTML = `
          <div class="text-muted text-center py-4">
            <i class="fas fa-mouse-pointer mb-2" style="font-size: 24px;"></i>
            <p>Click on a challenge to view its details</p>
          </div>
        `;
        return;
      }
    
      // Get prerequisites and dependents as before...
      const prereqs = getPrerequisiteChallenges(challenge);
      const prereqsHtml = prereqs.length > 0
        ? prereqs.map(c => `
          <span class="badge badge-info mr-1 mb-1" style="font-size: 11px; padding: 5px 8px;">
            ${escapeHtml(c.name)}
          </span>`).join("")
        : '<em class="text-muted">None</em>';
    
      const dependents = state.challenges.filter(c => {
        const prereqIds = getPrerequisiteIds(c);
        return prereqIds.includes(challenge.id);
      });
    
      const dependentsHtml = dependents.length > 0
        ? dependents.map(c => `
          <span class="badge badge-secondary mr-1 mb-1" style="font-size: 11px; padding: 5px 8px;">
            ${escapeHtml(c.name)}
          </span>`).join("")
        : '<em class="text-muted">None</em>';
    
      // Category color
      const categoryColor = state.categoryColors[challenge.category || 'Uncategorized'] || '#757575';
    
      // Build HTML with more compact buttons (just icons)
      infoContainer.innerHTML = `
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-${challenge.state === 'visible' ? 'primary' : 'secondary'} text-white">
            <h5 class="mb-0">${escapeHtml(challenge.name)}</h5>
          </div>
          <div class="card-body p-3">
            <div class="d-flex align-items-center mb-3">
              <span class="badge mr-2" style="background-color: ${categoryColor}; color: white; padding: 4px 8px; font-size: 11px;">
                ${escapeHtml(challenge.category || 'Uncategorized')}
              </span>
              <span class="badge badge-${challenge.state === 'visible' ? 'success' : 'secondary'} mr-2">
                ${challenge.state === 'visible' ? 'Visible' : 'Hidden'}
              </span>
              <span class="badge badge-primary">${challenge.value} pts</span>
            </div>
            
            <div class="small mb-3">
              <strong>Description:</strong>
              <div class="border rounded p-2 bg-light mt-1 mb-2" style="font-size: 12px; max-height: 80px; overflow-y: auto;">
                ${challenge.description ? escapeHtml(challenge.description) : '<em class="text-muted">No description</em>'}
              </div>
            </div>
            
            <div class="small mb-2">
              <strong>Prerequisites:</strong>
              <div class="mt-1">${prereqsHtml}</div>
            </div>
            
            <div class="small mb-3">
              <strong>Unlocks:</strong>
              <div class="mt-1">${dependentsHtml}</div>
            </div>
            
            <!-- More compact buttons (icons only) -->
            <div class="d-flex justify-content-between mt-4">
              <button class="btn btn-sm btn-primary edit-challenge-btn" data-id="${challenge.id}" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <a href="/admin/challenges/${challenge.id}" class="btn btn-sm btn-info" target="_blank" title="View challenge">
                <i class="fas fa-external-link-alt"></i>
              </a>
            </div>
          </div>
        </div>
      `;
    
      // Add event listener as before
      infoContainer.querySelector('.edit-challenge-btn').addEventListener('click', function() {
        const id = parseInt(this.getAttribute('data-id'));
        openEditModal(id);
      });
    }

  /**
   * Adjusts the initial zoom for a better overview
   */
  function adjustInitialZoom() {
    // Wait for the layout to stabilize
    setTimeout(() => {
        state.cy.fit();
        state.cy.zoom(state.cy.zoom() * 0.8); // Zoom out slightly to see the whole view
        state.cy.center();
    }, 1000);
  }

  /**
   * Opens the edit modal for a challenge
   */
  function openEditModal(challengeId) {
    const challenge = getChallengeById(challengeId);
    if (!challenge) return;

    // Fill the form
    elements.editChallengeId.value = challenge.id;
    elements.editChallengeName.value = challenge.name;
    elements.editChallengeValue.value = challenge.value;
    elements.editChallengeState.value = challenge.state;
    elements.editChallengeCategory.value = challenge.category || "";

    // Update prerequisites display
    updatePrerequisitesDisplay(challenge);

    // Show the modal
    $(elements.challengeEditModal).modal("show");
  }

  /**
   * Updates the prerequisites display in the edit modal
   */
  function updatePrerequisitesDisplay(challenge) {
    const container = elements.editChallengePrerequisites;
    const prereqs = getPrerequisiteChallenges(challenge);

    if (prereqs.length === 0) {
      container.innerHTML =
        '<em class="text-muted">No prerequisites defined</em>';
      return;
    }

    container.innerHTML = "";
    prereqs.forEach((prereq) => {
      const prereqEl = document.createElement("div");
      prereqEl.className = "badge badge-info mr-1 mb-1 p-2";
      prereqEl.innerHTML = `
                ${escapeHtml(prereq.name)}
                <button type="button" class="close ml-2 text-white remove-prereq-btn" 
                        data-id="${prereq.id}" aria-label="Remove">
                    <span aria-hidden="true">&times;</span>
                </button>
            `;
      container.appendChild(prereqEl);

      // Add event listener to the remove button
      prereqEl
        .querySelector(".remove-prereq-btn")
        .addEventListener("click", function () {
          const prereqId = parseInt(this.getAttribute("data-id"));
          removePrerequisite(challenge.id, prereqId);
          prereqEl.remove();

          // Update the graph
          state.cy.remove(
            `edge[source = "${prereqId}"][target = "${challenge.id}"]`
          );
        });
    });
  }

  // ===== Data Functions =====

  /**
   * Fetches challenges from the server
   */
  async function fetchChallenges() {
    try {
      const response = await fetch(
        "/plugins/bulk-challenge-manager/api/challenges"
      );
      const data = await response.json();

      if (data.success) {
        state.challenges = data.challenges;
        updateCategoryFilters(data.categories || []);
        buildGraphData();
      } else {
        showNotification(
          data.message || "Error loading challenges",
          "danger"
        );
      }
    } catch (error) {
      showNotification(
        `Error loading challenges: ${error.message}`,
        "danger"
      );
    }
  }

  /**
   * Fetches saved layout if available
   */
  async function fetchSavedLayout() {
    try {
      const response = await fetch(
        "/plugins/bulk-challenge-manager/api/challenge-layout"
      );
      const data = await response.json();

      if (data.success && data.layout) {
        state.positions = data.layout;
        state.layoutSaved = true;
        return true;
      }
    } catch (error) {
      console.error("Error loading layout:", error);
    }

    return false;
  }

  /**
   * Saves the current layout
   */
  async function saveLayout() {
    try {
      // Get the current positions of all nodes
      const positions = {};
      state.cy.nodes().forEach((node) => {
        positions[node.id()] = {
          x: node.position("x"),
          y: node.position("y"),
        };
      });

      const response = await fetch(
        "/plugins/bulk-challenge-manager/api/challenge-layout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "CSRF-Token": getCsrfToken(),
          },
          body: JSON.stringify({
            layout: positions,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        state.layoutSaved = true;
        state.positions = positions;
        showNotification("Layout saved successfully", "success");
      } else {
        showNotification(
          data.message || "Error saving layout",
          "danger"
        );
      }
    } catch (error) {
      showNotification(
        `Error saving layout: ${error.message}`,
        "danger"
      );
    }
  }

  /**
   * Resets the layout to saved state or default
   */
  function resetLayout() {
    if (state.layoutSaved && Object.keys(state.positions).length > 0) {
        // Apply saved positions
        state.cy.nodes().forEach(node => {
            const nodeId = node.id();
            if (state.positions[nodeId]) {
                node.position(state.positions[nodeId]);
            }
        });
        state.cy.fit();
    } else {
        applyDefaultLayout();
    }
    
    // Apply our custom function to prevent overlaps
    preventOverlap();
  }

  /**
   * Function to prevent node overlaps
   */
  function preventOverlap() {
      const minDistance = 150; // Minimum distance between nodes
      const nodes = state.cy.nodes();
      const iterations = 20; // More iterations for better results
      
      // Perform multiple iterations to progressively resolve overlaps
      for (let iteration = 0; iteration < iterations; iteration++) {
          let moved = false;
          
          // For each pair of nodes, check if they overlap
          for (let i = 0; i < nodes.length; i++) {
              const node1 = nodes[i];
              const pos1 = node1.position();
              
              for (let j = i + 1; j < nodes.length; j++) {
                  const node2 = nodes[j];
                  const pos2 = node2.position();
                  
                  // Calculate distance between node centers
                  const dx = pos1.x - pos2.x;
                  const dy = pos1.y - pos2.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  // If nodes are too close, move them apart
                  if (distance < minDistance) {
                      // Repulsion force proportional to proximity
                      const force = (minDistance - distance) / distance * 1.2;
                      
                      // Move both nodes in opposite directions
                      // But favor horizontal movement over vertical
                      // to preserve hierarchy
                      const forceX = dx * force * 0.8;
                      const forceY = dy * force * 0.2; // Less vertical force
                      
                      node1.position({
                          x: pos1.x + forceX,
                          y: pos1.y + forceY
                      });
                      
                      node2.position({
                          x: pos2.x - forceX,
                          y: pos2.y - forceY
                      });
                      
                      // Update saved positions
                      state.positions[node1.id()] = {
                          x: pos1.x + forceX,
                          y: pos1.y + forceY
                      };
                      
                      state.positions[node2.id()] = {
                          x: pos2.x - forceX,
                          y: pos2.y - forceY
                      };
                      
                      moved = true;
                  }
              }
          }
          
          // If no node was moved, overlaps are resolved
          if (!moved) break;
      }
  }

  /**
   * Applies a default layout
   */
  function applyDefaultLayout() {
      try {
          // Use improved hierarchical layout
          adjustLayoutBasedOnDependencies();
          
          // Center the view
          state.cy.fit();
      } catch (error) {
          console.error('Error applying hierarchical layout:', error);
          // Fallback to grid layout if hierarchical layout fails
          fallbackToGridLayout();
      }
  }

  function fallbackToGridLayout() {
      const layout = state.cy.layout({
          name: 'grid',
          fit: true,
          padding: 40,
          avoidOverlap: true,
          spacingFactor: 2.0,
          nodeDimensionsIncludeLabels: true
      });
      
      layout.run();
      
      setTimeout(preventOverlap, 300);
  }

  function adjustLayoutBasedOnDependencies() {
      // Calculate dependency levels (without inversion)
      const levels = calculateDependencyLevels();
      
      // Get container dimensions
      const containerWidth = elements.mapContainer.clientWidth;
      const containerHeight = elements.mapContainer.clientHeight;
      
      // Parameters for placement
      const padding = 80;
      const verticalSpacing = 150; // More vertical space for readability
      
      // For each level, adjust Y position
      Object.keys(levels).forEach(level => {
          const levelInt = parseInt(level);
          const nodesInLevel = levels[level];
          
          // Calculate horizontal spacing for this level
          const horizontalSpacing = (containerWidth - 2 * padding) / (nodesInLevel.length + 1);
          
          // Position each node in this level
          nodesInLevel.forEach((nodeId, index) => {
              const node = state.cy.getElementById(nodeId);
              if (node) {
                  // Add slight random horizontal offset to avoid rigid look
                  const jitterX = (Math.random() - 0.5) * 20;
                  
                  const xPos = padding + (index + 1) * horizontalSpacing + jitterX;
                  const yPos = padding + levelInt * verticalSpacing;
                  
                  node.position({
                      x: xPos,
                      y: yPos
                  });
                  
                  // Update saved positions
                  state.positions[nodeId] = {
                      x: xPos,
                      y: yPos
                  };
              }
          });
      });
      
      // Apply overlap prevention
      preventOverlap();
  }

  /**
* Calculates dependency levels for each node
* @returns {Object} An object with levels as keys and arrays of nodeIds as values
*/
  function calculateDependencyLevels() {
      const levels = {};
      const visited = new Set();
      const tempVisited = new Set();
      
      // Recursive function to determine a node's level
      function assignLevel(nodeId, currentLevel = 0) {
          // If we've already visited this node in this traversal, it's a cycle
          if (tempVisited.has(nodeId)) return;
          
          // If we've already processed this node, update if the new level is deeper
          if (visited.has(nodeId)) {
              // Find current node level
              let currentNodeLevel = -1;
              for (let lvl in levels) {
                  if (levels[lvl].includes(nodeId)) {
                      currentNodeLevel = parseInt(lvl);
                      break;
                  }
              }
              
              // If the new level is deeper, update
              if (currentLevel > currentNodeLevel) {
                  // Remove from old level
                  levels[currentNodeLevel] = levels[currentNodeLevel].filter(id => id !== nodeId);
                  
                  // Add to new level
                  if (!levels[currentLevel]) levels[currentLevel] = [];
                  levels[currentLevel].push(nodeId);
              }
              return;
          }
          
          // Mark as temporarily visited to detect cycles
          tempVisited.add(nodeId);
          
          // Get predecessors (nodes this one depends on)
          const node = state.cy.getElementById(nodeId);
          const incomers = node.incomers('node');
          
          // If no predecessors, it's a root (level 0)
          if (incomers.length === 0) {
              if (!levels[0]) levels[0] = [];
              if (!levels[0].includes(nodeId)) {
                  levels[0].push(nodeId);
              }
          } else {
              // Process all predecessors first
              incomers.forEach(pred => {
                  const predId = pred.id();
                  assignLevel(predId, 0); // Start at 0 for predecessors
              });
              
              // Find max level of predecessors
              let maxPredLevel = -1;
              for (let pred of incomers) {
                  const predId = pred.id();
                  for (let lvl in levels) {
                      if (levels[lvl].includes(predId)) {
                          maxPredLevel = Math.max(maxPredLevel, parseInt(lvl));
                          break;
                      }
                  }
              }
              
              // Place this node at the next level after its predecessors
              const nodeLevel = maxPredLevel + 1;
              if (!levels[nodeLevel]) levels[nodeLevel] = [];
              if (!levels[nodeLevel].includes(nodeId)) {
                  levels[nodeLevel].push(nodeId);
              }
          }
          
          // Mark as fully visited
          visited.add(nodeId);
          tempVisited.delete(nodeId);
          
          // Process successors to ensure they're at least 1 level lower
          const outgoers = node.outgoers('node');
          outgoers.forEach(succ => {
              const succId = succ.id();
              assignLevel(succId, currentLevel + 1);
          });
      }
      
      // Start with nodes without predecessors (roots)
      const rootNodes = state.cy.nodes().filter(n => n.incomers('node').length === 0);
      rootNodes.forEach(node => {
          assignLevel(node.id(), 0);
      });
      
      // Process remaining nodes (in potential cycles)
      state.cy.nodes().forEach(node => {
          const nodeId = node.id();
          if (!visited.has(nodeId)) {
              assignLevel(nodeId, 0);
          }
      });
      
      // IMPORTANT: Don't invert levels - that's where the problem occurs
      return levels;
  }

  /**
   * Distributes nodes more evenly
   */
  function spreadNodesEvenly() {
    // Get dimensions of visible area
    const containerWidth = elements.mapContainer.clientWidth;
    const containerHeight = elements.mapContainer.clientHeight;
    
    // Calculate a grid with sufficiently large cells
    const nodeCount = state.cy.nodes().length;
    const cellSize = Math.max(200, 250); // Minimum cell size
    
    // Number of columns and rows in the grid
    const cols = Math.floor(containerWidth / cellSize);
    const rows = Math.ceil(nodeCount / cols);
    
    // Distribute nodes on the grid
    state.cy.nodes().forEach((node, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        // Add some randomness to avoid a too regular grid
        const jitterX = (Math.random() - 0.5) * 40;
        const jitterY = (Math.random() - 0.5) * 40;
        
        // Calculate position
        const x = (col + 0.5) * cellSize + jitterX;
        const y = (row + 0.5) * cellSize + jitterY;
        
        // Position the node
        node.position({x, y});
    });
    
    // Apply our custom function to prevent overlaps
    preventOverlap();
    
    // Adjust zoom to see all nodes
    state.cy.fit();
  }

  /**
   * Builds graph data from challenges
   */
  function buildGraphData() {
      // Clear the graph
      state.cy.elements().remove();
  
      // Generate color map for categories
      updateCategoryColors();
  
      // Add nodes (challenges)
      state.challenges.forEach((challenge) => {
          // Calculate node size based on value
          const nodeSize = Math.max(50, Math.min(100, challenge.value / 10 + 50));
  
          // Determine color and opacity
          const category = challenge.category || "Uncategorized";
          const color = state.categoryColors[category] || "#757575";
          const opacity = challenge.state === "visible" ? 1 : 0.5;
  
          // Create node with category above name
          state.cy.add({
              group: "nodes",
              data: {
                  id: challenge.id.toString(),
                  challenge: challenge,
                  name: challenge.name,
                  category: category,
                  value: challenge.value,
                  size: nodeSize,
                  color: color,
                  opacity: opacity,
              },
          });
      });
  
      // Add edges (prerequisites) - relations between challenges
      state.challenges.forEach((challenge) => {
          const prereqs = getPrerequisiteIds(challenge);
  
          prereqs.forEach((prereqId) => {
              // Get prerequisite challenge
              const prereqChallenge = getChallengeById(prereqId);
              if (!prereqChallenge) return;
  
              state.cy.add({
                  group: "edges",
                  data: {
                      id: `${prereqId}-${challenge.id}`,
                      source: prereqId.toString(),
                      target: challenge.id.toString(),
                      label: `Prerequisite: ${prereqChallenge.name}`,
                  },
              });
          });
      });
  
      // Apply layout
      if (state.layoutSaved && Object.keys(state.positions).length > 0) {
          // Apply saved positions
          state.cy.nodes().forEach((node) => {
              const nodeId = parseInt(node.id());
              if (state.positions[nodeId]) {
                  node.position(state.positions[nodeId]);
              }
          });
          state.cy.fit();
          
          // Apply overlap prevention even with saved positions
          setTimeout(() => {
              preventOverlap();
          }, 300);
      } else {
          // Apply our new hierarchical layout for logical placement
          applyDefaultLayout();
      }
  
      // Add tooltips to nodes for better user experience
      setTimeout(() => {
          setupNodeTooltips();
      }, 500);
  
      // Update filters
      filterNodesByCategory();
  
      // Add validation button
      addValidateButton();
  
      // Adjust initial zoom for better overview
      adjustInitialZoom();
  }

  /**
* Addition of a new function for the "Organize Logically" button
* to add to the toolbar
*/
function addOrganizeLogicallyButton() {
  const organizeBtn = document.createElement("button");
  organizeBtn.id = "organize-logically-btn";
  organizeBtn.className = "btn btn-success btn-sm mr-2";
  organizeBtn.innerHTML = '<i class="fas fa-project-diagram mr-1"></i> Organize Logically';
  
  // Find parent element to insert button
  const btnContainer = document.querySelector(".card-header .d-flex:last-child");
  if (btnContainer) {
      // Insert before export button
      const exportBtn = document.getElementById("export-image-btn");
      if (exportBtn) {
          btnContainer.insertBefore(organizeBtn, exportBtn);
      } else {
          btnContainer.appendChild(organizeBtn);
      }
  }
  
  // Add event listener
  organizeBtn.addEventListener("click", function() {
      // Reorganize logically without clearing saved positions
      const tempPositions = { ...state.positions };
      state.positions = {}; // Temporarily empty positions
      applyDefaultLayout();
      
      // Show notification
      showNotification("Logical organization applied. Don't forget to save if you want to keep this layout.", "info");
      
      // Restore positions so 'save' works correctly, but keep new visual positions
      state.cy.nodes().forEach(node => {
          const nodeId = node.id();
          tempPositions[nodeId] = {
              x: node.position('x'),
              y: node.position('y')
          };
      });
      state.positions = tempPositions;
      state.layoutSaved = false;
  });
}

  /**
   * Adds a button to validate the graph structure
   */
  function addValidateButton() {
    // Check if button already exists
    if (document.getElementById("validate-graph-btn")) {
      return;
    }

    // Create button
    const validateBtn = document.createElement("button");
    validateBtn.id = "validate-graph-btn";
    validateBtn.className = "btn btn-sm btn-warning cytoscape-control-btn";
    validateBtn.innerHTML =
      '<i class="fas fa-check-circle mr-1"></i> Check Logic';

    // Add event listener
    validateBtn.addEventListener("click", function () {
      validateGraph();
    });

    // Add to container
    elements.mapContainer.appendChild(validateBtn);
  }

/**
* This function is called by fetchChallenges().
* It must be renamed to match the call in the code.
*/
function updateCategoryFilters(categories) {
  // Save current categories
  state.categories = categories;

  // Make sure colors are updated BEFORE creating filters
  updateCategoryColors();
  
  const container = elements.categoryFilters;
  
  // Make sure container exists
  if (!container) {
    console.error("Category filter element not found");
    return;
  }

  // Clear category filter container
  container.innerHTML = "";
  
  // Sort categories alphabetically
  categories.sort();

  // Add a checkbox for each category
  categories.forEach((category) => {
    // Ignore empty categories
    if (!category || category.trim() === "") return;
    
    // Get color from state.categoryColors
    const color = state.categoryColors[category] || "#757575";
    
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "form-check mb-1";
    categoryDiv.innerHTML = `
      <input class="form-check-input category-filter" type="checkbox" 
            id="category-${category.replace(/\s+/g, "-")}" 
            value="${category}" checked>
      <label class="form-check-label d-flex align-items-center" 
            for="category-${category.replace(/\s+/g, "-")}">
        <span class="category-color-indicator mr-2" 
              style="background-color: ${color};"></span>
        ${escapeHtml(category)}
      </label>
    `;
    
    container.appendChild(categoryDiv);
    
    // Add to list of active categories
    state.activeCategories.add(category);
  });

  // Add event listeners to category checkboxes
  container.querySelectorAll(".category-filter").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const category = this.value;

      if (this.checked) {
        state.activeCategories.add(category);
      } else {
        state.activeCategories.delete(category);
      }

      filterNodesByCategory();
    });
  });

  // Find "Show All" checkbox which is now outside the container
  const showAllCheckbox = document.getElementById("show-all-categories");
  if (showAllCheckbox) {
    // Remove old listeners if any to avoid duplicates
    const newShowAllCheckbox = showAllCheckbox.cloneNode(true);
    showAllCheckbox.parentNode.replaceChild(newShowAllCheckbox, showAllCheckbox);
    
    // Add event listener to "Show All" checkbox
    newShowAllCheckbox.addEventListener("change", function () {
      const categoryCheckboxes = container.querySelectorAll(".category-filter");

      categoryCheckboxes.forEach((checkbox) => {
        checkbox.checked = this.checked;

        const category = checkbox.value;
        if (this.checked) {
          state.activeCategories.add(category);
        } else {
          state.activeCategories.delete(category);
        }
      });

      filterNodesByCategory();
    });
  } else {
    console.warn("'Show All' checkbox not found");
  }
}

// You can keep createCategoryFilters() as an alias if needed
function createCategoryFilters(categories) {
  // Call the main function to maintain compatibility
  updateCategoryFilters(categories);
}

  /**
   * Updates the color map for categories
   */
  function updateCategoryColors() {
      // Create a color map for categories
      const categories = new Set();
      state.challenges.forEach((challenge) => {
        if (challenge.category) {
          categories.add(challenge.category);
        }
      });
    
      // Add "Uncategorized" as a category
      categories.add("Uncategorized");
    
      // Assign bright and distinct colors
      let colorIndex = 0;
      categories.forEach((category) => {
        state.categoryColors[category] = state.modernColors[colorIndex % state.modernColors.length];
        colorIndex++;
      });
      
      // Ensure "Uncategorized" has a specific color
      state.categoryColors["Uncategorized"] = "#757575";
      
      console.log("Colors assigned to categories:", state.categoryColors);
    }

  /**
   * Filters nodes by selected categories
   */
  function filterNodesByCategory() {
    state.cy.nodes().forEach((node) => {
      const challenge = node.data("challenge");
      if (!challenge) return;

      const category = challenge.category || "Uncategorized";
      const isVisible = state.activeCategories.has(category);

      if (isVisible) {
        node.removeClass("filtered");
        node.show();
      } else {
        node.addClass("filtered");
        node.hide();
      }
    });
  }

  /**
   * Gets a challenge by ID
   */
  function getChallengeById(challengeId) {
    return state.challenges.find((c) => c.id === parseInt(challengeId));
  }

  /**
   * Gets prerequisite IDs for a challenge
   */
  function getPrerequisiteIds(challenge) {
      if (!challenge.requirements) return [];
    
      let requirements;
      try {
        if (typeof challenge.requirements === "string") {
          requirements = JSON.parse(challenge.requirements);
        } else {
          requirements = challenge.requirements;
        }
      } catch (e) {
        console.error("Error parsing requirements:", e);
        return [];
      }
    
      return requirements.prerequisites || [];
    }

  /**
   * Gets prerequisite challenges for a challenge
   */
  function getPrerequisiteChallenges(challenge) {
    const prereqIds = getPrerequisiteIds(challenge);
    return state.challenges.filter((c) => prereqIds.includes(c.id));
  }

  /**
   * Updates a challenge's prerequisites
   */
  async function updateChallengePrerequisites(challengeId, prerequisiteId) {
    try {
      challengeId = parseInt(challengeId);
      prerequisiteId = parseInt(prerequisiteId);
  
      const challenge = getChallengeById(challengeId);
      if (!challenge) return;
  
      // Get current prerequisites
      const prereqIds = getPrerequisiteIds(challenge);
  
      // Add new prerequisite if it doesn't already exist
      if (!prereqIds.includes(prerequisiteId)) {
        prereqIds.push(prerequisiteId);
      }
  
      // Update challenge
      const newRequirements = { prerequisites: prereqIds };
  
      const response = await fetch(
        `/plugins/bulk-challenge-manager/api/challenges/${challengeId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "CSRF-Token": getCsrfToken(),
          },
          body: JSON.stringify({
            requirements: newRequirements, // Envoyer l'objet directement
          }),
        }
      );
  
      const data = await response.json();
  
      if (data.success) {
        // Update local state
        challenge.requirements = newRequirements; // Garder comme objet, pas comme chaîne
  
        // Update info panel if necessary
        if (state.selectedChallengeId === challengeId) {
          updateSelectedChallengeInfo(challenge);
        }
  
        showNotification("Prerequisite added", "success");
      } else {
        showNotification(
          data.message || "Error updating prerequisites",
          "danger"
        );
  
        // Remove edge from graph
        state.cy.remove(
          `edge[source = "${prerequisiteId}"][target = "${challengeId}"]`
        );
      }
    } catch (error) {
      showNotification(
        `Error updating prerequisites: ${error.message}`,
        "danger"
      );
  
      // Remove edge from graph
      state.cy.remove(
        `edge[source = "${prerequisiteId}"][target = "${challengeId}"]`
      );
    }
  }

  /**
   * Removes a prerequisite from a challenge
   */
  async function removePrerequisite(challengeId, prerequisiteId) {
    try {
      challengeId = parseInt(challengeId);
      prerequisiteId = parseInt(prerequisiteId);
  
      const challenge = getChallengeById(challengeId);
      if (!challenge) return;
  
      // Get current prerequisites
      const prereqIds = getPrerequisiteIds(challenge);
  
      // Remove the prerequisite
      const newPrereqIds = prereqIds.filter((id) => id !== prerequisiteId);
  
      // Update challenge
      const newRequirements = { prerequisites: newPrereqIds };
  
      const response = await fetch(
        `/plugins/bulk-challenge-manager/api/challenges/${challengeId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "CSRF-Token": getCsrfToken(),
          },
          body: JSON.stringify({
            requirements: newRequirements, // Envoyer l'objet directement
          }),
        }
      );
  
      const data = await response.json();
  
      if (data.success) {
        // Update local state
        challenge.requirements = newRequirements; // Garder comme objet, pas comme chaîne
  
        // Update info panel if necessary
        if (state.selectedChallengeId === challengeId) {
          updateSelectedChallengeInfo(challenge);
        }
  
        showNotification("Prerequisite removed", "success");
      } else {
        showNotification(
          data.message || "Error removing prerequisite",
          "danger"
        );
      }
    } catch (error) {
      showNotification(
        `Error removing prerequisite: ${error.message}`,
        "danger"
      );
    }
  }

  /**
* Saves challenge changes from the edit modal
*/
async function saveChallengeChanges() {
  try {
    const challengeId = parseInt(elements.editChallengeId.value);
    const challenge = getChallengeById(challengeId);
    if (!challenge) {
      showNotification("Challenge not found", "error");
      return;
    }

    // Get form values
    const name = elements.editChallengeName.value;
    const value = parseInt(elements.editChallengeValue.value) || 0;
    const state = elements.editChallengeState.value;
    const category = elements.editChallengeCategory.value || "";

    // Prepare data for update
    const updateData = {
      name: name,
      value: value,
      state: state,
      category: category
    };

    // Update challenge on server
    try {
      const response = await fetch(
        `/plugins/bulk-challenge-manager/api/challenges/${challengeId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "CSRF-Token": getCsrfToken(),
          },
          body: JSON.stringify(updateData),
        }
      );

      const data = await response.json();

      if (!data.success) {
        showNotification(
          data.message || "Error updating challenge on server",
          "danger"
        );
        return;
      }
    } catch (apiError) {
      showNotification(
        `Error communicating with server: ${apiError.message}`,
        "danger"
      );
      return;
    }

    // Successful update on server, update local state
    challenge.name = name;
    challenge.value = value;
    challenge.state = state;
    challenge.category = category;

    // Try to update node in Cytoscape graph if possible
    try {
      // Check if state.cy exists and has getElementById method
      if (state.cy && typeof state.cy.getElementById === 'function') {
        const nodeId = challengeId.toString();
        const node = state.cy.getElementById(nodeId);
        
        if (node && node.length !== 0) {
          // Calculate new size
          const nodeSize = Math.max(50, Math.min(100, value / 10 + 50));

          // Update node data
          node.data("name", name);
          node.data("category", category);
          node.data("value", value);
          node.data("size", nodeSize);
          node.data("opacity", state === "visible" ? 1 : 0.5);
          node.data("challenge", challenge);

          // Update color if category changed
          const categoryColor = state.categoryColors[category] || "#757575";
          node.data("color", categoryColor);

          // Update style
          node.style({
            "background-color": categoryColor,
            opacity: state === "visible" ? 1 : 0.5,
          });
          
          console.log("Node updated in Cytoscape graph:", nodeId);
        } else {
          console.warn("Node not found in Cytoscape graph:", nodeId);
        }
      } else {
        console.warn("Cytoscape graph not available to update node");
      }
    } catch (graphError) {
      console.error("Error updating graph:", graphError);
      // Continue even with graph error
    }

    // Try to update tooltips
    try {
      if (typeof setupNodeTooltips === 'function') {
        setupNodeTooltips();
      }
    } catch (tooltipError) {
      console.error("Error updating tooltips:", tooltipError);
    }

    // Update selected challenge info panel if necessary
    try {
      if (state.selectedChallengeId === challengeId && typeof updateSelectedChallengeInfo === 'function') {
        updateSelectedChallengeInfo(challenge);
      }
    } catch (panelError) {
      console.error("Error updating info panel:", panelError);
    }

    // Close modal
    try {
      if (typeof $ === 'function' && elements.challengeEditModal) {
        $(elements.challengeEditModal).modal("hide");
      }
    } catch (modalError) {
      console.error("Error closing modal:", modalError);
    }

    // Display success notification
    showNotification("Challenge updated successfully", "success");
    
    // Option: Completely refresh page after short delay
    // setTimeout(() => window.location.reload(), 1000);
    
  } catch (error) {
    console.error("Complete error saving challenge:", error);
    showNotification(
      `Error saving challenge: ${error.message}`,
      "danger"
    );
  }
}

  /**
   * Exports current graph view as image
   */
  function exportNetworkImage() {
    try {
      const png64 = state.cy.png({
        output: "blob",
        scale: 2, // Scale for better quality
        bg: "#ffffff",
        full: true,
      });

      // Create URL for blob
      const url = URL.createObjectURL(png64);

      // Create temporary link element
      const link = document.createElement("a");
      link.href = url;
      link.download = "challenge-map.png";
      link.click();

      // Release URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      showNotification(
        `Error exporting image: ${error.message}`,
        "danger"
      );
    }
  }

  // ===== Utility Functions =====

  /**
   * Displays a notification
   */
  function showNotification(message, type = "info") {
    // Create notification element if it doesn't exist
    let notificationContainer = document.getElementById(
      "notification-container"
    );
    if (!notificationContainer) {
      notificationContainer = document.createElement("div");
      notificationContainer.id = "notification-container";
      notificationContainer.style.position = "fixed";
      notificationContainer.style.top = "20px";
      notificationContainer.style.right = "20px";
      notificationContainer.style.zIndex = "9999";
      document.body.appendChild(notificationContainer);
    }

    // Create notification
    const notification = document.createElement("div");
    notification.className = `alert alert-${type} shadow-sm`;
    notification.innerHTML = message;
    notification.style.marginBottom = "10px";

    // Add to container
    notificationContainer.appendChild(notification);

    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transition = "opacity 0.5s ease";
      setTimeout(() => {
        notification.remove();
        // Remove container if empty
        if (notificationContainer.children.length === 0) {
          notificationContainer.remove();
        }
      }, 500);
    }, 5000); // Longer duration for important notifications
  }

  /**
   * Gets CSRF token
   */
  function getCsrfToken() {
    // Try to get from global CTFd object
    if (typeof CTFd !== "undefined" && CTFd.csrfToken) {
      return CTFd.csrfToken;
    }

    // Try to get from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute("content");
    }

    // Try to get from global init object
    if (typeof init !== "undefined" && init.csrfNonce) {
      return init.csrfNonce;
    }

    console.warn("CSRF token not found. Requests may fail.");
    return "";
  }

  /**
   * Escapes HTML characters
   */
  function escapeHtml(text) {
    if (!text) return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.toString().replace(/[&<>"']/g, (m) => map[m]);
  }

  // ===== Event Listeners =====

  // Layout save button
  elements.saveLayoutBtn.addEventListener("click", saveLayout);

  // Layout reset button
  elements.resetLayoutBtn.addEventListener("click", resetLayout);

  // Image export button
  elements.exportImageBtn.addEventListener("click", exportNetworkImage);

  // Challenge save button
  elements.saveChallengeBtn.addEventListener("click", saveChallengeChanges);

  // Validation button (will be added dynamically)
  if (elements.validateBtn) {
    elements.validateBtn.addEventListener("click", validateGraph);
  }

  // ===== Initialization =====

  // Initialize Cytoscape
  initCytoscape();

  // Load saved layout and challenges
  async function initialize() {
    await fetchSavedLayout();
    await fetchChallenges();
  }

  initialize();
  setTimeout(addOrganizeLogicallyButton, 1000);
  });
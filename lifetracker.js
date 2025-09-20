var playerLives = [40, 40, 40, 40];
        var numberOfPlayers = playerLives.length;
        var commanderDamages = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]; // Array to track commander damage for each player against others
        var partnerCommanderDamages = [[[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]]]; // Array to track partner commander damage [targetPlayer][opponentIndex][partnerNumber]
        var playersDead = [false, false, false, false]; // Track player death status
        var poisonCounters = [0, 0, 0, 0]; // New: Track poison counters for each player
        var partnerMode = [false, false, false, false]; // Track which players have partner commanders
        var tapCounts = { plus: [0, 0, 0, 0], minus: [0, 0, 0, 0] };
        var partnerTapCounts = { plus: [[0, 0], [0, 0], [0, 0], [0, 0]], minus: [[0, 0], [0, 0], [0, 0], [0, 0]] };
        var tapTimeouts = { plus: [null, null, null, null], minus: [null, null, null, null] };
        var partnerTapTimeouts = { plus: [[null,null], [null,null], [null,null], [null,null]], minus: [[null,null], [null,null], [null,null], [null,null]] };
        // --- New cumulative tap tracking (net up/down) ---
        var tapNetAccum = [0,0,0,0];              // Net life (or commander dmg) change during visible window
        var tapNetTimeouts = [null,null,null,null];
        var tapNetElement = [null,null,null,null]; // Which element (+ or -) is currently used to display the net
        // ------------------------------------------------
        var inCommanderDamageMode = false; // Track if any player is in commander damage mode
        var activePlayerPanel = -1; // Track which player's panel is slid out

        // Player color customization (defaults mirror original CSS)
        var playerColors = ['#da3633', '#238636', '#1f6feb', '#fb8500'];
        var colorStyleElement = null;

        function shadeColor(hex, percent) {
            // percent negative to darken, positive to lighten
            hex = hex.replace('#','');
            if(hex.length === 3) { hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]; }
            var r = parseInt(hex.substring(0,2),16);
            var g = parseInt(hex.substring(2,4),16);
            var b = parseInt(hex.substring(4,6),16);
            r = Math.min(255, Math.max(0, r + Math.round(255 * (percent/100))));
            g = Math.min(255, Math.max(0, g + Math.round(255 * (percent/100))));
            b = Math.min(255, Math.max(0, b + Math.round(255 * (percent/100))));
            // iOS 9.3.5 compatible padding function
            function pad(str) { return str.length < 2 ? '0' + str : str; }
            return '#' + pad(r.toString(16)) + pad(g.toString(16)) + pad(b.toString(16));
        }

        function contrastColor(hex) {
            // Determine high-contrast foreground (white or near-black) for the given background.
            // Original pure WCAG ratio comparison tended to prefer black for some medium-dark saturated colors
            // (e.g. #da3633) because their luminance made black *slightly* higher ratio, even though white
            // is visually clearer. We introduce a luminance bias threshold so more "dark-ish" colors use white.
            hex = hex.replace('#','');
            if (hex.length === 3) {
                hex = hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);
            }
            var r8 = parseInt(hex.substring(0,2),16);
            var g8 = parseInt(hex.substring(2,4),16);
            var b8 = parseInt(hex.substring(4,6),16);
            var r = r8 / 255;
            var g = g8 / 255;
            var b = b8 / 255;
            function lin(c){ return (c <= 0.04045) ? (c/12.92) : Math.pow((c+0.055)/1.055, 2.4); }
            var R = lin(r), G = lin(g), B = lin(b);
            var L = 0.2126*R + 0.7152*G + 0.0722*B; // Relative luminance (0 = dark, 1 = light)

            // Bias threshold: any background with luminance <= switch uses white text.
            // Adjust L_SWITCH to tune aggressiveness (lower = fewer whites, higher = more whites).
            // 0.50 chosen after testing to keep white on saturated reds / blues / greens while still
            // using dark text on very bright backgrounds (light pastels, yellows, etc.).
            var L_SWITCH = 0.50;
            if (L <= L_SWITCH) {
                return '#FFFFFF';
            }

            // For lighter backgrounds, fall back to contrast ratio comparison to ensure readability.
            var contrastWhite = (1.0 + 0.05) / (L + 0.05);
            var contrastBlack = (L + 0.05) / 0.05; // (0 + 0.05)

            // If white is dramatically better (can happen near the threshold), still allow it.
            if (contrastWhite - contrastBlack > 1.0) {
                return '#FFFFFF';
            }
            return '#000000';
        }

        function persistColors() {
            for (var i=0;i<playerColors.length;i++) {
                try { localStorage.setItem('playerColor'+i, playerColors[i]); } catch(e) {}
            }
        }

        function loadPersistedColors() {
            for (var i=0;i<playerColors.length;i++) {
                try {
                    var stored = localStorage.getItem('playerColor'+i);
                    if(stored) { playerColors[i] = stored; }
                } catch(e) {}
            }
        }

        function updateDynamicColorsStyle() {
            try {
                if(!colorStyleElement) {
                    colorStyleElement = document.createElement('style');
                    colorStyleElement.id = 'dynamic-player-colors';
                    document.head.appendChild(colorStyleElement);
                }
                var css = '';
                for (var i=0;i<playerColors.length;i++) {
                    var base = playerColors[i];
                    var mid = shadeColor(base, -15);
                    var dark = shadeColor(base, -30);
                    var partner = shadeColor(base, -25);
                    var textCol = contrastColor(base);
                    // Player panel text color
                    css += '.player'+i+'{background:linear-gradient(135deg,'+base+' 0%,'+mid+' 50%,'+dark+' 100%);color:'+textCol+';}';
                    // Commander damage boxes (main + partner) get both background and computed contrasting text color
                    css += '.commander-damage-container .damage-'+i+'{background-color:'+base+';color:'+textCol+';}';
                    css += '.commander-damage-container .damage-'+i+'.partner{background-color:'+partner+';color:'+textCol+';}';
                    // Half panels +/- and tap counters inside this player's panel
                    css += '#player'+i+' .half, #player'+i+' .half .minus, #player'+i+' .half .plus, #player'+i+' .half .tap-counter{color:'+textCol+';}';
                    // Partner damage interactive sections (plus/minus + tap counters) when shown for others during cmd damage mode
                    css += '#player'+i+' .partner-damage .minus, #player'+i+' .partner-damage .plus, #player'+i+' .partner-damage .tap-counter, #player'+i+' .regular-commander-damage, #player'+i+' .partner-damage-0, #player'+i+' .partner-damage-1 {color:'+textCol+';}';
                }
                colorStyleElement.textContent = css;

                // Update color inputs to reflect current values
                for (var j=0;j<playerColors.length;j++) {
                    var picker = document.getElementById('colorPicker'+j);
                    if (picker && picker.value.toLowerCase() !== playerColors[j].toLowerCase()) {
                        picker.value = playerColors[j];
                    }
                    // Update custom color picker selection
                    updateCustomColorPickerSelection(j);
                }
            } catch(e) {
                console.log("Color update error: " + e.message);
            }
        }

        function updatePlayerColor(playerIndex, hex) {
            try {
                if(!hex) return;
                playerColors[playerIndex] = hex;
                updateDynamicColorsStyle();
                persistColors();
                updateCustomColorPickerSelection(playerIndex);
                updateCogIconColor(playerIndex); // adjust cog after color change
            } catch(e) {
                console.log("Player color update error: " + e.message);
            }
        }

        function updateCogIconColor(playerIndex){
            try {
                var playerEl = document.getElementById('player'+playerIndex);
                if(!playerEl) return;
                // Sample mid color approximation (same as earlier shading logic)
                var base = playerColors[playerIndex];
                var contrast = contrastColor(base); // returns black or white
                var cog = playerEl.querySelector('.arrow-indicator i');
                if(!cog) return;
                // If contrast is white we keep icon white; if black we darken icon for bright backgrounds
                cog.style.color = contrast === '#FFFFFF' ? '#FFFFFF' : '#1b1f23';
            } catch(e){ console.log('Cog color update error: '+ e.message); }
        }

        function updateAllCogIconColors(){
            for(var i=0;i<playerColors.length;i++){ updateCogIconColor(i); }
        }

        // iOS 9.3.5 compatible custom color picker function
        function selectCustomColor(playerIndex, color) {
            try {
                updatePlayerColor(playerIndex, color);
                // Update HTML5 color input if available
                var picker = document.getElementById('colorPicker' + playerIndex);
                if (picker) {
                    picker.value = color;
                }
            } catch(e) {
                console.log("Custom color selection error: " + e.message);
            }
        }

        // Setup touch events for custom color picker options
        function setupCustomColorPickerEvents() {
            try {
                for (var playerIndex = 0; playerIndex < 4; playerIndex++) {
                    var customPicker = document.getElementById('customColorPicker' + playerIndex);
                    if (!customPicker) continue;
                    
                    var colorOptions = customPicker.querySelectorAll('.color-option');
                    for (var i = 0; i < colorOptions.length; i++) {
                        var option = colorOptions[i];
                        var color = option.getAttribute('data-color');
                        
                        // Create closure to capture variables properly
                        (function(pi, c, opt) {
                            function handleColorSelect(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                selectCustomColor(pi, c);
                            }
                            
                            opt.addEventListener('click', handleColorSelect);
                            opt.addEventListener('touchend', handleColorSelect);
                        })(playerIndex, color, option);
                    }
                }
            } catch(e) {
                console.log("Custom color picker events setup error: " + e.message);
            }
        }

        // Update custom color picker visual selection
        function updateCustomColorPickerSelection(playerIndex) {
            try {
                var customPicker = document.getElementById('customColorPicker' + playerIndex);
                if (!customPicker) return;
                
                var colorOptions = customPicker.querySelectorAll('.color-option');
                var currentColor = playerColors[playerIndex].toLowerCase();
                
                for (var i = 0; i < colorOptions.length; i++) {
                    var option = colorOptions[i];
                    var optionColor = option.getAttribute('data-color').toLowerCase();
                    
                    if (optionColor === currentColor) {
                        addClass(option, 'selected');
                    } else {
                        removeClass(option, 'selected');
                    }
                }
            } catch(e) {
                console.log("Custom color picker update error: " + e.message);
            }
        }

        // Touch event variables
        var touchStartX = 0;
        var touchStartY = 0;

        // Initialize: Hide all skulls and set up touch events
        window.onload = function () {
            try {
                // Load persisted colors first
                loadPersistedColors();
                updateDynamicColorsStyle();
                // Initialize color pickers with values (in case persistence applied)
                for (var cp=0; cp<playerColors.length; cp++) {
                    var pickerEl = document.getElementById('colorPicker'+cp);
                    if (pickerEl) { pickerEl.value = playerColors[cp]; }
                    // Initialize custom color picker selections
                    updateCustomColorPickerSelection(cp);
                }
                // Setup custom color picker touch events
                setupCustomColorPickerEvents();
            } catch(e) {
                console.log("Color initialization error: " + e.message);
            }
            
            for (var i = 0; i < 4; i++) {
                try {
                    document.getElementById("skull" + i).style.display = "none";
                    setupTouchEvents(i);
                    updatePoisonIndicator(i); // Initialize poison indicators

                    // Remove any existing partner containers (they'll be created dynamically when needed)
                    var playerElement = document.getElementById("player" + i);
                    var partnerContainer = playerElement.querySelector(".partner-split-container");
                    if (partnerContainer) {
                        playerElement.removeChild(partnerContainer);
                    }
                } catch(e) {
                    console.log("Player " + i + " initialization error: " + e.message);
                }
            }
        };

        function AppendPartnerBoxes(player) {
            log("Appending partner boxes for player " + player);

            // Check if partner container already exists
            var playerElement = document.getElementById("player" + player);
            var existingPartnerContainer = playerElement.querySelector(".partner-split-container");
            
            // Only create and append if it doesn't exist
            if (!existingPartnerContainer) {
                var partnerContainer = createPartnerContainer(player);
                playerElement.appendChild(partnerContainer);
            }

            hideElements(document.querySelector("#player" + player + " .minus"));
            hideElements(document.querySelector("#player" + player + " .plus"));
            hideElements(document.querySelector("#player" + player + " .half"));
        }

        function RemovePartnerBoxes(player) {
            log("Removing partner boxes for player " + player);

            // Remove the partner container from the DOM
            var playerElement = document.getElementById("player" + player);
            var partnerContainer = playerElement.querySelector(".partner-split-container");
            if (partnerContainer) {
                playerElement.removeChild(partnerContainer);
            }

            showElements(document.querySelector("#player" + player + " .minus"));
            showElements(document.querySelector("#player" + player + " .plus"));
            showElements(document.querySelector("#player" + player + " .half"));
        }

        function togglePartnerMode(player) {
            partnerMode[player] = !partnerMode[player];
            var toggleBtn = document.getElementById("partnerToggle" + player);

            if (partnerMode[player]) {
                toggleBtn.textContent = "Partner Mode: ON";
                addClass(toggleBtn, "active");
            }
            else {
                toggleBtn.textContent = "Partner Mode: OFF";
                removeClass(toggleBtn, "active");

                // Show basic commander buttons when partner mode is off
                var playerElement = document.getElementById("player" + player);
                var basicCommanderButtons = playerElement.querySelectorAll(".basic-commander");
                for (var i = 0; i < basicCommanderButtons.length; i++) {
                    basicCommanderButtons[i].style.removeProperty('display');
                }

                // Reset partner commander damage FROM this player to all other players
                for (var i = 0; i < 4; i++) {
                    if (i !== player) {
                        var dmgIdx = (player < i) ? player : player - 1;
                        partnerCommanderDamages[i][dmgIdx] = 0;
                        
                        // Reset the partner damage box text to 0
                        var partnerBox = document.querySelector("#player" + i + " .commander-damage-box.damage-" + player + ".partner");
                        if (partnerBox) {
                            partnerBox.textContent = "0";
                        }
                    }
                }
            }

            updateAllPartnerBoxVisibility();

            // Close the panel
            togglePlayerPanel(player);
        }

        // Helper function to create the partner container with the right structure
        function createPartnerContainer(player) {
            var container = document.createElement('div');
            container.className = 'partner-split-container';

            // First partner half
            var firstHalf = document.createElement('div');
            firstHalf.className = 'partner-half';

            // Second partner half
            var secondHalf = document.createElement('div');
            secondHalf.className = 'partner-half';

            // Determine rotation based on player position
            var rotation = (player === 1 || player === 3) ? 'rotate(-90deg)' : 'rotate(90deg)';

            // Create elements for first half
            var topHalf1 = document.createElement('div');
            topHalf1.className = 'partner-damage half Quarter-left top-half';
            topHalf1.innerHTML = '<div style="transform: ' + rotation + ';" class="minus">-</div><div style="transform: ' + rotation + ';" class="tap-counter" id="tapCounter' + player + 'Minus">-1</div>';
            topHalf1.onclick = function() { tapPartnerDamage(player, -1, this, 0) }; // Associated with Partner 0
            log(topHalf1);

            var middle1 = document.createElement('div');
            middle1.className = 'partner-damage half';
            middle1.innerHTML = '<div class="regular-commander-damage partner-damage-0" style="transform: ' + rotation + ';" >0</div>';

            var bottomHalf1 = document.createElement('div');
            bottomHalf1.className = 'partner-damage half Quarter-left bottom-half';
            bottomHalf1.innerHTML = '<div style="transform: ' + rotation + ';" class="plus">+</div><div style="transform: ' + rotation + ';" class="tap-counter" id="tapCounter' + player + 'Plus">+1</div>';
            bottomHalf1.onclick = function() { tapPartnerDamage(player, 1, this, 0) }; // Associated with Partner 0

            // Create elements for second half
            var topHalf2 = document.createElement('div');
            topHalf2.className = 'partner-damage half Quarter-right top-half';
            topHalf2.innerHTML = '<div style="transform: ' + rotation + ';" class="minus">-</div><div style="transform: ' + rotation + ';" class="tap-counter" id="tapCounter' + player + 'Minus">-1</div>';
            topHalf2.onclick = function() { tapPartnerDamage(player, -1, this, 1) }; // Associated with Partner 1

            var middle2 = document.createElement('div');
            middle2.className = 'partner-damage half';
            middle2.innerHTML = '<div style="transform: ' + rotation + ';" class="partner-damage partner-damage-1">0</div>';

            var bottomHalf2 = document.createElement('div');
            bottomHalf2.className = 'partner-damage half Quarter-right bottom-half';
            bottomHalf2.innerHTML = '<div style="transform: ' + rotation + ';" class="plus">+</div><div style="transform: ' + rotation + ';" class="tap-counter" id="tapCounter' + player + 'Plus">+1</div>';
            bottomHalf2.onclick = function() { tapPartnerDamage(player, 1, this, 1) }; // Associated with Partner 1

            // Assemble the structure
            firstHalf.appendChild(topHalf1);
            firstHalf.appendChild(middle1);
            firstHalf.appendChild(bottomHalf1);

            secondHalf.appendChild(topHalf2);
            secondHalf.appendChild(middle2);
            secondHalf.appendChild(bottomHalf2);

            container.appendChild(firstHalf);
            container.appendChild(secondHalf);

            return container;
        }

        function updateAllPartnerBoxVisibility() {
            // For each player, show/hide partner damage boxes based on other players' partner mode
            for (var targetPlayer = 0; targetPlayer < 4; targetPlayer++) {
                for (var sourcePlayer = 0; sourcePlayer < 4; sourcePlayer++) {
                    if (sourcePlayer !== targetPlayer) {
                        var partnerBox = document.querySelector("#player" + targetPlayer + " .commander-damage-box.damage-" + sourcePlayer + ".partner");
                        if (partnerBox) {
                            if (partnerMode[sourcePlayer]) {
                                partnerBox.style.display = "flex";
                            } else {
                                partnerBox.style.display = "none";
                            }
                            // Ensure updated color applies (in case dynamic style inserted after initial render)
                            // No action needed: colors driven by class selectors updated globally
                        }
                    }
                }
            }
        }

        function togglePlayerPanel(playerIndex) {
            var containerElement = document.getElementById("container" + playerIndex);

            // If panel already active, close it
            if (activePlayerPanel === playerIndex) {
                removeClass(containerElement, "active");
                activePlayerPanel = -1;
                return;
            }

            // If another panel is active, close it first
            if (activePlayerPanel !== -1) {
                removeClass(document.getElementById("container" + activePlayerPanel), "active");
            }

            // Open this panel
            addClass(containerElement, "active");
            activePlayerPanel = playerIndex;

            // Update toggle button text based on current state
            updateToggleButtonText(playerIndex);
        }

        function setupTouchEvents(playerIndex) {
            var playerElement = document.getElementById("player" + playerIndex);
            var containerElement = document.getElementById("container" + playerIndex);
            var arrowIndicator = playerElement.querySelector(".arrow-indicator");

            // Arrow indicator click handler - add both click and touchend for iOS 9.3.5 compatibility
            function handleSettingsToggle(e) {
                e.stopPropagation(); // Prevent event from bubbling to player element
                e.preventDefault(); // Prevent default touch behavior
                togglePlayerPanel(playerIndex);
            }

            arrowIndicator.addEventListener("click", handleSettingsToggle);
            arrowIndicator.addEventListener("touchend", handleSettingsToggle);

            // Setup touch events for swipe
            playerElement.addEventListener('touchstart', function (e) {
                if (inCommanderDamageMode) return; // Don't allow swipe during commander damage mode

                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, false);

            playerElement.addEventListener('touchmove', function (e) {
                if (inCommanderDamageMode) return;

                var touchX = e.touches[0].clientX;
                var touchY = e.touches[0].clientY;

                var deltaX = touchX - touchStartX;
                var deltaY = touchY - touchStartY;

                // If more horizontal than vertical movement, it's a horizontal swipe
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    e.preventDefault(); // Prevent scrolling
                }
            }, false);

            playerElement.addEventListener('touchend', function (e) {
                if (inCommanderDamageMode) return;

                var touchEndX = e.changedTouches[0].clientX;
                var touchEndY = e.changedTouches[0].clientY;

                var deltaX = touchEndX - touchStartX;
                var deltaY = touchEndY - touchStartY;

                // If more horizontal than vertical movement and significant swipe
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    // For left players (0 and 2), swipe left to open
                    if ((playerIndex === 0 || playerIndex === 2) && deltaX < 0) {
                        togglePlayerPanel(playerIndex);
                    }
                    // For right players (1 and 3), swipe right to open
                    else if ((playerIndex === 1 || playerIndex === 3) && deltaX > 0) {
                        togglePlayerPanel(playerIndex);
                    }
                    // For all players, opposite swipe to close
                    else if (hasClass(containerElement, "active")) {
                        togglePlayerPanel(playerIndex);
                    }
                }
            }, false);
        }

        // Function to adjust poison counters
        function adjustPoisonCounter(player, change) {
            // Don't allow negative poison counters
            if (poisonCounters[player] + change < 0) return;

            poisonCounters[player] += change;
            document.getElementById("poison-value-" + player).textContent = poisonCounters[player];
            updatePoisonIndicator(player);

            // Check player status after poison counter change
            checkPlayerStatus(player);
        }

        // Function to update poison indicator visibility
        function updatePoisonIndicator(player) {
            var indicator = document.getElementById("poison-indicator-" + player);
            if (poisonCounters[player] > 0) {
                indicator.innerHTML ='<i class="fas fa-skull"></i>' +  poisonCounters[player];
                addClass(indicator, "visible");
            } else {
                removeClass(indicator, "visible");
            }
        }

        // Function to reset poison counters
        function resetPoisonCounter(player) {
            poisonCounters[player] = 0;
            document.getElementById("poison-value-" + player).textContent = "0";
            updatePoisonIndicator(player);

            // Check if player should be revived
            checkPlayerStatus(player);
        }

        function updateToggleButtonText(playerIndex) {
            var button = document.getElementById("toggleDeadBtn" + playerIndex);
            button.textContent = playersDead[playerIndex] ? "Revive Player" : "Mark Dead";
        }

        function resetPlayerLife(player) {
            playerLives[player] = 40;
            document.getElementById("life" + player).textContent = "40";
            if (playersDead[player]) {
                revivePlayer(player);
            }

            // Close the panel
            togglePlayerPanel(player);
        }

        function togglePlayerDead(player) {
            if (playersDead[player]) {
                revivePlayer(player);
            } else {
                killPlayer(player);
            }

            // Update the button text
            updateToggleButtonText(player);
        }

        function resetCommanderDamage(player) {
            console.log("Resetting commander damage for player " + player);

            // Reset all commander damage dealt TO this player
            for (var i = 0; i < 3; i++) {
                commanderDamages[player][i] = 0;
                partnerCommanderDamages[player][i][0] = 0;
                partnerCommanderDamages[player][i][1] = 0;
            }

            // Reset all commander damage boxes showing damage TO this player
            for (var i = 0; i < 4; i++) {
                if (i !== player) {
                    var mainBox = document.querySelector("#player" + player + " .commander-damage-box.damage-" + i + ":not(.partner)");
                    var partnerBox = document.querySelector("#player" + player + " .commander-damage-box.damage-" + i + ".partner");
                    if (mainBox) {
                        mainBox.textContent = "0";
                    }
                    if (partnerBox) {
                        partnerBox.textContent = "0";
                    }
                }
            }

            // Check if player should be revived after resetting damage
            checkPlayerStatus(player);

            // Close the panel
            togglePlayerPanel(player);
        }

        function tapPartnerDamage(player, change, divElement, partnerNumber) 
        {
            var partnerDamageDiv = document.querySelector("#player" + player).querySelector(".partner-damage-" + partnerNumber);
            var currentActivePartnerDamageTotal = parseInt(partnerDamageDiv.textContent);
            currentActivePartnerDamageTotal += change;
            partnerDamageDiv.textContent = currentActivePartnerDamageTotal;

            var cmdDamagePlayerLife = document.querySelector(".player.active-cmd-damage-div");
            var cmdDamagePlayerNumber = cmdDamagePlayerLife.id[cmdDamagePlayerLife.id.length - 1];
            log("Partner damage taken from player " + player + " by Partner " + partnerNumber + " with change of " + change + " to player " + cmdDamagePlayerNumber);
        
            // Update the commander damage for tracking - FIX: Track each partner separately
            var targetPlayer = parseInt(cmdDamagePlayerNumber);
            var fromPlayer = player;
            var dmgIdx = (fromPlayer < targetPlayer) ? fromPlayer : fromPlayer - 1;
            partnerCommanderDamages[targetPlayer][dmgIdx][partnerNumber] = currentActivePartnerDamageTotal;

            playerLives[cmdDamagePlayerNumber] += (change * -1);
            document.getElementById("life" + cmdDamagePlayerNumber).textContent = playerLives[cmdDamagePlayerNumber];
            document.querySelector("#player" + cmdDamagePlayerNumber + " .damage-" + player + ".enemy-partner-" + partnerNumber).textContent = currentActivePartnerDamageTotal;

            // Check player status after partner damage and life change
            checkPlayerStatus(cmdDamagePlayerNumber);

            // Add partner damage dimmed effect for small counters
            var isPlus = change > 0;
            var tapType = isPlus ? "plus" : "minus";
            
            partnerTapCounts[tapType][player][partnerNumber] += change;
            var tapCounter = divElement.querySelector(".tap-counter");
            tapCounter.textContent = (isPlus ? "+" : "") + partnerTapCounts[tapType][player][partnerNumber];
            addClass(tapCounter, "show");

            addClass(divElement, "dimmed");
            setTimeout(function () { removeClass(divElement, "dimmed"); }, 200);

            clearTimeout(partnerTapTimeouts[tapType][player][partnerNumber]);
            partnerTapTimeouts[tapType][player][partnerNumber] = setTimeout(function () {
                partnerTapCounts[tapType][player][partnerNumber] = 0;
                removeClass(tapCounter, "show");
            }, 2000);
        }

        function tapLife(player, change, divElement) {

            if(hasClass(divElement, "disabled")) {
                return;
            }

            // If a panel is open, close it first
            if (activePlayerPanel !== -1) {
                togglePlayerPanel(activePlayerPanel);
                return;
            }

            var isPlus = change > 0;
            var halfClass = divElement.classList.contains("top-half") ? "top-half" : "bottom-half";
            var plusEl = document.getElementById("tapCounter" + player + "Plus");
            var minusEl = document.getElementById("tapCounter" + player + "Minus");
            var halfElement = document.querySelector("#player" + player + " ." + halfClass);
            var playerLife = document.querySelector("#player" + player).querySelector(".life-total");

            // Update life or commander damage
            if (!hasClass(playerLife, "disabled")) {
                playerLives[player] += change;
                document.getElementById("life" + player).textContent = playerLives[player];
                checkPlayerStatus(player); // life change
            }
            else {
                var commandDamage = document.querySelector("#player" + player).querySelector(".command-damage");
                var totalCmdDamage = parseInt(commandDamage.textContent) || 0;
                totalCmdDamage += change;
                var cmdDamagePlayerLife = document.querySelector(".player.active-cmd-damage-div");
                var cmdDamagePlayerNumber = cmdDamagePlayerLife.id[cmdDamagePlayerLife.id.length - 1];

                var targetPlayer = parseInt(cmdDamagePlayerNumber);
                var fromPlayer = player;
                var dmgIdx = (fromPlayer < targetPlayer) ? fromPlayer : fromPlayer - 1;
                commanderDamages[targetPlayer][dmgIdx] = totalCmdDamage;

                playerLives[cmdDamagePlayerNumber] += (change * -1);
                document.getElementById("life" + cmdDamagePlayerNumber).textContent = playerLives[cmdDamagePlayerNumber];
                commandDamage.textContent = totalCmdDamage;
                document.querySelector("#player" + cmdDamagePlayerNumber + " .damage-" + fromPlayer).textContent = totalCmdDamage;
                checkPlayerStatus(cmdDamagePlayerNumber);
            }

            // --- Updated cumulative net counter logic (swap sides, hide zero) ---
            if (tapNetTimeouts[player] === null) {
                tapNetAccum[player] = 0; // reset at start of a new visible window
                tapNetElement[player] = null; // will be chosen based on sign after applying change
            }

            tapNetAccum[player] += change;

            // Decide what to display
            if (tapNetAccum[player] === 0) {
                // Hide both, keep timer running so further taps can revive display
                removeClass(plusEl, "show");
                removeClass(minusEl, "show");
                tapNetElement[player] = null; // no active element while net is zero
            } else {
                var shouldBePlus = tapNetAccum[player] > 0;
                var desiredEl = shouldBePlus ? plusEl : minusEl;

                // If switching sides, hide the other and set new element
                if (tapNetElement[player] !== desiredEl) {
                    removeClass(plusEl, "show");
                    removeClass(minusEl, "show");
                    tapNetElement[player] = desiredEl;
                }

                // Show leading '+' for positive values
                tapNetElement[player].textContent = tapNetAccum[player] > 0 ? ('+' + tapNetAccum[player]) : tapNetAccum[player];
                addClass(tapNetElement[player], "show");
            }

            // Feedback flash on tapped half
            addClass(halfElement, "dimmed");
            setTimeout(function () { removeClass(halfElement, "dimmed"); }, 200);

            // Maintain / extend timeout window
            if (tapNetTimeouts[player] !== null) {
                clearTimeout(tapNetTimeouts[player]);
            }
            tapNetTimeouts[player] = setTimeout(function() {
                removeClass(plusEl, "show");
                removeClass(minusEl, "show");
                tapNetAccum[player] = 0;
                tapNetElement[player] = null;
                plusEl.textContent = "+1";
                minusEl.textContent = "-1";
            }, 2000);
            // --- End updated logic ---
        }

        function updateCommanderDamageBoxes(targetPlayer) {
            for (var i = 0; i < 4; i++) {
                if (i !== targetPlayer) {
                    var dmgIdx = (i < targetPlayer) ? i : i - 1;
                    var mainBox = document.querySelector("#player" + targetPlayer + " .commander-damage-box.damage-" + i + ":not(.partner)");
                    var partnerBox = document.querySelector("#player" + targetPlayer + " .commander-damage-box.damage-" + i + ".partner");

                    if (mainBox) {
                        mainBox.textContent = commanderDamages[targetPlayer][dmgIdx];
                    }
                    if (partnerBox) {
                        partnerBox.textContent = partnerCommanderDamages[targetPlayer][dmgIdx];
                    }
                }
            }
        }

        function killPlayer(player) {
            console.log("kill " + player);
            if (playersDead[player]) return; // If already dead, do nothing

            playersDead[player] = true;
            var playerElement = document.getElementById("player" + player);
            addClass(playerElement, "player-dead");

            // Show skull
            document.getElementById("skull" + player).style.display = "block";

            // Update button text if panel is open
            updateToggleButtonText(player);
        }

        function revivePlayer(player) {
            console.log("Revive " + player);
            if (!playersDead[player]) return; // If not dead, do nothing

            playersDead[player] = false;
            var playerElement = document.getElementById("player" + player);
            removeClass(playerElement, "player-dead");

            // Hide skull
            document.getElementById("skull" + player).style.display = "none";

            // Update button text if panel is open
            updateToggleButtonText(player);
        }

        function checkPlayerStatus(player) {
            // This function checks if a player should be dead or alive based on their
            // current life total, commander damage values, and poison counters
            var shouldBeDead = false;

            // Check life total
            if (playerLives[player] <= 0) {
                shouldBeDead = true;
            }
            // Check poison counters
            else if (poisonCounters[player] >= 10) {
                shouldBeDead = true;
            }
            else {
                // Check all commander damages to this player (both main and partner)
                for (var i = 0; i < 3; i++) {
                    var damage = commanderDamages[player][i];
                    if (damage >= 21) {
                        shouldBeDead = true;
                        break;
                    }
                    
                    // Check both partner commanders for this opponent
                    var partnerDamage0 = partnerCommanderDamages[player][i][0];
                    var partnerDamage1 = partnerCommanderDamages[player][i][1];
                    if (partnerDamage0 >= 21 || partnerDamage1 >= 21) {
                        shouldBeDead = true;
                        break;
                    }
                }
            }

            // Update player state if needed
            if (shouldBeDead && !playersDead[player]) {
                killPlayer(player);
            } else if (!shouldBeDead && playersDead[player]) {
                revivePlayer(player);
            }
        }

        function adjustCommanderDamage(activePlayer) {
            // Close any open panel first
            if (activePlayerPanel !== -1) {
                togglePlayerPanel(activePlayerPanel);
                return;
            }

            // Don't allow entering commander damage mode if already in it
            if (inCommanderDamageMode) {
                return;
            }

            inCommanderDamageMode = true;

            var currentPlayer = document.querySelector(".player.player" + activePlayer);
            addClass(currentPlayer, "active-cmd-damage-div");
            addClass(currentPlayer.querySelector(".command-damage"), "active-cmd-damage-div");

            var lifeTotal = currentPlayer.querySelector(".life-total");
            addClass(lifeTotal, "disabled");

            var halfElements = currentPlayer.querySelectorAll(".half");
            addClass(halfElements, "disabled");
            
            setTimeout(function () {
                currentPlayer.setAttribute("onclick", "enableDiv(this)");
            }, 200);

            var commandDamageText = currentPlayer.querySelector(".command-damage");
            removeClass(commandDamageText, "disabled");

            // Disable life change on active player
            for (var i = 0; i < 4; i++) {
                if (i != activePlayer) {
                    var player = document.querySelector("#player" + i);
                    addClass(player.querySelector(".life-total"), "disabled");
                }
            }

            // Hide all other commander damage containers except for the active player
            for (var i = 0; i < 4; i++) {
                if (i !== activePlayer) {
                    var container = document.getElementById("commander-damage-container" + i);
                    addClass(container, "hidden-container");
                }
            }

            var arrows = document.querySelectorAll(".arrow-indicator");
            for (var i = 0; i < arrows.length; i++) {
                arrows[i].style.display = "none";
            }

            // Replace forEach with for loop for iOS 9.3.5 compatibility
            for (var index = 0; index < partnerMode.length; index++) {
                var isEnabled = partnerMode[index];
                if(isEnabled && index !== activePlayer) {
                    AppendPartnerBoxes(index);
                    log("Partner mode enabled for player " + index);
                }
            }

            for (var i = 0; i < numberOfPlayers; i++) 
            {
                if(i !== activePlayer) 
                {
                    var commanderDamageBox = document.querySelectorAll("#player" + activePlayer + " .commander-damage-box" + ".damage-" + i);
                    // Replace forEach with for loop
                    for (var j = 0; j < commanderDamageBox.length; j++) {
                        var box = commanderDamageBox[j];
                        var damageClass = getDamageClass(box);
                        var opponent = damageClass.replace("damage-", "");

                        // Player has partner commanders
                        if(partnerMode[opponent]) {
                            log(box + " " + getClass(box, 'enemy-partner-'));
                            AppendPartnerBoxes(opponent);
                            var partnerNumber = getClass(box, 'enemy-partner-').replace('enemy-partner-', '');
                            log("Active damage from " + opponent + " using Second Partner commander to " + activePlayer + " from partner: " + partnerNumber + " Current Total: " + box.textContent);
                            document.querySelector("#player" + opponent + " .partner-damage-" + partnerNumber).textContent = box.textContent;
                        } 
                        // Player only has 1 commander
                        else if(!box.classList.contains("partner"))
                        {                    
                            log("[No Partner Commanders] Active damage from " + opponent + " to " + activePlayer + ": " + box.textContent);
                            var damageCounter = document.querySelector(".command-damage." + damageClass);
                            damageCounter.textContent = parseInt(box.textContent);
                            removeClass(damageCounter, "disabled");
                        }
                    }
                }
            }
        }

        function enableDiv(currentPlayer) {
            log("Exiting commander damage mode");

            removeClass(currentPlayer, 'active-cmd-damage-div');
            currentPlayer.removeAttribute("onclick");
            var halfElements = currentPlayer.querySelectorAll(".half");
            
            for (var i = 0; i < halfElements.length; i++) {
                removeClass(halfElements[i], "disabled");
            }

            // Bring back all life totals - Replace forEach with for loop
            var players = document.querySelectorAll(".player");
            for (var i = 0; i < players.length; i++) {
                var player = players[i];
                player.querySelector(".command-damage").textContent = "▶️Click to Exit";
                removeClass(player.querySelector(".life-total"), "disabled");
                removeClass(player.querySelector(".command-damage"), "active-cmd-damage-div");
                removeClass(player.querySelector(".commander-damage-container"), "hidden-container");
                addClass(player.querySelector(".command-damage"), "disabled");
            }

            var arrows = document.querySelectorAll(".arrow-indicator");
            for (var i = 0; i < arrows.length; i++) {
                arrows[i].style.display = "block";
            }

            // Check if player status should change after updating commander damage
            for (var i = 0; i < numberOfPlayers; i++) {
                checkPlayerStatus(i);
            }

            // Remove partner boxes if any - Replace forEach with for loop
            for (var index = 0; index < partnerMode.length; index++) {
                var isEnabled = partnerMode[index];
                if(isEnabled) {
                    RemovePartnerBoxes(index);
                }
            }

            // Exit commander damage mode
            inCommanderDamageMode = false;
        }

        // Helper functions for classList compatibility
        function hasClass(element, className) {
            // Handle arrays, NodeLists, and other array-like objects
            if (element && element.length !== undefined && typeof element.length === 'number') {
                for (var i = 0; i < element.length; i++) {
                    hasClass(element[i], className);
                }
                return;
            }

            if (!element) return false;
            
            if (element.classList) {
                return element.classList.contains(className);
            }
            return (' ' + element.className + ' ').indexOf(' ' + className + ' ') > -1;
        }

        function addClass(element, className) {
            // Handle arrays, NodeLists, and other array-like objects
            if (element && element.length !== undefined && typeof element.length === 'number') {
                for (var i = 0; i < element.length; i++) {
                    addClass(element[i], className);
                }
                return;
            }

            if (!element) return;

            if (element.classList) {
                element.classList.add(className);
            } else if (!hasClass(element, className)) {
                element.className += ' ' + className;
            }
        }

        function removeClass(element, className) {
            // Handle arrays, NodeLists, and other array-like objects
            if (element && element.length !== undefined && typeof element.length === 'number') {
                for (var i = 0; i < element.length; i++) {
                    removeClass(element[i], className);
                }
                return;
            }

            if (!element) return;

            // Handle single element
            if (element.classList) {
                element.classList.remove(className);
            } else {
                element.className = element.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
            }
        }

        function getDamageClass(element) {
            return getClass(element, 'damage-');
        }

        function getClass(element, classPrefix)
        {
            var classes = element.className.split(' ');
            for (var i = 0; i < classes.length; i++) {
                if (classes[i].indexOf(classPrefix) === 0) {
                    return classes[i];
                }
            }
            return '';
        }

        function restartGame() {
            // Reset player lives
            playerLives = [40, 40, 40, 40];
            for (var i = 0; i < 4; i++) {
                document.getElementById("life" + i).textContent = "40";
                revivePlayer(i);
                resetPoisonCounter(i);
            }

            // Reset commander damages (both main and partner)
            commanderDamages = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
            partnerCommanderDamages = [[[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]], [[0, 0], [0, 0], [0, 0]]];
            
            // Reset player death status
            playersDead = [false, false, false, false];

            // Reset partner mode
            for (var i = 0; i < 4; i++) {
                if (partnerMode[i]) {
                    togglePartnerMode(i);
                }
            }

            // Reset commander damage mode
            inCommanderDamageMode = false;

            // Close any open panel

            if (activePlayerPanel !== -1) {
                togglePlayerPanel(activePlayerPanel);
            }

            // Make sure all commander damage containers are visible
            for (var i = 0; i < 4; i++) {
                var container = document.getElementById("commander-damage-container" + i);
                removeClass(container, "hidden-container");
            }

            var arrows = document.querySelectorAll(".arrow-indicator");
            for (var i = 0; i < arrows.length; i++) {
                               arrows[i].style.display = "block";
            }

            // Close menu
            removeClass(document.getElementById("radialMenu"), "menu-open");

            // Update toggle button texts
            for (var i = 0; i < 4; i++) {
                updateToggleButtonText(i);
            }
        }

        function hideElements(element) {
            // Handle arrays, NodeLists, and other array-like objects
            if (element && element.length !== undefined && typeof element.length === 'number') {
                for (var i = 0; i < element.length; i++) {
                    hideElements(element[i]);
                }
                return;
            }

            if (!element) return;

           

            element.style.display = "none";
            element.style.pointerEvents = "none";
            element.style.click = "none";
            addClass(element, "disabled");
        }

        function showElements(element, makeBlock) {
            // Handle arrays, NodeLists, and other array-like objects
            if (element && element.length !== undefined && typeof element.length === 'number') {
                for (var i = 0; i < element.length; i++) {
                    showElements(element[i]);
                }
                return;
            }

            if (!element) return;

            if (makeBlock) {
                element.style.display = "block";
            } else {
                element.style.removeProperty('display');
            }
            element.style.pointerEvents = "auto";
            removeClass(element, "disabled");
        }

        function log(message) {
            console.log(message);
        }

        function toggleMenu() {
            var menu = document.getElementById("radialMenu");
            if (hasClass(menu, "menu-open")) {
                removeClass(menu, "menu-open");
            } else {
                addClass(menu, "menu-open");

            }
        }

        // --- Central Long-Press Menu Implementation ---
        var centralMenuHoldTimer = null;
        var centralMenuHoldThreshold = 400; // reduced ms to trigger menu (was 550)
        var centralMenuOpen = false;
        var centralMenuLastTapTime = 0; // for double-tap fallback

        function openCentralMenu(){
            var overlay = document.getElementById('centralMenuOverlay');
            if(!overlay) { log('Central menu overlay not found'); return; }
            addClass(overlay,'open');
            centralMenuOpen = true;
            log('Central menu opened');
        }
        function closeCentralMenu(){
            var overlay = document.getElementById('centralMenuOverlay');
            if(!overlay) return;
            removeClass(overlay,'open');
            centralMenuOpen = false;
            log('Central menu closed');
        }

        function attachCentralMenuButtonEvents(){
            var btn = document.getElementById('centralMenuButton');
            if(!btn) { log('Central menu button not found'); return; }

            function startHold(e){
                if(centralMenuOpen) return; // already open
                clearTimeout(centralMenuHoldTimer);
                centralMenuHoldTimer = setTimeout(function(){ if(!centralMenuOpen) openCentralMenu(); }, centralMenuHoldThreshold);
            }
            function cancelHold(e){
                clearTimeout(centralMenuHoldTimer);
            }
            // Touch
            btn.addEventListener('touchstart', function(e){ startHold(e); }, false);
            btn.addEventListener('touchend', function(e){ cancelHold(e); }, false);
            btn.addEventListener('touchcancel', function(e){ cancelHold(e); }, false);
            // Mouse (desktop/testing)
            btn.addEventListener('mousedown', function(e){ startHold(e); }, false);
            btn.addEventListener('mouseup', function(e){ cancelHold(e); }, false);
            btn.addEventListener('mouseleave', function(e){ cancelHold(e); }, false);
            // Click / double-tap fallback
            btn.addEventListener('click', function(e){
                // If hold already opened menu, ignore
                if(centralMenuOpen) return;
                var now = Date.now();
                if(now - centralMenuLastTapTime < 450){
                    openCentralMenu(); // double tap
                }
                centralMenuLastTapTime = now;
            }, false);
        }

        // Decide starting player feature
        function decideStartingPlayer(){
            closeCentralMenu();
            var aliveIndices = [];
            for(var i=0;i<playersDead.length;i++){
                if(!playersDead[i]) aliveIndices.push(i);
            }
            if(aliveIndices.length === 0){ log('No alive players to choose from'); return; }
            var chosen = aliveIndices[Math.floor(Math.random()*aliveIndices.length)];
            highlightStartingPlayer(chosen);
        }

        function highlightStartingPlayer(playerIndex){
            try {
                var ann = document.getElementById('startingPlayerAnnouncement');
                if(!ann) return;
                ann.textContent = 'Player ' + (playerIndex+1) + ' starts!';
                addClass(ann,'show');
                var playerDiv = document.getElementById('player'+playerIndex);
                addClass(playerDiv,'starting-player-highlight');
                addClass(playerDiv,'starting-player-highlight-fade');
                setTimeout(function(){ removeClass(ann,'show'); }, 2600);
                setTimeout(function(){ removeClass(playerDiv,'starting-player-highlight'); removeClass(playerDiv,'starting-player-highlight-fade'); }, 4000);
            } catch(e) { log('Starting player highlight error: '+ e.message); }
        }

        // Extend window.onload to attach events (preserve existing onload logic)
        (function(origOnLoad){
            window.onload = function(){
                if(typeof origOnLoad === 'function'){ origOnLoad(); }
                attachCentralMenuButtonEvents();
                updateAllCogIconColors(); // set initial cog colors
            };
        })(window.onload);
        // --- End Central Long-Press Menu Implementation ---

        var numberOfPlayers;
        var playerLives, commanderDamages, partnerCommanderDamages;
        var playersDead, poisonCounters, partnerMode;
        var tapCounts, partnerTapCounts, tapTimeouts, partnerTapTimeouts;
        // --- Cumulative tap tracking (net up/down) ---
        var tapNetAccum, tapNetTimeouts, tapNetElement;
        // ---------------------------------------------
        var inCommanderDamageMode = false;
        var activePlayerPanel = -1;

        // Player color defaults — 6 entries covers all supported player counts
        var playerColors = ['#da3633', '#238636', '#1f6feb', '#fb8500', '#8b5cf6', '#ec4899'];
        var colorStyleElement = null;

        // Build all per-player data arrays for n players.
        // Called once on startup and again by buildBoard() when player count changes.
        function initArrays(n) {
            var i, j;
            numberOfPlayers = n;
            playerLives = [];
            commanderDamages = [];
            partnerCommanderDamages = [];
            playersDead = [];
            poisonCounters = [];
            partnerMode = [];
            tapCounts = { plus: [], minus: [] };
            partnerTapCounts = { plus: [], minus: [] };
            tapTimeouts = { plus: [], minus: [] };
            partnerTapTimeouts = { plus: [], minus: [] };
            tapNetAccum = [];
            tapNetTimeouts = [];
            tapNetElement = [];
            for (i = 0; i < n; i++) {
                playerLives.push(40);
                playersDead.push(false);
                poisonCounters.push(0);
                partnerMode.push(false);
                tapCounts.plus.push(0);
                tapCounts.minus.push(0);
                partnerTapCounts.plus.push([0, 0]);
                partnerTapCounts.minus.push([0, 0]);
                tapTimeouts.plus.push(null);
                tapTimeouts.minus.push(null);
                partnerTapTimeouts.plus.push([null, null]);
                partnerTapTimeouts.minus.push([null, null]);
                tapNetAccum.push(0);
                tapNetTimeouts.push(null);
                tapNetElement.push(null);
                commanderDamages.push([]);
                partnerCommanderDamages.push([]);
                for (j = 0; j < n - 1; j++) {
                    commanderDamages[i].push(0);
                    partnerCommanderDamages[i].push([0, 0]);
                }
            }
        }

        // Initialize for the default 4-player game (matches original hardcoded state)
        initArrays(4);

        // ─── Layout Registry ──────────────────────────────────────────────────────
        // posClass drives both the container position CSS and the settings-panel rotation.
        // topHalfChange / bottomHalfChange define whether tapping the top or bottom
        // half of a panel increases (+1) or decreases (-1) life, adjusted per rotation.
        var COLOR_PRESETS = [
            '#da3633','#e85d04','#fb8500','#f4c542','#84cc16','#238636',
            '#06b6d4','#1f6feb','#4f46e5','#8b5cf6','#ec4899','#db2777',
            '#6b7280','#374151','#1e3a5f','#134e3a','#7c2d12','#4a1d96',
            '#ffffff','#d1d5db','#9ca3af','#4b5563','#1f2937','#000000'
        ];

        var LAYOUTS = {
            '3-A': {
                name: 'Duo + Base',
                playerCount: 3,
                slots: [
                    { posClass:'top-left',    top:'0%',   left:'0%',    width:'50%',    height:'50%',   rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'top-right',   top:'0%',   left:'50%',   width:'50%',    height:'50%',   rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 },
                    { posClass:'bottom-full', top:'50%',  left:'0%',    width:'100%',   height:'50%',   rotation:0,   slideDir:'y-pos', topHalfChange:-1, bottomHalfChange: 1 }
                ]
            },
            '4-A': {
                name: '2x2',
                playerCount: 4,
                slots: [
                    { posClass:'top-left',     top:'0%',  left:'0%',   width:'50%', height:'50%', rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'top-right',    top:'0%',  left:'50%',  width:'50%', height:'50%', rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 },
                    { posClass:'bottom-left',  top:'50%', left:'0%',   width:'50%', height:'50%', rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'bottom-right', top:'50%', left:'50%',  width:'50%', height:'50%', rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 }
                ]
            },
            '5-A': {
                name: '2+3 Split',
                playerCount: 5,
                slots: [
                    { posClass:'top-left',    top:'0%',    left:'0%',   width:'50%', height:'50%',    rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'bottom-left', top:'50%',   left:'0%',   width:'50%', height:'50%',    rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'top-right',   top:'0%',    left:'50%',  width:'50%', height:'33.33%', rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 },
                    { posClass:'top-right',   top:'33.33%',left:'50%',  width:'50%', height:'33.33%', rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 },
                    { posClass:'top-right',   top:'66.66%',left:'50%',  width:'50%', height:'33.34%', rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 }
                ]
            },
            '5-B': {
                name: '3+2 Split',
                playerCount: 5,
                slots: [
                    { posClass:'top-left',    top:'0%',    left:'0%',   width:'50%', height:'33.33%', rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'bottom-left', top:'33.33%',left:'0%',   width:'50%', height:'33.33%', rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'bottom-left', top:'66.66%',left:'0%',   width:'50%', height:'33.34%', rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'top-right',   top:'0%',    left:'50%',  width:'50%', height:'50%',    rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 },
                    { posClass:'top-right',   top:'50%',   left:'50%',  width:'50%', height:'50%',    rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 }
                ]
            },
            '6-B': {
                name: '2x3 Grid',
                playerCount: 6,
                slots: [
                    { posClass:'top-left',  top:'0%',    left:'0%',   width:'50%', height:'33.33%', rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'top-right', top:'0%',    left:'50%',  width:'50%', height:'33.33%', rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 },
                    { posClass:'top-left',  top:'33.33%',left:'0%',   width:'50%', height:'33.33%', rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'top-right', top:'33.33%',left:'50%',  width:'50%', height:'33.33%', rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 },
                    { posClass:'top-left',  top:'66.66%',left:'0%',   width:'50%', height:'33.34%', rotation:90,  slideDir:'x-neg', topHalfChange:-1, bottomHalfChange: 1 },
                    { posClass:'top-right', top:'66.66%',left:'50%',  width:'50%', height:'33.34%', rotation:-90, slideDir:'x-pos', topHalfChange: 1, bottomHalfChange:-1 }
                ]
            }
        };

        var currentLayoutId = '4-A';
        var playerSlots = [];

        // Returns true if placing the cog at the center of the given panel edge would land
        // within the Hold Menu safe zone (centered at 50%/50%, radius ~65px).
        function cogConflictsHoldMenu(slot) {
            var sw = window.innerWidth  || 1024;
            var sh = window.innerHeight || 768;
            var hmx = sw * 0.5;
            var hmy = sh * 0.5;
            var safeR = 65; // px — comfortable clearance around the 85px-diameter button

            var ctop  = parseFloat(slot.top)   || 0;
            var cleft = parseFloat(slot.left)  || 0;
            var cw    = parseFloat(slot.width) || 50;
            var ch    = parseFloat(slot.height)|| 50;
            var sd    = slot.slideDir;

            var cogX, cogY;
            if (sd === 'x-neg') {
                cogX = sw * ((cleft + cw) / 100);
                cogY = sh * (ctop / 100 + 0.5 * ch / 100);
            } else if (sd === 'x-pos') {
                cogX = sw * (cleft / 100);
                cogY = sh * (ctop / 100 + 0.5 * ch / 100);
            } else if (sd === 'y-pos') {
                cogX = sw * (cleft / 100 + 0.5 * cw / 100);
                cogY = sh * (ctop / 100);
            } else { // y-neg
                cogX = sw * (cleft / 100 + 0.5 * cw / 100);
                cogY = sh * ((ctop + ch) / 100);
            }
            var dist = Math.sqrt((cogX - hmx) * (cogX - hmx) + (cogY - hmy) * (cogY - hmy));
            return dist < safeR;
        }

        // Returns the CSS rule for this container's arrow-indicator (cog icon).
        // Centered on the panel edge by default; shifted if centered would conflict with Hold Menu.
        function cogArrowCss(playerIndex, slot) {
            var sd = slot.slideDir;
            var conflicts = cogConflictsHoldMenu(slot);
            var rule = '#container' + playerIndex + ' .arrow-indicator{';

            if (sd === 'x-neg') {
                var topVal = conflicts ? '25%' : '50%';
                rule += 'right:0;left:auto;bottom:auto;top:' + topVal + ';';
                rule += '-webkit-transform:translateY(-50%);transform:translateY(-50%);';
            } else if (sd === 'x-pos') {
                var topVal = conflicts ? '25%' : '50%';
                rule += 'left:0;right:auto;bottom:auto;top:' + topVal + ';';
                rule += '-webkit-transform:translateY(-50%);transform:translateY(-50%);';
            } else if (sd === 'y-pos') {
                var leftVal = conflicts ? '15%' : '50%';
                var xform   = conflicts ? 'none' : 'translateX(-50%)';
                rule += 'top:0;bottom:auto;right:auto;left:' + leftVal + ';';
                rule += '-webkit-transform:' + xform + ';transform:' + xform + ';';
            } else { // y-neg
                var leftVal = conflicts ? '15%' : '50%';
                var xform   = conflicts ? 'none' : 'translateX(-50%)';
                rule += 'bottom:0;top:auto;right:auto;left:' + leftVal + ';';
                rule += '-webkit-transform:' + xform + ';transform:' + xform + ';';
            }
            return rule + '}';
        }

        function updateDynamicLayoutStyle() {
            try {
                var styleEl = document.getElementById('dynamic-player-layout');
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = 'dynamic-player-layout';
                    document.head.appendChild(styleEl);
                }
                var css = '';
                for (var i = 0; i < playerSlots.length; i++) {
                    var slot = playerSlots[i];
                    var R = slot.rotation;
                    var sd = slot.slideDir;
                    var rotT = '-webkit-transform:translate(-50%,-50%) rotate(' + R + 'deg);transform:translate(-50%,-50%) rotate(' + R + 'deg);';
                    var rotOnly = '-webkit-transform:rotate(' + R + 'deg);transform:rotate(' + R + 'deg);';

                    // --- Centered content (life total, skull, command-damage label) ---
                    css += '.player' + i + ' .life-total{' + rotT + '}';
                    css += '.player' + i + ' .command-damage{' + rotT + '}';
                    css += '.player' + i + ' .skull{' + rotT + '}';

                    // --- +/- symbols and tap counters ---
                    css += '.player' + i + ' .tap-counter{' + rotOnly + '}';
                    css += '.player' + i + ' .minus{display:inline-block;' + rotOnly + '}';
                    css += '.player' + i + ' .plus{display:inline-block;}';

                    // --- Tap half zones ---
                    // For x-direction (90°/-90°) players: physical top/bottom halves become the
                    // player's left/right — no CSS change needed; layout already correct.
                    // For y-direction (0°/180°) players: override so top-half = left half and
                    // bottom-half = right half, placing +/- to the left and right of the life total.
                    if (sd === 'y-pos' || sd === 'y-neg') {
                        css += '.player' + i + ' .top-half{top:0!important;left:0!important;width:50%!important;height:100%!important;bottom:auto!important;}';
                        css += '.player' + i + ' .bottom-half{top:0!important;left:50%!important;right:auto!important;width:50%!important;height:100%!important;bottom:auto!important;}';
                    }

                    // --- Commander damage container ---
                    // x-direction: rotate a horizontal row 90° into a vertical strip at the panel edge
                    // (from player's rotated view this appears below the life total).
                    // y-direction: horizontal row pinned to bottom (y-pos) or top (y-neg) of panel,
                    // centred and rotated to face the player.
                    if (sd === 'x-neg') {
                        css += '.player' + i + ' .commander-damage-container{left:-3%;top:50%;right:auto;bottom:auto;-webkit-transform:translateY(-50%) rotate(' + R + 'deg);transform:translateY(-50%) rotate(' + R + 'deg);}';
                    } else if (sd === 'x-pos') {
                        css += '.player' + i + ' .commander-damage-container{right:-3%;top:50%;left:auto;bottom:auto;-webkit-transform:translateY(-50%) rotate(' + R + 'deg);transform:translateY(-50%) rotate(' + R + 'deg);}';
                    } else if (sd === 'y-pos') {
                        css += '.player' + i + ' .commander-damage-container{bottom:4%;left:50%;right:auto;top:auto;-webkit-transform:translateX(-50%) rotate(' + R + 'deg);transform:translateX(-50%) rotate(' + R + 'deg);}';
                    } else if (sd === 'y-neg') {
                        css += '.player' + i + ' .commander-damage-container{top:4%;left:50%;right:auto;bottom:auto;-webkit-transform:translateX(-50%) rotate(' + R + 'deg);transform:translateX(-50%) rotate(' + R + 'deg);}';
                    }

                    // --- Poison indicator ---
                    if (sd === 'x-neg') {
                        css += '.player' + i + ' .poison-indicator{top:10px;right:10px;left:auto;bottom:auto;-webkit-transform:rotate(' + R + 'deg);transform:rotate(' + R + 'deg);}';
                    } else if (sd === 'x-pos') {
                        css += '.player' + i + ' .poison-indicator{top:10px;left:10px;right:auto;bottom:auto;-webkit-transform:rotate(' + R + 'deg);transform:rotate(' + R + 'deg);}';
                    } else if (sd === 'y-pos') {
                        css += '.player' + i + ' .poison-indicator{bottom:10px;right:10px;top:auto;left:auto;-webkit-transform:rotate(' + R + 'deg);transform:rotate(' + R + 'deg);}';
                    } else if (sd === 'y-neg') {
                        css += '.player' + i + ' .poison-indicator{top:10px;left:10px;bottom:auto;right:auto;-webkit-transform:rotate(' + R + 'deg);transform:rotate(' + R + 'deg);}';
                    }

                    // --- Arrow indicator (cog / settings button) ---
                    // Use per-container ID selectors (higher specificity than posClass selectors).
                    // Default: center the cog on the panel edge.
                    // Exception: if centering would place the cog inside the Hold Menu safe zone
                    // (85px radius at screen center), shift it to avoid the conflict.
                    var cogCss = cogArrowCss(i, slot);
                    css += cogCss;
                }
                try { styleEl.textContent = css; } catch(e) { styleEl.innerText = css; }
            } catch(e) { log('updateDynamicLayoutStyle error: ' + e.message); }
        }

        // ─── DOM Generation ───────────────────────────────────────────────────────

        function createSettingsPanelElement(playerIndex, slot) {
            var panel = document.createElement('div');
            panel.className = 'settings-panel ' + slot.posClass;

            var resetLifeBtn = document.createElement('div');
            resetLifeBtn.className = 'setting-btn';
            resetLifeBtn.textContent = 'Reset Life';
            resetLifeBtn.setAttribute('onclick', 'resetPlayerLife(' + playerIndex + ')');
            panel.appendChild(resetLifeBtn);

            var resetCmdBtn = document.createElement('div');
            resetCmdBtn.className = 'setting-btn';
            resetCmdBtn.textContent = 'Reset Cmd DMG';
            resetCmdBtn.setAttribute('onclick', 'resetCommanderDamage(' + playerIndex + ')');
            panel.appendChild(resetCmdBtn);

            var partnerBtn = document.createElement('div');
            partnerBtn.className = 'setting-btn partner-toggle';
            partnerBtn.id = 'partnerToggle' + playerIndex;
            partnerBtn.textContent = 'Partner Mode: OFF';
            partnerBtn.setAttribute('onclick', 'togglePartnerMode(' + playerIndex + ')');
            panel.appendChild(partnerBtn);

            var poisonContainer = document.createElement('div');
            poisonContainer.className = 'poison-counter-container';
            poisonContainer.innerHTML =
                '<div class="poison-arrow" onclick="adjustPoisonCounter(' + playerIndex + ', -1)">&#8722;</div>' +
                '<div class="poison-display">' +
                    '<div class="poison-value" id="poison-value-' + playerIndex + '">0</div>' +
                    '<div class="poison-symbol"><i class="fas fa-skull"></i></div>' +
                '</div>' +
                '<div class="poison-arrow" onclick="adjustPoisonCounter(' + playerIndex + ', 1)">+</div>';
            panel.appendChild(poisonContainer);

            var colorSetting = document.createElement('div');
            colorSetting.className = 'setting-btn color-setting';
            var colorOptionsHTML = '';
            for (var c = 0; c < COLOR_PRESETS.length; c++) {
                colorOptionsHTML += '<div class="color-option" style="background-color:' + COLOR_PRESETS[c] + ';" data-color="' + COLOR_PRESETS[c] + '"></div>';
            }
            colorSetting.innerHTML =
                '<span>Player Color</span>' +
                '<input type="color" id="colorPicker' + playerIndex + '" onchange="updatePlayerColor(' + playerIndex + ', this.value)" />' +
                '<div class="custom-color-picker" id="customColorPicker' + playerIndex + '">' + colorOptionsHTML + '</div>';
            panel.appendChild(colorSetting);

            return panel;
        }

        function createPlayerDivElement(playerIndex, totalPlayers, slot) {
            var playerDiv = document.createElement('div');
            playerDiv.className = 'player player' + playerIndex;
            playerDiv.id = 'player' + playerIndex;

            var arrow = document.createElement('div');
            arrow.className = 'arrow-indicator';
            arrow.innerHTML = '<i class="fa fa-cog"></i>';
            playerDiv.appendChild(arrow);

            var cmdLabel = document.createElement('div');
            cmdLabel.className = 'command-damage disabled damage-' + playerIndex;
            cmdLabel.textContent = '\u25B6\uFE0F Click to Exit';
            playerDiv.appendChild(cmdLabel);

            var lifeTotal = document.createElement('div');
            lifeTotal.className = 'life-total';
            lifeTotal.id = 'life' + playerIndex;
            lifeTotal.textContent = '40';
            playerDiv.appendChild(lifeTotal);

            var skull = document.createElement('div');
            skull.className = 'skull';
            skull.id = 'skull' + playerIndex;
            skull.style.display = 'none';
            skull.innerHTML = '<i class="fas fa-skull"></i>';
            playerDiv.appendChild(skull);

            var poisonIndicator = document.createElement('div');
            poisonIndicator.className = 'poison-indicator';
            poisonIndicator.id = 'poison-indicator-' + playerIndex;
            playerDiv.appendChild(poisonIndicator);

            // Top tap half
            var topHalf = document.createElement('div');
            topHalf.className = 'half top-half basic-commander';
            topHalf.setAttribute('onclick', 'tapLife(' + playerIndex + ', ' + slot.topHalfChange + ', this)');
            var topIsPlus = slot.topHalfChange > 0;
            topHalf.innerHTML =
                '<div class="' + (topIsPlus ? 'plus' : 'minus') + '">' + (topIsPlus ? '+' : '-') + '</div>' +
                '<div class="tap-counter" id="tapCounter' + playerIndex + (topIsPlus ? 'Plus' : 'Minus') + '">' + (topIsPlus ? '+1' : '-1') + '</div>';
            playerDiv.appendChild(topHalf);

            // Bottom tap half
            var bottomHalf = document.createElement('div');
            bottomHalf.className = 'half bottom-half basic-commander';
            bottomHalf.setAttribute('onclick', 'tapLife(' + playerIndex + ', ' + slot.bottomHalfChange + ', this)');
            var bottomIsPlus = slot.bottomHalfChange > 0;
            bottomHalf.innerHTML =
                '<div class="' + (bottomIsPlus ? 'plus' : 'minus') + '">' + (bottomIsPlus ? '+' : '-') + '</div>' +
                '<div class="tap-counter" id="tapCounter' + playerIndex + (bottomIsPlus ? 'Plus' : 'Minus') + '">' + (bottomIsPlus ? '+1' : '-1') + '</div>';
            playerDiv.appendChild(bottomHalf);

            // Commander damage boxes (one group per opponent)
            var cmdContainer = document.createElement('div');
            cmdContainer.className = 'commander-damage-container';
            cmdContainer.id = 'commander-damage-container' + playerIndex;
            for (var opp = 0; opp < totalPlayers; opp++) {
                if (opp !== playerIndex) {
                    var oppGroup = document.createElement('div');

                    var mainBox = document.createElement('div');
                    mainBox.className = 'commander-damage-box damage-' + opp + ' enemy-partner-0';
                    mainBox.setAttribute('onclick', 'adjustCommanderDamage(' + playerIndex + ')');
                    mainBox.textContent = '0';
                    oppGroup.appendChild(mainBox);

                    var partnerBox = document.createElement('div');
                    partnerBox.className = 'commander-damage-box damage-' + opp + ' partner enemy-partner-1';
                    partnerBox.setAttribute('onclick', 'adjustCommanderDamage(' + playerIndex + ')');
                    partnerBox.textContent = '0';
                    partnerBox.style.display = 'none';
                    oppGroup.appendChild(partnerBox);

                    cmdContainer.appendChild(oppGroup);
                }
            }
            playerDiv.appendChild(cmdContainer);

            return playerDiv;
        }

        function createPlayerContainerElement(playerIndex, totalPlayers, slot) {
            var container = document.createElement('div');
            container.className = 'player-container ' + slot.posClass;
            container.id = 'container' + playerIndex;
            container.style.position = 'absolute';
            container.style.top = slot.top;
            container.style.left = slot.left;
            container.style.width = slot.width;
            container.style.height = slot.height;
            container.style.overflow = 'hidden';
            container.appendChild(createSettingsPanelElement(playerIndex, slot));
            container.appendChild(createPlayerDivElement(playerIndex, totalPlayers, slot));
            return container;
        }

        // Builds (or rebuilds) the game board for playerCount players using the given layout.
        // Safe to call at startup or when the user starts a new game with different settings.
        function buildBoard(playerCount, layoutId) {
            try {
                var layout = LAYOUTS[layoutId];
                if (!layout) { log('buildBoard: unknown layout ' + layoutId); return; }

                currentLayoutId = layoutId;

                // Reset mode flags before rebuilding DOM
                inCommanderDamageMode = false;
                activePlayerPanel = -1;

                initArrays(playerCount);

                var grid = document.getElementById('gridContainer');
                var existing = grid.querySelectorAll('.player-container');
                for (var r = 0; r < existing.length; r++) {
                    grid.removeChild(existing[r]);
                }

                var centralBtn = document.getElementById('centralMenuButton');
                for (var i = 0; i < playerCount; i++) {
                    grid.insertBefore(
                        createPlayerContainerElement(i, playerCount, layout.slots[i]),
                        centralBtn
                    );
                }
                playerSlots = layout.slots;

                // Color init
                try {
                    loadPersistedColors();
                    updateDynamicColorsStyle();
                    for (var cp = 0; cp < playerCount; cp++) {
                        var pickerEl = document.getElementById('colorPicker' + cp);
                        if (pickerEl) { pickerEl.value = playerColors[cp]; }
                        updateCustomColorPickerSelection(cp);
                    }
                    setupCustomColorPickerEvents();
                } catch(ce) { log('buildBoard color init error: ' + ce.message); }

                updateDynamicLayoutStyle();

                // Per-player event and state init
                for (var j = 0; j < playerCount; j++) {
                    try {
                        setupTouchEvents(j);
                        updatePoisonIndicator(j);
                    } catch(je) { log('buildBoard player ' + j + ' init error: ' + je.message); }
                }

                updateAllCogIconColors();
                setupHoldToJump();

                log('buildBoard: ' + playerCount + ' players, layout ' + layoutId);
            } catch(e) { log('buildBoard error: ' + e.message); }
        }
        // ─── End DOM Generation ───────────────────────────────────────────────────


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
                for (var playerIndex = 0; playerIndex < numberOfPlayers; playerIndex++) {
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

        // Initialize: build the board then attach the central menu
        window.onload = function () {
            var savedCount, savedLayout;
            try { savedCount = parseInt(localStorage.getItem('setupPlayerCount'), 10); } catch(e) {}
            try { savedLayout = localStorage.getItem('setupLayoutId'); } catch(e) {}
            if (savedCount && savedLayout && LAYOUTS[savedLayout] && LAYOUTS[savedLayout].playerCount === savedCount) {
                buildBoard(savedCount, savedLayout);
                closeSetupScreen();
            } else {
                buildBoard(4, '4-A');
                openSetupScreen();
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
                for (var i = 0; i < numberOfPlayers; i++) {
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
            for (var targetPlayer = 0; targetPlayer < numberOfPlayers; targetPlayer++) {
                for (var sourcePlayer = 0; sourcePlayer < numberOfPlayers; sourcePlayer++) {
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

        function getSlideTransform(slideDir) {
            if (slideDir === 'x-neg') { return 'translateX(-90%)'; }
            if (slideDir === 'x-pos') { return 'translateX(90%)'; }
            if (slideDir === 'y-neg') { return 'translateY(-90%)'; }
            if (slideDir === 'y-pos') { return 'translateY(90%)'; }
            return 'translateX(-90%)';
        }

        function togglePlayerPanel(playerIndex) {
            var containerElement = document.getElementById('container' + playerIndex);
            var playerEl = document.getElementById('player' + playerIndex);

            // If panel already active, close it
            if (activePlayerPanel === playerIndex) {
                removeClass(containerElement, 'active');
                playerEl.style.webkitTransform = '';
                playerEl.style.transform = '';
                activePlayerPanel = -1;
                return;
            }

            // If another panel is active, close it first
            if (activePlayerPanel !== -1) {
                var prevContainer = document.getElementById('container' + activePlayerPanel);
                var prevPlayer = document.getElementById('player' + activePlayerPanel);
                removeClass(prevContainer, 'active');
                prevPlayer.style.webkitTransform = '';
                prevPlayer.style.transform = '';
            }

            // Open this panel
            addClass(containerElement, 'active');
            var slideDir = (playerSlots && playerSlots[playerIndex]) ? playerSlots[playerIndex].slideDir : 'x-neg';
            var t = getSlideTransform(slideDir);
            playerEl.style.webkitTransform = t;
            playerEl.style.transform = t;
            activePlayerPanel = playerIndex;

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

                // Prevent scrolling for dominant-axis swipes when panel is open
                if (activePlayerPanel !== -1) {
                    e.preventDefault();
                } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    e.preventDefault();
                }
            }, false);

            playerElement.addEventListener('touchend', function (e) {
                if (inCommanderDamageMode) return;

                var touchEndX = e.changedTouches[0].clientX;
                var touchEndY = e.changedTouches[0].clientY;

                var deltaX = touchEndX - touchStartX;
                var deltaY = touchEndY - touchStartY;

                var slot = playerSlots && playerSlots[playerIndex] ? playerSlots[playerIndex] : null;
                var sd = slot ? slot.slideDir : 'x-neg';

                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    // Horizontal swipe
                    if (sd === 'x-neg' && deltaX < 0) {
                        togglePlayerPanel(playerIndex);
                    } else if (sd === 'x-pos' && deltaX > 0) {
                        togglePlayerPanel(playerIndex);
                    } else if (activePlayerPanel === playerIndex) {
                        togglePlayerPanel(playerIndex);
                    }
                } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
                    // Vertical swipe
                    if (sd === 'y-pos' && deltaY > 0) {
                        togglePlayerPanel(playerIndex);
                    } else if (sd === 'y-neg' && deltaY < 0) {
                        togglePlayerPanel(playerIndex);
                    } else if (activePlayerPanel === playerIndex) {
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
            checkPlayerStatus(player);
        }

        function updateToggleButtonText(playerIndex) {
            var button = document.getElementById("toggleDeadBtn" + playerIndex);
            if (button) { button.textContent = playersDead[playerIndex] ? "Revive Player" : "Mark Dead"; }
        }

        function resetPlayerLife(player) {
            playerLives[player] = 40;
            document.getElementById("life" + player).textContent = "40";
            if (playersDead[player]) { revivePlayer(player); }
            togglePlayerPanel(player);
        }

        function resetCommanderDamage(player) {
            console.log("Resetting commander damage for player " + player);

            // Reset all commander damage dealt TO this player
            for (var i = 0; i < numberOfPlayers - 1; i++) {
                commanderDamages[player][i] = 0;
                partnerCommanderDamages[player][i][0] = 0;
                partnerCommanderDamages[player][i][1] = 0;
            }

            // Reset all commander damage boxes showing damage TO this player
            for (var i = 0; i < numberOfPlayers; i++) {
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

            checkPlayerStatus(cmdDamagePlayerNumber);

            // Add partner damage dimmed effectfor small counters
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
                checkPlayerStatus(player);
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
            for (var i = 0; i < numberOfPlayers; i++) {
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
            if (playersDead[player]) return;
            playersDead[player] = true;
            var playerElement = document.getElementById("player" + player);
            addClass(playerElement, "player-dead");
            document.getElementById("skull" + player).style.display = "block";
            updateToggleButtonText(player);
        }

        function revivePlayer(player) {
            if (!playersDead[player]) return;
            playersDead[player] = false;
            var playerElement = document.getElementById("player" + player);
            removeClass(playerElement, "player-dead");
            document.getElementById("skull" + player).style.display = "none";
            updateToggleButtonText(player);
        }

        function checkPlayerStatus(player) {
            var shouldBeDead = false;
            if (playerLives[player] <= 0) {
                shouldBeDead = true;
            } else if (poisonCounters[player] >= 10) {
                shouldBeDead = true;
            } else {
                for (var i = 0; i < numberOfPlayers - 1; i++) {
                    if (commanderDamages[player][i] >= 21) { shouldBeDead = true; break; }
                    if (partnerCommanderDamages[player][i][0] >= 21 || partnerCommanderDamages[player][i][1] >= 21) { shouldBeDead = true; break; }
                }
            }
            if (shouldBeDead && !playersDead[player]) { killPlayer(player); }
            else if (!shouldBeDead && playersDead[player]) { revivePlayer(player); }
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
            for (var i = 0; i < numberOfPlayers; i++) {
                if (i != activePlayer) {
                    var player = document.querySelector("#player" + i);
                    addClass(player.querySelector(".life-total"), "disabled");
                }
            }

            // Hide all other commander damage containers except for the active player
            for (var i = 0; i < numberOfPlayers; i++) {
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

            // Check player status after commander damage exit
            for (var i = 0; i < numberOfPlayers; i++) { checkPlayerStatus(i); }

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

        // ─── Setup Screen ─────────────────────────────────────────────────────────

        var setupSelectedCount = 4;
        var setupSelectedLayout = '4-A';

        function openSetupScreen() {
            var overlay = document.getElementById('setupOverlay');
            if (!overlay) return;
            setupSelectedCount = numberOfPlayers;
            setupSelectedLayout = currentLayoutId;
            updateSetupPlayerBtns();
            updateSetupLayoutBtns();
            overlay.style.display = '-webkit-box';
            overlay.style.display = '-webkit-flex';
            overlay.style.display = 'flex';
        }

        function closeSetupScreen() {
            var overlay = document.getElementById('setupOverlay');
            if (overlay) overlay.style.display = 'none';
        }

        function selectPlayerCount(n) {
            setupSelectedCount = n;
            var firstLayout = getFirstLayoutForCount(n);
            setupSelectedLayout = firstLayout;
            updateSetupPlayerBtns();
            updateSetupLayoutBtns();
        }

        function getFirstLayoutForCount(n) {
            var keys = ['3-A','4-A','5-A','5-B','6-B'];
            for (var i = 0; i < keys.length; i++) {
                if (LAYOUTS[keys[i]] && LAYOUTS[keys[i]].playerCount === n) {
                    return keys[i];
                }
            }
            return '4-A';
        }

        function selectLayout(layoutId) {
            setupSelectedLayout = layoutId;
            updateSetupLayoutBtns();
        }

        function updateSetupPlayerBtns() {
            var counts = [3, 4, 5, 6];
            for (var i = 0; i < counts.length; i++) {
                var btn = document.getElementById('setupCountBtn' + counts[i]);
                if (!btn) continue;
                if (counts[i] === setupSelectedCount) {
                    addClass(btn, 'setup-btn-active');
                } else {
                    removeClass(btn, 'setup-btn-active');
                }
            }
        }

        function updateSetupLayoutBtns() {
            var container = document.getElementById('setupLayoutBtns');
            if (!container) return;
            container.innerHTML = '';
            var keys = ['3-A','4-A','5-A','5-B','6-B'];
            for (var i = 0; i < keys.length; i++) {
                var lid = keys[i];
                if (!LAYOUTS[lid] || LAYOUTS[lid].playerCount !== setupSelectedCount) continue;
                var btn = document.createElement('div');
                btn.className = 'setup-layout-btn' + (lid === setupSelectedLayout ? ' setup-btn-active' : '');
                btn.textContent = LAYOUTS[lid].name;
                btn.setAttribute('onclick', 'selectLayout("' + lid + '")');
                btn.setAttribute('id', 'setupLayoutBtn' + lid.replace('-',''));
                container.appendChild(btn);
            }
        }

        function startGame() {
            try { localStorage.setItem('setupPlayerCount', String(setupSelectedCount)); } catch(e) {}
            try { localStorage.setItem('setupLayoutId', setupSelectedLayout); } catch(e) {}
            closeSetupScreen();
            buildBoard(setupSelectedCount, setupSelectedLayout);
        }

        function newGame() {
            closeCentralMenu();
            openSetupScreen();
        }

        // ─── End Setup Screen ─────────────────────────────────────────────────────

        function restartGame() {
            // Reset player lives, death status and poison counters
            for (var i = 0; i < numberOfPlayers; i++) {
                playerLives[i] = 40;
                document.getElementById("life" + i).textContent = "40";
                revivePlayer(i);
                resetPoisonCounter(i);
            }

            // Reset commander damages (both main and partner) in-place
            for (var ri = 0; ri < numberOfPlayers; ri++) {
                for (var rj = 0; rj < numberOfPlayers - 1; rj++) {
                    commanderDamages[ri][rj] = 0;
                    partnerCommanderDamages[ri][rj][0] = 0;
                    partnerCommanderDamages[ri][rj][1] = 0;
                }
            }

            // Reset partner mode (togglePartnerMode may open a panel; closed below)
            for (var i = 0; i < numberOfPlayers; i++) {
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
            for (var i = 0; i < numberOfPlayers; i++) {
                var container = document.getElementById("commander-damage-container" + i);
                removeClass(container, "hidden-container");
            }

            var arrows = document.querySelectorAll(".arrow-indicator");
            for (var i = 0; i < arrows.length; i++) {
                               arrows[i].style.display = "block";
            }

            // Close menu
            closeCentralMenu();
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
        var centralMenuSuppressNextClick = false; // suppress accidental selection after hold-open
        var centralMenuOpenedByHold = false; // track if open originated from hold

        function openCentralMenu(){
            var overlay = document.getElementById('centralMenuOverlay');
            if(!overlay) { log('Central menu overlay not found'); return; }
            addClass(overlay,'open');
            centralMenuOpen = true;
            if(centralMenuOpenedByHold){
                centralMenuSuppressNextClick = true; // next tap/click will be ignored
                centralMenuOpenedByHold = false; // reset flag
            }
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
                centralMenuHoldTimer = setTimeout(function(){ if(!centralMenuOpen){ centralMenuOpenedByHold = true; openCentralMenu(); } }, centralMenuHoldThreshold);
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

        // Suppress first accidental tap/click after long-press open (capture phase)
        document.addEventListener('touchend', function(e){
            if(centralMenuOpen && centralMenuSuppressNextClick){
                e.preventDefault();
                e.stopPropagation();
                centralMenuSuppressNextClick = false; // consume only once
            }
        }, true);
        document.addEventListener('click', function(e){
            if(centralMenuOpen && centralMenuSuppressNextClick){
                e.preventDefault();
                e.stopPropagation();
                centralMenuSuppressNextClick = false; // consume only once
            }
        }, true);

        // Decide starting player feature
        function decideStartingPlayer(){
            closeCentralMenu();
            var aliveIndices = [];
            for (var i = 0; i < playersDead.length; i++) {
                if (!playersDead[i]) aliveIndices.push(i);
            }
            if (aliveIndices.length === 0) { log('No alive players'); return; }
            var chosen = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
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

        // --- Hold to Jump (+/-10) Implementation ---
        // Helper (iOS 9.3.5 friendly) to find ancestor with a class
        function findParentWithClass(el, className){
            while(el && el !== document){
                if(hasClass(el, className)) return el;
                el = el.parentNode;
            }
            return null;
        }

        function setupHoldToJump(){
            try {
                var halves = document.querySelectorAll('.half.basic-commander');
                for(var i=0;i<halves.length;i++){
                    (function(half){
                        var playerEl = findParentWithClass(half, 'player');
                        if(!playerEl || !playerEl.id) return;
                        var playerIdx = parseInt(playerEl.id.replace('player',''),10);
                        if(isNaN(playerIdx)) return;

                        var baseChange = half.querySelector('.plus') ? 1 : -1;
                        if(half.getAttribute('onclick')){ half.removeAttribute('onclick'); }

                        var holdTimer = null;        // timeout for initial long-press
                        var repeatTimer = null;      // timeout for subsequent repeats
                        var holdThreshold = 550;     // ms before first +/-10
                        var repeatDelay = 750;       // ms between subsequent repeats (further slowed)
                        half._longPressTriggered = false;
                        half._lastTouchTime = 0;

                        function applyJump(){
                            tapLife(playerIdx, baseChange * 10, half);
                        }
                        function scheduleNextRepeat(){
                            repeatTimer = setTimeout(function(){
                                // Only continue if still pressed (long press active)
                                if(half._longPressTriggered){
                                    applyJump();
                                    scheduleNextRepeat();
                                }
                            }, repeatDelay);
                        }
                        function clearAllTimers(){
                            if(holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
                            if(repeatTimer){ clearTimeout(repeatTimer); repeatTimer = null; }
                        }
                        function triggerLongPress(){
                            applyJump();
                            half._longPressTriggered = true;
                            scheduleNextRepeat();
                        }
                        function startHold(e){
                            if(inCommanderDamageMode) return; // respect mode lock
                            clearAllTimers();
                            half._longPressTriggered = false;
                            holdTimer = setTimeout(function(){ triggerLongPress(); }, holdThreshold);
                        }
                        function endHold(e){
                            clearAllTimers();
                            half._longPressTriggered = false; // stop further repeats
                        }

                        // Touch handlers
                        half.addEventListener('touchstart', function(e){ startHold(e); }, false);
                        half.addEventListener('touchend', function(e){
                            var wasLong = half._longPressTriggered; // capture before reset in endHold
                            endHold(e);
                            if(wasLong){
                                e.preventDefault();
                            } else {
                                tapLife(playerIdx, baseChange, half); // normal single increment
                                half._lastTouchTime = Date.now();
                                e.preventDefault(); // avoid synthetic click
                            }
                        }, false);
                        half.addEventListener('touchcancel', function(e){ endHold(e); }, false);

                        // Mouse handlers
                        half.addEventListener('mousedown', function(e){ startHold(e); half._mouseAppliedAt = 0; half._mouseUpFired = false; }, false);
                        half.addEventListener('mouseup', function(e){
                            var wasLong = half._longPressTriggered;
                            endHold(e);
                            if(wasLong){
                                e.preventDefault();
                            } else {
                                tapLife(playerIdx, baseChange, half);
                                half._mouseAppliedAt = Date.now();
                                half._mouseUpFired = true;
                            }
                        }, false);
                        half.addEventListener('mouseleave', function(e){ endHold(e); }, false);

                        // Fallback click (desktop) if neither path consumed it
                        half.addEventListener('click', function(e){
                            var now = Date.now();
                            if(half._longPressTriggered){
                                e.preventDefault();
                                return;
                            }
                            // Suppress if mouseup already handled the increment very recently
                            if(half._mouseUpFired && half._mouseAppliedAt && (now - half._mouseAppliedAt) < 500){
                                e.preventDefault();
                                return;
                            }
                            if(half._lastTouchTime && (now - half._lastTouchTime) < 700){
                                e.preventDefault();
                                return; // synthetic after touch
                            }
                            tapLife(playerIdx, baseChange, half);
                        }, false);
                    })(halves[i]);
                }
                log('Hold-to-jump life adjustment initialized');
            } catch(e){ log('Hold-to-jump setup error: ' + e.message); }
        }
        // --- End Hold to Jump Implementation ---

        // Extend window.onload to attach the central menu (buildBoard handles everything else)
        (function(origOnLoad){
            window.onload = function(){
                if(typeof origOnLoad === 'function'){ origOnLoad(); }
                attachCentralMenuButtonEvents();
            };
        })(window.onload);
        // --- End Central Long-Press Menu Implementation ---

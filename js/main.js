document.addEventListener('DOMContentLoaded', function() {
    var Config = PhantomChainer.Config;
    var Utils = PhantomChainer.Utils;
    var UI = PhantomChainer.UI;
    var ConfigProcessor = PhantomChainer.ConfigProcessor;

    var elements = {
        jsonConfigInput: document.getElementById('jsonConfigInput'),
        ipInput: document.getElementById('ipInput'),
        generateButton: document.getElementById('generateButton'),
        outputJson: document.getElementById('outputJson'),
        copyButton: document.getElementById('copyButton'),
        downloadButton: document.getElementById('downloadButton'),
        clearButton: document.getElementById('clearButton'),
        pasteButton: document.getElementById('pasteButton'),
        uploadButton: document.getElementById('uploadButton'),
        fileInput: document.getElementById('fileInput'),
        routeAllCheckbox: document.getElementById('routeAllCheckbox'),
        dualConfigToggle: document.getElementById('dualConfigToggle'),
        customNameCheckbox: document.getElementById('customNameCheckbox'),
        customNameInput: document.getElementById('customNameInput'),
        customNameInputContainer: document.getElementById('customNameInputContainer'),
        charCounter: document.getElementById('charCounter'),
        configCounter: document.getElementById('configCounter'),
        previewLabel: document.getElementById('previewLabel'),
        usePublicConfigToggle: document.getElementById('usePublicConfigToggle'),
        jsonInputLineNumbers: document.getElementById('jsonInputLineNumbers'),
        ipInputLineNumbers: document.getElementById('ipInputLineNumbers'),
        outputLineNumbers: document.getElementById('outputLineNumbers'),
        jsonInputContainer: document.getElementById('jsonInputContainer'),
        dragOverlay: document.getElementById('dragOverlay'),
        configTabs: document.getElementById('configTabs'),
        alertContainer: document.getElementById('alertContainer'),
        serverlessTypeSelect: document.getElementById('serverlessTypeSelect'),
        customDohCheckbox: document.getElementById('customDohCheckbox'),
        customDohInput: document.getElementById('customDohInput'),
        customDohInputContainer: document.getElementById('customDohInputContainer')
    };

    var generatedConfigs = [];
    var currentConfigIndex = 0;
    var isDualMode = false;

    function setDefaultIPs() {
        elements.ipInput.value = Config.defaultForcedRouteIPs.join('\n');
        UI.updateLineNumbers(elements.ipInput, elements.ipInputLineNumbers);
    }

    function handleFileUpload(file) {
        if (!file) return;
        
        if (!file.name.endsWith('.json')) {
            UI.showAlert('Please select a valid JSON file', 'error');
            return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var content = e.target.result;
                JSON.parse(content);
                elements.jsonConfigInput.value = content;
                UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
                UI.showAlert('File loaded successfully', 'success');
            } catch (error) {
                UI.showAlert('Invalid JSON file', 'error');
            }
        };
        reader.onerror = function() {
            UI.showAlert('Failed to read file', 'error');
        };
        reader.readAsText(file);
    }

    elements.uploadButton.addEventListener('click', function() {
        elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    elements.jsonInputContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dragOverlay.style.display = 'flex';
    });

    elements.jsonInputContainer.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === elements.jsonInputContainer) {
            elements.dragOverlay.style.display = 'none';
        }
    });

    elements.jsonInputContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.dragOverlay.style.display = 'none';
        
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    elements.customNameInput.addEventListener('input', function() {
        var length = elements.customNameInput.value.length;
        elements.charCounter.textContent = length + '/50';
        
        if (length > 45) {
            elements.charCounter.style.color = '#ff4b4b';
        } else {
            elements.charCounter.style.color = '#888';
        }
    });

    elements.customDohCheckbox.addEventListener('change', function() {
        if (elements.customDohCheckbox.checked) {
            elements.customDohInput.disabled = false;
            elements.customDohInputContainer.classList.add('active');
            elements.customDohInput.focus();
        } else {
            elements.customDohInput.disabled = true;
            elements.customDohInputContainer.classList.remove('active');
        }
    });

    elements.usePublicConfigToggle.addEventListener('change', function() {
        if (elements.usePublicConfigToggle.checked) {
            elements.pasteButton.disabled = true;
            elements.uploadButton.disabled = true;
            elements.jsonConfigInput.disabled = true;
            elements.jsonConfigInput.style.opacity = '0.5';
            elements.jsonConfigInput.style.cursor = 'not-allowed';
            
            UI.showLoading();
            Utils.fetchConfig(Config.publicConfigUrl, function(err, config) {
                UI.hideLoading();
                if (err) {
                    UI.showAlert('Error loading public config: ' + err.message, 'error');
                    elements.usePublicConfigToggle.checked = false;
                    elements.pasteButton.disabled = false;
                    elements.uploadButton.disabled = false;
                    elements.jsonConfigInput.disabled = false;
                    elements.jsonConfigInput.style.opacity = '1';
                    elements.jsonConfigInput.style.cursor = 'text';
                } else {
                    elements.jsonConfigInput.value = JSON.stringify(config, null, 2);
                    UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
                    UI.showAlert('Public config loaded successfully', 'success');
                }
            });
        } else {
            elements.pasteButton.disabled = false;
            elements.uploadButton.disabled = false;
            elements.jsonConfigInput.disabled = false;
            elements.jsonConfigInput.style.opacity = '1';
            elements.jsonConfigInput.style.cursor = 'text';
        }
    });

    elements.dualConfigToggle.addEventListener('change', function() {
        elements.routeAllCheckbox.disabled = elements.dualConfigToggle.checked;
    });

    elements.customNameCheckbox.addEventListener('change', function() {
        if (elements.customNameCheckbox.checked) {
            elements.customNameInput.disabled = false;
            elements.customNameInputContainer.classList.add('active');
            elements.customNameInput.focus();
        } else {
            elements.customNameInput.disabled = true;
            elements.customNameInputContainer.classList.remove('active');
        }
    });

    elements.jsonConfigInput.addEventListener('input', function() {
        UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
    });

    elements.jsonConfigInput.addEventListener('scroll', function() {
        UI.syncScroll(elements.jsonConfigInput, elements.jsonInputLineNumbers);
    });

    elements.ipInput.addEventListener('input', function() {
        UI.updateLineNumbers(elements.ipInput, elements.ipInputLineNumbers);
    });

    elements.ipInput.addEventListener('scroll', function() {
        UI.syncScroll(elements.ipInput, elements.ipInputLineNumbers);
    });

    elements.outputJson.addEventListener('scroll', function() {
        UI.syncScroll(elements.outputJson, elements.outputLineNumbers);
    });

    elements.pasteButton.addEventListener('click', function() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function(clipText) {
                elements.jsonConfigInput.value = clipText;
                UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
                UI.showAlert('Config pasted from clipboard', 'success');
            }).catch(function() {
                UI.showAlert('Failed to paste from clipboard', 'error');
            });
        } else {
            UI.showAlert('Clipboard not supported. Please paste manually.', 'warning');
        }
    });

    elements.generateButton.addEventListener('click', function() {
        var jsonInput = elements.jsonConfigInput.value.trim();
        var routeAll = elements.routeAllCheckbox.checked;
        var generateDual = elements.dualConfigToggle.checked;
        var useCustomName = elements.customNameCheckbox.checked;
        var customName = elements.customNameInput.value.trim();
        var serverlessType = elements.serverlessTypeSelect.value;
        var useCustomDoh = elements.customDohCheckbox.checked;
        var customDohUrl = elements.customDohInput.value.trim();
        var userConfig;

        elements.outputJson.value = '';
        generatedConfigs = [];
        currentConfigIndex = 0;
        isDualMode = false;
        elements.configTabs.style.display = 'none';
        elements.previewLabel.style.display = 'none';
        elements.downloadButton.style.display = 'none';
        UI.showLoading();
        elements.outputLineNumbers.textContent = '1';
        elements.configCounter.textContent = '';

        if (!jsonInput) {
            UI.hideLoading();
            UI.showAlert('Please enter or upload a JSON config', 'error');
            elements.outputJson.value = 'Error: No config provided';
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        if (useCustomName && customName === '') {
            UI.hideLoading();
            UI.showAlert('Please enter a custom config name or uncheck the option', 'error');
            elements.outputJson.value = 'Error: Custom name is empty';
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        if (useCustomName && !Utils.isValidConfigName(customName)) {
            UI.hideLoading();
            UI.showAlert('Config name contains invalid characters', 'error');
            elements.outputJson.value = 'Error: Invalid config name (use only letters, numbers, spaces, - and _)';
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        if (useCustomDoh && customDohUrl === '') {
            UI.hideLoading();
            UI.showAlert('Please enter a custom DoH URL or uncheck the option', 'error');
            elements.outputJson.value = 'Error: Custom DoH URL is empty';
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        if (useCustomDoh && !Utils.isValidDohUrl(customDohUrl)) {
            UI.hideLoading();
            UI.showAlert('Invalid DoH URL format. Must start with https://', 'error');
            elements.outputJson.value = 'Error: Invalid DoH URL format';
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        try {
            userConfig = Utils.parseJsonc(jsonInput);
        } catch (error) {
            try {
                userConfig = JSON.parse(jsonInput);
            } catch (error2) {
                UI.hideLoading();
                UI.showAlert('Invalid JSON format', 'error');
                elements.outputJson.value = 'Error: Invalid JSON. Please check your config format.';
                UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
                return;
            }
        }

        if (!userConfig.outbounds || !userConfig.routing) {
            UI.hideLoading();
            UI.showAlert('Config is incomplete', 'error');
            elements.outputJson.value = 'Error: Config must contain "outbounds" and "routing" sections.';
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        var detectionResult = ConfigProcessor.detectConfigType(userConfig);

        if (detectionResult.configCount > 0) {
            elements.configCounter.textContent = '(' + detectionResult.configCount + ' config' + (detectionResult.configCount > 1 ? 's' : '') + ' detected)';
        }

        var validationError = ConfigProcessor.validateConfig(userConfig, detectionResult);
        if (validationError) {
            UI.hideLoading();
            UI.showAlert('Config validation failed', 'error');
            elements.outputJson.value = validationError;
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        var routeItems = [];
        var lines = elements.ipInput.value.split('\n');
        var invalidItems = [];
        
        for (var i = 0; i < lines.length; i++) {
            var item = lines[i].trim();
            if (item) {
                if (Utils.isValidRouteItem(item)) {
                    routeItems.push(item);
                } else {
                    invalidItems.push(item);
                }
            }
        }

        if (invalidItems.length > 0) {
            UI.hideLoading();
            UI.showAlert('Invalid IP/Domain entries found: ' + invalidItems.slice(0, 3).join(', ') + (invalidItems.length > 3 ? '...' : ''), 'error');
            elements.outputJson.value = 'Error: Invalid entries in IP/Domain list:\n' + invalidItems.join('\n');
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        if (routeItems.length === 0 && !routeAll && !generateDual) {
            UI.hideLoading();
            UI.showAlert('IP/Domain list cannot be empty when "Route All" is unchecked', 'error');
            elements.outputJson.value = 'Error: Please add IPs/Domains or enable "Route All Traffic"';
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        var phantomConfigUrl = Config.phantomConfigUrls[serverlessType];

        Utils.fetchConfig(phantomConfigUrl, function(err, baseConfig) {
            if (err) {
                UI.hideLoading();
                UI.showAlert('Error fetching base config: ' + err.message, 'error');
                elements.outputJson.value = 'Error: Could not fetch base config from server';
                UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
                return;
            }

            try {
                if (generateDual) {
                    var configAll = ConfigProcessor.createCombinedConfig(baseConfig, userConfig, routeItems, {
                        routeAllTraffic: true,
                        useCustomName: useCustomName,
                        customName: customName,
                        customDohUrl: useCustomDoh ? customDohUrl : null
                    });
                    var configCustom = ConfigProcessor.createCombinedConfig(baseConfig, userConfig, routeItems, {
                        routeAllTraffic: false,
                        useCustomName: useCustomName,
                        customName: customName,
                        customDohUrl: useCustomDoh ? customDohUrl : null
                    });
                    
                    generatedConfigs = [configAll, configCustom];
                    isDualMode = true;
                    elements.configTabs.style.display = 'flex';
                    elements.previewLabel.style.display = 'inline';
                    
                    displayConfig(0);
                } else {
                    var singleConfig = ConfigProcessor.createCombinedConfig(baseConfig, userConfig, routeItems, {
                        routeAllTraffic: routeAll,
                        useCustomName: useCustomName,
                        customName: customName,
                        customDohUrl: useCustomDoh ? customDohUrl : null
                    });
                    
                    generatedConfigs = [singleConfig];
                    isDualMode = false;
                    elements.configTabs.style.display = 'none';
                    elements.previewLabel.style.display = 'none';
                    
                    displayConfig(0);
                }

                setTimeout(function() {
                    UI.hideLoading();
                    elements.downloadButton.style.display = 'inline-flex';
                    UI.showAlert('Config generated successfully!', 'success');
                }, 800);

            } catch (error) {
                setTimeout(function() {
                    UI.hideLoading();
                    UI.showAlert('Error processing config: ' + error.message, 'error');
                    elements.outputJson.value = 'Error: ' + error.message;
                    UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
                }, 800);
            }
        });
    });

    function displayConfig(index) {
        if (index < 0 || index >= generatedConfigs.length) return;
        
        currentConfigIndex = index;
        var output = JSON.stringify(generatedConfigs[index], null, 2);
        elements.outputJson.value = output;
        UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
        
        var tabs = elements.configTabs.querySelectorAll('.tab-button');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
        }
        if (tabs[index]) {
            tabs[index].classList.add('active');
        }
    }

    elements.configTabs.addEventListener('click', function(e) {
        if (e.target.classList.contains('tab-button')) {
            var configIndex = parseInt(e.target.getAttribute('data-config'));
            displayConfig(configIndex);
        }
    });

    elements.copyButton.addEventListener('click', function() {
        if (generatedConfigs.length === 0) {
            UI.showAlert('No config to copy', 'warning');
            return;
        }
        
        var textToCopy;
        
        if (isDualMode) {
            textToCopy = JSON.stringify(generatedConfigs, null, 2);
            Utils.copyToClipboard(textToCopy, elements.copyButton);
            UI.showAlert('Both configs copied to clipboard as array', 'success');
        } else {
            textToCopy = JSON.stringify(generatedConfigs[0], null, 2);
            Utils.copyToClipboard(textToCopy, elements.copyButton);
            UI.showAlert('Config copied to clipboard', 'success');
        }
    });

    elements.downloadButton.addEventListener('click', function() {
        if (generatedConfigs.length === 0) return;
        
        var filename = 'phantom-chain-config.json';
        var dataToDownload;
        
        if (isDualMode) {
            dataToDownload = JSON.stringify(generatedConfigs, null, 2);
            filename = 'phantom-chain-configs-dual.json';
        } else {
            dataToDownload = JSON.stringify(generatedConfigs[0], null, 2);
            filename = (generatedConfigs[0].remarks || 'phantom-chain-config').replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.json';
        }
        
        Utils.downloadJSON(dataToDownload, filename);
        UI.showAlert(isDualMode ? 'Both configs downloaded' : 'Config downloaded', 'success');
    });

    elements.clearButton.addEventListener('click', function() {
        elements.jsonConfigInput.value = '';
        UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
        setDefaultIPs();
        elements.routeAllCheckbox.checked = false;
        elements.routeAllCheckbox.disabled = false;
        elements.dualConfigToggle.checked = false;
        elements.customNameCheckbox.checked = false;
        elements.customNameInput.value = '';
        elements.customNameInput.disabled = true;
        elements.charCounter.textContent = '0/50';
        elements.charCounter.style.color = '#888';
        elements.customNameInputContainer.classList.remove('active');
        elements.outputJson.value = 'Your combined JSON config will appear here...';
        UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
        elements.configCounter.textContent = '';
        elements.usePublicConfigToggle.checked = false;
        elements.pasteButton.disabled = false;
        elements.uploadButton.disabled = false;
        elements.jsonConfigInput.disabled = false;
        elements.jsonConfigInput.style.opacity = '1';
        elements.jsonConfigInput.style.cursor = 'text';
        elements.configTabs.style.display = 'none';
        elements.previewLabel.style.display = 'none';
        elements.downloadButton.style.display = 'none';
        elements.serverlessTypeSelect.value = 'standard';
        elements.customDohCheckbox.checked = false;
        elements.customDohInput.value = '';
        elements.customDohInput.disabled = true;
        elements.customDohInputContainer.classList.remove('active');
        generatedConfigs = [];
        currentConfigIndex = 0;
        isDualMode = false;
        UI.showAlert('All fields cleared', 'info');
    });

    setDefaultIPs();
    UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
    
    setTimeout(function() {
        UI.initParticles();
    }, 500);
});
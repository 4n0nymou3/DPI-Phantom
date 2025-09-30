function initializeAceEditor(id, mode, isReadOnly = false) {
    const editor = ace.edit(id);
    editor.setTheme("ace/theme/tokyo_night");
    editor.session.setMode(mode);
    editor.setOptions({
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: "14px",
        useWorker: false,
        showPrintMargin: false,
        highlightActiveLine: true,
        wrap: true,
        showGutter: true,
    });
    if (isReadOnly) {
        editor.setReadOnly(true);
    }
    return editor;
}

window.addEventListener('DOMContentLoaded', () => {
    window.jsonConfigEditor = initializeAceEditor('jsonConfigInput', 'ace/mode/json');
    window.ipInputEditor = initializeAceEditor('ipInput', 'ace/mode/text');
    window.outputEditor = initializeAceEditor('outputJson', 'ace/mode/json', true);
    
    window.outputEditor.setValue('Your combined JSON config will appear here...', -1);
});

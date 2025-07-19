function showWelcomePageChanged(box) {
    if (box.checked === true) {
        vscode.postMessage({
            command: 'showWelcomePage'
        });
    } else {
        vscode.postMessage({
            command: 'hideWelcomePage'
        });
    }
}

document.addEventListener("DOMContentLoaded", function() {
    let a = 0 ;

    if (seltab) {
        try {
            a = parseInt(seltab) ;
        }
        catch(err) {
            vscode.postMessage({
                command: 'logMessage',
                message: 'exception: ' + err.message
            }) ;
        }
    }

    vscode.postMessage({
        command: 'logMessage',
        message: "selecting page: " + a
    }) ;    
    
    $( "#tabs" ).tabs({collapsible: true, active: a});
}) ;

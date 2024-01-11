const vscode = acquireVsCodeApi() ;
function showWelcomePageChanged(box) {
    if (box.checked === true) {
        vscode.postMessage({ command: 'showWelcomePage'}) ;
    }
    else {
        vscode.postMessage({ command: 'hideWelcomePage'}) ;
    }
}

function selectContent(evt, which) {
    let buttons = document.getElementsByClassName("tabbutton") ;
    for(var button of buttons) {
        button.style.backgroundColor = "#202020" ;
        button.style.color = "#FFFFFF" ;
    }

    let contents = document.getElementsByClassName("tabcont") ;
    for(var content of contents) {
        content.style.display = "none" ;
    }

    let selbutton = document.getElementById("tabbutton" + which) ;
    selbutton.style.backgroundColor = "#ffffffff" ;
    selbutton.style.color = "#000000ff" ;

    let selcontent = document.getElementById("content" + which) ;
    selcontent.style.display = "block" ;
}

document.addEventListener("DOMContentLoaded", function() {
    selectContent(undefined, "####PAGE####") ;
}) ;

# ModusToolbox Assistant README

This extension is an assistant for using ModusToolbox with the Visual Studio Code.

## Features

This extension provides support for the ModusToolbox embedded software devlopment environment.
This includes the following feature:
- ModusToolbox welcome page showing recent project, how to create and import a project, and documentation
- ModusToolbox shell as a terminal type
- ModusToolbox view showing project info, available tools, documentation, and assets
- Ability to show documentation for ModusToolbox asset function
- Intelligent management of Intellisense to insure that the specific project of interest is the focus

## Requirements

This extension requires ModusToolbox version 3.0 or later to be installed.  It does not work
with ModusToolbox 2.x.  For ModusToolbox development in VS Code the Cortex Debug extensions
must also be installed.

This extension works best if the 'clangd' extension is installed to manage Intellisense.  The
default Microsoft support for 'C/C++' intellisense does not work as well.

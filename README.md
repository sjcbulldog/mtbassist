# ModusToolbox Assistant README

This extension is an assistant for using ModusToolbox with the Visual Studio Code.

## Features

This extension provides support for the ModusToolbox embedded software devlopment environment.
This includes the following feature:
- ModusToolbox welcome page showing recent project, how to create and import a project
- ModusToolbox shell as a terminal type
- ModusToolbox view showing project info, available tools, documentation, and assets
- Command to map a symbol in the "C" source code to the asset documentation for that symbol

## Requirements

This extension requires ModusToolbox version 3.0 or later to be installed.  It does not work
with ModusToolbox 2.x.  For ModusToolbox development in VS Code the Cortex Debug extensions
must also be installed.

### 1.0.6
Initial release of the ModusToolbox Assistant

### 1.0.8
Added Shift + Ctrl + F1 lookup for symbols documentation

### 1.0.9
Fixed issues with Mac OS and Linux display

### 1.0.11
Fixed issues with multi-core projects.  Added in a warning screen if ModusToolbox 3.0 or later
is not installed.

### 1.0.13
Added in the documentation of the Import command to try and make it more clear what the
command does and how it is used.

### 1.0.14
Added in the display of the README.md file if it exists in the current application.

### 1.0.15
Fixed a bug with newlines on Mac OS

### 1.0.16
Added the import from local directory command (mtbImportDiskProject)

### 1.0.17
Added the ability to detect ModusToolbox application without build support
Added the Run 'make getlibs' command

### 1.0.18
Fixed a bug with retreiving the extension version number

### 1.0.19
Fixed bug with recent projects list not being updated

### 1.0.20
Cleaned up how the tools are displayed in the ModusToolbox view.

### 1.0.21
Reduced when the ModusToolbox Assistant log window is displayed

Reworded some of the text in the ModusToolbox view to make intent more obvious

When loading a ModusToolbox project but no build support is available, 
run 'make getlibs' to bring in the required buidl support.  This basically
eliminates the need for the "import from disk" command.

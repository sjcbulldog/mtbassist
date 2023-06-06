# Change Log

### 1.0.24
Added support for ModusToolbox 3.1

### 1.0.23
Detect when a project has been moved and can no longer be built.  In this case
run 'make getlibs' to refresh the project.  Created a status bar item to show
the status of the current open folder or workspace with respect to ModusToolbox.

### 1.0.22
Fixed a defect with multi-core projects not updating correctly

### 1.0.21
Reduced when the ModusToolbox Assistant log window is displayed

Reworded some of the text in the ModusToolbox view to make intent more obvious

When loading a ModusToolbox project but no build support is available, 
run 'make getlibs' to bring in the required buidl support.  This basically
eliminates the need for the "import from disk" command.

### 1.0.20
Cleaned up how the tools are displayed in the ModusToolbox view.

### 1.0.19
Fixed bug with recent projects list not being updated

### 1.0.18
Fixed a bug with retreiving the extension version number

### 1.0.17
Added the ability to detect ModusToolbox application without build support
Added the Run 'make getlibs' command

### 1.0.16
Added the import from local directory command (mtbImportDiskProject)

### 1.0.15
Fixed a bug with newlines on Mac OS

### 1.0.14
Added in the display of the README.md file if it exists in the current application.

### 1.0.13
Added in the documentation of the Import command to try and make it more clear what the
command does and how it is used.

### 1.0.11
Fixed issues with multi-core projects.  Added in a warning screen if ModusToolbox 3.0 or later
is not installed.

### 1.0.9
Fixed issues with Mac OS and Linux display

### 1.0.8
Added Shift + Ctrl + F1 lookup for symbols documentation


### 1.0.6
Initial release of the ModusToolbox Assistant






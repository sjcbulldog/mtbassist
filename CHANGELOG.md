# Change Log

### 1.1.5
Make the firmware update message stand out more so that it is not missed

### 1.1.4
Fixed a bug with the recent ModusToolbox applications page

### 1.1.3
Fixed bug with welcome page not being displayed under some conditions

### 1.1.2
Added a notification about kits being out of date

### 1.1.1
Added a message when the welcome page is displayed because of out of date kits.

### 1.1.0
Added the ability to detect ModusToolbox supported kits attached to the local machine and display
the list of kits.  If the firmware for these kits are out of date, provide an option to update the
firmware.

### 1.0.34
Fixed the intellisense data file (compile_commands.json) that is malformed out of ModusToolbox
3.1 after each build so that intellisense continues to work.

### 1.0.33

### 1.0.32

If you are using clangd (recommended) for Intellisense, the extension can configure clangd
to provide the best possible Intellisense experience.

Added the ability to switch between projects for intellisense when in a multiproject
application.  Right clicking on the status indicator (MTB) in the bottom right will
bring up a selection of projects that exist in the current application.

ModusToolbox Documentation command on the right click (context) menu can now find the 
documentation for the specific item under the cursor.

If a ModusToolbox application is loaded and assets are missing, the user is prompted 
to run 'make getlibs' to download any missing assets.  This can happen if an application
is shared via git and another developer has added assets via the library manager. This
will happen if you are working with others on an application and someone else adds an asset
to the project and you pull the changes.  The requirement for the asset will be present
via a .mtb file, but the actual asset will be missing.

Added a brief overview of the features of this extension in the extension welcome page.

### 1.0.31
Updated to filter out documetation that is hidden below a component that is not
defined and therefore should not be shown.

### 1.0.30
Updated to fix bug with older ModusToolbox 2.x projects where getlibs was run every
time the project was loaded.

### 1.0.29
Put a work around where the C language server finds a symbol in the wrong
version of an asset.  This leads to the extension saying the symbols is not
in an asset, when it really is.

### 1.0.28
Fixed a bug in the WSL support

### 1.0.27
Updated to find documentation when running in WSL from windows

### 1.0.26
Updated manifest parsing to be more compatible with manifest requirements

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






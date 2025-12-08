# Change Log

### 2.0
First version of new ModusToolbox Assistant.  Complete rewrite and approach.

### 2.0.1
Fixed issue with initializaiton failing when

### 2.0.2
Added aliases in the local content storage manager based on BSP categories.  Now
typeing 'edge' in the BSP filter should filter to the edge BSPs.

Normalized the direction of the slashes in the project creator.

### 2.0.3
Updated how external documents are opened to use the vscode capabilites.

### 2.0.4
Cleaned up the application view to reduce the amount of space used.
Updated the Erase action button to have a context menu so you can select between Erase and Erase All tasks.
Updated the Program action button to have a context menu so you can select between Program and Quick Program tasks.

### 2.0.5
Updated the memory section to output 2 decimal places in the percentages
Added the ability to log information when the extension is downloading and installing ModusToolbox
Fixed issue with settings change not triggering update of the application where needed
Refactored the interface to the IDC Service
Started support for linux with setup and install

### 2.0.6
Fixed a problem with the tasks that should be executed after showing the application gating display of the application (race condition)
Added per project configuration settings (Debug, Release, Per Project)
Fixed issues with the VS Code tasks and settings and appliations with multiple projects
Fixed issues with local manifests referenced via FILE: url resource locators 
Added support for per project compiler choices

### 2.1.0
Provided better message in the application tab if no ModusToolbox appliation is loaded
Remove the status bar item and added an icon on the editor/title menu to bring up the assistant page

### 2.3.0
Fixed bug with filter of environment when launching external programs
Fixed bug with installing new software when no project is loaded
Parallelized the search for keywords in asset documentation to make the extension more responsive
Moved LLVM versions available to JSON file on server that can be fetched, added fallback verions of LLVM in case server not reachable

### 2.4.0
Changed the IDC Launcher support to directly download and install the launcher service (window)
Updated the project creation display to show more details about what is happening

### 2.5.0
Added copyright information when installing the LLVM compiler.
Changed the IDC Launcher support to directly download and install the launcher service (macos)

### 2.6.0
Refactored the LLVM installer to be more rebust against future changes in the release formats
Added an extension setting 'mtbassist2.disablellvmnag' that can be set to display the LLVM nag
Create a vscode command to start the LLVM installation process
Fix small bugs with the ModusToolbox tools installer for Linux

### 2.7.0
If configurators are launched and still open when VSCode exits, leave these configurators open

### 2.8.0
Fixed issue if the workspace exists, but the libs directories and .vscode directories do not exist, then the initialization did not succeed after fixing the ModusToolbox application.
Updated the memory usage display to show regions created in the device configuration, and the percentage used of each region as well as the physical memories.

### 2.9.0
First public release

### 2.10.0
Updated to fix color problems with some of the displays when in light mode.

### 2.11.0
Added a new command to manage what is displayed in the ModusToolbox output channel.

### 2.12.0
Update this change log, which I forgot in the last versions.

### 2.13.0
Updated the names of the PSOC Edge kits in the kit database to better detect these kits

### 2.14.0
Fixed bug with verbose option to clangd.
Fixed bug with too much output to the debug console.
Improved the performance of the scanner that searches documentation for symbols.

### 2.15.0
Fixed the regression on the symbol to documentation feature

### 2.16.0
Fixed a problem with trailing spaces causing problems in a few places

### 2.17.0
Fixed a problem with assets that do not have a version file (either version.xml nor props.json)

### 2.18.0
Fixed a problem with file based (versus https based) manifest files

### 2.19.0
Updated to that the code example category is shown in alphabetic order

### 2.20.0
Added code to look for veneer related build erros and help the user fix the issues.

### 2.22.0
Improved the intellisense handling.
When something changes that would impact intellisense (like toolchain) there is a prompt to make the changes required to have intellisense work at its best.

### 2.23.0
Fixed issue with manifest loading but not signaling the frontend

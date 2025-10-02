# ModusToolbox Assistant README

This extension is an assistant for using ModusToolbox with the Visual Studio Code.

## Features

### 🚀 Project Creation & Management
- **Guided Project Wizard**: Step-by-step project creation with BSP selection, code examples, and configuration options
- **Connected Development Kit Detection**: Automatic detection and integration with connected ModusToolbox development kits
- **Project Status Dashboard**: Real-time overview of application health, build status, and project configuration
- **Multi-Project Support**: Manage complex applications with multiple projects in a single workspace

### 🔧 Build & Development Tools
- **Integrated Build Actions**: One-click build, rebuild, clean, erase, and program operations
- **Memory Usage Analysis**: Visual memory mapping and usage statistics for optimizing applications
- **Configuration Management**: Easy switching between Debug/Release configurations
- **Missing Asset Detection**: Automatic detection and fixing of missing project dependencies

### 🧠 IntelliSense & Code Navigation
- **CLANGD Integration**: Optimized C/C++ IntelliSense using CLANGD for better code completion and navigation
- **Symbol Documentation**: Quick access to ModusToolbox API documentation with `Ctrl+Shift+F1`
- **Context-Aware Help**: Right-click context menu integration for symbol documentation lookup

### 📦 Package & Content Management
- **Local Content Storage**: Manage BSP packages and local storage with drag-and-drop interface
- **BSP Keyword Aliases**: Smart filtering and search capabilities for Board Support Packages
- **Automatic Updates**: Check for and install BSP and tool updates
- **Manifest Integration**: Real-time synchronization with ModusToolbox manifest data

### 🔌 Hardware & DevKit Support
- **DevKit Management**: Monitor connected development kits with status, firmware, and BSP information
- **Hardware Configuration**: Automatic BSP association and firmware update notifications
- **Multi-Kit Support**: Handle multiple connected development kits simultaneously

### ⚙️ Tool Integration
- **Device Configurator**: Direct access to ModusToolbox Device Configurator
- **Library Manager**: Integrated middleware and library management
- **LLVM Toolchain**: Install and manage supported LLVM compiler versions
- **ModusToolbox Shell**: Dedicated terminal profile with ModusToolbox environment

### 🎯 User Experience
- **Dark/Light Theme Support**: Adaptive theming that follows VS Code preferences
- **Getting Started Guide**: Interactive onboarding for new users
- **Recently Opened Projects**: Quick access to recently used ModusToolbox applications
- **Status Bar Integration**: Real-time status updates and quick access to main features
- **Task Integration**: Custom VS Code tasks for build operations and tool launching

### 🛠️ Advanced Features
- **Bootloader Support**: Add bootloader functionality to PSoC Edge applications
- **Custom Task System**: Extensible task system for project-specific operations
- **Settings Management**: Comprehensive configuration options for workspace and user preferences
- **Documentation Integration**: Built-in user guide and context-sensitive help system


## Requirements

This extension requires ModusToolbox version 3.2 or later to be installed.  It does not work
with ModusToolbox 2.x, 3.0, or 3.1.  

This extension works best if the 'clangd' extension is installed to manage Intellisense.  The
default Microsoft support for 'C/C++' intellisense does not work as well.

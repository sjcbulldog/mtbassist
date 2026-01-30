import { ModusToolboxEnvironment } from "../mtbenv";
import { MTBRunCommandOptions } from "../mtbenv/mtbenv/mtbenv";
import * as path from 'path';
import * as fs from 'fs';
import * as winston from 'winston';
import { MTBSettings } from "./mtbsettings";
import { MTBUtils } from "../mtbenv/misc/mtbutils";
import EventEmitter = require('events');

interface CompileCommand {
    command: string;
    directory: string;
    file: string;
}

class CMakeIncludesAndDefines {
    // Common includes and defines across all files of each type
    public cCommonIncludes_ : string[] = [];
    public cCommonDefines_ : string[] = [];
    public asmCommonIncludes_ : string[] = [];
    public asmCommonDefines_ : string[] = [];
    public cppCommonIncludes_ : string[] = [];
    public cppCommonDefines_ : string[] = [];
    
    // File-specific includes and defines
    public fileIncludes_ : Map<string, string[]> = new Map();
    public fileDefines_ : Map<string, string[]> = new Map();

    public sourceFiles_ : Set<string> = new Set();

    public get isValid() : boolean {
        return this.fileIncludes_.size === 0 && this.fileDefines_.size === 0 ;
    }
} ;

export class CMakeBuildSupport extends EventEmitter{
    private env_ : ModusToolboxEnvironment ;
    private settings_ : MTBSettings ;
    private logger_ : winston.Logger;
    private toolsdir_? : string ;
    private modusShellDir_? : string ;

    private debugFlags_ : Map<string, string> = new Map();
    private releaseFlags_ : Map<string, string> = new Map();
    private toolchainFile_ : string ;
    private gui_ : boolean = false ;
    
    private debugIncludesDefines_: CMakeIncludesAndDefines = new CMakeIncludesAndDefines() ;
    private releaseIncludesDefines_: CMakeIncludesAndDefines = new CMakeIncludesAndDefines() ;

    public constructor(env: ModusToolboxEnvironment, settings: MTBSettings, logger: winston.Logger, gui: boolean = false) {
        super() ;
        this.env_ = env ;
        this.settings_ = settings ;
        this.logger_ = logger;
        this.gui_ = gui ;
        this.toolchainFile_ = 'arm-cortex-m33.cmake' ;

        this.toolsdir_ = this.env_.toolsDir! ;
        if (!this.setupModusShell()) {
            this.logger_.warn(`CMakeBuildSupport: cannot find 'modus-shell' in the tools directory '${this.toolsdir_}'`) ;
        }
    }

    public async createCMakeFileForCurrentProject() {

        ////////////// Debug configuration ////////////////
        if (this.gui_) {
            this.emit('startOperation', 'Creating CMake files for current project...') ;
            this.emit('addStatusLine', 'Running "make codegen CONFIG=Debug" to extract build recipe ...') ;
        }

        this.logger_.info('CMakeBuildSupport: generating CMake files for current project...') ; 
        this.logger_.info('                   running "make codegen"') ;
        try {
            await this.runCodeGen('Debug') ;
        }
        catch(err) {
            this.logger_.warn(`CMakeBuildSupport: failed to run codegen: ${err}`) ;
            return ;
        }

        if (this.gui_) {
            this.emit('addStatusLine', 'Extracting source files and flags from compile_commands.json...') ;
        }
        this.logger_.info('                   reading debug "compile_commands.json"') ;
        this.readCompileCommands('Debug', this.debugIncludesDefines_) ;

        this.logger_.info('                   reading debug build flags') ;
        if (!this.readFlags('Debug', this.debugFlags_)) {
            this.logger_.warn('CMakeBuildSupport: failed to read flags from build directory') ;
            return ;
        }        

        //////////////// Release configuration ////////////////

        if (this.gui_) {
            this.emit('addStatusLine', 'Running "make codegen CONFIG=Release" to extract build recipe ...') ;
        }

        try {
            await this.runCodeGen('Release') ;
        }
        catch(err) {
            this.logger_.warn(`CMakeBuildSupport: failed to run codegen: ${err}`) ;
            return ;
        }        

        if (this.gui_) {
            this.emit('addStatusLine', 'Extracting source files and flags from compile_commands.json...') ;
        }
        this.logger_.info('                   reading "compile_commands.json"') ;
        this.readCompileCommands('Release', this.releaseIncludesDefines_) ;

        if (this.gui_) {
            this.emit('addStatusLine', 'Reading build flags from build directories...') ;
        }

        if (!this.readFlags('Release', this.releaseFlags_)) {
            this.logger_.warn('CMakeBuildSupport: failed to read flags from build directory') ;
            return ;
        }        

        if (this.gui_) {
            this.emit('addStatusLine', 'Writing toolchain file...') ;
        }
        this.logger_.info('                   writing toolchain file') ;
        this.writeToolchainFile() ;

        if (this.gui_) {
            this.emit('addStatusLine', 'Writing CMakeLists.txt file...') ;
        }
        this.logger_.info('                   writing CMakeLists.txt file') ;
        this.writeCMakeListsFile() ;

        if (this.gui_) {
            this.emit('finishOperation', 'CMake files created successfully.') ;
        }
    }

    private get bspName() : string | undefined {
        const appInfo = this.env_.appInfo ;
        if (!appInfo || !appInfo.projects || appInfo.projects.length === 0) {
            return undefined ;
        }
        let ret = appInfo.projects[0].bspName ;
        if (ret?.startsWith('TARGET_')) {
            ret = ret.substring('TARGET_'.length) ;
        }
        return ret;
    }

    /**
     * Run the 'make codegen' command in the project's top-level directory.
     * Uses the ModusToolboxEnvironment's capabilities to execute the make command.
     * @returns Promise that resolves when the codegen command completes
     */
    private async runCodeGen(config: string): Promise<void> {
        let ret = new Promise<void>(async (resolve, reject) => {
            const appInfo = this.env_.appInfo;

            if (!this.modusShellDir_) {
                reject(new Error('Modus Shell directory not set - cannot run codegen')) ;
                return ;
            }
            
            if (!appInfo) {
                reject(new Error('No application info available - cannot run codegen')) ;
                return ;
            }

            const projectDir = appInfo.appdir;
            
            if (!fs.existsSync(projectDir)) {
                reject(new Error(`Project directory does not exist: ${projectDir}`)) ;
                return ;
            }

            // Remove the build directory to ensure a clean codegen run
            const buildDir = path.join(projectDir, 'build');
            if (fs.existsSync(buildDir)) {
                this.logger_.info(`CMakeBuildSupport: removing existing build directory: ${buildDir}`) ;
                try {
                    fs.rmdirSync(buildDir, { recursive: true }) ;
                }
                catch(err) {
                    this.logger_.warn(`CMakeBuildSupport: failed to remove build directory: ${err}`) ;
                    reject(new Error(`Failed to remove existing build directory: ${err}`)) ;
                    return ;
                }
            }

            // Determine the make command based on the platform
            const args = ['codegen', `CONFIG=${config}`];
            let toolspath = this.env_.toolsDir! ;
            try {
                const [exitCode, output] = await MTBUtils.callMake(this.logger_, toolspath, this.modusShellDir_, this.env_.appInfo?.appdir!, args) ;
                if (exitCode !== 0) {
                    reject(new Error(`Code generation failed with exit code ${exitCode}\n${output.join('\n')}`));
                    return ;
                }
            } catch (err) {
                reject(new Error(`Failed to run code generation: ${err}`)) ;
            }

            resolve() ;
        }) ;
        return ret ;
    }

    /**
     * Read the compile_commands.json file from the build directory and store the 
     * set of source files that must be built to create the target application.
     * Also extracts includes and defines from each command.
     * @returns Promise that resolves when the compile commands have been read
     */
    private async readCompileCommands(config: string, includesDefines: CMakeIncludesAndDefines): Promise<void> {
        const appInfo = this.env_.appInfo;
        
        if (!appInfo) {
            throw new Error('No application info available - cannot read compile commands');
        }

        const projectDir = appInfo.appdir;
        const buildDir = path.join(projectDir, 'build');
        const compileCommandsPath = path.join(buildDir, 'compile_commands.json');

        if (!fs.existsSync(compileCommandsPath)) {
            throw new Error(`compile_commands.json not found at: ${compileCommandsPath}`);
        }

        try {
            const fileContent = fs.readFileSync(compileCommandsPath, 'utf-8');
            const compileCommands: CompileCommand[] = JSON.parse(fileContent);

            // Clear the previous data
            includesDefines.sourceFiles_.clear();
            includesDefines.fileIncludes_.clear();
            includesDefines.fileDefines_.clear();

            // Data structures to compute common includes/defines
            const cFiles: Map<string, {includes: string[], defines: string[]}> = new Map();
            const asmFiles: Map<string, {includes: string[], defines: string[]}> = new Map();
            const cppFiles: Map<string, {includes: string[], defines: string[]}> = new Map();

            // Extract and store all source file paths and their includes/defines
            for (const cmd of compileCommands) {
                if (cmd.file) {
                    // Normalize the file path and add to the set
                    const normalizedPath = path.normalize(cmd.file);
                    includesDefines.sourceFiles_.add(normalizedPath);

                    // Extract includes and defines from the command
                    const includes = this.extractIncludes(cmd.command);
                    const defines = this.extractDefines(cmd.command);

                    // Determine file type based on extension
                    const ext = path.extname(cmd.file).toLowerCase();
                    const fileData = { includes, defines };

                    if (ext === '.c') {
                        cFiles.set(normalizedPath, fileData);
                    } else if (ext === '.s' || ext === '.asm') {
                        asmFiles.set(normalizedPath, fileData);
                    } else if (ext === '.cpp' || ext === '.cc' || ext === '.cxx') {
                        cppFiles.set(normalizedPath, fileData);
                    }
                }
            }

            // Compute common includes and defines for each file type
            this.computeCommonAndFileSpecific(cFiles, includesDefines.cCommonIncludes_, includesDefines.cCommonDefines_, includesDefines);
            this.computeCommonAndFileSpecific(asmFiles, includesDefines.asmCommonIncludes_, includesDefines.asmCommonDefines_, includesDefines);
            this.computeCommonAndFileSpecific(cppFiles, includesDefines.cppCommonIncludes_, includesDefines.cppCommonDefines_, includesDefines);

        } catch (err) {
            throw new Error(`Failed to read or parse compile_commands.json: ${err}`);
        }

        if (!includesDefines.isValid) {
            throw new Error('Per-file includes/defines detected - cannot generate CMake files');
        }
    }

    /**
     * Read compiler and linker flag files from the build directory.
     * Reads the first line of each flag file and stores it in the flags map.
     * Flag files are located in build/BSPNAME/CONFIG directory.
     */
    private readFlags(config: string, flagsMap: Map<string, string>): boolean { 
        const appInfo = this.env_.appInfo;
        
        if (!appInfo) {
            this.logger_.warn('No application info available - cannot read flags');
            return false ;
        }

        if (!appInfo.projects || appInfo.projects.length === 0) {
            this.logger_.warn('No projects available in application info - cannot read flags');
            return false ;
        }

        if (!appInfo.projects || appInfo.projects.length !== 1) {
            this.logger_.warn('Multiple projects detected - cmake is only supported for a single project application (for now)');
            return false ;
        }

        if (!this.bspName) {
            this.logger_.warn('No BSP information available - cannot read flags');
            return false ;
        }

        const projectDir = appInfo.appdir;
        
        const flagsDir = path.join(projectDir, 'build', this.bspName, config as string);
        
        if (!fs.existsSync(flagsDir)) {
            this.logger_.warn(`Flags directory does not exist: ${flagsDir}`);
            return false ;
        }

        // List of flag files to read (with leading periods)
        const flagFiles = [
            '.arflags',
            '.asflags',
            '.asflags_s',
            '.cflags',
            '.cxxflags',
            '.defines',
            '.includes',
            '.ldflags',
            '.ldlibs'
        ];

        // Clear the previous flags
        flagsMap.clear();

        // Read each flag file
        for (const flagFile of flagFiles) {
            const flagFilePath = path.join(flagsDir, flagFile);
            
            if (fs.existsSync(flagFilePath)) {
                try {
                    const fileContent = fs.readFileSync(flagFilePath, 'utf-8');
                    const firstLine = fileContent.split('\n')[0].trim();
                    
                    // Store in map without the leading period
                    const keyName = flagFile.substring(1); // Remove the leading '.'
                    flagsMap.set(keyName, firstLine);
                } catch (err) {
                    this.logger_.warn(`Failed to read flag file ${flagFile}: ${err}`);
                }
            } else {
                this.logger_.debug(`Flag file not found: ${flagFilePath}`);
            }
        }
        return true ;
    }

    /**
     * Extract include paths from a compile command string.
     * Looks for -I flags followed by paths.
     */
    private extractIncludes(command: string): string[] {
        const includes: string[] = [];
        // Match -I followed by a path (may be quoted or unquoted)
        const includeRegex = /-I\s*(["']?)([^\s"']+)\1/g;
        let match;
        
        while ((match = includeRegex.exec(command)) !== null) {
            includes.push(match[2]);
        }
        
        return includes;
    }

    /**
     * Extract defines from a compile command string.
     * Looks for -D flags followed by define names/values.
     */
    private extractDefines(command: string): string[] {
        const defines: string[] = [];
        // Match -D followed by a define (may be quoted or unquoted)
        const defineRegex = /-D\s*(["']?)([^\s"']+)\1/g;
        let match;
        
        while ((match = defineRegex.exec(command)) !== null) {
            defines.push(match[2]);
        }
        
        return defines;
    }

    /**
     * Compute common includes/defines across all files and store file-specific ones.
     * Common items are those present in ALL files of the given type.
     */
    private computeCommonAndFileSpecific(
        filesMap: Map<string, {includes: string[], defines: string[]}>,
        commonIncludes: string[],
        commonDefines: string[],
        includesDefines: CMakeIncludesAndDefines
    ): void {
        if (filesMap.size === 0) {
            return;
        }

        // Find intersection of includes and defines across all files
        let firstFile = true;
        let commonIncludesSet = new Set<string>();
        let commonDefinesSet = new Set<string>();

        for (const [filePath, fileData] of filesMap) {
            if (firstFile) {
                // Initialize with first file's includes/defines
                commonIncludesSet = new Set(fileData.includes);
                commonDefinesSet = new Set(fileData.defines);
                firstFile = false;
            } else {
                // Keep only items that exist in current file
                const currentIncludes = new Set(fileData.includes);
                const currentDefines = new Set(fileData.defines);
                
                for (const inc of commonIncludesSet) {
                    if (!currentIncludes.has(inc)) {
                        commonIncludesSet.delete(inc);
                    }
                }
                
                for (const def of commonDefinesSet) {
                    if (!currentDefines.has(def)) {
                        commonDefinesSet.delete(def);
                    }
                }
            }
        }

        // Store common includes/defines in the provided arrays
        commonIncludes.length = 0;
        commonIncludes.push(...Array.from(commonIncludesSet));
        commonDefines.length = 0;
        commonDefines.push(...Array.from(commonDefinesSet));

        // For each file, store only the includes/defines that are NOT common
        for (const [filePath, fileData] of filesMap) {
            const specificIncludes = fileData.includes.filter(inc => !commonIncludesSet.has(inc));
            const specificDefines = fileData.defines.filter(def => !commonDefinesSet.has(def));
            
            if (specificIncludes.length > 0) {
                includesDefines.fileIncludes_.set(filePath, specificIncludes);
            }
            
            if (specificDefines.length > 0) {
                includesDefines.fileDefines_.set(filePath, specificDefines);
            }
        }
    }

    private setupModusShell() : boolean {
        let ret = true ;

        if (!this.modusShellDir_) {
            this.modusShellDir_ = path.join(this.toolsdir_!, 'modus-shell') ;
            if (!fs.existsSync(this.modusShellDir_) || !fs.statSync(this.modusShellDir_).isDirectory()) {
                this.modusShellDir_ = undefined ;
                ret = false ;
            }
        }

        return ret;
    }

    private filterLDFlags(originalFlags: string) : string {
        // Example: remove any -T flags (linker script specifications)
        const parts = originalFlags.split(' ');
        const filteredParts : string[] = [] ;
        for(let part of parts) {
            if (!part.startsWith('-T') && !part.startsWith('-Wl,-Map') && !part.startsWith('-Wl,--start-group') && !part.startsWith('--specs') &&
                    !part.startsWith('-Wl,--end-group') && !part.startsWith('-o') && part !== '@elffile' && part !== '@objs') {
                filteredParts.push(part);
            }
        }
        return filteredParts.join(' ');
    }

    private filterCompileFlags(originalFlags: string) : string {
        // Example: remove any optimization flags
        const parts = originalFlags.split(' ');
        const filteredParts : string[] = [] ;
        let skipNext = false ;
        for(let part of parts) {
            if (skipNext) {
                skipNext = false ;
                continue ;
            }
            else if (part === '-MF' || part === '-MT' || part === '-MQ') {
                skipNext = true ;
                continue ;
            }
            else if (!part.startsWith('-c') && part !== '-MMD' && part !== '-MP') {
                filteredParts.push(part);
            }
        }
        return filteredParts.join(' ');    
    }

    private writeToolchainFile() : void {
        let debugcflags = this.filterCompileFlags(this.debugFlags_.get('cflags') || '') ;
        let debugcxxflags = this.filterCompileFlags(this.debugFlags_.get('cxxflags') || '') ;
        let debugasflags = this.filterCompileFlags(this.debugFlags_.get('asflags') || '') ;
        let debugldflags = this.filterLDFlags(this.debugFlags_.get('ldflags') || '')  + ' -Wl,-Map,${CMAKE_BINARY_DIR}/build-.map -T ${LINKER_SCRIPT}' ;

        let releasecflags = this.filterCompileFlags(this.releaseFlags_.get('cflags') || '') ;
        let releasecxxflags = this.filterCompileFlags(this.releaseFlags_.get('cxxflags') || '') ;
        let releaseasflags = this.filterCompileFlags(this.releaseFlags_.get('asflags') || '') ;
        let releaseldflags = this.filterLDFlags(this.releaseFlags_.get('ldflags') || '')  + ' -Wl,-Map,${CMAKE_BINARY_DIR}/build-.map -T ${LINKER_SCRIPT}' ;      

        let contents =`
# toolchain-gcc_cortex-m33.cmake
SET(CMAKE_SYSTEM_NAME Generic)
SET(CMAKE_SYSTEM_VERSION 1)

#
# Tell the system the cross compilers work and don't need to be checked
#
set(CMAKE_C_COMPILER_WORKS 1)
set(CMAKE_CXX_COMPILER_WORKS 1)

#
# specify the cross compiler path or just set to empty string if the
# required tools are already in the PATH
#
SET(GCCPATH "C:/mtb/tools/mtbgccpackage/gcc/bin/")

#
# specify the cross compilers
#
SET(CMAKE_C_COMPILER \${GCCPATH}arm-none-eabi-gcc.exe)
SET(CMAKE_CXX_COMPILER \${GCCPATH}arm-none-eabi-g++.exe)
SET(CMAKE_ASM_COMPILER \${GCCPATH}arm-none-eabi-gcc.exe)
set(CMAKE_OBJCOPY \${GCCPATH}arm-none-eabi-objcopy)
set(CMAKE_SIZE \${GCCPATH}arm-none-eabi-size)

# Compiler flags for C
set(CMAKE_C_FLAGS_DEBUG_INIT "${debugcflags}")
set(CMAKE_C_FLAGS_RELEASE_INIT "${releasecflags}")

# Compiler flags for C++
set(CMAKE_CXX_FLAGS_DEBUG_INIT "${debugcxxflags}")
set(CMAKE_CXX_FLAGS_RELEASE_INIT "${releasecxxflags}")

# Compiler flags for ASM
set(CMAKE_ASM_FLAGS_DEBUG_INIT "${debugasflags}")
set(CMAKE_ASM_FLAGS_RELEASE_INIT "${releaseasflags}")

# specify the flags for the Cortex-M33
set(CMAKE_EXE_LINKER_FLAGS_DEBUG_INIT "${debugldflags}")
set(CMAKE_EXE_LINKER_FLAGS_RELEASE_INIT "${releaseldflags}")
    ` ;

        const p = path.join(this.env_!.appInfo!.appdir, this.toolchainFile_) ;
        fs.writeFileSync(p, contents) ;
    }

    private normalizePathForCMake(p: string) : string {
        let ret = p.replace(/\\/g, '/') ;
        return ret ;
    }

    private addDefines(contents: string[]) : void {
        // Find common defines between debug and release
        const debugDefines = new Set(this.debugIncludesDefines_.cCommonDefines_);
        const releaseDefines = new Set(this.releaseIncludesDefines_.cCommonDefines_);
        const commonDefines: string[] = [];
        const debugOnlyDefines: string[] = [];
        const releaseOnlyDefines: string[] = [];

        // Find common defines
        for (const def of debugDefines) {
            if (releaseDefines.has(def)) {
                commonDefines.push(def);
            } else {
                debugOnlyDefines.push(def);
            }
        }

        // Find release-only defines
        for (const def of releaseDefines) {
            if (!debugDefines.has(def)) {
                releaseOnlyDefines.push(def);
            }
        }

        // Add common defines
        if (commonDefines.length > 0) {
            contents.push('# Preprocessor definitions (common to both Debug and Release)') ;
            contents.push('add_compile_definitions(') ;
            for (let def of commonDefines) {
                contents.push(`    ${def}`) ;
            }
            contents.push(')') ;
            contents.push('') ;
        }

        // Add debug-specific defines
        if (debugOnlyDefines.length > 0) {
            contents.push('# Debug-specific preprocessor definitions') ;
            contents.push('add_compile_definitions(') ;
            for (let def of debugOnlyDefines) {
                contents.push(`    $<$<CONFIG:Debug>:${def}>`) ;
            }
            contents.push(')') ;
            contents.push('') ;
        }

        // Add release-specific defines
        if (releaseOnlyDefines.length > 0) {
            contents.push('# Release-specific preprocessor definitions') ;
            contents.push('add_compile_definitions(') ;
            for (let def of releaseOnlyDefines) {
                contents.push(`    $<$<CONFIG:Release>:${def}>`) ;
            }
            contents.push(')') ;
            contents.push('') ;
        }
    }

    private addIncludes(contents: string[]) : void {
        // Find common includes between debug and release
        const debugIncludes = new Set(this.debugIncludesDefines_.cCommonIncludes_);
        const releaseIncludes = new Set(this.releaseIncludesDefines_.cCommonIncludes_);
        const commonIncludes: string[] = [];
        const debugOnlyIncludes: string[] = [];
        const releaseOnlyIncludes: string[] = [];

        // Find common includes
        for (const inc of debugIncludes) {
            if (releaseIncludes.has(inc)) {
                commonIncludes.push(inc);
            } else {
                debugOnlyIncludes.push(inc);
            }
        }

        // Find release-only includes
        for (const inc of releaseIncludes) {
            if (!debugIncludes.has(inc)) {
                releaseOnlyIncludes.push(inc);
            }
        }

        // Add common includes
        if (commonIncludes.length > 0) {
            contents.push('# Include directories (common to both Debug and Release)') ;
            contents.push('include_directories(') ;
            for (let inc of commonIncludes) {
                contents.push(`    ${this.normalizePathForCMake(inc)}`) ;
            }
            contents.push(')') ;
            contents.push('') ;
        }

        // Add debug-specific includes
        if (debugOnlyIncludes.length > 0) {
            contents.push('# Debug-specific include directories') ;
            contents.push('include_directories($<$<CONFIG:Debug>:') ;
            for (let inc of debugOnlyIncludes) {
                contents.push(`    ${this.normalizePathForCMake(inc)}`) ;
            }
            contents.push('>)') ;
            contents.push('') ;
        }

        // Add release-specific includes
        if (releaseOnlyIncludes.length > 0) {
            contents.push('# Release-specific include directories') ;
            contents.push('include_directories($<$<CONFIG:Release>:') ;
            for (let inc of releaseOnlyIncludes) {
                contents.push(`    ${this.normalizePathForCMake(inc)}`) ;
            }
            contents.push('>)') ;
            contents.push('') ;
        }
    }

    private addSources(contents: string[]) : void {
        contents.push('# Source files') ;
        contents.push('set(PROJECT_SOURCES') ;
        for (let srcfile of this.debugIncludesDefines_.sourceFiles_) {
            contents.push(`    ${this.normalizePathForCMake(srcfile)}`) ;
        }
        contents.push(')') ;
        contents.push('') ;
    }

    private writeCMakeListsFile() : void {
        let tchain = this.settings_.settingByName('toolchain')! ;
        let name = 'linker_s_flash.ld' ;
        let ldscript = path.join('${CMAKE_SOURCE_DIR}', 'bsps', 'TARGET_' + this.bspName!, 'TOOLCHAIN_'+ tchain.value! as string, name) ;
        let appname = this.env_!.appInfo!.appName || 'MyApp' ;

        let contents: string[] = [] ;
        contents.push(`# CMakeLists.txt generated by ModusToolbox Assistant for VS Code`) ;
        contents.push(`cmake_minimum_required(VERSION 3.20)`) ;
        contents.push('') ;
        contents.push(`# Set the linker script - used by the toolchain file`) ;
        contents.push(`set(LINKER_SCRIPT "${this.normalizePathForCMake(ldscript)}")`) ;
        contents.push('') ;
        contents.push(`# Set the project name`) ;
        contents.push(`project(${appname} C CXX ASM)`) ;
        contents.push('') ;

        this.addDefines(contents) ;
        this.addIncludes(contents) ;
        this.addSources(contents) ;

        contents.push(`# Create executable`) ;
        contents.push(`add_executable(\${PROJECT_NAME}.elf \${PROJECT_SOURCES})`) ;

        contents.push(`# Post-build commands to generate additional output files`) ;
        contents.push(`add_custom_command(TARGET \${PROJECT_NAME}.elf POST_BUILD`) ;
        contents.push(`    COMMAND \${CMAKE_OBJCOPY} -O ihex $<TARGET_FILE:\${PROJECT_NAME}.elf> \${CMAKE_BINARY_DIR}/\${PROJECT_NAME}.hex`) ;
        contents.push(`    COMMAND \${CMAKE_OBJCOPY} -O binary $<TARGET_FILE:\${PROJECT_NAME}.elf> \${CMAKE_BINARY_DIR}/\${PROJECT_NAME}.bin`) ;
        contents.push(`    COMMAND \${CMAKE_SIZE} $<TARGET_FILE:\${PROJECT_NAME}.elf>`) ;
        contents.push(`    COMMENT "Generating HEX and BIN files, and printing size information"`) ;
        contents.push(`)`) ;

        let cmakefile = path.join(this.env_!.appInfo!.appdir, 'CMakeLists.txt') ;
        fs.writeFileSync(cmakefile, contents.join('\n')) ;
    }
}
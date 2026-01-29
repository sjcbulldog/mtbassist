import { ModusToolboxEnvironment } from "../mtbenv";
import { MTBRunCommandOptions } from "../mtbenv/mtbenv/mtbenv";
import * as path from 'path';
import * as fs from 'fs';
import * as winston from 'winston';
import { MTBSettings } from "./mtbsettings";
import { MTBUtils } from "../mtbenv/misc/mtbutils";

interface CompileCommand {
    command: string;
    directory: string;
    file: string;
}

export class CMakeBuildSupport {
    private env_ : ModusToolboxEnvironment ;
    private settings_ : MTBSettings ;
    private logger_ : winston.Logger;
    private toolsdir_? : string ;
    private modusShellDir_? : string ;
    private sourceFiles_ : Set<string> = new Set();
    private flags_ : Map<string, string> = new Map();
    private toolchainFile_ : string ;
    
    // Common includes and defines across all files of each type
    private cCommonIncludes_ : string[] = [];
    private cCommonDefines_ : string[] = [];
    private asmCommonIncludes_ : string[] = [];
    private asmCommonDefines_ : string[] = [];
    private cppCommonIncludes_ : string[] = [];
    private cppCommonDefines_ : string[] = [];
    
    // File-specific includes and defines
    private fileIncludes_ : Map<string, string[]> = new Map();
    private fileDefines_ : Map<string, string[]> = new Map();

    public constructor(env: ModusToolboxEnvironment, settings: MTBSettings, logger: winston.Logger) {
        this.env_ = env ;
        this.settings_ = settings ;
        this.logger_ = logger;

        this.toolchainFile_ = 'arm-cortex-m33.cmake' ;

        this.toolsdir_ = this.env_.toolsDir! ;
        if (!this.setupModusShell()) {
            this.logger_.warn(`CMakeBuildSupport: cannot find 'modus-shell' in the tools directory '${this.toolsdir_}'`) ;
        }
    }

    public async createCMakeFileForCurrentProject() {

        this.logger_.info('CMakeBuildSupport: generating CMake files for current project...') ; 
        this.logger_.info('                   running "make codegen"') ;
        try {
            await this.runCodeGen() ;
        }
        catch(err) {
            this.logger_.warn(`CMakeBuildSupport: failed to run codegen: ${err}`) ;
            return ;
        }

        this.logger_.info('                   reading "compile_commands.json"') ;
        this.readCompileCommands() ;

        this.logger_.info('                   reading build flags') ;
        if (!this.readFlags()) {
            this.logger_.warn('CMakeBuildSupport: failed to read flags from build directory') ;
            return ;
        }

        this.logger_.info('                   writing toolchain file') ;
        this.writeToolchainFile() ;
        this.logger_.info('                   writing CMakeLists.txt file') ;
        this.writeCMakeListsFile() ;
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
    private async runCodeGen(): Promise<void> {
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

            // Determine the make command based on the platform
            const setting = this.settings_.settingByName('configuration') ;
            const args = ['codegen', `CONFIG=${setting?.value || 'Debug'}`];

            const options: MTBRunCommandOptions = {
                cwd: projectDir,
                toolchainCmdLine: true
            };

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
    private async readCompileCommands(): Promise<void> {
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
            this.sourceFiles_.clear();
            this.fileIncludes_.clear();
            this.fileDefines_.clear();

            // Data structures to compute common includes/defines
            const cFiles: Map<string, {includes: string[], defines: string[]}> = new Map();
            const asmFiles: Map<string, {includes: string[], defines: string[]}> = new Map();
            const cppFiles: Map<string, {includes: string[], defines: string[]}> = new Map();

            // Extract and store all source file paths and their includes/defines
            for (const cmd of compileCommands) {
                if (cmd.file) {
                    // Normalize the file path and add to the set
                    const normalizedPath = path.normalize(cmd.file);
                    this.sourceFiles_.add(normalizedPath);

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
            this.computeCommonAndFileSpecific(cFiles, this.cCommonIncludes_, this.cCommonDefines_);
            this.computeCommonAndFileSpecific(asmFiles, this.asmCommonIncludes_, this.asmCommonDefines_);
            this.computeCommonAndFileSpecific(cppFiles, this.cppCommonIncludes_, this.cppCommonDefines_);

        } catch (err) {
            throw new Error(`Failed to read or parse compile_commands.json: ${err}`);
        }
    }

    /**
     * Read compiler and linker flag files from the build directory.
     * Reads the first line of each flag file and stores it in the flags map.
     * Flag files are located in build/BSPNAME/CONFIG directory.
     */
    private readFlags(): boolean { 
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
        
        const setting = this.settings_.settingByName('configuration');
        const config = setting?.value || 'Debug';
        
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
        this.flags_.clear();

        // Read each flag file
        for (const flagFile of flagFiles) {
            const flagFilePath = path.join(flagsDir, flagFile);
            
            if (fs.existsSync(flagFilePath)) {
                try {
                    const fileContent = fs.readFileSync(flagFilePath, 'utf-8');
                    const firstLine = fileContent.split('\n')[0].trim();
                    
                    // Store in map without the leading period
                    const keyName = flagFile.substring(1); // Remove the leading '.'
                    this.flags_.set(keyName, firstLine);
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
        commonDefines: string[]
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
                this.fileIncludes_.set(filePath, specificIncludes);
            }
            
            if (specificDefines.length > 0) {
                this.fileDefines_.set(filePath, specificDefines);
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
        let cflags = this.filterCompileFlags(this.flags_.get('cflags') || '') ;
        let cxxflags = this.filterCompileFlags(this.flags_.get('cxxflags') || '') ;
        let asflags = this.filterCompileFlags(this.flags_.get('asflags') || '') ;
        let ldflags = this.filterLDFlags(this.flags_.get('ldflags') || '')  + ' -Wl,-Map,${CMAKE_BINARY_DIR}/build.map -T ${LINKER_SCRIPT}' ;
        

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
set(MTBSHELL "C:/users/butch/ModusToolbox/tools_3.7/modus-shell/bin/")

#
# specify the cross compilers
#
SET(CMAKE_C_COMPILER \${GCCPATH}arm-none-eabi-gcc.exe)
SET(CMAKE_CXX_COMPILER \${GCCPATH}arm-none-eabi-g++.exe)
SET(CMAKE_ASM_COMPILER \${GCCPATH}arm-none-eabi-gcc.exe)
set(CMAKE_OBJCOPY \${GCCPATH}arm-none-eabi-objcopy)
set(CMAKE_SIZE \${GCCPATH}arm-none-eabi-size)
SET(CMAKE_MAKE_PROGRAM \${MTBSHELL}make.exe)

# where is the target environment ?
SET(CMAKE_FIND_ROOT_PATH "/path/to/your/arm/toolchain/install/folder")
SET(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM ONLY)
SET(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
SET(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)

# CPU and FPU settings
set(CPU_FLAGS "${cflags}")
set(FPU_FLAGS "-mfloat-abi=soft")

# Compiler flags for C
set(CMAKE_C_FLAGS "${cflags}")

# Compiler flags for C++
set(CMAKE_CXX_FLAGS "${cxxflags}")

# Compiler flags for ASM
set(CMAKE_ASM_FLAGS "${asflags}")

# specify the flags for the Cortex-M33
set(CMAKE_EXE_LINKER_FLAGS "${ldflags}")
    ` ;

        const p = path.join(this.env_!.appInfo!.appdir, this.toolchainFile_) ;
        fs.writeFileSync(p, contents) ;
    }

    private normalizePathForCMake(p: string) : string {
        let ret = p.replace(/\\/g, '/') ;
        return ret ;
    }

    private addDefines(contents: string[]) : void {
        contents.push('# Preprocessor definitions') ;
        contents.push('add_compile_definitions(') ;
        for (let def of this.cCommonDefines_) {
            contents.push(`    ${def}`) ;
        }
        contents.push(')') ;
        contents.push('') ;
    }

    private addIncludes(contents: string[]) : void {
        contents.push('# Include directories') ;
        contents.push('include_directories(') ;
        for (let inc of this.cCommonIncludes_) {
            contents.push(`    ${this.normalizePathForCMake(inc)}`) ;
        }
        contents.push(')') ;
        contents.push('') ;
    }

    private addSources(contents: string[]) : void {
        contents.push('# Source files') ;
        contents.push('set(PROJECT_SOURCES') ;
        for (let srcfile of this.sourceFiles_) {
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
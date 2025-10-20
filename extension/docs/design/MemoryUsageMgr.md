# MemoryUsageMgr Design Document

## Overview

The `MemoryUsageMgr` class is responsible for analyzing and reporting memory usage information for ModusToolbox applications. It combines data from multiple sources to provide a comprehensive view of how physical memory is being utilized by compiled applications, including both overall memory consumption and detailed breakdowns by user-defined regions.

## Architecture

### Core Components

The memory usage analysis system consists of several interconnected components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MemoryMap     │    │  DesignModus    │    │ ELF File Parser │
│   (memmap.ts)   │    │  (dmodus.ts)    │    │   (readelf)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                         ┌─────────────────┐
                         │ MemoryUsageMgr  │
                         │  (memusage.ts)  │
                         └─────────────────┘
                                 │
                         ┌─────────────────┐
                         │   Frontend UI   │
                         │  (Component)    │
                         └─────────────────┘
```

### Data Flow

1. **ELF Analysis**: Parse compiled ELF files using `arm-none-eabi-readelf`
2. **Memory Map Loading**: Extract device memory layout from compressed device database
3. **Region Definition**: Load user-defined memory regions from `design.modus`
4. **Segment Mapping**: Map ELF segments to physical memory views and regions
5. **Usage Calculation**: Compute percentages and generate hierarchical usage data

## Key Classes and Interfaces

### MemoryUsageMgr

The main orchestrator class that coordinates memory analysis.

#### Key Responsibilities:
- Coordinate data collection from multiple sources
- Parse ELF files to extract memory segments
- Map segments to physical memory regions
- Calculate memory usage percentages
- Generate hierarchical usage reports

#### Key Methods:

##### `updateMemoryInfo(): Promise<boolean>`
Main entry point that orchestrates the entire memory analysis process:
1. Validates prerequisites (device DB, environment, GCC tools)
2. Loads memory map from device database
3. Extracts segments from all project ELF files
4. Loads design.modus configuration
5. Computes memory usage and percentages

##### `getSegmentsFromProjects(): Promise<boolean>`
Processes all projects in the application:
- Locates ELF files in `build/last_config/` directories
- Executes `arm-none-eabi-readelf -l` to extract program headers
- Parses segment information (virtual/physical addresses, sizes, flags)
- Extracts section-to-segment mappings

##### `computeMemoryUsage(): void`
Core algorithm that:
1. Maps project segments to memory views using address matching
2. Creates hierarchical structure (Physical Memory → Regions → Segments)
3. Calculates usage percentages using geometric merging to handle overlaps
4. Generates final `PhysicalMemoryUsageData[]` structure

### MemoryMap

Handles device-specific memory layout information.

#### Key Responsibilities:
- Load and decrypt compressed memory map files (`memories.cydata`)
- Parse XML-based memory definitions
- Provide memory view mappings for different CPU cores
- Link physical memories to addressable views

#### Key Data Structures:

##### `PhysicalMemory`
Represents a physical memory device (SRAM, Flash, etc.):
```typescript
interface PhysicalMemory {
    description: string;        // Technical description
    displayName: string;        // User-friendly name
    memoryId: string;          // Unique identifier
    size: number;              // Total memory size in bytes
    capabilities: string[];     // Memory capabilities (R/W/X)
    views: View[];             // Address views for this memory
}
```

##### `View`
Represents an addressable view of physical memory:
```typescript
interface View {
    address: number;           // Base address in memory map
    mapId: string;            // View identifier
    memoryId: string;         // Associated physical memory
    offset: number;           // Offset within physical memory
    size: number;             // Size of this view
    memory?: PhysicalMemory;  // Back-reference to physical memory
}
```

### DesignModus

Parses user-defined memory region configurations from `design.modus` files.

#### Key Responsibilities:
- Load and parse design.modus XML files
- Extract memory region definitions created by users
- Provide region metadata (descriptions, offsets, sizes)

#### Region Structure:
```typescript
class Region {
    description: string;       // User-friendly region name
    domain: string;           // Memory domain
    memoryId: string;         // Associated physical memory ID
    offset: number;           // Region start offset
    size: number;             // Region size in bytes
    regionId: string;         // Unique region identifier
}
```

### Memory Segment Processing

#### MemorySegment (Internal Class)
Represents a single segment from an ELF file:
```typescript
class MemorySegment {
    project: string;          // Source project name
    offset: number;           // File offset
    virtaddr: number;         // Virtual address
    physaddr: number;         // Physical address
    filesize: number;         // Size in file
    memsize: number;          // Size in memory
    flags: string;            // Segment flags (R/W/X)
    sections: string[];       // ELF sections in this segment
    views: ViewMatch[];       // Matched memory views
}
```

#### ViewMatch
Links segments to memory views with type classification:
```typescript
interface ViewMatch {
    view: View;
    type: 'virtual' | 'physical' | 'virtual/physical';
}
```

## Data Processing Pipeline

### 1. ELF File Analysis

For each project in the application:

1. **Locate ELF File**: `{project}/build/last_config/{project}.elf`
2. **Extract Program Headers**: Execute `arm-none-eabi-readelf -l`
3. **Parse Segments**: Extract LOAD segments with addresses and sizes
4. **Map Sections**: Associate ELF sections with segments

#### Sample readelf Output Processing:
```
Program Headers:
  Type           Offset   VirtAddr   PhysAddr   FileSiz MemSiz  Flg Align
  LOAD           0x000000 0x08000000 0x08000000 0x12340 0x12340 R E 0x1000
  LOAD           0x012340 0x20000000 0x08012340 0x01000 0x02000 RW  0x1000
```

### 2. Memory View Mapping

For each segment:

1. **Find Matching Views**: Check if segment addresses fall within view ranges
2. **Classify Segment Type**:
   - `virtual`: Only virtual address matches view
   - `physical`: Only physical address matches view  
   - `virtual/physical`: Both addresses match (common for ROM)
3. **Calculate Offsets**: Compute relative positions within views

### 3. Region Assignment

For each segment with matched views:

1. **Check Region Boundaries**: Determine if segment falls within user-defined regions
2. **Create Usage Segments**: Generate `MemoryUsageSegment` objects
3. **Assign to Regions**: Add segments to appropriate region containers

### 4. Percentage Calculation

Uses geometric processing to handle overlapping segments:

1. **Geometric Merging**: Combine overlapping segments using `GeomElement` class
2. **Region Usage**: Calculate `(used_bytes / region_size) * 100`
3. **Physical Memory Usage**: Sum all region areas within each physical memory
4. **Handle Overlaps**: Ensure segments aren't double-counted across regions

#### Example Calculation:
```typescript
// For a region with overlapping segments:
// Segment A: 0x20000000-0x20001000 (4KB)
// Segment B: 0x20000800-0x20001800 (4KB)
// After geometric merge: 0x20000000-0x20001800 (6KB total)
// Region size: 32KB
// Usage percentage: (6KB / 32KB) * 100 = 18.75%
```

## Output Data Structure

The final output is a hierarchical structure suitable for UI display:

### PhysicalMemoryUsageData
Top-level physical memory information:
```typescript
interface PhysicalMemoryUsageData {
    name: string;              // Display name (e.g., "SRAM", "Flash")
    id: string;                // Unique memory identifier
    size: number;              // Total memory size
    percent: number;           // Overall usage percentage
    regions: MemoryRegion[];   // User-defined regions
}
```

### MemoryRegion
User-defined memory regions within physical memory:
```typescript
interface MemoryRegion {
    name: string;              // Region description
    percent: number;           // Region usage percentage
    memoryId: string;          // Parent memory identifier
    offset: number;            // Start offset in memory
    size: number;              // Region size
    segments: MemoryUsageSegment[]; // ELF segments in region
}
```

### MemoryUsageSegment
Individual ELF segments within regions:
```typescript
interface MemoryUsageSegment {
    start: number;             // Segment start address
    msize: number;             // Memory size
    fsize: number;             // File size
    type: 'virtual' | 'physical' | 'virtual/physical' | 'unused';
}
```

## Error Handling and Edge Cases

### Missing Dependencies
- **No GCC Tools**: Returns `false`, clears usage data
- **No Device Database**: Cannot load memory maps, disables feature
- **Missing ELF Files**: Logs warnings, continues with available projects

### Data Validation
- **Invalid Addresses**: Segments with unparseable addresses are skipped
- **Missing Memory Maps**: Feature disabled gracefully
- **Corrupt XML**: Parsing errors logged, defaults to empty structures

### Memory Overlap Handling
- **Geometric Merging**: Uses `GeomElement` class to merge overlapping segments
- **Cross-Region Overlaps**: Segments can span multiple regions
- **Double-Counting Prevention**: Careful offset calculations prevent inflation

## Performance Considerations

### Caching Strategy
- **Memory Maps**: Loaded once per device type, cached for session
- **ELF Parsing**: Re-parsed only when build artifacts change
- **Design.modus**: Loaded once per configuration

### Optimization Opportunities
- **Incremental Updates**: Could track file modification times
- **Parallel Processing**: ELF parsing could be parallelized per project
- **Result Caching**: Could cache computed usage until next build

## Integration Points

### Frontend Communication
Data is serialized and sent to the frontend via the `'memory-data'` message type, where it's consumed by the Angular memory usage component for hierarchical display.

### Build System Integration
The manager is triggered after successful builds to ensure usage data reflects the latest compiled state.

### VSCode Extension Lifecycle
- **Initialization**: Triggered when workspace loads
- **Build Events**: Updates after successful project builds
- **Configuration Changes**: Refreshes when device or project settings change

## Dependencies

### External Tools
- **arm-none-eabi-readelf**: GCC toolchain component for ELF analysis
- **xml2js**: Node.js library for XML parsing
- **zlib**: Node.js compression library for device database decryption

### Internal Dependencies
- **DeviceDBManager**: Device database access
- **ModusToolboxEnvironment**: Project and tool configuration
- **GeomElement**: Geometric operations for segment merging
- **MTBAssistObject**: Main extension object providing logging and services

## Future Enhancements

### Potential Improvements
1. **Real-time Updates**: Watch for build completion events
2. **Historical Tracking**: Track memory usage trends over time
3. **Optimization Suggestions**: Suggest regions with optimization potential
4. **Export Capabilities**: Generate memory usage reports for documentation
5. **Multi-Configuration Support**: Compare usage across Debug/Release builds
6. **Section-Level Analysis**: Drill down to individual ELF sections
7. **Memory Map Visualization**: Graphical representation of memory layout
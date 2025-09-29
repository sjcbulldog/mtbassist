
# Bootloader

The final step in putting a bootloader in your project is updating the memory map for your application via
the device configurator.  This example walks through creating a bootloader in overwrite mode with the bootloader
in RRAM (internal non-volatile memory) and the application and upgrade slots in external flash.

Start the device configurator follow the step below.

1. Navigate to the Solutions tab in the device configurator and enable the 'Edge Protect Bootloader Solution'
2. Navigate to the Memory tab.
3. Open the RRAM memory
4. Create a region named bootloader_nvm.  This region sould be in the M33S domain and be at least 160K bytes in size.
5. Open the Serial Memory Interface Block 0
6. Update the memory regions to reflect the table below.  If your code for any of the regions exceeds the sizes given below, make the size of that region larger but be sure the assocaited upgrade slot is the same size.
7. Navigate to the Solutions tab again and select the 'Edge Protect Bootloader Solution'
8. For Application 0:
* Set the 'Secondary slot region' to app0slot 1.
* Set the 'Primary Slot Configuration' - 'Primary slot memory' to 'Serial Memory interface block 0'
* Set the 'Primary Slot Configuration' - 'Primary slot offset' to 0x00000000 (offset for m33s_nvm below)
* Set the 'Primary Slot Configuration' - 'Primary slot size' to 0x00100000 (size for m33s_nvm below)
9. For Application 1: 
* Set the 'Secondary slot region' to app1slot 1.
* Set the 'Primary Slot Configuration' - 'Primary slot memory' to 'Serial Memory interface block 0'
* Set the 'Primary Slot Configuration' - 'Primary slot offset' to 0x00140000 (offset for m33s_nvm below)
* Set the 'Primary Slot Configuration' - 'Primary slot size' to 0x00100000 (size for m33s_nvm below)

10. For Application 2:
* Set the 'Secondary slot region' to app2slot 1.
* Set the 'Primary Slot Configuration' - 'Primary slot memory' to 'Serial Memory interface block 0'
* Set the 'Primary Slot Configuration' - 'Primary slot offset' to 0x00280000 (offset for m33s_nvm below)
* Set the 'Primary Slot Configuration' - 'Primary slot size' to 0x00100000 (size for m33s_nvm below)

11. Save the device configuration and close the device configurator.  
12. If you are using the PSOC Edge EVK, be sure the boot switch is in the off position (which means boot from RRAM).
13. Return to VSCode and press build and then program.
14. You should see the 

| Offset          | Size            | Domain          | Purpose
| ----------      | ----------      | ------          | -------------------------------------
| 0x00000000      | 0x00100000      | M33S            | m33s_nvm
| 0x00100000      | 0x00040000      | M33S            | m33s_trailer
| 0x00140000      | 0x00100000      | M33             | m33_nvm
| 0x00240000      | 0x00040000      | M33             | m33_trailer
| 0x00280000      | 0x00100000      | M55             | m55_nvm
| 0x00380000      | 0x00040000      | M55             | m55_trailer
| 0x003C0000      | 0x00100000      | M33             | app0slot1 (upgrade slot for m33s_nvm)
| 0x004C0000      | 0x00100000      | M33             | app1slot1 (upgrade slot for m33_nvm)
| 0x005C0000      | 0x00100000      | M33             | app2slot1 (upgrade slot for m55_nvm)


If you get a failure referring to the gnustubs, this likely means the 'veneer' file is invalid.  This
file is located in the secure project (usually named proj_m33s) and is named nsc_veneer.o.  This file contains
the information that allows the non-secure project to make calls into the secure project.  This file is maintained
to ensure that secure project maintains the address of the secure gateways in the non-secure callable region.  This
is required to allow independent development of the secure and non-secure projects.

However, if the memory map for the M33 secure project changes, the nsc_veneer.o file will refer to invalid addresses
causing a build failure. If you are updating your memory map, this veneer file can safely be removed is it is no longer
valid.

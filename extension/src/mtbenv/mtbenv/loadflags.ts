
export enum MTBLoadFlags {
    none = 0,
    appInfo = (1 << 1),
    manifestData = (1 << 2),
    packs = (1 << 3),
    tools = (1 << 4),
    deviceDB = (1 << 5),
    reload = (1 << 31)
}


export enum MTBLoadFlags {
    None = 0,
    AppInfo = (1 << 1),
    Manifest = (1 << 2),
    Packs = (1 << 3),
    Tools = (1 << 4),
    DeviceDB = (1 << 5),
    ReloadAppInfo = (1 << 6)
}

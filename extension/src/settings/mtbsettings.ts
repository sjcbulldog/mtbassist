import { MTBSetting } from "../comms";

export class MTBSettings {
    private static readonly defaultSettings : MTBSetting[] = [
        {
            name: 'auto_display_assistant',
            owner: 'extension',
            type: 'boolean',
            value: true,    
            description:  'Automatically Display the ModusToolbox Assistant when VS Code is started.',
        },
        {
            name: 'enabled_eap',
            owner: 'modus',
            type: 'string',
            value: '',
            description: 'The early access pack enabled'
        },
        {
            name: 'git_insteadof',
            owner: 'modus',
            type: 'string',
            value: '',
            description: 'The git_insteadof setting'
        },
        {
            name: 'global_path',
            owner: 'modus',
            type: 'string',
            value: '~/.modustoolbox/global',
            description: 'The global path setting'
        },
        {
            name: 'information_level',
            owner: 'modus',
            type: 'string',
            value: 'low',
            choices: ['low', 'medium', 'high'],
            description: 'The amount of information displayed in ModusToolbox applications'
        },
        {
            name: 'lcs_path',
            owner: 'modus',
            type: 'string',
            value: '~/.modustoolbox/lcs',
            description: 'The path for storing local content when working without an internet connection'
        },
        {
            name: 'manifest_loc_path',
            owner: 'modus',
            type: 'string',
            value: '~/.modustoolbox/manifest.loc',
            description: 'The path a local manifest file that adds additional content into ModusToolbox.'
        },
        {
            name: 'manifestdb_system_url',
            owner: 'modus',
            type: 'uri',
            value: '',
            description: 'The URL for top level super manfest containing ModusToolbox content'
        },
        {
            name: 'operating_mode',
            owner: 'modus',
            type: 'choice',
            value: 'normal',
            choices: ['Online Mode', 'Local Content Mode'],
            description: 'The operating mode of ModusToolbox'
        },
        {
            name: 'toolspath',
            owner: 'modus',
            type: 'dirpath',
            value: '',
            description: 'The path to the tools directory, if empty the tools will be discovered automatically'
        }
    ] ;

    private settings_: MTBSetting[];

    constructor() {
        this.settings_ = [];
    }

    public get settings(): MTBSetting[] {
        return this.settings_;
    }
}
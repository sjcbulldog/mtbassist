import path from "path";
import { expect, test } from "vitest";
import { ModusToolboxEnvironment, MTBLoadFlags } from "../../src";
import winston from "winston";

test('Load Manifests', async () => {
    let logger = winston.createLogger({
        transports: [new winston.transports.Console()]
    })

    let mtbenv = ModusToolboxEnvironment.getInstance(logger, __dirname) ;
    expect(mtbenv).not.toBeNull();
    await mtbenv!.load(MTBLoadFlags.Manifest) ;
    mtbenv!.destroy() ;
});

test('Load Single Core (p6)', async () => {
    let logger = winston.createLogger({
        transports: [new winston.transports.Console()]
    })

    let proj = path.join(__dirname, '..', '..', 'tc', 'p6hello') ;
    let mtbenv = ModusToolboxEnvironment.getInstance(logger, proj) ;
    expect(mtbenv).not.toBeNull();
    await mtbenv!.load(MTBLoadFlags.All, proj) ;
    mtbenv!.destroy() ;
});


test('Load Multi Core (edge)', async () => {
    let logger = winston.createLogger({
        transports: [new winston.transports.Console()]
    })
        
    let proj = path.join(__dirname, '..', '..', 'tc', 'edgehello') ;
    let mtbenv = ModusToolboxEnvironment.getInstance(logger, proj) ;
    expect(mtbenv).not.toBeNull();
    await mtbenv!.load(MTBLoadFlags.All, proj) ;
    mtbenv!.destroy() ;
});
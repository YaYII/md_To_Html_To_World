import from_cn from "../from/cn.js";
import from_hk from "../from/hk.js";
import from_tw from "../from/tw.js";
import from_twp from "../from/twp.js";
import from_jp from "../from/jp.js";
import to_cn from "../to/cn.js";
import to_hk from "../to/hk.js";
import to_tw from "../to/tw.js";
import to_twp from "../to/twp.js";
import to_jp from "../to/jp.js";

const fromDicts = {
    cn: from_cn,
    hk: from_hk,
    tw: from_tw,
    twp: from_twp,
    jp: from_jp
};

const toDicts = {
    cn: to_cn,
    hk: to_hk,
    tw: to_tw,
    twp: to_twp,
    jp: to_jp
};

export {fromDicts as from, toDicts as to};
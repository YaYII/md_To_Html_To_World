import from_hk from "../from/hk.js";
import from_tw from "../from/tw.js";
import from_twp from "../from/twp.js";
import from_jp from "../from/jp.js";
import to_cn from "../to/cn.js";

const fromDicts = {
    hk: from_hk,
    tw: from_tw,
    twp: from_twp,
    jp: from_jp
};

const toDicts = {
    cn: to_cn
};

export {fromDicts as from, toDicts as to};
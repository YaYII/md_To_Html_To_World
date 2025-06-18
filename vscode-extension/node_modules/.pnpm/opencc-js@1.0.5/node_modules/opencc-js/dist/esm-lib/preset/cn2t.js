import from_cn from "../from/cn.js";
import to_hk from "../to/hk.js";
import to_tw from "../to/tw.js";
import to_twp from "../to/twp.js";
import to_jp from "../to/jp.js";

const fromDicts = {
    cn: from_cn
};

const toDicts = {
    hk: to_hk,
    tw: to_tw,
    twp: to_twp,
    jp: to_jp
};

export {fromDicts as from, toDicts as to};
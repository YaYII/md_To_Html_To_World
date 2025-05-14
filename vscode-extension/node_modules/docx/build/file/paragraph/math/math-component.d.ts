import { MathAngledBrackets, MathCurlyBrackets, MathRoundBrackets, MathSquareBrackets } from "./brackets";
import { MathFraction } from "./fraction";
import { MathFunction } from "./function";
import { MathRun } from "./math-run";
import { MathSum, MathIntegral } from "./n-ary";
import { MathRadical } from "./radical";
import { MathSubScript, MathSubSuperScript, MathSuperScript } from "./script";
export type MathComponent = MathRun | MathFraction | MathSum | MathIntegral | MathSuperScript | MathSubScript | MathSubSuperScript | MathRadical | MathFunction | MathRoundBrackets | MathCurlyBrackets | MathAngledBrackets | MathSquareBrackets;
export declare const WORKAROUND4 = "";

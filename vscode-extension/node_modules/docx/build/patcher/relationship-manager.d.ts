import { Element } from "xml-js";
import { RelationshipType, TargetModeType } from '../file/relationships/relationship/relationship';
export declare const getNextRelationshipIndex: (relationships: Element) => number;
export declare const appendRelationship: (relationships: Element, id: number | string, type: RelationshipType, target: string, targetMode?: (typeof TargetModeType)[keyof typeof TargetModeType]) => readonly Element[];

import { XmlComponent } from '../xml-components';
import { Relationship, RelationshipType, TargetModeType } from "./relationship/relationship";
export declare class Relationships extends XmlComponent {
    constructor();
    createRelationship(id: number | string, type: RelationshipType, target: string, targetMode?: (typeof TargetModeType)[keyof typeof TargetModeType]): Relationship;
    get RelationshipCount(): number;
}

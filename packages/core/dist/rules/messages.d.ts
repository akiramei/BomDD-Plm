export interface MessageTemplate {
    message: string;
    fixTarget: string;
}
export interface MessageVars {
    targetId?: string;
    file?: string;
    family?: string;
    ref?: string;
    rule?: string;
    supIndex?: number | string;
}
/** Look up + fill a rule message. Throws if the rule is absent (spec hole => blocker). */
export declare function getMessage(rule: string, vars?: MessageVars): MessageTemplate;
export declare function hasMessage(rule: string): boolean;
export declare function allRuleIds(): string[];
//# sourceMappingURL=messages.d.ts.map
/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/rxjs-tslint-rules
 */
/*tslint:disable:no-use-before-declare*/

import * as Lint from "tslint";
import * as ts from "typescript";
import * as tsutils from "tsutils";
import { couldBeType, isReferenceType } from "../support/util";

export class Rule extends Lint.Rules.TypedRule {

    public static metadata: Lint.IRuleMetadata = {
        description: "Disallows the application of operators after takeUntil.",
        options: null,
        optionsDescription: "Not configurable.",
        requiresTypeInfo: true,
        ruleName: "rxjs-no-unsafe-takeuntil",
        type: "functionality",
        typescriptOnly: true
    };

    public static FAILURE_STRING = "Applying operators after takeUntil is forbidden";

    public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Lint.RuleFailure[] {

        return this.applyWithWalker(new Walker(sourceFile, this.getOptions(), program));
    }
}

class Walker extends Lint.ProgramAwareRuleWalker {

    protected visitCallExpression(node: ts.CallExpression): void {

        const { expression: propertyAccessExpression } = node;
        if (tsutils.isPropertyAccessExpression(propertyAccessExpression)) {

            const { expression: identifier } = propertyAccessExpression;
            if (tsutils.isIdentifier(identifier)) {

                const propertyName = propertyAccessExpression.name.getText();
                const identifierText = identifier.getText();
                const typeChecker = this.getTypeChecker();
                const type = typeChecker.getTypeAtLocation(identifier);

                if (isReferenceType(type) && couldBeType(type.target, "Observable")) {

                    switch (propertyName) {
                    case "takeUntil":
                        this.walkPatchedOperators(node, propertyAccessExpression.name);
                        break;
                    case "pipe":
                        this.walkPipedOperators(node);
                        break;
                    default:
                        break;
                    }
                }
            }
        }

        super.visitCallExpression(node);
    }

    private walkPatchedOperators(node: ts.Node, identifier: ts.Identifier): void {

        let name: ts.Identifier | undefined = undefined;
        for (let parent = node.parent; parent; parent = parent.parent) {
            if (tsutils.isCallExpression(parent)) {
                if (name) {
                    if (name.getText() === "pipe") {
                        this.walkPipedOperators(parent, identifier);
                    } else {
                        const typeChecker = this.getTypeChecker();
                        const type = typeChecker.getTypeAtLocation(parent);
                        if (isReferenceType(type) && couldBeType(type.target, "Observable")) {
                            this.addFailureAtNode(identifier, Rule.FAILURE_STRING);
                            return;
                        }
                    }
                }
            } else if (tsutils.isPropertyAccessExpression(parent)) {
                name = parent.name;
            } else {
                break;
            }
        }
    }

    private walkPipedOperators(node: ts.CallExpression, identifier: ts.Identifier | null = null): void {

        if (identifier) {
            if (node.arguments.length > 0) {
                this.addFailureAtNode(identifier, Rule.FAILURE_STRING);
            }
        } else {
            node.arguments.forEach((arg, index) => {
                if (tsutils.isCallExpression(arg)) {
                    const { expression } = arg;
                    if (tsutils.isIdentifier(expression) && (expression.getText() === "takeUntil")) {
                        if (index < (node.arguments.length - 1)) {
                            this.addFailureAtNode(expression, Rule.FAILURE_STRING);
                        }
                    }
                }
            });
        }
    }
}

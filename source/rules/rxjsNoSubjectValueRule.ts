/**
 * @license Use of this source code is governed by an MIT-style license that
 * can be found in the LICENSE file at https://github.com/cartant/rxjs-tslint-rules
 */
/*tslint:disable:no-use-before-declare*/

import * as Lint from "tslint";
import * as ts from "typescript";

import { couldBeType, isReferenceType } from "../support/util";

export class Rule extends Lint.Rules.TypedRule {

    public static metadata: Lint.IRuleMetadata = {
        description: "Disallows accessing the value property of a BehaviorSubject instance.",
        options: null,
        optionsDescription: "Not configurable.",
        requiresTypeInfo: true,
        ruleName: "rxjs-no-subject-value",
        type: "functionality",
        typescriptOnly: true
    };

    public static FAILURE_STRING = "Accessing the value property of a BehaviorSubject is forbidden";

    public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Lint.RuleFailure[] {

        return this.applyWithWalker(new Walker(sourceFile, this.getOptions(), program));
    }
}

export class Walker extends Lint.ProgramAwareRuleWalker {

    protected visitCallExpression(node: ts.CallExpression): void {

        node.forEachChild((child) => {

            if (child.kind === ts.SyntaxKind.PropertyAccessExpression) {

                const propertyAccessExpression = child as ts.PropertyAccessExpression;
                const name = propertyAccessExpression.name.getText();
                const typeChecker = this.getTypeChecker();
                const type = typeChecker.getTypeAtLocation(propertyAccessExpression.expression);

                if (((name === "value") || (name === "getValue")) && isReferenceType(type) && couldBeType(type.target, "BehaviorSubject")) {
                    this.addFailureAtNode(propertyAccessExpression.name, Rule.FAILURE_STRING);
                }
            }
        });

        super.visitCallExpression(node);
    }
}

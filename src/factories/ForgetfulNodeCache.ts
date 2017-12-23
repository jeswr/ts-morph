﻿/* barrel:ignore */
import * as ts from "typescript";
import {Node} from "./../compiler";
import {KeyValueCache, createHashSet, HashSet} from "./../utils";

/**
 * Extension of KeyValueCache that allows for "forget points."
 */
export class ForgetfulNodeCache extends KeyValueCache<ts.Node, Node> {
    private readonly forgetStack: HashSet<Node>[] = [];

    getOrCreate<TCreate extends Node>(key: ts.Node, createFunc: () => TCreate) {
        return super.getOrCreate(key, () => {
            const node = createFunc();
            if (this.forgetStack.length > 0)
                this.forgetStack[this.forgetStack.length - 1].add(node);
            return node;
        });
    }

    setForgetPoint() {
        this.forgetStack.push(createHashSet());
    }

    forgetLastPoint() {
        const nodes = this.forgetStack.pop();
        if (nodes != null)
            this.forgetNodes(nodes.values());
    }

    rememberNode(node: Node) {
        let wasInForgetStack = false;
        for (const stackItem of this.forgetStack) {
            if (stackItem.delete(node)) {
                wasInForgetStack = true;
                break;
            }
        }

        if (wasInForgetStack)
            this.rememberParentOfNode(node);

        return wasInForgetStack;
    }

    private rememberParentOfNode(node: Node) {
        const parent = node.getParentSyntaxList() || node.getParent();
        if (parent != null)
            this.rememberNode(parent);
    }

    private forgetNodes(nodes: IterableIterator<Node>) {
        for (const node of nodes) {
            if (node.getKind() === ts.SyntaxKind.SourceFile)
                continue;
            node.forgetOnlyThis();
        }
    }
}
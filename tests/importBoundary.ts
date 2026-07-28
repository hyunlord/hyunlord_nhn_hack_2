import {
  createScanner,
  SyntaxKind,
} from "typescript/unstable/ast";

interface Token {
  readonly kind: number;
  readonly value: string;
}

type BoundaryNode =
  | { readonly kind: "import"; readonly moduleSpecifier: string }
  | { readonly kind: "export"; readonly moduleSpecifier: string }
  | { readonly kind: "importEquals"; readonly moduleSpecifier: string }
  | { readonly kind: "dynamicImport"; readonly moduleSpecifier: string }
  | { readonly kind: "requireCall"; readonly moduleSpecifier: string };

function isForbiddenRenderModule(moduleSpecifier: string): boolean {
  return (
    moduleSpecifier.includes("../render") ||
    moduleSpecifier.includes("src/render") ||
    /(?:^|\/)render\/(?:combatTransient|transientShake|waveBannerText|gameCanvasFrame)/.test(
      moduleSpecifier,
    )
  );
}

function tokensFor(sourceText: string): Token[] {
  const scanner = createScanner(true, undefined, sourceText);
  const tokens: Token[] = [];
  for (
    let kind = scanner.scan();
    kind !== SyntaxKind.EndOfFile;
    kind = scanner.scan()
  ) {
    tokens.push({ kind, value: scanner.getTokenValue() });
  }
  return tokens;
}

function literalAt(tokens: readonly Token[], index: number): string | null {
  const token = tokens[index];
  return token?.kind === SyntaxKind.StringLiteral ||
    token?.kind === SyntaxKind.NoSubstitutionTemplateLiteral
    ? token.value
    : null;
}

function collectStaticModule(
  nodes: BoundaryNode[],
  kind: "import" | "export" | "importEquals",
  tokens: readonly Token[],
  start: number,
): void {
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token?.kind === SyntaxKind.SemicolonToken) {
      return;
    }
    if (token?.kind === SyntaxKind.FromKeyword) {
      const moduleSpecifier = literalAt(tokens, index + 1);
      if (moduleSpecifier !== null) {
        nodes.push({ kind, moduleSpecifier });
      }
    }
    if (token?.kind === SyntaxKind.RequireKeyword) {
      const moduleSpecifier = literalAt(tokens, index + 2);
      if (moduleSpecifier !== null) {
        nodes.push({ kind: "importEquals", moduleSpecifier });
      }
    }
  }
}

function statementStartsWithImport(
  tokens: readonly Token[],
  currentIndex: number,
): boolean {
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token?.kind === SyntaxKind.SemicolonToken) {
      return false;
    }
    if (token?.kind === SyntaxKind.ImportKeyword) {
      return true;
    }
  }
  return false;
}

function parseBoundaryAst(sourceText: string): BoundaryNode[] {
  const tokens = tokensFor(sourceText);
  const nodes: BoundaryNode[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const nextNextModule = literalAt(tokens, index + 2);
    if (token?.kind === SyntaxKind.ImportKeyword) {
      if (next?.kind === SyntaxKind.OpenParenToken && nextNextModule !== null) {
        nodes.push({
          kind: "dynamicImport",
          moduleSpecifier: nextNextModule,
        });
      } else {
        const sideEffectModule = literalAt(tokens, index + 1);
        if (sideEffectModule !== null) {
          nodes.push({ kind: "import", moduleSpecifier: sideEffectModule });
        } else {
          collectStaticModule(nodes, "import", tokens, index + 1);
        }
      }
    }
    if (token?.kind === SyntaxKind.ExportKeyword) {
      collectStaticModule(nodes, "export", tokens, index + 1);
    }
    if (
      token?.kind === SyntaxKind.RequireKeyword &&
      !statementStartsWithImport(tokens, index) &&
      nextNextModule !== null
    ) {
      nodes.push({ kind: "requireCall", moduleSpecifier: nextNextModule });
    }
  }
  return nodes;
}

export function forbiddenRenderImports(sourceText: string): string[] {
  return parseBoundaryAst(sourceText)
    .map(({ moduleSpecifier }) => moduleSpecifier)
    .filter(isForbiddenRenderModule);
}

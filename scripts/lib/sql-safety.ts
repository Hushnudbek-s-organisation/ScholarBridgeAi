import ts from "typescript";
/** AST guard: Drizzle tagged SQL binds values; raw SQL strings do not. */
export function unsafeSql(source:string):boolean{
  const file=ts.createSourceFile("route.ts",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const beginsSql=(text:string)=>/^\s*(SELECT|UPDATE|INSERT|DELETE)\b/i.test(text);
  let unsafe=false;
  const visit=(node:ts.Node)=>{
    if(ts.isCallExpression(node)&&node.expression.getText(file)==="sql.raw")unsafe=true;
    if(ts.isTemplateExpression(node)&&beginsSql(node.head.text)&&!(ts.isTaggedTemplateExpression(node.parent)&&node.parent.tag.getText(file)==="sql"))unsafe=true;
    if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken&&(ts.isStringLiteral(node.left)||ts.isNoSubstitutionTemplateLiteral(node.left))&&beginsSql(node.left.text))unsafe=true;
    ts.forEachChild(node,visit);
  };visit(file);return unsafe;
}

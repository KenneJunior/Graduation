module.exports = function transformer(file, api) {
  const j = api.jscodeshift;

  const passiveEvents = new Set([
    'touchstart',
    'touchend',
    'touchmove',
    'wheel',
    'scroll'
  ]);

  const root = j(file.source);

  root
    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'addEventListener'
        }
      }
    })
    .forEach(path => {
      const args = path.node.arguments;

      // Need event name + handler
      if (args.length < 2) return;

      const eventArg = args[0];

      // Must be string literal
      if (
        eventArg.type !== 'Literal' &&
        eventArg.type !== 'StringLiteral'
      ) {
        return;
      }

      const eventName = eventArg.value;

      // Only target selected events
      if (!passiveEvents.has(eventName)) return;

      // CASE 1:
      // No third argument
      if (args.length === 2) {
        args.push(
          j.objectExpression([
            j.property(
              'init',
              j.identifier('passive'),
              j.booleanLiteral(true)
            )
          ])
        );

        return;
      }

      // CASE 2:
      // Existing object options
      const thirdArg = args[2];

      if (thirdArg.type === 'ObjectExpression') {

        const alreadyHasPassive = thirdArg.properties.some(prop =>
          prop.key &&
          prop.key.name === 'passive'
        );

        if (!alreadyHasPassive) {
          thirdArg.properties.push(
            j.property(
              'init',
              j.identifier('passive'),
              j.booleanLiteral(true)
            )
          );
        }
      }
    });

  return root.toSource({
    quote: 'single',
    trailingComma: true
  });
};

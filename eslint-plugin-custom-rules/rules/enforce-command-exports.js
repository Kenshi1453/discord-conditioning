export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce required exports for command files',
    },
    messages: {
      missingExport: 'File must export "{{ name }}".',
      invalidDataType: '"data" must be either explicitly typed as SlashCommandBuilder or initialized with new SlashCommandBuilder()',
      executeNotAsync: '"execute" must be an async function.',
      executeParamType: '"execute" must have a parameter of type CommandInteraction imported from discord.js.',
      autocompleteNotAsync: '"autocomplete" must be an async function.',
      autocompleteParamType: '"autocomplete" must have a parameter of type AutocompleteInteraction imported from discord.js.',
      typeNotFromDiscordJS: '{{ typeName }} must be imported from discord.js',
      slashCommandBuilderNotImported: 'SlashCommandBuilder must be imported from discord.js',
    },
  },
  create(context) {
    const exports = new Map();
    const importedTypes = new Set();
    let hasDiscordJSImport = false;
    let hasSlashCommandBuilder = false;

    function isSlashCommandBuilder(node) {
      if (!node) return false;
      
      // Check if this is a direct new SlashCommandBuilder()
      if (node.type === 'NewExpression' && 
          node.callee.type === 'Identifier' && 
          (node.callee.name === 'SlashCommandBuilder' || node.callee.name === 'ContextMenuCommandBuilder')) {
        return hasSlashCommandBuilder;
      }
      
      // Check if this is a method chain
      if (node.type === 'CallExpression' && 
          node.callee.type === 'MemberExpression') {
        return isSlashCommandBuilder(node.callee.object);
      }
      
      return false;
    }

    function checkTypeImport(node, typeName) {
      if (!importedTypes.has(typeName)) {
        context.report({
          node,
          messageId: 'typeNotFromDiscordJS',
          data: { typeName },
        });
        return false;
      }
      return true;
    }

    function checkFunction(node, functionNode, typeName) {
      if (!functionNode.async) {
        context.report({ node, messageId: `${typeName}NotAsync` });
      }

      const [param] = functionNode.params;
      if (!param?.typeAnnotation) {
        context.report({ node: functionNode, messageId: `${typeName}ParamType` });
        return;
      }

      const typeAnnotation = param.typeAnnotation.typeAnnotation;
      if (typeAnnotation.type !== 'TSTypeReference') {
        context.report({ node: typeAnnotation, messageId: `${typeName}ParamType` });
        return;
      }

      const expectedType = typeName === 'execute' ? 'CommandInteraction' : 'AutocompleteInteraction';
      if (typeAnnotation.typeName.name !== expectedType) {
        context.report({ node: typeAnnotation, messageId: `${typeName}ParamType` });
        return;
      }

      checkTypeImport(typeAnnotation, expectedType);
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'discord.js') {
          hasDiscordJSImport = true;
          node.specifiers.forEach(specifier => {
            if (specifier.type === 'ImportSpecifier') {
              importedTypes.add(specifier.imported.name);
              if (specifier.imported.name === 'SlashCommandBuilder' || specifier.imported.name === 'ContextMenuCommandBuilder') {
                hasSlashCommandBuilder = true;
              }
            }
          });
        }
      },

      ExportNamedDeclaration(node) {
        if (node.declaration?.type === 'VariableDeclaration') {
          node.declaration.declarations.forEach(declarator => {
            if (declarator.id.type === 'Identifier') {
              exports.set(declarator.id.name, { 
                node: declarator, 
                type: 'variable',
                init: declarator.init 
              });
            }
          });
        } else if (node.declaration?.type === 'FunctionDeclaration') {
          const name = node.declaration.id?.name;
          if (name) exports.set(name, { node: node.declaration, type: 'function' });
        }
      },

      'Program:exit'(programNode) {
        if (!hasDiscordJSImport) {
          context.report({
            node: programNode,
            messageId: 'typeNotFromDiscordJS',
            data: { typeName: 'discord.js types' },
          });
          return;
        }

        // Check required exports
        ['data', 'execute'].forEach(name => {
          if (!exports.has(name)) {
            context.report({ node: programNode, messageId: 'missingExport', data: { name } });
          }
        });

        // Validate 'data' export
        const dataExport = exports.get('data');
        if (dataExport?.type === 'variable') {
          const typeAnnotation = dataExport.node.id.typeAnnotation?.typeAnnotation;
          
          // Check explicit type annotation
          if (typeAnnotation?.type === 'TSTypeReference' && 
              (typeAnnotation.typeName.name === 'SlashCommandBuilder' || typeAnnotation.typeName.name === 'ContextMenuCommandBuilder')) {
            if (!checkTypeImport(typeAnnotation, 'SlashCommandBuilder') && !checkTypeImport(typeAnnotation, 'ContextMenuCommandBuilder')) {
              return;
            }
          } 
          // Check implicit initialization
          else if (!isSlashCommandBuilder(dataExport.init)) {
            if (dataExport.init?.type === 'NewExpression' && 
                (dataExport.init.callee.name === 'SlashCommandBuilder' || dataExport.init.callee.name === 'ContextMenuCommandBuilder') &&
                !hasSlashCommandBuilder) {
              context.report({
                node: dataExport.init.callee,
                messageId: 'slashCommandBuilderNotImported',
              });
            }
            context.report({ node: dataExport.node, messageId: 'invalidDataType' });
          }
        }

        // Validate 'execute' export
        const executeExport = exports.get('execute');
        if (executeExport) {
          const functionNode = executeExport.type === 'function'
            ? executeExport.node
            : executeExport.node.init?.type === 'FunctionExpression' || executeExport.node.init?.type === 'ArrowFunctionExpression'
              ? executeExport.node.init
              : null;

          if (!functionNode || !functionNode.async) {
            context.report({ node: executeExport.node, messageId: 'executeNotAsync' });
          } else {
            checkFunction(executeExport.node, functionNode, 'execute');
          }
        }

        // Validate 'autocomplete' if present
        const autocompleteExport = exports.get('autocomplete');
        if (autocompleteExport) {
          const functionNode = autocompleteExport.type === 'function'
            ? autocompleteExport.node
            : autocompleteExport.node.init?.type === 'FunctionExpression' || autocompleteExport.node.init?.type === 'ArrowFunctionExpression'
              ? autocompleteExport.node.init
              : null;

          if (!functionNode || !functionNode.async) {
            context.report({ node: autocompleteExport.node, messageId: 'autocompleteNotAsync' });
          } else {
            checkFunction(autocompleteExport.node, functionNode, 'autocomplete');
          }
        }
      },
    };
  },
};
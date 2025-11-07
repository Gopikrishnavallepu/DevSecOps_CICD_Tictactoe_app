import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
// Import the components you already have installed
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  // 1. Ignore files
  { ignores: ['dist'] },
  
  // 2. Base recommended JS rules
  js.configs.recommended,
  
  // 3. Main configuration for TypeScript/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
  // Point directly at the tsconfig files that actually include the source.
  // Using the referenced tsconfig (tsconfig.json) can fail with the
  // TypeScript ESLint parser, so list the concrete configs instead.
  parserOptions: { project: ['./tsconfig.app.json', './tsconfig.node.json'] },
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      // Register the plugin with its standard name
      '@typescript-eslint': tsPlugin, 
    },
    
    rules: {
      // Bring in recommended rules from the TS plugin
      ...tsPlugin.configs.recommended.rules,
      
      // Inherit all recommended rules from react-hooks
      ...reactHooks.configs.recommended.rules, 
      
      // CRITICAL FIX: Disable the base rule
      'no-unused-expressions': 'off', 
      
      // CRITICAL FIX: Enable the TypeScript-aware version
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],

      // Existing react-refresh rule
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
];
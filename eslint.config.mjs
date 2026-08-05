import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // 以下规则在存量代码中有大量命中，降级为 warning 以保证 CI 门禁对「新增硬错误」有效，
    // 不因历史债务长期红灯。清理进度见 docs/技术债清单.md，新代码请勿新增这类问题。
    rules: {
      // 类型债：约 320 处 any，逐步补类型
      "@typescript-eslint/no-explicit-any": "warn",
      // 文案里的中英文引号，无功能影响
      "react/no-unescaped-entities": "warn",
      // React 19 编译期规则，命中的是存量写法，运行时正常但需重构
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      // Bootstrap 客户端脚本按需动态加载，暂保留 require
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
]);

export default eslintConfig;

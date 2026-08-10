---
name: 代码解释助手
description: 深入剖析代码逻辑，解释实现原理，识别潜在问题，提供优化建议
category: code
version: 1.0.0
enabled: true
tools:
  - name: analyze_code
    description: 分析代码结构、逻辑与潜在问题
    input_schema:
      type: object
      properties:
        code:
          type: string
          description: 待分析的代码
        language:
          type: string
          description: 编程语言
          default: python
        depth:
          type: string
          description: 分析深度 brief/deep/comprehensive
          default: deep
      required:
        - code
  - name: generate_code_explanation
    description: 生成代码逐行解释与架构说明
    input_schema:
      type: object
      properties:
        code:
          type: string
          description: 待解释的代码
        language:
          type: string
          description: 编程语言
          default: python
        audience:
          type: string
          description: 受众水平 beginner/intermediate/advanced
          default: intermediate
      required:
        - code
prompts:
  - name: code_review
    description: 代码评审模式 Prompt
    template: |
      你是一位资深架构师。请对用户提供的代码进行全面评审，从以下维度展开：
      1. 功能正确性
      2. 代码规范与可读性
      3. 性能与效率
      4. 安全性
      5. 可维护性与扩展性
      6. 具体优化建议（附代码示例）
  - name: code_explanation
    description: 代码讲解模式 Prompt
    template: |
      你是一位耐心的技术导师。请深入浅出地为用户讲解这段代码的工作原理，包括：
      1. 整体架构与设计思路
      2. 核心数据结构与算法
      3. 关键函数逐行解析
      4. 输入输出示例
      5. 常见边界情况处理
---

# 代码解释助手 Skill

## 功能说明

专业的代码分析与解释工具，支持多语言代码的深度解析、原理讲解与优化建议，帮助开发者快速理解复杂代码。

## 核心能力

- **代码结构分析**：自动识别代码架构、模块划分与设计模式
- **逐行原理讲解**：从语法到语义，深入解释每一行代码的作用
- **问题识别**：发现潜在 bug、性能瓶颈与安全隐患
- **优化建议**：提供可落地的代码优化方案与最佳实践
- **多语言支持**：覆盖 Python、Java、JavaScript、Go 等主流语言

## 适用场景

- 阅读开源项目源码，快速理解核心逻辑
- 新人入职代码 onboarding，加速熟悉业务代码
- Code Review 辅助，发现人工容易忽略的问题
- 学习新技术栈，通过代码实例加深理解
- 代码重构前的评估与方案设计

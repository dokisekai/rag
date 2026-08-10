---
name: 技术方案评估
description: 多维度评估技术选型与架构方案，对比优劣，给出决策建议
category: evaluation
version: 1.0.0
enabled: true
tools:
  - name: evaluate_tech_stack
    description: 评估技术栈选型的合理性
    input_schema:
      type: object
      properties:
        tech_stacks:
          type: array
          description: 待评估的技术栈列表
          items:
            type: string
        scenario:
          type: string
          description: 应用场景描述
        criteria:
          type: array
          description: 评估维度
          items:
            type: string
          default:
            - 性能
            - 可扩展性
            - 学习成本
            - 生态成熟度
            - 社区支持
      required:
        - tech_stacks
        - scenario
  - name: architecture_review
    description: 架构方案评审与优化建议
    input_schema:
      type: object
      properties:
        architecture:
          type: string
          description: 架构方案描述
        scale:
          type: string
          description: 系统规模 small/medium/large
          default: medium
        focus:
          type: string
          description: 重点关注 performance/reliability/cost/maintainability
          default: performance
      required:
        - architecture
prompts:
  - name: tech_evaluation
    description: 技术评估模式 Prompt
    template: |
      你是一位资深技术架构师。请基于用户的业务场景和需求，对技术方案进行全面、客观、深入的评估。

      评估框架：
      1. 背景与目标对齐
      2. 方案对比分析（多维度打分）
      3. 优势与风险
      4. 推荐方案与理由
      5. 落地建议与里程碑

      请给出明确的决策建议，避免模棱两可。
  - name: architecture_design
    description: 架构设计模式 Prompt
    template: |
      你是一位资深系统架构师。请根据用户的需求描述，设计一套高可用、可扩展的系统架构方案，包括：
      1. 整体架构图与模块划分
      2. 技术选型与理由
      3. 数据流与核心流程
      4. 高可用与容灾设计
      5. 性能优化策略
      6. 演进路线图
---

# 技术方案评估 Skill

## 功能说明

专业的技术选型与架构评估工具，基于多维度评分模型，对比不同技术方案的优劣，给出客观、可落地的决策建议。

## 核心能力

- **多维度评估**：性能、可扩展性、学习成本、生态成熟度、社区支持等全面打分
- **方案对比**：横向对比多种技术栈，量化差异，辅助决策
- **架构评审**：从可用性、可靠性、可维护性等角度审视架构设计
- **风险识别**：提前发现技术选型中的潜在坑点与风险
- **落地建议**：给出分阶段落地路线图与关键里程碑

## 适用场景

- 新项目技术选型决策（数据库、框架、中间件等）
- 架构方案评审与优化
- 技术债务评估与重构方案设计
- 云原生/微服务转型可行性分析
- 开源组件选型对比

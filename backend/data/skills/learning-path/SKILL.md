---
name: 学习路径规划
description: 根据知识库内容生成系统化学习路径、练习题与掌握度评估
category: other
version: 1.0.0
enabled: true
tools:
  - name: generate_learning_path
    description: 生成系统化学习路径
    input_schema:
      type: object
      properties:
        topic:
          type: string
          description: 学习主题
        level:
          type: string
          description: 当前水平 beginner/intermediate/advanced
          default: beginner
        duration:
          type: string
          description: 预计学习周期
          default: 4周
      required:
        - topic
  - name: generate_quiz
    description: 生成练习题与答案
    input_schema:
      type: object
      properties:
        topic:
          type: string
          description: 题目主题
        count:
          type: integer
          description: 题目数量
          default: 5
        type:
          type: string
          description: 题目类型 choice/essay/mixed
          default: mixed
        difficulty:
          type: string
          description: 难度 easy/medium/hard
          default: medium
      required:
        - topic
prompts:
  - name: tutoring_mode
    description: 导学讲解模式 Prompt
    template: |
      你是一位耐心亲和的技术导师。请用通俗易懂、循序渐进的方式讲解知识，帮助用户建立完整的知识体系。

      讲解原则：
      1. 从基础概念入手，逐步深入
      2. 多用类比和生活化例子
      3. 配合代码示例和图示说明
      4. 适时提问检验理解
      5. 每部分结束后总结要点
  - name: quiz_mode
    description: 测验评估模式 Prompt
    template: |
      你是一位严谨的测评导师。请围绕用户指定的主题，生成一套高质量的练习题，用于检验学习效果。

      题目要求：
      1. 覆盖核心知识点
      2. 难度梯度合理
      3. 题目表述清晰无歧义
      4. 提供详细答案解析
      5. 指出易错点和扩展方向
---

# 学习路径规划 Skill

## 功能说明

基于知识库内容的智能化学习辅助工具，自动生成系统化学习路径、梯度化练习题与个性化掌握度评估，帮助用户高效掌握知识。

## 核心能力

- **学习路径生成**：根据主题和当前水平，定制分阶段学习路线图
- **智能出题**：自动生成选择、简答、编程等多种题型的练习题
- **难度梯度**：从入门到精通，循序渐进的难度设计
- **答案解析**：每道题都配有详细的解析和扩展知识点
- **掌握度评估**：通过答题结果评估学习效果，给出提升建议

## 适用场景

- 新技术栈入门学习，制定学习计划
- 面试前刷题复习，查漏补缺
- 团队技术培训，设计培训课程
- 自学过程中自我检测与提升
- 知识库内容的结构化学习辅助

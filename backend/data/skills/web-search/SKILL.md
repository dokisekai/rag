---
name: 全网实时搜索
description: 调用 Bing 搜索引擎获取最新网页信息，支持智能关键词提炼与相关性过滤
category: knowledge
version: 1.0.0
enabled: true
tools:
  - name: web_search
    description: 全网实时联网搜索，获取最新网页信息
    input_schema:
      type: object
      properties:
        query:
          type: string
          description: 搜索查询
        top_k:
          type: integer
          description: 返回结果数量
          default: 5
      required:
        - query
prompts:
  - name: web_research
    description: 联网调研模式 Prompt
    template: |
      你是一位资深技术研究员。请结合联网搜索结果，对用户的问题进行全面、深入、准确的解答。
      引用来源请标注 [网页 N]。
---

# 全网实时搜索 Skill

## 功能说明

基于 Bing 搜索引擎的实时联网检索能力，支持智能关键词提炼与多维度相关性过滤，为大模型提供最新的全网信息补充。

## 核心能力

- **智能关键词重写**：自动将口语化提问转换为精准搜索引擎关键词
- **多源结果整合**：聚合全网优质技术博客、文档与教程
- **相关性过滤**：自动过滤广告、下载页、字典等低价值内容
- **品牌域名识别**：优先展示权威技术站点内容

## 适用场景

- 查询最新技术动态与版本更新
- 调研开源项目生态与社区反馈
- 获取实时性较强的信息（如版本发布、安全漏洞等）
- 知识库未覆盖的新兴技术领域

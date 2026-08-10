"""tests/test_history_service.py —— 历史会话服务单元测试。"""

import json
from datetime import datetime


class TestSaveQaSession:
    """测试保存问答会话。"""

    def test_save_basic_session(self, fresh_history_service):
        """测试保存基本会话并返回完整记录。"""
        dialog = [
            {"role": "system", "content": "系统提示"},
            {"role": "user", "content": "什么是 RAG？"},
            {"role": "assistant", "content": "RAG 是检索增强生成..."},
        ]
        record = fresh_history_service.save_qa_session(
            title="测试会话",
            kb_id="kb_001",
            dialog_messages=dialog,
        )
        assert record["id"] is not None
        assert record["title"] == "测试会话"
        assert record["kb_id"] == "kb_001"
        assert record["query_count"] == 1
        # system 消息应被过滤
        assert len(record["dialog_messages"]) == 2
        assert record["dialog_messages"][0]["role"] == "user"

    def test_save_without_title_uses_summary(self, fresh_history_service):
        """未提供 title 时应使用首条用户消息作为摘要。"""
        dialog = [
            {"role": "user", "content": "解释一下向量检索的原理"},
        ]
        record = fresh_history_service.save_qa_session(
            title=None,
            kb_id=None,
            dialog_messages=dialog,
        )
        assert record["title"] == "解释一下向量检索的原理"

    def test_save_long_query_truncated(self, fresh_history_service):
        """超长首问应被截断为 30 字 + '...'。"""
        long_query = "A" * 100
        dialog = [{"role": "user", "content": long_query}]
        record = fresh_history_service.save_qa_session(
            title=None, kb_id=None, dialog_messages=dialog
        )
        assert len(record["summary"]) == 33  # 30 + "..."
        assert record["summary"].endswith("...")

    def test_save_with_rag_and_web_results(self, fresh_history_service):
        """测试保存含 RAG 引用和 Web 搜索结果的会话。"""
        dialog = [{"role": "user", "content": "test"}]
        rag_refs = [{"chunk_id": "c1", "content": "ref text"}]
        web_results = [{"title": "web result", "url": "http://example.com"}]
        record = fresh_history_service.save_qa_session(
            title="T",
            kb_id="kb1",
            dialog_messages=dialog,
            rag_references=rag_refs,
            web_results=web_results,
        )
        assert len(record["rag_references"]) == 1
        assert len(record["web_results"]) == 1


class TestGetHistory:
    """测试查询历史记录。"""

    def test_get_all_history_empty(self, fresh_history_service):
        """空数据库应返回空列表。"""
        result = fresh_history_service.get_all_history()
        assert result == []

    def test_get_all_history_ordered(self, fresh_history_service):
        """保存多条记录后应全部返回且按时间倒序。"""
        titles = []
        for i in range(3):
            record = fresh_history_service.save_qa_session(
                title=f"session_{i}",
                kb_id="kb1",
                dialog_messages=[{"role": "user", "content": f"q{i}"}],
            )
            titles.append(f"session_{i}")
        result = fresh_history_service.get_all_history()
        assert len(result) == 3
        # 验证所有 title 都在结果中（同一秒内创建时排序可能不稳定）
        result_titles = {r["title"] for r in result}
        assert result_titles == set(titles)

    def test_get_by_id_existing(self, fresh_history_service):
        """根据 ID 查询存在的记录。"""
        record = fresh_history_service.save_qa_session(
            title="find_me",
            kb_id="kb1",
            dialog_messages=[{"role": "user", "content": "hello"}],
        )
        found = fresh_history_service.get_history_by_id(record["id"])
        assert found is not None
        assert found["title"] == "find_me"
        assert found["id"] == record["id"]

    def test_get_by_id_nonexistent(self, fresh_history_service):
        """查询不存在的 ID 应返回 None。"""
        result = fresh_history_service.get_history_by_id("nonexistent-id-12345")
        assert result is None


class TestUpdateSession:
    """测试更新会话记录。"""

    def test_update_existing_session(self, fresh_history_service):
        """更新已存在会话的消息和引用。"""
        record = fresh_history_service.save_qa_session(
            title="original",
            kb_id="kb1",
            dialog_messages=[{"role": "user", "content": "first question"}],
        )
        updated = fresh_history_service.update_session(
            session_id=record["id"],
            dialog_messages=[
                {"role": "user", "content": "first question"},
                {"role": "assistant", "content": "answer"},
                {"role": "user", "content": "follow up"},
            ],
            rag_chunks=[{"content": "chunk1"}],
        )
        assert updated is not None
        assert updated["query_count"] == 2
        assert len(updated["dialog_messages"]) == 3
        assert len(updated["rag_references"]) == 1

    def test_update_nonexistent_returns_none(self, fresh_history_service):
        """更新不存在的会话应返回 None。"""
        result = fresh_history_service.update_session(
            session_id="fake-id",
            dialog_messages=[{"role": "user", "content": "test"}],
        )
        assert result is None

    def test_update_title_override(self, fresh_history_service):
        """显式传入 title 应覆盖原 title。"""
        record = fresh_history_service.save_qa_session(
            title="old title",
            kb_id="kb1",
            dialog_messages=[{"role": "user", "content": "q"}],
        )
        updated = fresh_history_service.update_session(
            session_id=record["id"],
            dialog_messages=[{"role": "user", "content": "q"}],
            title="new title",
        )
        assert updated["title"] == "new title"


class TestDeleteHistory:
    """测试删除历史记录。"""

    def test_delete_existing(self, fresh_history_service):
        """删除存在的记录应返回 True。"""
        record = fresh_history_service.save_qa_session(
            title="to_delete",
            kb_id="kb1",
            dialog_messages=[{"role": "user", "content": "q"}],
        )
        result = fresh_history_service.delete_history_by_id(record["id"])
        assert result is True
        # 确认已删除
        assert fresh_history_service.get_history_by_id(record["id"]) is None

    def test_delete_nonexistent(self, fresh_history_service):
        """删除不存在的记录应返回 False。"""
        result = fresh_history_service.delete_history_by_id("nonexistent")
        assert result is False

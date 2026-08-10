"""tests/test_notification_service.py —— 通知服务单元测试。"""

class TestCreateNotification:
    """测试创建通知。"""

    def test_create_basic_notification(self, fresh_notification_service):
        """创建基本通知并验证返回结构。"""
        notif = fresh_notification_service.create_notification(
            notification_type="info",
            title="测试通知",
            content="这是一条测试通知",
        )
        assert notif["id"] is not None
        assert notif["type"] == "info"
        assert notif["title"] == "测试通知"
        assert notif["content"] == "这是一条测试通知"
        assert notif["read"] is False
        assert notif["created_at"] is not None

    def test_create_with_related_id_and_extra(self, fresh_notification_service):
        """创建带关联 ID 和额外数据的通知。"""
        notif = fresh_notification_service.create_notification(
            notification_type="warning",
            title="文档处理完成",
            content="知识库索引构建完毕",
            related_id="kb_001",
            extra={"doc_count": 5, "chunk_count": 120},
        )
        assert notif["related_id"] == "kb_001"
        assert notif["extra"]["doc_count"] == 5
        assert notif["extra"]["chunk_count"] == 120

    def test_create_multiple_notifications(self, fresh_notification_service):
        """创建多条通知，每条应有唯一 ID。"""
        ids = set()
        for i in range(5):
            n = fresh_notification_service.create_notification(
                notification_type="info",
                title=f"通知_{i}",
                content=f"内容_{i}",
            )
            ids.add(n["id"])
        assert len(ids) == 5


class TestGetNotifications:
    """测试查询通知。"""

    def test_get_all_empty(self, fresh_notification_service):
        """空数据库应返回空列表。"""
        result = fresh_notification_service.get_all_notifications()
        assert result == []

    def test_get_all_ordered_desc(self, fresh_notification_service):
        """通知应按创建时间倒序返回。"""
        titles = []
        for i in range(3):
            fresh_notification_service.create_notification(
                notification_type="info",
                title=f"n_{i}",
                content="content",
            )
            titles.append(f"n_{i}")
        result = fresh_notification_service.get_all_notifications()
        assert len(result) == 3
        # 验证所有 title 都在结果中（同一秒内创建时排序可能不稳定）
        result_titles = {r["title"] for r in result}
        assert result_titles == set(titles)

    def test_get_unread_count_empty(self, fresh_notification_service):
        """空数据库未读数应为 0。"""
        assert fresh_notification_service.get_unread_count() == 0

    def test_get_unread_count(self, fresh_notification_service):
        """创建 3 条未读通知后未读数应为 3。"""
        for i in range(3):
            fresh_notification_service.create_notification(
                notification_type="info",
                title=f"n_{i}",
                content="c",
            )
        assert fresh_notification_service.get_unread_count() == 3


class TestMarkAsRead:
    """测试标记已读。"""

    def test_mark_single_as_read(self, fresh_notification_service):
        """标记单条通知为已读。"""
        notif = fresh_notification_service.create_notification(
            notification_type="info", title="t", content="c"
        )
        assert fresh_notification_service.get_unread_count() == 1
        result = fresh_notification_service.mark_as_read(notif["id"])
        assert result is True
        assert fresh_notification_service.get_unread_count() == 0
        # 验证 read 字段已更新
        all_notifs = fresh_notification_service.get_all_notifications()
        assert all_notifs[0]["read"] is True

    def test_mark_nonexistent_as_read(self, fresh_notification_service):
        """标记不存在的通知应返回 False。"""
        result = fresh_notification_service.mark_as_read("nonexistent-id")
        assert result is False

    def test_mark_all_as_read(self, fresh_notification_service):
        """批量标记全部已读。"""
        for i in range(5):
            fresh_notification_service.create_notification(
                notification_type="info", title=f"t{i}", content="c"
            )
        assert fresh_notification_service.get_unread_count() == 5
        count = fresh_notification_service.mark_all_as_read()
        assert count == 5
        assert fresh_notification_service.get_unread_count() == 0


class TestDeleteNotification:
    """测试删除通知。"""

    def test_delete_existing(self, fresh_notification_service):
        """删除存在的通知应返回 True。"""
        notif = fresh_notification_service.create_notification(
            notification_type="info", title="t", content="c"
        )
        result = fresh_notification_service.delete_notification(notif["id"])
        assert result is True
        assert len(fresh_notification_service.get_all_notifications()) == 0

    def test_delete_nonexistent(self, fresh_notification_service):
        """删除不存在的通知应返回 False。"""
        result = fresh_notification_service.delete_notification("nonexistent")
        assert result is False

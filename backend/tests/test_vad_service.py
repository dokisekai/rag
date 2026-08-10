"""tests/test_vad_service.py —— VAD 语音活动检测控制器单元测试。"""

import time
from unittest.mock import patch


class TestVADController:
    """测试 VADController。"""

    def test_initial_state(self):
        from services.vad_service import VADController
        vad = VADController(silence_threshold_sec=1.0)
        assert vad.is_speaking is False
        assert vad.silence_threshold_sec == 1.0

    def test_voice_detected_sets_speaking(self):
        from services.vad_service import VADController
        vad = VADController(silence_threshold_sec=1.0)
        result = vad.update_speech_activity(has_voice=True)
        assert vad.is_speaking is True
        assert result is False  # 有声音时不触发结束

    def test_silence_during_speaking_no_trigger(self):
        """说话中短暂静音不应触发结束。"""
        from services.vad_service import VADController
        vad = VADController(silence_threshold_sec=1.0)
        # 先开始说话
        vad.update_speech_activity(has_voice=True)
        # 立即静音（未超过阈值）
        result = vad.update_speech_activity(has_voice=False)
        assert result is False
        assert vad.is_speaking is True  # 仍在说话状态

    def test_silence_triggers_end(self):
        """说话后静音超过阈值应触发结束。"""
        from services.vad_service import VADController
        vad = VADController(silence_threshold_sec=0.1)
        vad.update_speech_activity(has_voice=True)
        # 等待超过阈值
        time.sleep(0.15)
        result = vad.update_speech_activity(has_voice=False)
        assert result is True
        assert vad.is_speaking is False

    def test_silence_without_speaking_no_trigger(self):
        """未说话状态下静音不触发结束。"""
        from services.vad_service import VADController
        vad = VADController(silence_threshold_sec=0.1)
        time.sleep(0.15)
        result = vad.update_speech_activity(has_voice=False)
        assert result is False

    def test_resume_speaking_resets(self):
        """触发结束后再次说话应重置状态。"""
        from services.vad_service import VADController
        vad = VADController(silence_threshold_sec=0.1)
        vad.update_speech_activity(has_voice=True)
        time.sleep(0.15)
        vad.update_speech_activity(has_voice=False)  # 触发结束
        assert vad.is_speaking is False
        # 再次说话
        result = vad.update_speech_activity(has_voice=True)
        assert vad.is_speaking is True
        assert result is False

    def test_custom_threshold(self):
        """自定义静音阈值。"""
        from services.vad_service import VADController
        vad = VADController(silence_threshold_sec=2.0)
        assert vad.silence_threshold_sec == 2.0
        vad.update_speech_activity(has_voice=True)
        time.sleep(0.5)  # 远小于 2.0
        result = vad.update_speech_activity(has_voice=False)
        assert result is False

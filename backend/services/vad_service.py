import time

class VADController:
    """简单的自适应静音缓冲与断句控制器"""
    def __init__(self, silence_threshold_sec: float = 1.6):
        self.silence_threshold_sec = silence_threshold_sec
        self.last_speech_time = time.time()
        self.is_speaking = False

    def update_speech_activity(self, has_voice: bool) -> bool:
        """
        更新声音帧，返回是否判定“回答结束” (Turn-Taking)
        """
        now = time.time()
        if has_voice:
            self.last_speech_time = now
            self.is_speaking = True
            return False
        else:
            if self.is_speaking and (now - self.last_speech_time > self.silence_threshold_sec):
                self.is_speaking = False
                return True # 触发回答结束
            return False

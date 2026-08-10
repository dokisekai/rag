import os
import logging

logger = logging.getLogger(__name__)
import asyncio
import tempfile
import edge_tts
from typing import Optional

# 微软 Edge TTS 最佳中文声音配置
# zh-CN-YunxiNeural     — 男声，温润自然，适合知识解说
# zh-CN-XiaoxiaoNeural  — 女声，自然知性，清晰悦耳
# zh-CN-YunjianNeural   — 男声，沉稳大气，适合技术讲解
# zh-CN-XiaoyiNeural    — 女声，温柔亲切
DEFAULT_VOICE = "zh-CN-YunxiNeural"   # 云希：温润自然男声，知识解说最佳
DEFAULT_RATE = "+5%"                    # 语速略快，保持流畅感
DEFAULT_VOLUME = "+15%"                 # 音量提升，清晰明朗

async def generate_speech_audio(
    text: str,
    voice: str = DEFAULT_VOICE,
    rate: str = DEFAULT_RATE,
    volume: str = DEFAULT_VOLUME,
) -> Optional[str]:
    """使用 Edge-TTS 异步合成音频，若网络断连则安全降级返回 None"""
    # 过滤掉无法播报的特殊字符与 Markdown 标记
    import re
    clean_text = re.sub(r'[#*`_>|\[\]()\-]{1,}', ' ', text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    if not clean_text or clean_text.startswith("【API 请求异常") or clean_text.startswith("【无法连接"):
        return None
    # 截断超长文本（Edge-TTS 单次上限约 6000 字符）
    if len(clean_text) > 5000:
        clean_text = clean_text[:5000]

    temp_dir = tempfile.gettempdir()
    output_path = os.path.join(temp_dir, f"speech_{os.urandom(6).hex()}.mp3")

    try:
        communicate = edge_tts.Communicate(clean_text, voice, rate=rate, volume=volume)
        await communicate.save(output_path)
        return output_path
    except Exception as e:
        logger.warning("TTS audio generation warning (Network/DNS): %s", e)
        return None

def synthesize_text_to_audio(text: str, voice: str = DEFAULT_VOICE) -> Optional[str]:
    """同步调用包裹"""
    return asyncio.run(generate_speech_audio(text, voice))

if __name__ == "__main__":
    path = synthesize_text_to_audio("你好，我是今天的技术面试官，准备好开始了吗？")
    print(f"语音已生成到临时文件: {path}")

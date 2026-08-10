import os
import glob
from typing import List, Dict, Any

def get_question_bank_dir() -> str:
    base = os.path.dirname(__file__)
    candidates = [
        os.path.abspath(os.path.join(base, "..", "..", "..", "全栈面试题库")),
        os.path.abspath(os.path.join(base, "..", "..", "全栈面试题库")),
        os.path.abspath(os.path.join(base, "..", "..", "..")),
        os.path.abspath(os.path.join(base, "..", "..")),
    ]
    for cand in candidates:
        if os.path.exists(cand) and len(glob.glob(os.path.join(cand, "*.md"))) > 0:
            return cand
    return os.path.abspath(os.path.join(base, "..", "..", "..", "全栈面试题库"))

QUESTION_BANK_DIR = get_question_bank_dir()

def get_question_modules() -> List[Dict[str, Any]]:
    """扫描全栈面试题库目录下的所有 .md 文件"""
    bank_dir = get_question_bank_dir()
    md_files = glob.glob(os.path.join(bank_dir, "*.md"))

    modules = []
    for file_path in sorted(md_files):
        filename = os.path.basename(file_path)
        if filename.startswith('.'):
            continue
            
        file_size = os.path.getsize(file_path)
        
        # 提取简短标题与导言
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
            title = lines[0].replace("#", "").strip() if lines else filename
            summary = lines[1] if len(lines) > 1 else "系统包含大量高频面试点"

        modules.append({
            "id": filename,
            "filename": filename,
            "title": title,
            "path": file_path,
            "size_kb": round(file_size / 1024, 1),
            "summary": summary[:120] + "..." if len(summary) > 120 else summary
        })
    return modules

def read_module_content(filename: str) -> str:
    """读取指定 Markdown 文件的核心提问节点"""
    bank_dir = get_question_bank_dir()
    target_path = os.path.join(bank_dir, filename)
    if not os.path.exists(target_path):
        target_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", filename)
        )
    
    if not os.path.exists(target_path):
        return f"未找到该题目模块内容: {filename}"
        
    with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    
    # 截取前 2,000 字符，适配本地 LLM (LM Studio / Ollama) 的 Context Length 上限
    if len(content) > 2000:
        content = content[:2000] + "\n\n... (已自动截取核心考点大纲)"
    return content

if __name__ == "__main__":
    mods = get_question_modules()
    print(f"扫描到 {len(mods)} 个面试题模块")
    for m in mods[:3]:
        print(f" - {m['filename']}: {m['title']}")

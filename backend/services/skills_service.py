import os
import re
import time
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


def _parse_simple_yaml(text: str) -> Dict[str, Any]:
    lines = text.rstrip().split("\n")
    result, _ = _parse_yaml_mapping(lines, 0, 0)
    return result


def _parse_yaml_mapping(lines: List[str], start: int, indent: int) -> (Dict[str, Any], int):
    result = {}
    i = start
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue
        current_indent = len(line) - len(line.lstrip(" "))
        if current_indent < indent:
            break
        if current_indent > indent:
            i += 1
            continue
        if stripped.startswith("- "):
            break
        if ":" not in stripped:
            i += 1
            continue
        key, _, value = stripped.partition(":")
        key = key.strip()
        value = value.strip()
        if value == "" or value == "|":
            i += 1
            if i < len(lines):
                next_line = lines[i]
                next_stripped = next_line.strip()
                next_indent = len(next_line) - len(next_line.lstrip(" "))
                if next_indent >= indent and next_stripped.startswith("- "):
                    items, i = _parse_yaml_list(lines, i, next_indent)
                    result[key] = items
                elif next_indent > indent and value == "|":
                    block_lines = []
                    while i < len(lines):
                        bl = lines[i]
                        bs = bl.strip()
                        bi = len(bl) - len(bl.lstrip(" "))
                        if bi >= next_indent:
                            block_lines.append(bl[next_indent:])
                            i += 1
                        else:
                            break
                    result[key] = "\n".join(block_lines)
                elif next_indent > indent:
                    nested, i = _parse_yaml_mapping(lines, i, next_indent)
                    result[key] = nested
                else:
                    result[key] = None
            else:
                result[key] = None
        else:
            result[key] = _parse_yaml_value(value)
            i += 1
    return result, i


def _parse_yaml_list(lines: List[str], start: int, indent: int) -> (List[Any], int):
    result = []
    i = start
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue
        current_indent = len(line) - len(line.lstrip(" "))
        if current_indent < indent:
            break
        if current_indent > indent:
            i += 1
            continue
        if not stripped.startswith("- "):
            break
        item_text = stripped[2:].strip()
        i += 1
        if item_text == "":
            if i < len(lines):
                next_line = lines[i]
                next_indent = len(next_line) - len(next_line.lstrip(" "))
                next_stripped = next_line.strip()
                if next_indent > indent and next_stripped and not next_stripped.startswith("- "):
                    nested, i = _parse_yaml_mapping(lines, i, next_indent)
                    result.append(nested)
                else:
                    result.append(None)
            else:
                result.append(None)
        elif ":" in item_text and not item_text.startswith('"') and not item_text.startswith("'"):
            item_dict = {}
            k, _, v = item_text.partition(":")
            item_dict[k.strip()] = _parse_yaml_value(v.strip())
            if i < len(lines):
                next_line = lines[i]
                next_indent = len(next_line) - len(next_line.lstrip(" "))
                if next_indent > indent:
                    rest, i = _parse_yaml_mapping(lines, i, next_indent)
                    item_dict.update(rest)
            result.append(item_dict)
        else:
            result.append(_parse_yaml_value(item_text))
    return result, i


def _parse_yaml_value(value: str) -> Any:
    value = value.strip()
    if value.lower() == "true":
        return True
    if value.lower() == "false":
        return False
    if value.lower() == "null" or value == "~":
        return None
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        parts = [p.strip() for p in inner.split(",")]
        return [_parse_yaml_value(p) for p in parts]
    try:
        if "." in value:
            return float(value)
        return int(value)
    except (ValueError, TypeError):
        return value


def _dump_simple_yaml(data: Dict[str, Any], indent: int = 0) -> str:
    lines = []
    prefix = " " * indent
    for key, value in data.items():
        lines.extend(_dump_yaml_kv(key, value, indent))
    return "\n".join(lines)


def _dump_yaml_kv(key: str, value: Any, indent: int) -> List[str]:
    prefix = " " * indent
    if isinstance(value, dict):
        if not value:
            return [f"{prefix}{key}: {{}}"]
        result = [f"{prefix}{key}:"]
        for k, v in value.items():
            result.extend(_dump_yaml_kv(k, v, indent + 2))
        return result
    elif isinstance(value, list):
        if not value:
            return [f"{prefix}{key}: []"]
        result = [f"{prefix}{key}:"]
        for item in value:
            if isinstance(item, dict):
                first = True
                for ik, iv in item.items():
                    if first:
                        result.extend(_dump_yaml_list_kv(ik, iv, indent + 2, is_first=True))
                        first = False
                    else:
                        result.extend(_dump_yaml_list_kv(ik, iv, indent + 2, is_first=False))
            else:
                result.append(f"{prefix}  - {_yaml_scalar(item)}")
        return result
    else:
        if isinstance(value, str) and "\n" in value:
            result = [f"{prefix}{key}: |"]
            for line in value.split("\n"):
                result.append(f"{prefix}  {line}")
            return result
        return [f"{prefix}{key}: {_yaml_scalar(value)}"]


def _dump_yaml_list_kv(key: str, value: Any, indent: int, is_first: bool) -> List[str]:
    bullet_prefix = " " * indent
    if is_first:
        bullet_prefix = bullet_prefix[:-2] + "- "
        continue_prefix = " " * indent
    else:
        bullet_prefix = " " * indent
        continue_prefix = " " * indent

    if isinstance(value, dict):
        if not value:
            return [f"{bullet_prefix}{key}: {{}}"]
        result = [f"{bullet_prefix}{key}:"]
        for k, v in value.items():
            sub_lines = _dump_yaml_kv(k, v, indent + 2)
            result.extend(sub_lines)
        return result
    elif isinstance(value, list):
        if not value:
            return [f"{bullet_prefix}{key}: []"]
        result = [f"{bullet_prefix}{key}:"]
        for item in value:
            if isinstance(item, dict):
                first_inner = True
                for ik, iv in item.items():
                    if first_inner:
                        result.append(f"{indent + 2}  - {ik}: {_yaml_scalar(iv)}")
                        first_inner = False
                    else:
                        result.append(f"{indent + 4}{ik}: {_yaml_scalar(iv)}")
            else:
                result.append(f"{' ' * (indent + 2)}- {_yaml_scalar(item)}")
        return result
    else:
        if isinstance(value, str) and "\n" in value:
            result = [f"{bullet_prefix}{key}: |"]
            for line in value.split("\n"):
                result.append(f"{continue_prefix}  {line}")
            return result
        return [f"{bullet_prefix}{key}: {_yaml_scalar(value)}"]


def _yaml_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    if isinstance(value, str):
        if value == "" or any(c in value for c in [":", "#", '"', "'", "{", "}", "[", "]", ",", "&", "*", "!", "|", ">", "%", "@", "`"]):
            escaped = value.replace('"', '\\"')
            return f'"{escaped}"'
        return value
    if isinstance(value, (int, float)):
        return str(value)
    return str(value)


@dataclass
class Skill:
    id: str
    name: str
    description: str
    category: str
    version: str
    enabled: bool
    tools: List[Dict[str, Any]]
    prompts: List[Dict[str, Any]]
    resources: List[Dict[str, Any]]
    created_at: float
    updated_at: float
    config: Dict[str, Any]
    skill_dir: str = ""
    content: str = ""


class SkillsService:
    def __init__(self, data_path: str = "data/skills"):
        self.data_path = Path(data_path)
        self.data_path.mkdir(parents=True, exist_ok=True)
        self.skills: Dict[str, Skill] = {}
        self._load_skills()

    def _parse_skill_md(self, skill_dir: Path) -> Optional[Skill]:
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            return None

        try:
            with open(skill_md, "r", encoding="utf-8") as f:
                content = f.read()

            if not content.startswith("---"):
                return None

            end_idx = content.find("---", 3)
            if end_idx == -1:
                return None

            frontmatter_str = content[3:end_idx].strip()
            body_content = content[end_idx + 3:].strip()

            try:
                frontmatter = _parse_simple_yaml(frontmatter_str)
            except Exception:
                return None

            if not isinstance(frontmatter, dict):
                return None

            skill_id = skill_dir.name
            stat = skill_md.stat()

            return Skill(
                id=skill_id,
                name=frontmatter.get("name", skill_id),
                description=frontmatter.get("description", ""),
                category=frontmatter.get("category", "other"),
                version=frontmatter.get("version", "1.0.0"),
                enabled=frontmatter.get("enabled", True),
                tools=frontmatter.get("tools", []),
                prompts=frontmatter.get("prompts", []),
                resources=frontmatter.get("resources", []),
                created_at=stat.st_ctime,
                updated_at=stat.st_mtime,
                config=frontmatter.get("config", {}),
                skill_dir=str(skill_dir),
                content=body_content,
            )
        except Exception as e:
            logger.error(f"Failed to parse skill {skill_dir}: {e}")
            return None

    def _load_skills(self):
        if not self.data_path.exists():
            return

        for item in self.data_path.iterdir():
            if item.is_dir():
                skill = self._parse_skill_md(item)
                if skill:
                    self.skills[skill.id] = skill

    def _save_skill_md(self, skill: Skill) -> bool:
        try:
            skill_dir = Path(skill.skill_dir) if skill.skill_dir else self.data_path / skill.id
            skill_dir.mkdir(parents=True, exist_ok=True)

            frontmatter = {
                "name": skill.name,
                "description": skill.description,
                "category": skill.category,
                "version": skill.version,
                "enabled": skill.enabled,
                "tools": skill.tools,
                "prompts": skill.prompts,
                "resources": skill.resources,
                "config": skill.config,
            }

            yaml_str = _dump_simple_yaml(frontmatter)

            skill_md = skill_dir / "SKILL.md"
            with open(skill_md, "w", encoding="utf-8") as f:
                f.write("---\n")
                f.write(yaml_str)
                f.write("\n---\n\n")
                if skill.content:
                    f.write(skill.content)
                else:
                    f.write(f"# {skill.name}\n\n{skill.description}\n")

            skill.skill_dir = str(skill_dir)
            stat = skill_md.stat()
            skill.updated_at = stat.st_mtime
            return True
        except Exception as e:
            logger.error(f"Failed to save skill {skill.id}: {e}")
            return False

    def list_skills(self, category: Optional[str] = None, enabled_only: bool = False) -> List[Dict[str, Any]]:
        result = []
        for skill in self.skills.values():
            if category and skill.category != category:
                continue
            if enabled_only and not skill.enabled:
                continue
            result.append({
                "id": skill.id,
                "name": skill.name,
                "description": skill.description,
                "category": skill.category,
                "version": skill.version,
                "enabled": skill.enabled,
                "tool_count": len(skill.tools),
                "prompt_count": len(skill.prompts),
                "resource_count": len(skill.resources),
                "created_at": skill.created_at,
                "updated_at": skill.updated_at,
                "is_builtin": skill.config.get("type") == "builtin",
            })
        return result

    def get_skill(self, skill_id: str) -> Optional[Dict[str, Any]]:
        skill = self.skills.get(skill_id)
        if not skill:
            return None
        return {
            "id": skill.id,
            "name": skill.name,
            "description": skill.description,
            "category": skill.category,
            "version": skill.version,
            "enabled": skill.enabled,
            "tools": skill.tools,
            "prompts": skill.prompts,
            "resources": skill.resources,
            "created_at": skill.created_at,
            "updated_at": skill.updated_at,
            "config": skill.config,
            "content": skill.content,
        }

    def create_skill(self, name: str, description: str, category: str = "custom",
                     tools: Optional[List[Dict[str, Any]]] = None,
                     prompts: Optional[List[Dict[str, Any]]] = None,
                     resources: Optional[List[Dict[str, Any]]] = None,
                     config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        skill_id = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        if not skill_id:
            skill_id = f"skill-{int(time.time())}"

        base_id = skill_id
        counter = 1
        while skill_id in self.skills:
            skill_id = f"{base_id}-{counter}"
            counter += 1

        now = time.time()
        skill = Skill(
            id=skill_id,
            name=name,
            description=description,
            category=category,
            version="1.0.0",
            enabled=True,
            tools=tools or [],
            prompts=prompts or [],
            resources=resources or [],
            created_at=now,
            updated_at=now,
            config=config or {"type": "custom"},
            skill_dir="",
            content="",
        )

        self._save_skill_md(skill)
        self.skills[skill.id] = skill
        return self.get_skill(skill.id)

    def update_skill(self, skill_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        skill = self.skills.get(skill_id)
        if not skill:
            return None

        for key, value in kwargs.items():
            if hasattr(skill, key):
                setattr(skill, key, value)

        self._save_skill_md(skill)
        return self.get_skill(skill_id)

    def delete_skill(self, skill_id: str) -> bool:
        skill = self.skills.get(skill_id)
        if not skill:
            return False
        if skill.config.get("type") == "builtin":
            return False

        import shutil
        try:
            if skill.skill_dir:
                shutil.rmtree(skill.skill_dir)
            del self.skills[skill_id]
            return True
        except Exception as e:
            logger.error(f"Failed to delete skill {skill_id}: {e}")
            return False

    def toggle_skill(self, skill_id: str, enabled: bool) -> Optional[Dict[str, Any]]:
        return self.update_skill(skill_id, enabled=enabled)

    def get_enabled_tools(self) -> List[Dict[str, Any]]:
        tools = []
        for skill in self.skills.values():
            if skill.enabled:
                for tool in skill.tools:
                    tools.append({
                        **tool,
                        "skill_id": skill.id,
                        "skill_name": skill.name,
                    })
        return tools

    def get_enabled_prompts(self) -> List[Dict[str, Any]]:
        prompts = []
        for skill in self.skills.values():
            if skill.enabled:
                for prompt in skill.prompts:
                    prompts.append({
                        **prompt,
                        "skill_id": skill.id,
                        "skill_name": skill.name,
                    })
        return prompts

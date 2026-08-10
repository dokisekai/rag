import os
import json
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
NOTIFICATION_FILE = os.path.join(DATA_DIR, "notifications.json")


def _ensure_data_file():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(NOTIFICATION_FILE):
        with open(NOTIFICATION_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)


def get_all_notifications() -> List[Dict[str, Any]]:
    _ensure_data_file()
    try:
        with open(NOTIFICATION_FILE, "r", encoding="utf-8") as f:
            notifications = json.load(f)
            return sorted(notifications, key=lambda x: x.get("created_at", ""), reverse=True)
    except Exception as e:
        logger.error("Error loading notifications: %s", e)
        return []


def get_unread_count() -> int:
    notifications = get_all_notifications()
    return sum(1 for n in notifications if not n.get("read", False))


def create_notification(
    notification_type: str,
    title: str,
    content: str,
    related_id: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    _ensure_data_file()

    notification = {
        "id": str(uuid.uuid4()),
        "type": notification_type,
        "title": title,
        "content": content,
        "read": False,
        "related_id": related_id,
        "extra": extra or {},
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    notifications = get_all_notifications()
    notifications.append(notification)

    with open(NOTIFICATION_FILE, "w", encoding="utf-8") as f:
        json.dump(notifications, f, ensure_ascii=False, indent=2)

    return notification


def mark_as_read(notification_id: str) -> bool:
    notifications = get_all_notifications()
    found = False
    for n in notifications:
        if n.get("id") == notification_id:
            n["read"] = True
            found = True
            break
    if found:
        with open(NOTIFICATION_FILE, "w", encoding="utf-8") as f:
            json.dump(notifications, f, ensure_ascii=False, indent=2)
    return found


def mark_all_as_read() -> int:
    notifications = get_all_notifications()
    count = 0
    for n in notifications:
        if not n.get("read", False):
            n["read"] = True
            count += 1
    if count > 0:
        with open(NOTIFICATION_FILE, "w", encoding="utf-8") as f:
            json.dump(notifications, f, ensure_ascii=False, indent=2)
    return count


def delete_notification(notification_id: str) -> bool:
    notifications = get_all_notifications()
    filtered = [n for n in notifications if n.get("id") != notification_id]
    if len(filtered) < len(notifications):
        with open(NOTIFICATION_FILE, "w", encoding="utf-8") as f:
            json.dump(filtered, f, ensure_ascii=False, indent=2)
        return True
    return False

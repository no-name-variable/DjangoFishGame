"""Утилиты рыбалки."""

from apps.fishing.models import FishingSession


def calc_bite_timeout_seconds(session: FishingSession) -> float:
    """Окно подсечки — читаем из сохранённого bite_duration."""
    return session.bite_duration or 30.0

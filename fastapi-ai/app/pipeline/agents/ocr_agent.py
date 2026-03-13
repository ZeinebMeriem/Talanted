from __future__ import annotations

import logging

from ..models import SourcePack

logger = logging.getLogger(__name__)


class OcrAgent:
    """Placeholder – pass-through for now."""

    def run(self, pack: SourcePack) -> SourcePack:
        return pack

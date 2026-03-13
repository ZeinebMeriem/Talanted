from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class ValidatorAgent:
    """Minimal guardrails (schema-lite) for the uiSpec."""

    def validate(self, ui_spec: dict[str, Any]) -> None:
        if not isinstance(ui_spec, dict):
            raise ValueError("uiSpec doit etre un objet")
        page = ui_spec.get("page")
        if not isinstance(page, dict):
            raise ValueError("uiSpec.page manquant")
        title = page.get("title")
        if not isinstance(title, str) or not title.strip():
            raise ValueError("uiSpec.page.title manquant")
        comps = page.get("components")
        if not isinstance(comps, list) or len(comps) == 0:
            raise ValueError("uiSpec.page.components vide")

        for idx, comp in enumerate(comps):
            if not isinstance(comp, dict):
                raise ValueError(f"uiSpec.page.components[{idx}] doit etre un objet")
            t = str(comp.get("type") or "").strip().lower()
            if not t:
                raise ValueError(f"uiSpec.page.components[{idx}].type manquant")
            if t == "input":
                if not str(comp.get("name") or "").strip():
                    raise ValueError(f"input.name manquant (component {idx})")
                if not str(comp.get("label") or "").strip():
                    raise ValueError(f"input.label manquant (component {idx})")
            elif t == "checkbox":
                if not str(comp.get("name") or "").strip():
                    raise ValueError(f"checkbox.name manquant (component {idx})")
                if not str(comp.get("label") or "").strip():
                    raise ValueError(f"checkbox.label manquant (component {idx})")
            elif t == "link":
                if not str(comp.get("text") or "").strip():
                    raise ValueError(f"link.text manquant (component {idx})")
            elif t == "button":
                if not str(comp.get("text") or "").strip():
                    raise ValueError(f"button.text manquant (component {idx})")

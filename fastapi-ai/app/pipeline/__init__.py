"""Multi-agent pipeline (MVP).

This package hosts a deterministic orchestrator and agent implementations.
The initial target output is HTML/CSS. React codegen can be added later.
"""

from .orchestrator import Orchestrator

__all__ = ["Orchestrator"]

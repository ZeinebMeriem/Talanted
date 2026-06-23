"""Test standalone de FigmaAgent — aucun Docker requis."""
import sys
import os

# Ajoute le path pour importer les modules
sys.path.insert(0, os.path.dirname(__file__))

from app.pipeline.agents.figma_agent import FigmaAgent
from app.pipeline.models import SourceItem, SourcePack

# ── CONFIGURE ICI ──────────────────────────────────────────────────────────
FIGMA_URL   = "https://www.figma.com/design/zdfHmVe1v8izcauNO54itQ/Settings--Community-"
FIGMA_TOKEN = "figd_QymFfaE7v_MORVTH7zvuReejbVFX7u_AxcQn_nbp"
# ───────────────────────────────────────────────────────────────────────────

def test():
    print("=" * 60)
    print("TEST FigmaAgent")
    print("=" * 60)
    print(f"URL   : {FIGMA_URL}")
    print(f"Token : {FIGMA_TOKEN[:12]}...")
    print()

    pack = SourcePack(items=[
        SourceItem(
            kind="context",
            content=FIGMA_URL,
            meta={
                "extract": "figma_url",
                "figmaToken": FIGMA_TOKEN,
            },
        )
    ])

    agent = FigmaAgent()
    result = agent.run(pack)

    figma_items = [i for i in result.items if i.meta.get("extract") == "figma"]

    if not figma_items:
        print("ECHEC -- FigmaAgent n'a produit aucun item.")
        print("   Verifie : token valide ? URL correcte ? httpx installe ?")
        return

    item = figma_items[0]
    print(f"SUCCES -- {len(item.content)} caracteres extraits")
    print(f"   Cle Figma : {item.meta.get('figmaFileKey')}")
    print()
    print("-- Apercu (500 premiers caracteres) --")
    print(item.content[:500])
    print("...")

if __name__ == "__main__":
    test()

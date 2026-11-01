"""Grava no painel uma cópia dos dados (tarefas, estado e histórico).

A cópia aparece para quem abre o painel sem estar na conta Claude
(Letícia, Diogo, qualquer celular ou computador). Quem está na conta vê os
dados ao vivo do banco do painel.

Uso: python3 painel/atualizar-copia.py <pasta com tarefas/, estado/ e historico/ em JSON>
(a pasta é a que o ArtifactData grava com out_dir)
"""
import glob, json, os, re, sys

pasta = sys.argv[1]
def ler(colecao):
    docs = []
    for f in sorted(glob.glob(os.path.join(pasta, colecao, "*.json"))):
        d = json.load(open(f))
        d["id"] = os.path.splitext(os.path.basename(f))[0]
        docs.append(d)
    return docs

copia = {
    "tarefas": ler("tarefas"),
    "estado": (ler("estado") or [None])[0],
    "historico": sorted(ler("historico"), key=lambda h: -h.get("ordem", 0)),
}
texto = json.dumps(copia, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
bloco = f'<script id="copia" type="application/json">{texto}</script>'
p = os.path.join(os.path.dirname(__file__), "painel-duo-life.html")
html = open(p).read()
if 'id="copia"' in html:
    html = re.sub(r'<script id="copia" type="application/json">.*?</script>', lambda m: bloco, html, flags=re.S)
else:
    html = html.replace("\n<script>\n", "\n" + bloco + "\n<script>\n", 1)
open(p, "w").write(html)
print("cópia gravada:", len(copia["tarefas"]), "tarefas,", len(copia["historico"]), "registros")

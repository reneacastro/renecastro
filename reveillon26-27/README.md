# Réveillon 2026 › 2027

One page de decisão do grupo: comparativo das casas candidatas + votação.
Publicada em **https://renecastro.com.br/reveillon26-27/**

## Como adicionar uma casa nova

Tudo vem de `js/dados.js`. Copie um objeto de `DADOS.casas`, troque os campos e
publique — a página se ajusta sozinha: cards, comparativo, opções de voto,
callout de lotação e cálculo por pessoa.

Campos obrigatórios de uma casa:

| campo | o que é |
|---|---|
| `id` | slug único (vira o âncora `#casa-<id>`) |
| `apelido` | nome curto usado no comparativo e na votação |
| `titulo`, `url` | título e link do anúncio |
| `local` | `{cidade, uf, lat, lng, detalhe}` |
| `datas` | `{checkin, checkout, noites}` — datas em ISO `YYYY-MM-DD` |
| `preco` | `{total, porNoite, taxas, cancelamento}` + `nota` opcional |
| `capacidade` | `{maxHospedes, quartos, camas, banheiros}` — `banheiros: null` se o anúncio não informar |
| `distancia` | `{km, min}` a partir de São Caetano do Sul |
| `rating`, `anfitriao`, `destaquesAirbnb`, `descricao` | vêm do anúncio |
| `fotos` | `[{u: url, t: [tags], o: orientação}]` |
| `comodidades`, `naoTem`, `quartos`, `regras`, `avaliacoes` | idem |

Numa avaliação, `"flag": "atencao"` destaca o comentário em amarelo — use para
ressalvas que o grupo precisa ver.

Os **pontos de atenção** de cada card são derivados por regra (lotação menor que
o grupo, menos camas que gente, banheiro não informado, proibição de festa,
horário de silêncio, falta de detector de fumaça, ressalvas nas avaliações).
Casa nova entra já com essa análise, sem código extra.

## Votação

Ligada e funcionando no Firebase Realtime Database — projeto **`renecastro-a6d57`**
(conta rene.affonso@gmail.com, plano Spark, sem custo). A config está em
`js/config.js`; os votos ficam em `reveillon-2026-2027/votos/<slug>`.

Ver os votos a qualquer momento:

```bash
curl -s https://renecastro-a6d57-default-rtdb.firebaseio.com/reveillon-2026-2027/votos.json
```

As regras publicadas liberam leitura dos votos e escrita apenas no formato
esperado, e fecham todo o resto do banco:

```json
{
  "rules": {
    "reveillon-2026-2027": {
      "votos": {
        ".read": true,
        "$slug": {
          ".write": true,
          ".validate": "newData.hasChildren(['casa','nome','em']) && newData.child('casa').val().length <= 40 && newData.child('nome').val().length <= 60 && newData.child('em').isNumber()"
        }
      }
    }
  }
}
```

Não há login: quem abre o link escolhe um nome da lista e vota. Para 13 amigos
com um link privado isso é o certo — pedir senha afastaria metade do grupo. Se um
dia precisar zerar a votação, apague o nó `reveillon-2026-2027/votos` no console.

Se `window.CONFIG.firebase` voltar a ser `null`, a página cai sozinha em modo
rascunho local (voto só no navegador de quem votou) e avisa isso na tela.

## Fotos de perfil

Cada pessoa tem um avatar com a inicial e uma cor estável por nome. Para trocar
por uma foto de verdade:

1. salve o arquivo como `fotos/<slug>.jpg` (o `slug` está em `DADOS.pessoas`)
2. acrescente o slug em `temFoto`, dentro de `fotos/manifest.json`

O manifesto existe para a página não pedir 13 arquivos que talvez não estejam
lá — sem ele, o console enche de 404. Quem não estiver na lista continua com a
inicial, sem nenhuma requisição.
